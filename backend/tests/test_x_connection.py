import base64
import hashlib
import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet

from app.core.config import settings
from app.domains.creators.models import Creator
from app.domains.creators.x_connection import SCOPES, snapshot

BASE = '/api/v1/creators/me/x'
SOCIALS = '/api/v1/creators/me/social-accounts'


@pytest.fixture
def configured(monkeypatch):
    key = Fernet.generate_key().decode()
    for name, value in {
        'X_CLIENT_ID': 'x-client', 'X_CLIENT_SECRET': 'private-client-secret',
        'X_REDIRECT_URI': 'https://preview.test/api/social/x/callback',
        'SOCIAL_TOKEN_ENCRYPTION_KEY': key,
    }.items():
        monkeypatch.setattr(settings, name, value)
    return key


async def begin(client, headers, handle=None):
    response = await client.post(BASE + '/connect', headers=headers, json={'handle': handle} if handle else {})
    assert response.status_code == 200, response.text
    url = urlparse(response.json()['url'])
    params = parse_qs(url.query)
    assert url.netloc == 'x.com' and url.path == '/i/oauth2/authorize'
    assert params['scope'] == [SCOPES]
    assert params['code_challenge_method'] == ['S256']
    assert params['redirect_uri'] == ['https://preview.test/api/social/x/callback']
    assert 'private-client-secret' not in response.text
    return params


def provider(monkeypatch):
    calls = []
    control = {'token_status': 200, 'profile_status': 200, 'id': '123456', 'username': 'example',
        'scope': SCOPES, 'expiry': 7200, 'refresh': 'private-refresh-token',
        'metrics': {'followers_count': 0, 'following_count': 5, 'post_count': 8}}
    original = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if not str(url).startswith('https://api.x.com/'):
            return await original(self, method, url, **kwargs)
        calls.append((method, str(url), kwargs))
        if str(url).endswith('/oauth2/token'):
            assert method == 'POST'
            auth_request = next(kwargs['auth'].auth_flow(httpx.Request(method, url)))
            expected = base64.b64encode(b'x-client:private-client-secret').decode()
            assert auth_request.headers['Authorization'] == 'Basic ' + expected
            if control['token_status'] != 200:
                return httpx.Response(control['token_status'], json={'error': control.get('token_error', 'private-client-secret private-access-token')})
            return httpx.Response(200, json={'access_token': 'private-access-token', 'refresh_token': control['refresh'],
                'expires_in': control['expiry'], 'scope': control['scope']})
        assert str(url) == 'https://api.x.com/2/users/me' and method == 'GET'
        assert kwargs['headers']['Authorization'] == 'Bearer private-access-token'
        assert kwargs['params']['user.fields'] == 'profile_image_url,public_metrics'
        if control['profile_status'] != 200:
            return httpx.Response(control['profile_status'], json={'detail': 'private-client-secret private-access-token', 'reason': 'client-not-enrolled'})
        return httpx.Response(200, json={'data': {'id': control['id'], 'username': control['username'],
            'name': 'Example Creator', 'profile_image_url': 'https://pbs.twimg.com/profile_images/example.jpg',
            'public_metrics': control['metrics']}})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls, control


async def creator_for(client, headers, db_session):
    cid = (await client.get('/api/v1/creators/me', headers=headers)).json()['id']
    return await db_session.get(Creator, cid)


