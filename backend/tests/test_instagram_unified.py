import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet
from app.core.config import settings
from app.domains.creators.models import Creator
from test_instagram_connection import begin, BASE, SOCIALS


@pytest.fixture
def unified(monkeypatch):
    key = Fernet.generate_key().decode()
    values = {'INSTAGRAM_LOGIN_MODE': 'unified', 'INSTAGRAM_CONFIG_ID': '1165832983065314',
        'INSTAGRAM_APP_ID': '12345', 'INSTAGRAM_APP_SECRET': 'private-app-secret',
        'INSTAGRAM_API_VERSION': 'v26.0', 'INSTAGRAM_REDIRECT_URI': 'https://preview.test/api/social/instagram/callback',
        'SOCIAL_TOKEN_ENCRYPTION_KEY': key}
    for name, value in values.items():
        monkeypatch.setattr(settings, name, value)
    return key


def provider(monkeypatch, mode='ok'):
    calls = []
    previous = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if not str(url).startswith('https://graph.facebook.com/'):
            return await previous(self, method, url, **kwargs)
        calls.append((str(url), kwargs))
        path = urlparse(str(url)).path
        if mode == 'revoked':
            return httpx.Response(400, json={'error': {'message': 'private-app-secret suat-token'}})
        if path.endswith('/oauth/access_token'):
            assert set(kwargs['params']) == {'client_id', 'client_secret', 'redirect_uri', 'code'}
            return httpx.Response(200, json={'access_token': 'suat-token'})
        if path.endswith('/debug_token'):
            assert kwargs['headers']['Authorization'] == 'Bearer 12345|private-app-secret'
            assert kwargs['params']['input_token'] == 'suat-token'
            targets = [] if mode in ('empty_targets', 'mismatch') else ['123']
            return httpx.Response(200, json={'data': {'is_valid': True, 'granular_scopes': [
                {'scope': 'instagram_basic', 'target_ids': targets},
            ]}})
        assert kwargs['headers']['Authorization'] == 'Bearer suat-token'
        assert len(kwargs['params']['appsecret_proof']) == 64
        if path.endswith('/456/owned_instagram_accounts'):
            if mode == 'owned':
                return httpx.Response(200, json={'data': [{'id': '123'}]})
            return httpx.Response(400, json={'error': {'message': 'not available'}})
        if path.endswith('/assigned_instagram_accounts'):
            if mode in ('empty', 'empty_targets', 'owned'):
                return httpx.Response(200, json={'data': []})
            username = 'someone_else' if mode == 'mismatch' else 'example'
            return httpx.Response(200, json={'data': [{'id': '123', 'username': username}]})
        if path.endswith('/me/permissions'):
            return httpx.Response(200, json={'data': [
                {'permission': 'instagram_basic', 'status': 'granted'},
                {'permission': 'instagram_manage_messages', 'status': 'declined'},
            ]})
        if path.endswith('/me'):
            return httpx.Response(200, json={} if mode == 'no_business' else {'client_business_id': '456', 'id': '999'})
        assert path.endswith('/123')
        return httpx.Response(200, json={'id': '999' if mode == 'wrong_id' else '123', 'username': 'example', 'followers_count': 0, 'follows_count': 7, 'media_count': 3})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls


@pytest.mark.asyncio
async def test_login_matches_meta_generated_url(client, auth_headers, unified):
    headers = auth_headers()
    await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': 'example'})
    response = await client.post(BASE + '/connect', headers=headers, json={'handle': 'example'})
    url = urlparse(response.json()['url'])
    params = parse_qs(url.query)
    assert url.scheme == 'https' and url.netloc == 'www.facebook.com' and url.path == '/dialog/oauth'
    assert params['config_id'] == ['1165832983065314']
    assert params['response_type'] == ['code']
    assert params['prompt'] == ['login']
    assert 'display' not in params  # Full-tab navigation must not request popup rendering.
    assert 'scope' not in params
    assert 'private-app-secret' not in response.text


