import json
import time
import httpx
import pytest
from cryptography.fernet import Fernet
from app.core.config import settings
from app.domains.creators import recent_engagement as module
from app.domains.creators.models import Creator
from app.domains.creators.socials import SocialAccountRead, store_accounts

BASE = '/api/v1/creators/me/recent-engagement'

@pytest.fixture
def configured(monkeypatch):
    key = Fernet.generate_key()
    for name, value in {'SOCIAL_TOKEN_ENCRYPTION_KEY': key.decode(), 'FACEBOOK_APP_ID': 'app', 'FACEBOOK_APP_SECRET': 'private-secret', 'FACEBOOK_CONFIG_ID': '123', 'FACEBOOK_REDIRECT_URI': 'https://preview.test/api/social/facebook/callback', 'INSTAGRAM_APP_SECRET': 'private-secret'}.items():
        monkeypatch.setattr(settings, name, value)
    async def authorized(**kwargs): return {'connected': True}
    for platform in module.HANDLERS: monkeypatch.setitem(module.HANDLERS, platform, authorized)
    return Fernet(key)

async def seed(client, headers, db, cipher, platform):
    cid = (await client.get('/api/v1/creators/me', headers=headers)).json()['id']
    creator = await db.get(Creator, cid)
    key = 'example' if platform == 'instagram' else platform + ':example'
    creator.social_credentials = {key: {'encrypted_token': cipher.encrypt(b'private-token').decode(), 'account_id': '101', 'mode': 'unified', 'expires_at': int(time.time()) + 3600}}
    store_accounts(creator, [SocialAccountRead(platform=platform, handle='example', is_verified=True)])
    await db.commit()
    return creator, key

def provider(monkeypatch, platform):
    original = httpx.AsyncClient.request
    control = {'fail': False, 'missing': False, 'private': False, 'wrong_owner': False}
    calls = []
    async def request(self, method, url, **kwargs):
        if not str(url).startswith(('https://graph.', 'https://api.x.com', 'https://www.googleapis.com')): return await original(self, method, url, **kwargs)
        calls.append(str(url))
        assert kwargs['headers']['Authorization'] == 'Bearer private-token'
        if control['fail']: return httpx.Response(403, json={'error': {'message': 'private-token private-secret'}})
        if platform == 'youtube':
            if str(url).endswith('/channels'): data = {'items': [{'id': '101', 'contentDetails': {'relatedPlaylists': {'uploads': 'uploads-101'}}}]}
            elif str(url).endswith('/playlistItems'): data = {'items': [{'contentDetails': {'videoId': 'video-1'}}]}
            else: data = {'items': [{'id': 'video-1', 'snippet': {'channelId': 'other' if control['wrong_owner'] else '101'}, 'status': {'privacyStatus': 'private' if control['private'] else 'public'}, 'statistics': {'likeCount': '7', **({} if control['missing'] else {'commentCount': '3'})}}]}
        elif platform == 'x':
            assert kwargs['params']['exclude'] == 'retweets,replies'
            data = {'data': [{'id': 'post-1', 'author_id': 'other' if control['wrong_owner'] else '101', 'public_metrics': {'like_count': 7, **({} if control['missing'] else {'reply_count': 3})}}]}
        elif platform == 'instagram':
            assert '/101/media' in str(url) and kwargs['params']['limit'] == 10
            data = {'data': [{'id': 'post-1', 'like_count': 7, **({} if control['missing'] else {'comments_count': 3})}]}
        else:
            assert '/101/published_posts' in str(url)
            data = {'data': [{'id': 'post-1', 'reactions': {'summary': {'total_count': 7}}, **({} if control['missing'] else {'comments': {'summary': {'total_count': 3}}})}]}
        return httpx.Response(200, json=data)
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    return calls, control