@pytest.mark.asyncio
async def test_pkce_profile_encrypt_cache_preserve_disconnect(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    params = await begin(client, headers)
    creator = await creator_for(client, headers, db_session)
    flow = creator.social_credentials['_x_flow']
    verifier = Fernet(configured.encode()).decrypt(flow['verifier'].encode()).decode()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    assert params['code_challenge'] == [challenge]
    assert flow['hash'] == hashlib.sha256(params['state'][0].encode()).hexdigest()
    calls, _ = provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'provider-code', 'state': params['state'][0]})
    assert response.status_code == 200, response.text
    assert calls[0][2]['data']['code_verifier'] == verifier
    assert calls[0][2]['data']['redirect_uri'] == settings.X_REDIRECT_URI
    credential = creator.social_credentials['x:example']
    encryption = Fernet(configured.encode())
    assert encryption.decrypt(credential['encrypted_token'].encode()).decode() == 'private-access-token'
    assert encryption.decrypt(credential['encrypted_refresh_token'].encode()).decode() == 'private-refresh-token'
    account = (await client.get(SOCIALS, headers=headers)).json()[0]
    assert account['handle'] == 'example' and account['is_verified'] is True and account['connected'] is True
    assert account['avatar_url'].startswith('/api/proxy-image?')
    for _ in range(2):
        stats = await client.get(BASE + '/stats?handle=example', headers=headers)
        assert stats.status_code == 200
        assert stats.json()['followers'] == 0 and stats.json()['postCount'] == 8
    assert len(calls) == 2  # Page refreshes within the cache window cause no paid reads.
    assert 'private-access-token' not in stats.text + str(creator.social_credentials)
    assert 'private-refresh-token' not in str(creator.social_credentials)
    await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': 'example'})
    assert 'x:example' in creator.social_credentials
    assert (await client.delete(BASE + '/connection?handle=example', headers=headers)).status_code == 200
    account = next(a for a in (await client.get(SOCIALS, headers=headers)).json() if a['platform'] == 'x')
    assert account['is_verified'] is False and account['connected'] is False
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 409


@pytest.mark.asyncio
async def test_refresh_rotation_is_saved_even_when_profile_billing_fails(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    params = await begin(client, headers)
    calls, control = provider(monkeypatch)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 200
    creator = await creator_for(client, headers, db_session)
    credential = creator.social_credentials['x:example']
    creator.social_credentials = {'x:example': {**credential, 'expires_at': 0}}
    await db_session.commit()
    control.update(refresh='rotated-refresh-token', profile_status=402)
    response = await client.get(BASE + '/stats?handle=example', headers=headers)
    assert response.status_code == 503 and response.json()['error']['code'] == 'X_BILLING_REQUIRED'
    creator = await creator_for(client, headers, db_session)
    updated = creator.social_credentials['x:example']
    assert Fernet(configured.encode()).decrypt(updated['encrypted_refresh_token'].encode()).decode() == 'rotated-refresh-token'
    assert calls[2][2]['data'] == {'grant_type': 'refresh_token', 'refresh_token': 'private-refresh-token'}
    assert 'private-client-secret' not in response.text and 'private-access-token' not in response.text
    control['profile_status'] = 200
    creator.social_credentials = {'x:example': {**updated, 'fetched_at': 0}}
    await db_session.commit()
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 200
    assert len(calls) == 5  # Refresh was not repeated after the failed paid read.


@pytest.mark.asyncio
@pytest.mark.parametrize('mode', ['scope', 'expiry', 'refresh', 'token_failure', 'billing', 'rate_limit', 'invalid_client', 'profile_forbidden'])
async def test_failure_never_imports_and_consumes_flow(client, auth_headers, db_session, configured, monkeypatch, mode):
    headers = auth_headers()
    params = await begin(client, headers)
    calls, control = provider(monkeypatch)
    if mode == 'scope': control['scope'] = 'users.read'
    if mode == 'expiry': control['expiry'] = True
    if mode == 'refresh': control['refresh'] = None
    if mode == 'token_failure': control['token_status'] = 401
    if mode == 'billing': control['profile_status'] = 402
    if mode == 'rate_limit': control['profile_status'] = 429
    if mode == 'invalid_client': control.update(token_status=401, token_error='invalid_client')
    if mode == 'profile_forbidden': control['profile_status'] = 403
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})
    assert response.status_code in (409, 503)
    assert 'private-client-secret' not in response.text and 'private-access-token' not in response.text
    creator = await creator_for(client, headers, db_session)
    flow = creator.social_credentials['_x_flow']
    assert flow['status'] == 'failed'
    assert 'private-client-secret' not in str(flow) and 'private-access-token' not in str(flow)
    if mode == 'invalid_client':
        assert flow['error_code'] == 'X_CLIENT_CONFIGURATION'
        assert flow['diagnostic'] == [{'stage': 'token_exchange', 'http_status': 401, 'provider_error': 'invalid_client'}]
    if mode == 'profile_forbidden':
        assert flow['error_code'] == 'X_API_ACCESS_REQUIRED'
        assert flow['diagnostic'] == [{'stage': 'profile_lookup', 'http_status': 403, 'provider_reason': 'client-not-enrolled'}]
    count = len(calls)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 403
    assert len(calls) == count
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_owner_state_expiry_and_client_binding(client, auth_headers, db_session, configured, monkeypatch):
    headers, other = auth_headers(), auth_headers(sub='other-owner', email='other@example.com')
    params = await begin(client, headers)
    state = params['state'][0]
    await client.get('/api/v1/creators/me', headers=other)
    calls, _ = provider(monkeypatch)
    for owner, nonce in ((other, state), (headers, 'x' * 43)):
        assert (await client.post(BASE + '/callback', headers=owner, json={'code': 'code', 'state': nonce})).status_code == 403
    monkeypatch.setattr(settings, 'X_CLIENT_ID', 'different-client')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    monkeypatch.setattr(settings, 'X_CLIENT_ID', 'x-client')
    creator = await creator_for(client, headers, db_session)
    creator.social_credentials = {'_x_flow': {**creator.social_credentials['_x_flow'], 'expires_at': time.time() - 1}}
    await db_session.commit()
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert not calls