@pytest.mark.asyncio
async def test_business_and_assigned_account_verified_and_token_encrypted(client, auth_headers, db_session, unified, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'provider-code', 'state': state})
    assert response.status_code == 200, response.text
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    credential = creator.social_credentials['example']
    assert credential['business_id'] == '456'
    assert credential['account_id'] == '123'
    assert credential['mode'] == 'unified' and credential['expires_at'] is None
    assert credential['config_id'] == '1165832983065314'
    assert Fernet(unified.encode()).decrypt(credential['encrypted_token'].encode()).decode() == 'suat-token'
    assert 'suat-token' not in str(creator.social_credentials)
    assert len(calls) == 4
    stats = await client.get(BASE + '/stats?handle=example', headers=headers)
    assert stats.json()['followers'] == 0 and stats.json()['connected']
    assert len(calls) == 4
    # Non-expiring tokens still fetch fresh data; /me is never treated as the IG profile.
    creator.social_credentials = {'example': {**credential, 'fetched_at': int(time.time()) - 301}}
    await db_session.commit()
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 200
    assert calls[-1][0].endswith('/123')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'provider-code', 'state': state})).status_code == 403
    assert 'social_credentials' not in (await client.get('/api/v1/creators/me', headers=headers)).text
    await client.delete(BASE + '/connection?handle=example', headers=headers)
    assert (await client.get(BASE + '/stats?handle=example', headers=headers)).status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize('mode', ['mismatch', 'no_business', 'wrong_id', 'revoked'])
async def test_invalid_grant_never_verifies_or_leaks_secrets(client, auth_headers, unified, monkeypatch, mode):
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch, mode)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code in (403, 409)
    if mode == 'mismatch':
        assert response.json()['error']['code'] == 'INSTAGRAM_ACCOUNT_NOT_SHARED'
    assert 'suat-token' not in response.text and 'private-app-secret' not in response.text
    assert not (await client.get(SOCIALS, headers=headers)).json()[0]['is_verified']
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403


@pytest.mark.asyncio
async def test_changed_configuration_rejects_old_flow_before_provider(client, auth_headers, unified, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls = provider(monkeypatch)
    monkeypatch.setattr(settings, 'INSTAGRAM_CONFIG_ID', '99999')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 403
    assert calls == []


@pytest.mark.asyncio
async def test_discover_and_add_accounts_without_manual_username(client, auth_headers, db_session, unified, monkeypatch):
    headers = auth_headers()
    provider(monkeypatch)
    previous = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if str(url).endswith('/789'):
            return httpx.Response(200, json={'id': '789', 'username': 'second', 'followers_count': 12})
        response = await previous(self, method, url, **kwargs)
        if str(url).endswith('/assigned_instagram_accounts'):
            data = response.json()
            data['data'].append({'id': '789', 'username': 'second'})
            return httpx.Response(200, json=data)
        return response
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    for _ in range(2):
        response = await client.post(BASE + '/connect', headers=headers, json={})
        assert response.status_code == 200
        state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
        # Another account update must preserve pending Instagram discovery.
        await client.patch(SOCIALS + '/youtube', headers=headers, json={'handle': 'example'})
        response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
        assert response.status_code == 200, response.text
        assert response.json()['handles'] == ['example', 'second']
    accounts = (await client.get(SOCIALS, headers=headers)).json()
    assert len(accounts) == 3
    assert all(a['is_verified'] for a in accounts if a['platform'] == 'instagram')
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    assert creator.social_credentials['example']['account_id'] == '123'
    assert creator.social_credentials['second']['account_id'] == '789'
    assert creator.instagram_handle == 'example'


@pytest.mark.asyncio
async def test_failed_discovery_does_not_create_account(client, auth_headers, unified, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'no_business')
    assert (await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})).status_code == 409
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_empty_assignment_records_only_safe_permission_diagnostic(client, auth_headers, db_session, unified, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'empty_targets')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 403
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    diagnostic = creator.social_credentials['_flow']['diagnostic'][0]
    assert diagnostic == {'assigned_count': 0, 'missing_username_count': 0,
        'granted_permissions': ['instagram_basic'], 'declined_permissions': ['instagram_manage_messages'],
        'business_account_count': 0, 'granular_target_count': 0}
    assert 'suat-token' not in str(creator.social_credentials)


