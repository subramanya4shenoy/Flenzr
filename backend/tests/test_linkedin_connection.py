import hashlib
import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet

from app.core.config import settings
from app.domains.creators.models import Creator

BASE = '/api/v1/creators/me/linkedin'
SOCIALS = '/api/v1/creators/me/social-accounts'


@pytest.fixture
def configured(monkeypatch):
    key = Fernet.generate_key().decode()
    for name, value in {
        'LINKEDIN_CLIENT_ID': 'linkedin-client', 'LINKEDIN_CLIENT_SECRET': 'private-client-secret',
        'LINKEDIN_REDIRECT_URI': 'https://preview.test/api/social/linkedin/callback',
        'SOCIAL_TOKEN_ENCRYPTION_KEY': key,
    }.items():
        monkeypatch.setattr(settings, name, value)
    return key


async def begin(client, headers, handle=None):
    response = await client.post(BASE + '/connect', headers=headers, json={'handle': handle} if handle else {})
    assert response.status_code == 200, response.text
    url = urlparse(response.json()['url'])
    params = parse_qs(url.query)
    assert url.netloc == 'www.linkedin.com' and url.path == '/oauth/v2/authorization'
    assert params['scope'] == ['openid profile']
    assert params['redirect_uri'] == ['https://preview.test/api/social/linkedin/callback']
    assert 'private-client-secret' not in response.text
    return params['state'][0]


def provider(monkeypatch, mode='ok'):
    calls = []
    original = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if not str(url).startswith(('https://www.linkedin.com/', 'https://api.linkedin.com/')):
            return await original(self, method, url, **kwargs)
        calls.append((method, str(url), kwargs))
        if mode == 'failure':
            return httpx.Response(400, json={'error_description': 'private-client-secret private-access-token'})
        if str(url).endswith('/accessToken'):
            assert method == 'POST'
            assert kwargs['data']['client_secret'] == 'private-client-secret'
            return httpx.Response(200, json={'access_token': 'private-access-token', 'expires_in': True if mode == 'bad_expiry' else 3600})
        assert kwargs['headers']['Authorization'] == 'Bearer private-access-token'
        data = {'sub': 'other-member' if mode == 'other' else 'opaque-member-id',
                'name': 'Example Member', 'picture': 'https://media.licdn.com/profile.jpg',
                'email': 'private@example.com', 'email_verified': True}
        if mode == 'missing_sub':
            del data['sub']
        return httpx.Response(200, json=data)
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls


async def creator_for(client, headers, db_session):
    cid = (await client.get('/api/v1/creators/me', headers=headers)).json()['id']
    return await db_session.get(Creator, cid)


@pytest.mark.asyncio
async def test_import_encrypt_cache_deduplicate_disconnect(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    creator = await creator_for(client, headers, db_session)
    assert creator.social_credentials['_linkedin_flow']['hash'] == hashlib.sha256(state.encode()).hexdigest()
    calls = provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'provider-code', 'state': state})
    assert response.status_code == 200, response.text
    handle = response.json()['handle']
    account = (await client.get(SOCIALS, headers=headers)).json()[0]
    assert account['display_name'] == 'Example Member' and account['connected'] is True
    assert account['is_verified'] is False
    assert account['avatar_url'].startswith('/api/proxy-image?')
    assert 'opaque-member-id' not in str(account) and 'private@example.com' not in str(account)
    credential = creator.social_credentials['linkedin:' + handle]
    assert Fernet(configured.encode()).decrypt(credential['encrypted_token'].encode()).decode() == 'private-access-token'
    assert 'private-access-token' not in str(creator.social_credentials)
    response = await client.get(BASE + '/stats', headers=headers, params={'handle': handle})
    assert response.status_code == 200 and response.json()['followers'] is None
    assert response.json()['connected'] is True and len(calls) == 2
    assert 'private-access-token' not in response.text
    # Changes to other networks retain this connection and its public metadata.
    await client.patch(SOCIALS + '/x', headers=headers, json={'handle': 'example'})
    assert 'linkedin:' + handle in creator.social_credentials
    state = await begin(client, headers)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'new-code', 'state': state})).status_code == 200
    assert len([a for a in (await client.get(SOCIALS, headers=headers)).json() if a['platform'] == 'linkedin']) == 1
    assert (await client.delete(BASE + '/connection', headers=headers, params={'handle': handle})).status_code == 200
    accounts = (await client.get(SOCIALS, headers=headers)).json()
    account = next(a for a in accounts if a['platform'] == 'linkedin')
    assert account['connected'] is False and account['display_name'] == 'Example Member'
    assert (await client.get(BASE + '/stats', headers=headers, params={'handle': handle})).status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize('mode', ['failure', 'missing_sub', 'bad_expiry'])
