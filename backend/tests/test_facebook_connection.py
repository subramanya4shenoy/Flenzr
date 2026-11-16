import hashlib
import hmac
import json
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet

from app.core.config import settings
from app.domains.creators.models import Creator
from app.domains.creators.facebook_connection import snapshot

BASE = '/api/v1/creators/me/facebook'
SOCIALS = '/api/v1/creators/me/social-accounts'


@pytest.fixture
def configured(monkeypatch):
    key = Fernet.generate_key().decode()
    for name, value in {'FACEBOOK_APP_ID': '', 'FACEBOOK_APP_SECRET': '', 'INSTAGRAM_APP_ID': 'meta-app',
        'INSTAGRAM_APP_SECRET': 'private-secret', 'FACEBOOK_CONFIG_ID': '12345', 'INSTAGRAM_CONFIG_ID': '99999',
        'FACEBOOK_REDIRECT_URI': 'https://preview.test/api/social/facebook/callback',
        'FACEBOOK_API_VERSION': 'v26.0', 'SOCIAL_TOKEN_ENCRYPTION_KEY': key}.items():
        monkeypatch.setattr(settings, name, value)
    return Fernet(key.encode())


async def creator_for(client, headers, db):
    cid = (await client.get('/api/v1/creators/me', headers=headers)).json()['id']
    return await db.get(Creator, cid)


async def begin(client, headers, handle=None):
    await client.get('/api/v1/creators/me', headers=headers)
    response = await client.post(BASE + '/connect', headers=headers, json={'handle': handle} if handle else {})
    assert response.status_code == 200, response.text
    url = urlparse(response.json()['url'])
    params = parse_qs(url.query)
    assert url.netloc == 'www.facebook.com' and url.path == '/dialog/oauth'
    assert params['config_id'] == ['12345'] and params['client_id'] == ['meta-app']
    assert params['response_type'] == ['code'] and params['override_default_response_type'] == ['true']
    assert params['redirect_uri'] == [settings.FACEBOOK_REDIRECT_URI]
    assert 'scope' not in params and 'private-secret' not in response.text
    return params['state'][0]


def provider(monkeypatch, ids=('101',)):
    calls = []
    control = {'ids': list(ids), 'fail': None, 'declined': False, 'expiry': 3600}
    original = httpx.AsyncClient.request
    async def request(self, method, url, **kwargs):
        if not str(url).startswith('https://graph.facebook.com/'):
            return await original(self, method, url, **kwargs)
        path = str(url).split('/v26.0/')[1]
        params = kwargs.get('params', {})
        calls.append((path, kwargs))
        if path == control['fail']:
            return httpx.Response(400, json={'error': {'message': 'private-secret private-page-token', 'code': 200, 'error_subcode': 201}})
        if path == 'oauth/access_token':
            if params.get('grant_type') == 'fb_exchange_token':
                assert params['fb_exchange_token'] == 'private-short-user-token'
                return httpx.Response(200, json={'access_token': 'private-long-user-token', 'expires_in': control['expiry']})
            assert params['code'] == 'provider-code' and params['client_secret'] == 'private-secret'
            return httpx.Response(200, json={'access_token': 'private-short-user-token'})
        token = 'private-long-user-token' if path.startswith('me/') else 'private-page-token-' + path
        assert kwargs['headers']['Authorization'] == 'Bearer ' + token
        assert params['appsecret_proof'] == hmac.new(b'private-secret', token.encode(), hashlib.sha256).hexdigest()
        if path == 'me/permissions':
            return httpx.Response(200, json={'data': [{'permission': p, 'status': 'declined' if control['declined'] else 'granted'} for p in ['pages_show_list', 'pages_read_engagement']]})
        if path == 'me/accounts':
            return httpx.Response(200, json={'data': [{'id': page_id, 'name': 'Page ' + page_id, 'access_token': 'private-page-token-' + page_id} for page_id in control['ids']]})
        assert path in control['ids']
        return httpx.Response(200, json={'id': path, 'name': 'Page ' + path, 'category': 'Creator', 'followers_count': 0, 'fan_count': 0,
            'has_transitioned_to_new_page_experience': False, 'picture': {'data': {'url': 'https://scontent.xx.fbcdn.net/photo.jpg'}}})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls, control


async def complete(client, headers, state):
    return await client.post(BASE + '/callback', headers=headers, json={'code': 'provider-code', 'state': state})


