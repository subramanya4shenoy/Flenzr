import httpx
import pytest
from sqlalchemy import select
from app.domains.creators.models import Creator

BASE = '/api/v1/creators/me/social-accounts'


@pytest.mark.asyncio
@pytest.mark.parametrize('platform', ['instagram', 'youtube', 'x', 'tiktok', 'linkedin', 'twitch'])
async def test_add_correct_and_remove_unverified_account(client, auth_headers, platform):
    headers = auth_headers()
    first = await client.patch(f'{BASE}/{platform}', headers=headers, json={'handle': '@Mistake'})
    assert first.status_code == 200
    assert first.json() == [{'platform': platform, 'handle': 'mistake', 'is_verified': False}]
    # A new read, rather than only trusting the mutation's response, must reflect persistence.
    assert (await client.get(BASE, headers=headers)).json() == first.json()
    edited = await client.patch(f'{BASE}/{platform}', headers=headers, json={'handle': 'correct', 'expected_handle': 'mistake'})
    assert edited.status_code == 200
    assert edited.json()[0]['handle'] == 'correct'
    assert edited.json()[0]['is_verified'] is False
    removed = await client.delete(f'{BASE}/{platform}?expected_handle=correct', headers=headers)
    assert removed.status_code == 200
    assert removed.json() == []
    assert (await client.get(BASE, headers=headers)).json() == []
    assert (await client.delete(f'{BASE}/{platform}', headers=headers)).json() == []


@pytest.mark.asyncio
async def test_verified_changes_reset_only_the_changed_account(client, auth_headers, db_session):
    headers = auth_headers()
    profile = (await client.get('/api/v1/creators/me', headers=headers)).json()
    creator = await db_session.get(Creator, profile['id'])
    creator.instagram_handle = 'instagram_owner'
    creator.youtube_channel = 'youtube_owner'
    creator.instagram_verified = creator.youtube_verified = creator.is_verified = True
    await db_session.commit()
    # Saving an unchanged handle must not revoke its existing proof.
    same = await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'instagram_owner'})
    assert same.json()[0]['is_verified'] is True
    changed = await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'new_owner'})
    accounts = {a['platform']: a for a in changed.json()}
    assert accounts['instagram']['is_verified'] is False
    assert accounts['youtube']['is_verified'] is True
    await client.delete(BASE + '/instagram', headers=headers)
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    assert me['instagram_handle'] is None
    assert me['instagram_verified'] is False
    assert me['is_verified'] is True
    await client.delete(BASE + '/youtube', headers=headers)
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    assert me['youtube_channel'] is None
    assert me['is_verified'] is False
    public = await client.get(f"/api/v1/creators/public/{me['handle']}")
    assert public.json()['instagram_handle'] is None
    assert public.json()['youtube_channel'] is None


@pytest.mark.asyncio
async def test_stale_delete_cannot_remove_a_corrected_account(client, auth_headers):
    headers = auth_headers()
    await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'current'})
    res = await client.delete(BASE + '/instagram?expected_handle=old', headers=headers)
    assert res.status_code == 409
    res = await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'replace', 'expected_handle': 'old'})
    assert res.status_code == 409
    assert (await client.get(BASE, headers=headers)).json()[0]['handle'] == 'current'


@pytest.mark.asyncio
async def test_social_mutations_are_owner_scoped_and_cannot_grant_verification(client, auth_headers):
    owner = auth_headers(sub='owner', email='owner@example.com')
    other = auth_headers(sub='other', email='other@example.com')
    await client.patch(BASE + '/instagram', headers=owner, json={'handle': 'owner_account'})
    assert (await client.get(BASE, headers=other)).json() == []
    await client.delete(BASE + '/instagram', headers=other)
    assert (await client.get(BASE, headers=owner)).json()[0]['handle'] == 'owner_account'
    res = await client.patch(BASE + '/instagram', headers=other, json={'handle': 'other_account', 'is_verified': True})
    assert res.status_code == 422
    assert (await client.get(BASE, headers=other)).json() == []
    assert (await client.patch(BASE + '/unsupported', headers=owner, json={'handle': 'name'})).status_code == 422


@pytest.mark.asyncio
async def test_late_verification_cannot_restore_a_removed_account(client, auth_headers, monkeypatch, db_session):
    headers = auth_headers()
    await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'mistake'})
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    async def removed_during_scan(self, url, **kwargs):
        creator = (await db_session.execute(select(Creator).where(Creator.id == me['id']))).scalar_one()
        creator.instagram_handle = None
        creator.instagram_verified = False
        await db_session.commit()
        return httpx.Response(200, json={'data': {'user': {'biography': me['verification_code']}}})
    monkeypatch.setattr(httpx.AsyncClient, 'get', removed_during_scan)
    res = await client.post('/api/v1/creators/verify-bio', headers=headers, json={'platform': 'instagram', 'handle': 'mistake', 'verification_code': me['verification_code']})
    assert res.status_code == 403
    assert (await client.request('GET', BASE, headers=headers)).json() == []