async def test_rejection_consumes_state_and_never_imports(client, auth_headers, configured, monkeypatch, mode):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch, mode)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 409
    assert 'private-client-secret' not in response.text and 'private-access-token' not in response.text
    count = len(calls)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert len(calls) == count
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_owner_state_expiry_configuration_and_replay(client, auth_headers, db_session, configured, monkeypatch):
    headers, other = auth_headers(), auth_headers(sub='other-member', email='other@example.com')
    state = await begin(client, headers)
    await client.get('/api/v1/creators/me', headers=other)
    calls = provider(monkeypatch)
    for owner, nonce in ((other, state), (headers, 'x' * 43)):
        assert (await client.post(BASE + '/callback', headers=owner, json={'code': 'code', 'state': nonce})).status_code == 403
    assert not calls
    monkeypatch.setattr(settings, 'LINKEDIN_CLIENT_ID', 'different-client')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    monkeypatch.setattr(settings, 'LINKEDIN_CLIENT_ID', 'linkedin-client')
    creator = await creator_for(client, headers, db_session)
    creator.social_credentials = {'_linkedin_flow': {**creator.social_credentials['_linkedin_flow'], 'expires_at': time.time() - 1}}
    await db_session.commit()
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    state = await begin(client, headers)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 200
    count = len(calls)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert len(calls) == count


@pytest.mark.asyncio
async def test_reconnect_cannot_replace_member_and_removal_invalidates_flow(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    handle = response.json()['handle']
    state = await begin(client, headers, handle)
    provider(monkeypatch, 'other')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    state = await begin(client, headers, handle)
    await client.delete(SOCIALS + '/linkedin', headers=headers, params={'expected_handle': handle})
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_manual_vanity_link_is_not_verified_or_replaced(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    await client.patch(SOCIALS + '/linkedin', headers=headers, json={'handle': 'someone-else'})
    state = await begin(client, headers, 'someone-else')
    provider(monkeypatch)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 200
    accounts = (await client.get(SOCIALS, headers=headers)).json()
    assert len(accounts) == 2
    manual = next(a for a in accounts if a['handle'] == 'someone-else')
    assert manual['is_verified'] is False and manual['connected'] is False


@pytest.mark.asyncio
async def test_expiry_requires_reconnection_and_profile_refresh_checks_subject(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    handle = response.json()['handle']
    creator = await creator_for(client, headers, db_session)
    key = 'linkedin:' + handle
    credential = creator.social_credentials[key]
    creator.social_credentials = {key: {**credential, 'fetched_at': 0}}
    await db_session.commit()
    provider(monkeypatch, 'other')
    assert (await client.get(BASE + '/stats', headers=headers, params={'handle': handle})).status_code == 403
    creator.social_credentials = {key: {**credential, 'expires_at': 0}}
    await db_session.commit()
    assert (await client.get(BASE + '/stats', headers=headers, params={'handle': handle})).status_code == 409
    assert (await client.get(SOCIALS, headers=headers)).json()[0]['connected'] is False


@pytest.mark.asyncio
async def test_unconfigured_connection_is_explicit(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, 'LINKEDIN_CLIENT_ID', '')
    response = await client.post(BASE + '/connect', headers=auth_headers(), json={})
    assert response.status_code == 503 and response.json()['error']['code'] == 'LINKEDIN_NOT_CONFIGURED'