@pytest.mark.asyncio
async def test_empty_assignment_uses_authorized_granular_target(client, auth_headers, unified, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'empty')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 200, response.text
    assert response.json()['handles'] == ['example']
    assert (await client.get(SOCIALS, headers=headers)).json() == [
        {'platform': 'instagram', 'handle': 'example', 'is_verified': True}]


@pytest.mark.asyncio
async def test_explicit_account_id_is_verified_when_meta_discovery_is_empty(client, auth_headers, db_session, unified, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={'account_id': '123'})
    assert response.status_code == 200
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    assert creator.social_credentials['_flow']['account_id'] == '123'
    calls = provider(monkeypatch, 'empty_targets')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 200, response.text
    assert response.json()['handles'] == ['example']
    assert (await client.get(SOCIALS, headers=headers)).json() == [
        {'platform': 'instagram', 'handle': 'example', 'is_verified': True}]
    assert any(url.endswith('/123') for url, _ in calls)
    assert not any(url.endswith('/assigned_instagram_accounts') for url, _ in calls)


@pytest.mark.asyncio
async def test_explicit_account_id_must_be_numeric_and_match_provider(client, auth_headers, unified, monkeypatch):
    headers = auth_headers()
    assert (await client.post(BASE + '/connect', headers=headers, json={'account_id': 'abc'})).status_code == 422
    response = await client.post(BASE + '/connect', headers=headers, json={'account_id': '123'})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'wrong_id')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 403
    assert response.json()['error']['code'] == 'INSTAGRAM_ACCOUNT_MISMATCH'


@pytest.mark.asyncio
async def test_empty_assignment_uses_portfolio_owned_account(client, auth_headers, unified, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'owned')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 200, response.text
    assert response.json()['handles'] == ['example']


@pytest.mark.asyncio
@pytest.mark.parametrize('with_handle', [False, True])
async def test_assigned_account_without_username_is_resolved_by_authorized_id(client, auth_headers, unified, monkeypatch, with_handle):
    headers = auth_headers()
    if with_handle:
        state = await begin(client, headers)
    else:
        response = await client.post(BASE + '/connect', headers=headers, json={})
        state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch)
    previous = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if str(url).endswith('/assigned_instagram_accounts'):
            return httpx.Response(200, json={'data': [{'id': '123'}]})
        return await previous(self, method, url, **kwargs)
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 200, response.text
    assert response.json()['handles'] == ['example']
    accounts = (await client.get(SOCIALS, headers=headers)).json()
    assert accounts == [{'platform': 'instagram', 'handle': 'example', 'is_verified': True}]


@pytest.mark.asyncio
async def test_authorization_failure_records_safe_diagnostics(client, auth_headers, db_session, unified, monkeypatch):
    headers = auth_headers()
    response = await client.post(BASE + '/connect', headers=headers, json={})
    state = parse_qs(urlparse(response.json()['url']).query)['state'][0]
    provider(monkeypatch, 'revoked')
    response = await client.post(BASE + '/callback', headers=headers, json={'code': 'code', 'state': state})
    assert response.status_code == 409
    creator = await db_session.get(Creator, (await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    flow = creator.social_credentials['_flow']
    assert flow['status'] == 'failed'
    assert flow['diagnostic'] == [{'stage': 'token_exchange'}]
    assert 'private-app-secret' not in response.text + str(flow)
    assert 'suat-token' not in response.text + str(flow)
    assert (await client.get(SOCIALS, headers=headers)).json() == []
