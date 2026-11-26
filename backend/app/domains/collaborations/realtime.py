"""Participant-scoped fan-out, with optional shared Redis transport.

Redis is ephemeral: persisted messages/receipts remain authoritative. Closing a
stream on transport failure or overflow makes EventSource reconnect and reconcile.
"""
import asyncio
import json
import logging
import time
from collections import defaultdict
from contextlib import suppress
from datetime import datetime, timezone
from uuid import uuid4

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.exceptions import FlenzrException

logger = logging.getLogger(__name__)


class ChatRealtimeHub:
    lease_seconds = 35
    refresh_seconds = 10

    def __init__(self) -> None:
        self._rooms: dict[str, set[tuple[str, asyncio.Queue]]] = defaultdict(set)
        self._online_counts: dict[str, int] = defaultdict(int)
        self._worker = uuid4().hex
        self._redis: Redis | None = None
        self._pubsub = None
        self._tasks: list[asyncio.Task] = []
        self._seen: dict[tuple[str, str], float] = {}
        self._closed: set[asyncio.Queue] = set()
        self._namespace = 'flenzr:chat'
        self._connected = False

    async def start(self, url: str = '', namespace: str = 'flenzr:chat') -> None:
        if not url:
            return
        self._namespace = namespace
        self._redis = Redis.from_url(url, decode_responses=True, socket_connect_timeout=3, socket_timeout=3)
        try:
            await self._redis.ping()
            self._pubsub = self._redis.pubsub()
            await self._pubsub.subscribe(self._channel)
            # Wait for the subscription acknowledgement before accepting requests.
            acknowledgement = await self._pubsub.get_message(timeout=3)
            if not acknowledgement or acknowledgement['type'] != 'subscribe':
                raise RuntimeError('Chat Redis subscription was not acknowledged')
            self._connected = True
            self._tasks = [asyncio.create_task(self._listen()), asyncio.create_task(self._maintain())]
        except BaseException:
            await self.stop()
            raise

    @property
    def transport(self) -> str:
        return 'redis' if self._redis else 'local'

    @property
    def ready(self) -> bool:
        return self._redis is None or self._connected

    @property
    def _channel(self) -> str:
        return f'{self._namespace}:events'

    def _presence_key(self, user_id: str) -> str:
        return f'{self._namespace}:online:{user_id}'

    async def stop(self) -> None:
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            with suppress(asyncio.CancelledError):
                await task
        self._tasks.clear()
        for room, connections in list(self._rooms.items()):
            for uid, queue in list(connections):
                self._close_queue(queue)
                await self.unsubscribe(room, uid, queue)
        if self._pubsub:
            await self._pubsub.aclose()
        if self._redis:
            await self._redis.aclose()
        self._redis = None
        self._pubsub = None
        self._connected = False
        self._seen.clear()

    async def is_online(self, user_id: str) -> bool:
        if self._redis:
            try:
                return bool(await self._redis.zcount(self._presence_key(user_id), time.time(), '+inf'))
            except RedisError:
                return False
        return self._online_counts.get(user_id, 0) > 0

    async def peer_online(self, room: str, user_id: str) -> bool:
        online = await self.is_online(user_id)
        if online and self._redis:
            # The peer may already be connected before this worker joins the
            # room, so there need not be a presence event to start expiry.
            self._seen[(room, user_id)] = time.monotonic() + self.lease_seconds
        return online

    async def _lease(self, user_id: str) -> None:
        if self._redis:
            key = self._presence_key(user_id)
            async with self._redis.pipeline(transaction=True) as pipe:
                pipe.zremrangebyscore(key, '-inf', time.time())
                if self._online_counts.get(user_id, 0):
                    pipe.zadd(key, {self._worker: time.time() + self.lease_seconds})
                    pipe.expire(key, self.lease_seconds * 2)
                else:
                    pipe.zrem(key, self._worker)
                await pipe.execute()

    async def subscribe(self, collaboration_id: str, user_id: str) -> asyncio.Queue:
        if self._redis and not self._connected:
            raise FlenzrException('CHAT_UNAVAILABLE', 'Live chat is reconnecting. Please retry.', 503)
        queue: asyncio.Queue = asyncio.Queue(maxsize=128)
        self._rooms[collaboration_id].add((user_id, queue))
        self._online_counts[user_id] += 1
        try:
            await self._lease(user_id)
            await self._presence(collaboration_id, user_id)
        except RedisError:
            await self.unsubscribe(collaboration_id, user_id, queue)
            raise FlenzrException('CHAT_UNAVAILABLE', 'Live chat is reconnecting. Please retry.', 503) from None
        except BaseException:
            await self.unsubscribe(collaboration_id, user_id, queue)
            raise
        return queue

    async def unsubscribe(self, collaboration_id: str, user_id: str, queue: asyncio.Queue) -> None:
        room = self._rooms.get(collaboration_id)
        if not room or (user_id, queue) not in room:
            return
        room.remove((user_id, queue))
        self._closed.discard(queue)
        if not room:
            self._rooms.pop(collaboration_id, None)
            for key in list(self._seen):
                if key[0] == collaboration_id:
                    self._seen.pop(key, None)
        self._online_counts[user_id] -= 1
        if not self._online_counts[user_id]:
            self._online_counts.pop(user_id, None)
        try:
            await self._lease(user_id)
            await self._presence(collaboration_id, user_id)
        except RedisError:
            # A crashed/disconnected worker's presence expires without cleanup.
            logger.warning('Chat presence cleanup deferred to lease expiry')

    async def _presence(self, room: str, uid: str) -> None:
        await self.publish(room, 'presence', {
            'user_id': uid, 'online': await self.is_online(uid),
            'at': datetime.now(timezone.utc).isoformat(),
        }, exclude_user_id=uid)

    def _close_queue(self, queue: asyncio.Queue) -> None:
        self._closed.add(queue)
        while not queue.empty():
            queue.get_nowait()
        queue.put_nowait(None)

    def _deliver(self, room: str, event: str, data: dict, exclude: str | None) -> None:
        if event == 'presence' and room in self._rooms:
            key = (room, data['user_id'])
            if data['online']:
                self._seen[key] = time.monotonic() + self.lease_seconds
            else:
                self._seen.pop(key, None)
        for uid, queue in list(self._rooms.get(room, ())):
            if uid == exclude:
                continue
            if queue.full():
                self._close_queue(queue)
            elif queue not in self._closed:
                queue.put_nowait({'event': event, 'data': data})

    async def publish(self, collaboration_id: str, event: str, data: dict, *, exclude_user_id: str | None = None, required: bool = False) -> None:
        if not self._redis:
            self._deliver(collaboration_id, event, data, exclude_user_id)
            return
        try:
            if not self._connected:
                raise RedisError('Chat subscriber disconnected')
            await self._redis.publish(self._channel, json.dumps({
                'room': collaboration_id, 'event': event, 'data': data, 'exclude': exclude_user_id,
            }))
        except RedisError:
            self._disconnect_streams()
            logger.warning('Chat transport unavailable; durable state will reconcile on reconnect')
            if required:
                raise FlenzrException('CHAT_UNAVAILABLE', 'Live chat is reconnecting. Please retry.', 503) from None

    def _disconnect_streams(self) -> None:
        for connections in self._rooms.values():
            for _, queue in connections:
                self._close_queue(queue)

    async def _listen(self) -> None:
        while True:
            try:
                message = await self._pubsub.get_message(ignore_subscribe_messages=False, timeout=1)
                if message and message['type'] == 'subscribe':
                    # Acknowledgement also detects redis-py internal reconnects.
                    self._disconnect_streams()
                    self._connected = True
                elif message and message['type'] == 'message':
                    payload = json.loads(message['data'])
                    self._deliver(payload['room'], payload['event'], payload['data'], payload['exclude'])
            except (RedisError, OSError):
                self._connected = False
                self._disconnect_streams()
                await asyncio.sleep(1)
            except (ValueError, KeyError, TypeError):
                logger.warning('Invalid chat transport envelope ignored')

    async def _maintain(self) -> None:
        while True:
            await asyncio.sleep(self.refresh_seconds)
            try:
                for uid in list(self._online_counts):
                    await self._lease(uid)
                for room, connections in list(self._rooms.items()):
                    for uid in {uid for uid, _ in connections}:
                        await self._presence(room, uid)
                # Refresh events stop if a worker dies. Resolve expired leases
                # here rather than relying on Redis keyspace notifications.
                for (room, uid), expiry in list(self._seen.items()):
                    if expiry < time.monotonic():
                        online = await self.is_online(uid)
                        self._deliver(room, 'presence', {
                            'user_id': uid, 'online': online,
                            'at': datetime.now(timezone.utc).isoformat(),
                        }, uid)
            except RedisError:
                self._disconnect_streams()


chat_hub = ChatRealtimeHub()