@pytest.mark.asyncio
async def test_manual_handle_must_match_and_reconnect_rejects_different_id(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    await client.patch(SOCIALS + '/x', headers=headers, json={'handle': 'example'})
    params = await begin(client, headers, 'example')
    _, control = provider(monkeypatch)
    control['username'] = 'someoneelse'
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 403
    assert (await client.get(SOCIALS, headers=headers)).json()[0]['is_verified'] is False
    control['username'] = 'example'
    params = await begin(client, headers, 'example')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 200
    params = await begin(client, headers, 'example')
    control['id'] = '789'
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 403


@pytest.mark.asyncio
async def test_deduplication_username_change_and_removal(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    calls, control = provider(monkeypatch)
    for _ in range(2):
        params = await begin(client, headers)
        assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 200
    assert len((await client.get(SOCIALS, headers=headers)).json()) == 1
    control['username'] = 'newname'
    params = await begin(client, headers, 'example')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 200
    assert (await client.get(SOCIALS, headers=headers)).json()[0]['handle'] == 'newname'
    creator = await creator_for(client, headers, db_session)
    assert 'x:example' not in creator.social_credentials and 'x:newname' in creator.social_credentials
    params = await begin(client, headers, 'newname')
    await client.delete(SOCIALS + '/x?expected_handle=newname', headers=headers)
    count = len(calls)
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': params['state'][0]})).status_code == 403
    assert len(calls) == count and (await client.get(SOCIALS, headers=headers)).json() == []


def test_missing_and_invalid_metrics_do_not_become_zero():
    for value in (None, True, -1, '12', 9007199254740992):
        result = snapshot({'public_metrics': {'followers_count': value}, 'username': 'example'}, 'example')
        assert result['followers'] is None and result['followersAvailable'] is False
    result = snapshot({'public_metrics': {'tweet_count': 0}}, 'example')
    assert result['postCount'] == 0


@pytest.mark.asyncio
async def test_unconfigured_is_explicit(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, 'X_CLIENT_ID', '')
    response = await client.post(BASE + '/connect', headers=auth_headers(), json={})
    assert response.status_code == 503 and response.json()['error']['code'] == 'X_NOT_CONFIGURED'