@pytest.mark.asyncio
async def test_single_page_autoimport_encryption_cache_disconnect_remove(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls, _ = provider(monkeypatch)
    response = await complete(client, headers, state)
    assert response.status_code == 200, response.text
    assert response.json() == {'connected': True, 'handles': ['101']}
    creator = await creator_for(client, headers, db_session)
    stored = creator.social_credentials
    assert '_facebook_flow' not in stored
    assert configured.decrypt(stored['facebook:101']['encrypted_token'].encode()) == b'private-page-token-101'
    assert 'private-' not in json.dumps(stored)
    listing = await client.get(SOCIALS, headers=headers)
    account = listing.json()[0]
    assert account['platform'] == 'facebook' and account['handle'] == '101'
    assert account['display_name'] == 'Page 101' and account['connected'] and account['is_verified']
    for _ in range(2):
        stats = await client.get(BASE + '/stats?handle=101', headers=headers)
        assert stats.status_code == 200 and stats.json()['followers'] == 0 and stats.json()['likes'] == 0
    assert len(calls) == 5
    assert 'private-' not in response.text + listing.text + stats.text
    await client.patch(SOCIALS + '/instagram', headers=headers, json={'handle': 'example'})
    assert 'facebook:101' in creator.social_credentials
    assert (await client.delete(BASE + '/connection?handle=101', headers=headers)).status_code == 200
    assert (await client.get(BASE + '/stats?handle=101', headers=headers)).status_code == 409
    account = next(a for a in (await client.get(SOCIALS, headers=headers)).json() if a['platform'] == 'facebook')
    assert account['connected'] is False
    assert (await complete(client, headers, await begin(client, headers, '101'))).status_code == 200
    assert sum(a['platform'] == 'facebook' for a in (await client.get(SOCIALS, headers=headers)).json()) == 1
    await client.delete(SOCIALS + '/facebook?expected_handle=101', headers=headers)
    assert 'facebook:101' not in creator.social_credentials


@pytest.mark.asyncio
async def test_multiple_pages_explicit_selection_owner_replay_subset(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls, _ = provider(monkeypatch, ('101', '202', '303'))
    assert (await complete(client, headers, state)).json() == {'selectionRequired': True}
    assert (await client.get(SOCIALS, headers=headers)).json() == []
    pending = await client.get(BASE + '/pending-pages', headers=headers)
    data = pending.json()
    assert 'token' not in pending.text and 'private-' not in pending.text
    assert {p['id'] for p in data['pages']} == {'101', '202', '303'}
    creator = await creator_for(client, headers, db_session)
    assert configured.decrypt(creator.social_credentials['_facebook_flow']['pages'][0]['encrypted_token'].encode()) == b'private-page-token-101'
    body = {'selection_id': data['selectionId'], 'page_ids': ['202']}
    other = auth_headers('other-owner', 'other@example.test')
    await creator_for(client, other, db_session)
    assert (await client.post(BASE + '/select', headers=other, json=body)).status_code == 403
    assert (await client.post(BASE + '/select', headers=headers, json={**body, 'page_ids': ['999']})).status_code == 403
    assert (await client.post(BASE + '/select', headers=headers, json={**body, 'selection_id': 'x' * 43})).status_code == 403
    assert (await client.post(BASE + '/select', headers=headers, json={**body, 'page_ids': ['202', '202']})).status_code == 422
    assert (await client.post(BASE + '/select', headers=headers, json=body)).status_code == 200
    assert [path for path, _ in calls if path.isdigit()] == ['202']
    creator = await creator_for(client, headers, db_session)
    assert set(creator.social_credentials) == {'facebook:202'}
    assert (await client.post(BASE + '/select', headers=headers, json=body)).status_code == 403
    assert (await complete(client, headers, state)).status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize('failure,expected', [('me/permissions', 'FACEBOOK_AUTHORIZATION_FAILED'), ('declined', 'FACEBOOK_PERMISSION_REQUIRED'), ('empty', 'FACEBOOK_NO_PAGES'), ('expiry', 'FACEBOOK_USER_LOGIN_REQUIRED'), ('101', 'FACEBOOK_AUTHORIZATION_FAILED')])
async def test_failures_no_partial_accounts_safe_diagnostics(client, auth_headers, db_session, configured, monkeypatch, failure, expected):
    headers = auth_headers()
    state = await begin(client, headers)
    _, control = provider(monkeypatch)
    if failure == 'declined': control['declined'] = True
    elif failure == 'empty': control['ids'] = []
    elif failure == 'expiry': control['expiry'] = 0
    else: control['fail'] = failure
    response = await complete(client, headers, state)
    assert response.status_code == 409, response.text
    assert response.json()['error']['code'] == expected
    assert 'private-' not in response.text
    creator = await creator_for(client, headers, db_session)
    flow = creator.social_credentials['_facebook_flow']
    assert flow['status'] == 'failed' and 'pages' not in flow
    assert 'private-' not in json.dumps(flow)
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_batch_profile_failure_rolls_back_all_pages(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    _, control = provider(monkeypatch, ('101', '202'))
    await complete(client, headers, state)
    pending = (await client.get(BASE + '/pending-pages', headers=headers)).json()
    control['fail'] = '202'
    response = await client.post(BASE + '/select', headers=headers, json={'selection_id': pending['selectionId'], 'page_ids': ['101', '202']})
    assert response.status_code == 409
    assert (await client.get(SOCIALS, headers=headers)).json() == []
    creator = await creator_for(client, headers, db_session)
    assert not any(key.startswith('facebook:') for key in creator.social_credentials)
    assert 'pages' not in creator.social_credentials['_facebook_flow']


@pytest.mark.asyncio
async def test_changed_config_cancel_and_expiry(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    calls, _ = provider(monkeypatch, ('101', '202'))
    creator = await creator_for(client, headers, db_session)
    assert creator.social_credentials['_facebook_flow']['hash'] == hashlib.sha256(state.encode()).hexdigest()
    monkeypatch.setattr(settings, 'FACEBOOK_CONFIG_ID', '23456')
    assert (await complete(client, headers, state)).status_code == 403 and calls == []
    monkeypatch.setattr(settings, 'FACEBOOK_CONFIG_ID', '12345')
    await complete(client, headers, state)
    assert (await client.delete(BASE + '/pending-pages', headers=headers)).status_code == 200
    assert '_facebook_flow' not in creator.social_credentials
    assert (await client.get(BASE + '/pending-pages', headers=headers)).status_code == 403
    state = await begin(client, headers)
    creator.social_credentials = {'_facebook_flow': {**creator.social_credentials['_facebook_flow'], 'expires_at': 0}}
    await db_session.commit()
    assert (await complete(client, headers, state)).status_code == 403


@pytest.mark.asyncio
async def test_reconnect_mismatch_expired_stats(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    state = await begin(client, headers)
    _, control = provider(monkeypatch)
    await complete(client, headers, state)
    state = await begin(client, headers, '101')
    control['ids'] = ['202']
    assert (await complete(client, headers, state)).status_code == 403
    creator = await creator_for(client, headers, db_session)
    old = creator.social_credentials['facebook:101']
    creator.social_credentials = {'facebook:101': {**old, 'expires_at': 0}}
    await db_session.commit()
    assert (await client.get(BASE + '/stats?handle=101', headers=headers)).status_code == 409
    assert (await client.get(SOCIALS, headers=headers)).json()[0]['connected'] is False


def test_metrics_missing_values_and_new_pages_likes():
    new = snapshot({'id': '101', 'followers_count': 10, 'fan_count': 10, 'has_transitioned_to_new_page_experience': True})
    assert new['likes'] is None and not new['likesAvailable'] and new['followers'] == 10
    unknown = snapshot({'id': '101', 'followers_count': True, 'fan_count': 20})
    assert unknown['followers'] is None and unknown['likes'] is None
    assert snapshot({'id': '101', 'picture': {'data': None}})['avatarUrl'] is None


@pytest.mark.asyncio
async def test_late_selection_cannot_restore_cancelled_flow(client, auth_headers, db_session, configured, monkeypatch):
    from app.domains.creators import facebook_connection as connection
    headers = auth_headers()
    state = await begin(client, headers)
    provider(monkeypatch, ('101', '202'))
    await complete(client, headers, state)
    pending = (await client.get(BASE + '/pending-pages', headers=headers)).json()
    original = connection.read_page
    async def read_then_replace(*args):
        result = await original(*args)
        creator = await creator_for(client, headers, db_session)
        creator.social_credentials = {}
        await db_session.commit()
        return result
    monkeypatch.setattr(connection, 'read_page', read_then_replace)
    response = await client.post(BASE + '/select', headers=headers, json={'selection_id': pending['selectionId'], 'page_ids': ['101']})
    assert response.status_code == 403
    assert (await client.get(SOCIALS, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_configuration_fails_closed(client, auth_headers, configured, monkeypatch):
    headers = auth_headers()
    await client.get('/api/v1/creators/me', headers=headers)
    monkeypatch.setattr(settings, 'FACEBOOK_APP_ID', 'separate-app-without-secret')
    response = await client.post(BASE + '/connect', headers=headers, json={})
    assert response.status_code == 503 and response.json()['error']['code'] == 'FACEBOOK_NOT_CONFIGURED'
    monkeypatch.setattr(settings, 'FACEBOOK_APP_ID', '')
    monkeypatch.setattr(settings, 'FACEBOOK_CONFIG_ID', '')
    assert (await client.post(BASE + '/connect', headers=headers, json={})).status_code == 503


@pytest.mark.asyncio
async def test_discovery_paginates_using_fixed_graph_path(monkeypatch, configured):
    from app.domains.creators.facebook_connection import discover_pages
    calls = []
    async def request(self, method, url, **kwargs):
        calls.append((str(url), kwargs))
        if str(url).endswith('me/permissions'):
            return httpx.Response(200, json={'data': [{'permission': p, 'status': 'granted'} for p in ['pages_show_list', 'pages_read_engagement']]})
        assert str(url) == 'https://graph.facebook.com/v26.0/me/accounts'
        page = '202' if kwargs['params'].get('after') else '101'
        result = {'data': [{'id': page, 'name': page, 'access_token': 'private-page-token'}]}
        if page == '101':
            result['paging'] = {'next': 'https://untrusted.example/never-follow-this', 'cursors': {'after': 'cursor-two'}}
        return httpx.Response(200, json=result)
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    async with httpx.AsyncClient() as client:
        pages = await discover_pages(client, 'private-user-token', 'private-secret', configured, 9999999999)
    assert [p['id'] for p in pages] == ['101', '202'] and len(calls) == 3
    assert 'private-' not in json.dumps(pages)