@pytest.mark.asyncio
async def test_verification_cannot_link_an_account_that_was_not_added(client, auth_headers):
    headers = auth_headers()
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    res = await client.post('/api/v1/creators/verify-bio', headers=headers, json={'platform': 'instagram', 'handle': 'not_added', 'verification_code': me['verification_code']})
    assert res.status_code == 403
    assert (await client.get(BASE, headers=headers)).json() == []


@pytest.mark.asyncio
@pytest.mark.parametrize('platform', ['instagram', 'youtube', 'x', 'tiktok', 'linkedin', 'twitch'])
async def test_multiple_accounts_are_independent(client, auth_headers, platform):
    headers = auth_headers()
    for handle in ('first', 'second', 'third'):
        res = await client.patch(f'{BASE}/{platform}', headers=headers, json={'handle': handle, 'expected_handle': ''})
        assert res.status_code == 200
    assert len((await client.get(BASE, headers=headers)).json()) == 3
    duplicate = await client.patch(f'{BASE}/{platform}', headers=headers, json={'handle': 'second', 'expected_handle': ''})
    assert duplicate.status_code == 409
    assert (await client.delete(f'{BASE}/{platform}', headers=headers)).status_code == 409
    edit = await client.patch(f'{BASE}/{platform}', headers=headers, json={'handle': 'corrected', 'expected_handle': 'second'})
    assert {a['handle'] for a in edit.json()} == {'first', 'corrected', 'third'}
    removed = await client.delete(f'{BASE}/{platform}?expected_handle=first', headers=headers)
    assert {a['handle'] for a in removed.json()} == {'corrected', 'third'}
    assert {a['handle'] for a in (await client.get(BASE, headers=headers)).json()} == {'corrected', 'third'}


@pytest.mark.asyncio
async def test_verifying_second_instagram_preserves_first(client, auth_headers, monkeypatch):
    headers = auth_headers()
    for handle in ('first', 'second'):
        await client.patch(BASE + '/instagram', headers=headers, json={'handle': handle, 'expected_handle': ''})
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    original_get = httpx.AsyncClient.get
    async def scan(self, url, **kwargs):
        if str(url).startswith('https://www.instagram.com/'):
            return httpx.Response(200, json={'data': {'user': {'biography': me['verification_code']}}})
        return await original_get(self, url, **kwargs)
    monkeypatch.setattr(httpx.AsyncClient, 'get', scan)
    res = await client.post('/api/v1/creators/verify-bio', headers=headers, json={'platform': 'instagram', 'handle': 'second', 'verification_code': me['verification_code']})
    assert res.json()['verified'] is True
    accounts = {a['handle']: a['is_verified'] for a in (await client.get(BASE, headers=headers)).json()}
    assert accounts == {'first': False, 'second': True}


@pytest.mark.asyncio
async def test_unreadable_instagram_is_not_reported_as_missing_code(client, auth_headers, monkeypatch):
    monkeypatch.setattr("app.domains.creators.instagram.fetch_public_profile", lambda handle: None)
    headers = auth_headers()
    await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'first'})
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    async def scan(self, url, **kwargs):
        return httpx.Response(200, json={'status': 'fail'})
    monkeypatch.setattr(httpx.AsyncClient, 'get', scan)
    res = await client.post('/api/v1/creators/verify-bio', headers=headers, json={'platform': 'instagram', 'handle': 'first', 'verification_code': me['verification_code']})
    assert res.json()['verified'] is False
    assert 'readable bio' in res.json()['message']


@pytest.mark.asyncio
async def test_instagram_schema_failure_verifies_using_matching_public_bio(client, auth_headers, monkeypatch):
    headers = auth_headers()
    await client.patch(BASE + '/instagram', headers=headers, json={'handle': 'example'})
    me = (await client.get('/api/v1/creators/me', headers=headers)).json()
    original_get = httpx.AsyncClient.get
    async def scan(self, url, **kwargs):
        if str(url).startswith('https://www.instagram.com/'):
            return httpx.Response(400, json={'status': 'fail', 'message': 'Asset has been deleted'})
        return await original_get(self, url, **kwargs)
    monkeypatch.setattr(httpx.AsyncClient, 'get', scan)
    page = f'''<meta property="og:url" content="https://www.instagram.com/example/">
    <meta name="description" content="Example (@example) on Instagram: &quot;{me['verification_code']}&quot;">'''
    monkeypatch.setattr('app.domains.creators.instagram.fetch_public_profile', lambda handle: page)
    res = await client.post('/api/v1/creators/verify-bio', headers=headers, json={'platform': 'instagram', 'handle': 'example', 'verification_code': me['verification_code']})
    assert res.json()['verified'] is True
    assert (await client.get(BASE, headers=headers)).json()[0]['is_verified'] is True
