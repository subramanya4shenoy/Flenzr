"""Opt-in real Redis + two independent Uvicorn processes, isolated SQLite fixture.

FLENZR_TEST_CHAT_REDIS_URL=redis://127.0.0.1:56379/0 DEBUG=false .venv/bin/python -m pytest tests/test_chat_multiworker.py -q
"""
import asyncio
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from uuid import uuid4

import httpx
import pytest
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app
from test_deliveries import agreed

REDIS_URL = os.getenv('FLENZR_TEST_CHAT_REDIS_URL', '')
pytestmark = pytest.mark.skipif(not REDIS_URL, reason='requires isolated Redis and two API processes')


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


class Events:
    def __init__(self, url, headers):
        self.url, self.headers = url, headers
        self.queue = asyncio.Queue()

    async def __aenter__(self):
        self.task = asyncio.create_task(self.read())
        return self

    async def __aexit__(self, *args):
        self.task.cancel()
        try:
            await self.task
        except asyncio.CancelledError:
            pass

    async def read(self):
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream('GET', self.url, headers=self.headers) as response:
                    response.raise_for_status()
                    event = ''
                    async for line in response.aiter_lines():
                        if line.startswith('event: '):
                            event = line[7:]
                        elif line.startswith('data: '):
                            await self.queue.put((event, json.loads(line[6:])))
            await self.queue.put(('closed', {}))
        except Exception as error:
            await self.queue.put(('error', str(error)))

    async def next(self, kind, predicate=lambda data: True, timeout=6):
        async with asyncio.timeout(timeout):
            while True:
                event, data = await self.queue.get()
                assert event != 'error', data
                if event == kind and predicate(data):
                    return data


@pytest.mark.asyncio
async def test_two_api_workers_share_chat_signals_presence_and_crash_expiry(tmp_path, client, auth_headers):
    namespace = 'flenzr:test:chat:' + uuid4().hex
    database_url = f'sqlite+aiosqlite:///{tmp_path / "chat.sqlite"}'
    engine = create_async_engine(database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    processes, logs = [], []
    redis = Redis.from_url(REDIS_URL)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with sessions() as session:
            async def override():
                yield session
            app.dependency_overrides[get_db] = override
            brand, creator, outsider, path, _ = await agreed(client, auth_headers, session)
        base = path.removesuffix('/deliveries')
        env = dict(os.environ, DATABASE_URL=database_url, CHAT_REDIS_URL=REDIS_URL,
                   CHAT_REDIS_NAMESPACE=namespace, DEBUG='false', SUPABASE_JWKS_URL='')
        urls = []
        async with httpx.AsyncClient(timeout=5) as http:
            for index in range(2):
                port = free_port()
                url = f'http://127.0.0.1:{port}'
                log = open(tmp_path / f'worker-{index}.log', 'w+')
                logs.append(log)
                process = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(port)], env=env, cwd=Path(__file__).resolve().parents[1], stdout=log, stderr=log)
                processes.append(process)
                async with asyncio.timeout(15):
                    while True:
                        assert process.poll() is None, (tmp_path / f'worker-{index}.log').read_text()
                        try:
                            if (await http.get(url + '/health')).status_code == 200:
                                break
                        except httpx.TransportError:
                            pass
                        await asyncio.sleep(.1)
                urls.append(url)
            a, b = urls
            for url in urls:
                assert (await http.get(url + base + '/chat/events', headers=outsider)).status_code == 404
                assert (await http.post(url + base + '/chat/signal', headers=outsider, json={'kind': 'typing', 'payload': {'active': True}})).status_code == 404
            async with Events(a + base + '/chat/events', brand) as brand_events, Events(b + base + '/chat/events', creator) as creator_events:
                await brand_events.next('ready')
                assert (await creator_events.next('ready'))['peer_online'] is True
                await brand_events.next('presence', lambda d: d['online'])
                body = {'request_id': str(uuid4()), 'text': 'Cross-worker hello'}
                response = await http.post(b + base + '/messages', headers=creator, json=body)
                assert response.status_code == 200, response.text
                message = response.json()
                received = await brand_events.next('message')
                assert received['id'] == message['id'] and received['is_mine'] is False
                assert (await http.post(a + base + '/messages', headers=creator, json=body)).json()['id'] == message['id']
                assert (await http.post(b + base + '/messages/read', headers=brand, json={'last_read_sequence': 1})).status_code == 200
                assert (await creator_events.next('read'))['last_read_sequence'] == 1
                assert (await http.post(b + base + f'/messages/{message["id"]}/reactions', headers=creator, json={'emoji': '👍'})).status_code == 200
                assert (await brand_events.next('reaction'))['message_id'] == message['id']
                for kind in ['typing', 'call_ring', 'call_accept', 'call_decline', 'call_offer', 'call_answer', 'call_ice', 'call_end']:
                    payload = {'active': True} if kind == 'typing' else {'test': kind, 'sdp': 'x' * 12000}
                    response = await http.post(b + base + '/chat/signal', headers=creator, json={'kind': kind, 'payload': payload})
                    assert response.status_code == 200, response.text
                    assert (await brand_events.next(kind))['payload'] == payload
                reply = await http.post(a + base + '/messages', headers=brand, json={'request_id': str(uuid4()), 'text': 'Reply from worker A'})
                assert reply.status_code == 200, reply.text
                assert (await creator_events.next('message'))['id'] == reply.json()['id']
                assert not any(event in {'message', 'typing', 'reaction', 'call_ring'} for event, _ in list(creator_events.queue._queue))
                async with Events(a + base + '/chat/events', creator) as tab:
                    await tab.next('ready')
                await asyncio.sleep(.2)
                assert (await http.get(a + base + '/messages', headers=brand)).json()['meta']['peer_online'] is True
                # Force subscriber reconnect; Redis state and durable writes survive.
                await redis.client_kill_filter(_type='pubsub')
                await brand_events.next('closed')
                await creator_events.next('closed')
                missed = await http.post(b + base + '/messages', headers=creator, json={'request_id': str(uuid4()), 'text': 'Saved while streams reconnect'})
                assert missed.status_code == 200, missed.text
                async with asyncio.timeout(8):
                    while not all([(await http.get(url + '/health')).json()['chat_ready'] for url in urls]):
                        await asyncio.sleep(.1)
                creator_events.task = asyncio.create_task(creator_events.read())
                await creator_events.next('ready')
                brand_events.task = asyncio.create_task(brand_events.read())
                assert (await brand_events.next('ready'))['peer_online'] is True
                recovered = (await http.get(a + base + '/messages', headers=brand)).json()
                assert [row['sequence'] for row in recovered['items']] == [1, 2, 3]
                assert recovered['items'][-1]['id'] == missed.json()['id']
                processes[1].kill()
                processes[1].wait(timeout=5)
                assert (await brand_events.next('presence', lambda d: not d['online'], timeout=50))['online'] is False
                state = (await http.get(a + base + '/messages', headers=brand)).json()
                assert state['meta']['peer_online'] is False and state['items'][0]['id'] == message['id']
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
                await asyncio.to_thread(process.wait, 8)
        for log in logs:
            log.close()
        keys = [key async for key in redis.scan_iter(match=namespace + ':*')]
        if keys:
            await redis.delete(*keys)
        await redis.aclose()
        await engine.dispose()
