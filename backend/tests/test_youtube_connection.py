import hashlib
import json
import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet
from app.core.config import settings
from app.domains.creators.models import Creator

BASE = '/api/v1/creators/me/youtube'
SOCIALS = '/api/v1/creators/me/social-accounts'
SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'


@pytest.fixture
def configured(monkeypatch, tmp_path):
    path = tmp_path / 'client.json'
    path.write_text(json.dumps({'web': {'client_id': 'test-client', 'client_secret': 'secret-client'}}))
    key = Fernet.generate_key().decode()
    monkeypatch.setattr(settings, 'YOUTUBE_OAUTH_CLIENT_FILE', str(path))
    monkeypatch.setattr(settings, 'YOUTUBE_REDIRECT_URI', 'http://localhost:3210/api/social/youtube/callback')
    monkeypatch.setattr(settings, 'SOCIAL_TOKEN_ENCRYPTION_KEY', key)
    return key


async def begin(client, headers):
    await client.patch(SOCIALS + '/youtube', headers=headers, json={'handle': 'example'})
    response = await client.post(BASE + '/connect', headers=headers, json={'handle': 'example'})
    assert response.status_code == 200
    params = parse_qs(urlparse(response.json()['url']).query)
    assert params['scope'] == [SCOPE]
    assert params['code_challenge_method'] == ['S256']
    assert params['access_type'] == ['offline']
    return params['state'][0]


def provider(monkeypatch, mode='ok'):
    calls = []
    original = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if not str(url).startswith(('https://oauth2.googleapis.com/', 'https://www.googleapis.com/youtube/')):
            return await original(self, method, url, **kwargs)
        calls.append((method, str(url), kwargs))
        if mode == 'failure':
            return httpx.Response(400, json={'error': 'secret-client access-token'})
        if str(url).endswith('/token'):
            return httpx.Response(200, json={'access_token': 'access-token', 'refresh_token': 'refresh-token', 'expires_in': 3600, 'scope': '' if mode == 'scope' else SCOPE})
        cid = 'other' if mode == 'mismatch' and kwargs['params'].get('forHandle') else 'channel-id'
        return httpx.Response(200, json={'items': [{'id': cid, 'snippet': {'title': 'Example'}, 'statistics': {'subscriberCount': '0', 'viewCount': '120', 'videoCount': '5'}}]})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls


@pytest.mark.asyncio
async def test_verify_encrypt_cache_refresh_disconnect(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    assert creator.social_credentials['_youtube_flow']['hash'] == hashlib.sha256(state.encode()).hexdigest()
    calls = provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 200, response.text
    credential = creator.social_credentials['youtube:example']
    assert 'refresh-token' not in str(creator.social_credentials)
    assert Fernet(configured.encode()).decrypt(credential['encrypted_refresh_token'].encode()).decode() == 'refresh-token'
    assert (await client.get(SOCIALS, headers=headers)).json()[0]['is_verified'] is True
    stats = await client.get(BASE + '/stats?handle=example', headers=headers)
    assert stats.json()['followers'] == 0
    assert stats.json()['connected'] is True
    assert len(calls) == 3
    assert 'token' not in stats.text
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    creator.social_credentials = {'youtube:example': {**credential, 'expires_at': int(time.time()) - 1}}
    await db_session.commit()
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 200
    assert calls[-2][2]['data']['grant_type'] == 'refresh_token'
    await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': 'example'})
    assert 'youtube:example' in creator.social_credentials
    assert 'social_credentials' not in (await client.get('/api/v1/creators/me', headers=headers)).text
    assert (await client.delete(BASE + '/connection?handle=example', headers=headers)).status_code == 200
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize('mode', ['mismatch', 'failure', 'scope'])
async def test_rejection_never_verifies_and_consumes_flow(client, auth_headers, configured, monkeypatch, mode):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch, mode)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code in (403, 409)
    assert 'secret-client' not in response.text and 'access-token' not in response.text
    assert not (await client.get(SOCIALS, headers=headers)).json()[0]['is_verified']
    count = len(calls)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert len(calls) == count