@pytest.mark.asyncio
@pytest.mark.parametrize('platform', ['instagram', 'youtube', 'facebook'])
async def test_metrics_cache_owner_and_removal(client, auth_headers, db_session, configured, monkeypatch, platform):
    headers = auth_headers()
    creator, key = await seed(client, headers, db_session, configured, platform)
    calls, _ = provider(monkeypatch, platform)
    params = {'platform': platform, 'handle': 'example'}
    response = await client.post(BASE, params=params, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data['total'] == 10 and data['likes'] == 7 and data['comments'] == 3
    assert data['postsRead'] == data['measuredPosts'] == 1
    assert 'private-' not in response.text + json.dumps(creator.social_credentials[key]['recent_engagement'])
    count = len(calls)
    assert (await client.get(BASE, params=params, headers=headers)).json() == data and len(calls) == count
    other = auth_headers('other-owner', 'other@example.test')
    await client.get('/api/v1/creators/me', headers=other)
    assert (await client.post(BASE, params=params, headers=other)).status_code == 403
    await client.delete('/api/v1/creators/me/social-accounts/' + platform + '?expected_handle=example', headers=headers)
    assert (await client.post(BASE, params=params, headers=headers)).status_code == 403

@pytest.mark.asyncio
@pytest.mark.parametrize('platform', ['instagram', 'youtube', 'facebook'])
async def test_missing_counts_and_safe_errors(client, auth_headers, db_session, configured, monkeypatch, platform):
    headers = auth_headers()
    creator, key = await seed(client, headers, db_session, configured, platform)
    _, control = provider(monkeypatch, platform)
    control['missing'] = True
    params = {'platform': platform, 'handle': 'example'}
    response = await client.post(BASE, params=params, headers=headers)
    assert response.status_code == 200 and response.json()['total'] is None
    assert response.json()['postsRead'] == 1 and response.json()['measuredPosts'] == 0
    creator.social_credentials = {key: {**creator.social_credentials[key], 'recent_engagement': None}}
    await db_session.commit()
    control['fail'] = True
    response = await client.post(BASE, params=params, headers=headers)
    assert response.status_code == 409 and 'private-' not in response.text

@pytest.mark.asyncio
async def test_linkedin_unsupported_and_late_removal(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    await seed(client, headers, db_session, configured, 'linkedin')
    response = await client.post(BASE, params={'platform': 'linkedin', 'handle': 'example'}, headers=headers)
    assert response.json()['status'] == 'unsupported' and response.json()['total'] is None
    creator, _ = await seed(client, headers, db_session, configured, 'instagram')
    async def removed(*args):
        store_accounts(creator, [])
        await db_session.commit()
        return []
    monkeypatch.setattr(module, 'read_posts', removed)
    response = await client.post(BASE, params={'platform': 'instagram', 'handle': 'example'}, headers=headers)
    assert response.status_code == 403 and creator.social_credentials == {}

@pytest.mark.asyncio
@pytest.mark.parametrize('private,wrong_owner,expected', [(True, False, 200), (False, True, 403)])
async def test_private_uploads_and_foreign_channels(client, auth_headers, db_session, configured, monkeypatch, private, wrong_owner, expected):
    headers = auth_headers()
    await seed(client, headers, db_session, configured, 'youtube')
    _, control = provider(monkeypatch, 'youtube')
    control.update(private=private, wrong_owner=wrong_owner)
    response = await client.post(BASE, params={'platform': 'youtube', 'handle': 'example'}, headers=headers)
    assert response.status_code == expected
    if private: assert response.json()['postsRead'] == 0 and response.json()['total'] == 0

def test_zero_vs_missing_and_invalid_counts():
    assert module.post('1', None, 0, '0')['total'] == 0
    for missing in (True, -1, None, 9007199254740992): assert module.post('1', None, missing, 10)['total'] is None


@pytest.mark.asyncio
async def test_facebook_missing_post_permission_has_specific_safe_error(monkeypatch):
    async def request(self, method, url, **kwargs):
        return httpx.Response(400, json={'error': {'code': 10, 'message': "private-token This endpoint requires the 'pages_read_user_content' permission."}})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    from app.core.exceptions import FlenzrException
    async with httpx.AsyncClient() as client:
        with pytest.raises(FlenzrException) as caught:
            await module.request(client, 'https://graph.facebook.com/v26.0/101/published_posts', {}, {})
    error = caught.value
    assert error.code == 'FACEBOOK_POST_PERMISSION_REQUIRED' and error.status_code == 409
    assert error.details == [{'required_permission': 'pages_read_user_content', 'provider_code': 10}]
    assert 'private-token' not in str(error) + str(error.details)


@pytest.mark.asyncio
@pytest.mark.parametrize('status,expected', [(402, 'X_BILLING_REQUIRED'), (429, 'X_RATE_LIMITED')])
async def test_x_billing_is_distinct_from_rate_limits(monkeypatch, status, expected):
    async def request(self, method, url, **kwargs):
        return httpx.Response(status, json={'detail': 'private-token private-billing-information'})
    monkeypatch.setattr(httpx.AsyncClient, 'request', request)
    from app.core.exceptions import FlenzrException
    async with httpx.AsyncClient() as client:
        with pytest.raises(FlenzrException) as caught:
            await module.request(client, 'https://api.x.com/2/users/101/tweets', {}, {})
    error = caught.value
    assert error.code == expected and error.status_code == 503
    assert 'private-' not in str(error) + str(error.details)


@pytest.mark.asyncio
async def test_saved_reads_never_contact_provider_and_survive_age(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    creator, key = await seed(client, headers, db_session, configured, 'instagram')
    async def forbidden(**kwargs):
        raise AssertionError('Saved reads must not validate or refresh against a provider')
    monkeypatch.setitem(module.HANDLERS, 'instagram', forbidden)
    params = {'platform': 'instagram', 'handle': 'example'}
    response = await client.get(BASE, params=params, headers=headers)
    assert response.status_code == 200 and response.json()['status'] == 'not_refreshed'
    saved = module.summarize('instagram', 'example', [module.post('1', None, 7, 3)])
    saved['fetchedAt'] = 1
    creator.social_credentials = {key: {**creator.social_credentials[key], 'recent_engagement': saved}}
    await db_session.commit()
    response = await client.get(BASE, params=params, headers=headers)
    assert response.json() == saved


@pytest.mark.asyncio
async def test_manual_refresh_retrieves_again_and_preserves_last_success_on_failure(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    await seed(client, headers, db_session, configured, 'instagram')
    calls, control = provider(monkeypatch, 'instagram')
    params = {'platform': 'instagram', 'handle': 'example'}
    assert (await client.post(BASE, params=params, headers=headers)).status_code == 200
    response = await client.post(BASE, params=params, headers=headers)
    assert response.status_code == 200 and len(calls) == 2
    saved = response.json()
    control['fail'] = True
    assert (await client.post(BASE, params=params, headers=headers)).status_code == 409
    assert (await client.get(BASE, params=params, headers=headers)).json() == saved


@pytest.mark.asyncio
async def test_x_public_refresh_never_uses_paid_api_or_token_refresh(client, auth_headers, db_session, configured, monkeypatch):
    headers = auth_headers()
    creator, key = await seed(client, headers, db_session, configured, 'x')
    monkeypatch.setattr(settings, 'SOCIAL_TOKEN_ENCRYPTION_KEY', '')
    async def paid_forbidden(**kwargs):
        raise AssertionError('Public post reads must never invoke paid profile or token APIs')
    monkeypatch.setitem(module.HANDLERS, 'x', paid_forbidden)
    calls = []
    async def public(client, handle):
        calls.append(handle)
        return [module.post('101', None, 3, 2)]
    monkeypatch.setattr(module, 'fetch_public_posts', public)
    params = {'platform': 'x', 'handle': 'example'}
    response = await client.post(BASE, params=params, headers=headers)
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved['total'] == 5 and saved['source'] == 'x-public-profile'
    assert saved['latestTenGuaranteed'] is False and saved['postsRead'] == 1
    assert (await client.get(BASE, params=params, headers=headers)).json() == saved
    assert calls == ['example']
    from app.core.exceptions import FlenzrException
    async def blocked(*args):
        raise FlenzrException('X_PUBLIC_UNAVAILABLE', 'Public counts are unavailable.', 503)
    monkeypatch.setattr(module, 'fetch_public_posts', blocked)
    assert (await client.post(BASE, params=params, headers=headers)).status_code == 503
    assert (await client.get(BASE, params=params, headers=headers)).json() == saved
