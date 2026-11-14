import hashlib
import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet
from app.core.config import settings
from app.domains.creators.models import Creator

BASE = '/api/v1/creators/me/instagram'
SOCIALS = '/api/v1/creators/me/social-accounts'


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, 'INSTAGRAM_LOGIN_MODE', 'instagram')
    key = Fernet.generate_key().decode()
    for name, value in {'INSTAGRAM_APP_ID': '12345', 'INSTAGRAM_APP_SECRET': 'private-app-secret',
        'INSTAGRAM_REDIRECT_URI': 'https://preview.flenzr.test/api/social/instagram/callback',
        'SOCIAL_TOKEN_ENCRYPTION_KEY': key}.items():
        monkeypatch.setattr(settings, name, value)
    return key


async def begin(client, headers, handle='example'):
    await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': handle, 'expected_handle': ''})
    response = await client.post(BASE + '/connect', headers=headers, json={'handle': handle})
    assert response.status_code == 200
    params = parse_qs(urlparse(response.json()['url']).query)
    return params['state'][0]


def provider(monkeypatch, username='example', failure=False):
    calls = []
    original = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if not str(url).startswith(('https://api.instagram.com/', 'https://graph.instagram.com/')):
            return await original(self, method, url, **kwargs)
        calls.append((method, str(url), kwargs))
        if failure:
            return httpx.Response(400, json={'error': {'message': 'private-app-secret provider-token'}})
        if 'api.instagram.com/oauth/access_token' in str(url):
            return httpx.Response(200, json={'access_token': 'short-provider-token', 'user_id': '123'})
        if 'graph.instagram.com/access_token' in str(url):
            return httpx.Response(200, json={'access_token': 'long-provider-token', 'expires_in': 5184000})
        return httpx.Response(200, json={'user_id': '123', 'username': username, 'name': 'Example', 'followers_count': 0, 'follows_count': 12, 'media_count': 9, 'profile_picture_url': 'https://scontent.cdninstagram.com/profile.jpg'})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls


@pytest.mark.asyncio
async def test_missing_configuration_does_not_start_flow(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, 'INSTAGRAM_APP_ID', '')
    response = await client.post(BASE + '/connect', headers=auth_headers(), json={'handle': 'example'})
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'INSTAGRAM_NOT_CONFIGURED'


@pytest.mark.asyncio
async def test_flow_owner_state_encryption_stats_and_replay(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    creator = await db_session.get(Creator, me['id'])
    assert creator.social_credentials['_flow']['hash'] == hashlib.sha256(state.encode()).hexdigest()
    assert state not in str(creator.social_credentials)
    calls = provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 200
    credential = creator.social_credentials['example']
    assert 'long-provider-token' not in str(creator.social_credentials)
    assert Fernet(configured.encode()).decrypt(credential['encrypted_token'].encode()).decode() == 'long-provider-token'
    public = await client.get(SOCIALS, headers=headers)
    assert public.json()[0]['is_verified'] is True
    stats = await client.get(BASE + '/stats?handle=example', headers=headers)
    assert stats.json()['followers'] == 0
    assert stats.json()['following'] == 12
    assert stats.json()['postCount'] == 9
    assert stats.json()['connected'] is True
    assert 'token' not in stats.text
    assert len(calls) == 3  # Stats use the fresh snapshot.
    replay = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert replay.status_code == 403
    assert len(calls) == 3
    own = await client.get('/api/v1/creators/me', headers=headers)
    assert 'social_credentials' not in own.json()
    assert 'encrypted_token' not in own.text


@pytest.mark.asyncio
async def test_wrong_owner_and_wrong_state_never_call_provider(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch)
    other = auth_headers(sub='other-user', email='other@example.com')
    await client.get('/api/v1/creators/me', headers=other)
    for owner, nonce in [(other, state), (headers, 'invalid-state-' * 4)]:
        response = await client.post(BASE + '/callback', headers=owner, json={'code': 'code', 'state': nonce})
        assert response.status_code == 403
    assert calls == []
    assert (await client.get(BASE + '/stats?handle=example', headers=other)).status_code == 403


@pytest.mark.asyncio
async def test_authorizing_different_handle_never_verifies_saved_account(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch, username='someone_else')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 403
    assert (await client.get(SOCIALS, headers=headers)).json()[0]['is_verified'] is False
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 409


@pytest.mark.asyncio
async def test_provider_error_is_sanitized_and_flow_is_consumed(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch, failure=True)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 409
    assert 'private-app-secret' not in response.text
    assert 'provider-token' not in response.text
    replay = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert replay.status_code == 403
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_removed_account_invalidates_pending_authorization(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    await client.delete(SOCIALS + '/instagram?expected_handle=example', headers=headers)
    await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': 'example', 'expected_handle': ''})
    calls = provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 403
    assert calls == []


@pytest.mark.asyncio
async def test_multiple_connections_disconnect_and_remove_are_independent(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    for handle in ['first', 'second']:
        state = await begin(client, headers, handle)
        provider(monkeypatch, username=handle)
        response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
        assert response.status_code == 200
    await client.delete(BASE + '/connection?handle=first', headers=headers)
    accounts = {a['handle']: a for a in (await client.get(SOCIALS, headers=headers)).json()}
    assert accounts['first']['is_verified'] is False
    assert accounts['second']['is_verified'] is True
    assert (await client.get(BASE + '/stats?handle=first', headers=headers)).status_code == 409
    assert (await client.get(BASE + '/stats?handle=second', headers=headers)).status_code == 200
    await client.delete(SOCIALS + '/instagram?expected_handle=second', headers=headers)
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    assert creator.social_credentials == {}


@pytest.mark.asyncio
async def test_expired_flow_and_connection_require_reauthorization(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    credential = dict(creator.social_credentials)
    creator.social_credentials = {'_flow': {**credential['_flow'], 'expires_at': int(time.time()) - 1}}
    await db_session.commit()
    calls = provider(monkeypatch)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert calls == []
    creator.social_credentials = {'example': {'expires_at': int(time.time()) - 1}}
    await db_session.commit()
    response = await client.get(BASE + '/stats?handle=example', headers=headers)
    assert response.json()['error']['code'] == 'INSTAGRAM_CONNECTION_EXPIRED'


@pytest.mark.asyncio
async def test_removal_during_provider_exchange_cannot_restore_connection(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch)
    previous = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if str(url).endswith('/me') and str(url).startswith('https://graph.instagram.com/'):
            await client.delete(SOCIALS + '/instagram?expected_handle=example', headers=headers)
        return await previous(self, method, url, **kwargs)
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 403
    assert (await client.get(SOCIALS, headers=headers)).json() == []