@pytest.mark.asyncio
async def test_owner_state_expiry_and_removal(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch)
    other = auth_headers(sub='other', email='other@example.com')
    await client.get('/api/v1/creators/me', headers=other)
    for owner, nonce in [(other, state), (headers, 'bad-state' * 5)]:
        assert (await client.post(BASE + '/callback', headers=owner, json={'code': 'code', 'state': nonce})).status_code == 403
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    creator.social_credentials = {'_youtube_flow': {**creator.social_credentials['_youtube_flow'], 'expires_at': 1}}
    await db_session.commit()
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    state = await begin(client, headers)
    await client.delete(SOCIALS + '/youtube?expected_handle=example', headers=headers)
    await client.patch(SOCIALS + '/youtube', headers=headers, json={'handle': 'example'})
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert calls == []


@pytest.mark.asyncio
async def test_removal_during_exchange(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch)
    previous = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if str(url).endswith('/channels') and kwargs.get('params', {}).get('forHandle'):
            await client.delete(SOCIALS + '/youtube?expected_handle=example', headers=headers)
        return await previous(self, method, url, **kwargs)
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_anonymous_rejected(client):
    for method, route in [('POST', '/connect'), ('POST', '/callback'), ('GET', '/stats?handle=example'), ('DELETE', '/connection?handle=example')]:
        assert (await client.request(method, BASE + route, json={} if method == 'POST' else None)).status_code == 401


@pytest.mark.asyncio
async def test_multiple_channels_disconnect_independently(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    provider(monkeypatch)
    for handle in ['first', 'second']:
        await client.patch(SOCIALS + '/youtube', headers=headers, json={'handle': handle, 'expected_handle': ''})
        response = await client.post(BASE + '/connect', headers=headers, json={'handle': handle})
        state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
        assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 200
    await client.delete(BASE + '/connection?handle=first', headers=headers)
    assert (await client.get(BASE + '/stats?handle=first', headers=headers)).status_code == 409
    assert (await client.get(BASE + '/stats?handle=second', headers=headers)).status_code == 200


@pytest.mark.asyncio
async def test_missing_configuration_is_sanitized(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, 'YOUTUBE_OAUTH_CLIENT_FILE', '/missing/private-client.json')
    response = await client.post(BASE + '/connect', headers=auth_headers(), json={'handle': 'example'})
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'YOUTUBE_NOT_CONFIGURED'
    assert 'private-client' not in response.text


@pytest.mark.asyncio
async def test_oauth_discovers_channel_without_manual_handle_and_deduplicates(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    provider(monkeypatch)
    previous = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        response = await previous(self, method, url, **kwargs)
        if str(url).endswith('/channels'):
            assert kwargs['params'].get('mine') == 'true'
            data = response.json()
            data['items'][0]['snippet']['customUrl'] = '@Discovered'
            return httpx.Response(200, json=data)
        return response
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    for _ in range(2):
        response = await client.post(BASE + '/connect', headers=headers, json={})
        assert response.status_code == 200
        state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
        # Updating another platform must preserve pending channel discovery.
        await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': 'example'})
        response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
        assert response.status_code == 200, response.text
        assert response.json()['handle'] == 'discovered'
    accounts = (await client.get(SOCIALS, headers=headers)).json()
    youtube = [a for a in accounts if a['platform'] == 'youtube']
    assert youtube == [{'platform': 'youtube', 'handle': 'discovered', 'is_verified': True}]
    stats = await client.get(BASE + '/stats?handle=discovered', headers=headers)
    assert stats.json()['displayName'] == 'Example'
    assert stats.json()['accountId'] == 'channel-id'


@pytest.mark.asyncio
async def test_failed_discovery_does_not_create_link(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'scope')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 409
    assert not any(a['platform'] == 'youtube' for a in (await client.get(SOCIALS, headers=headers)).json())
