import pytest

from app.domains.creators.models import Creator
from app.domains.identity.models import User


@pytest.fixture
async def directory(db_session):
    for index in range(29):
        user = User(id=f"discovery-user-{index:02}", supabase_uid=f"discovery-sub-{index}",
                    email=f"discovery-{index}@example.com", is_active=index != 28)
        db_session.add(user)
        await db_session.flush()
        db_session.add(Creator(id=f"discovery-creator-{index:02}", user_id=user.id,
                               handle=f"maker_{index:02}", display_name=f"Creator {index:02}",
                               bio="Camera reviews" if index % 2 == 0 else "Travel stories",
                               niche="Technology" if index % 2 == 0 else "Travel",
                               location="Mumbai" if index % 3 == 0 else "Delhi",
                               is_verified=index % 5 == 0, rating=4 if index % 4 == 0 else 0,
                               social_credentials={"private": "do-not-expose"}))
    await db_session.commit()


@pytest.mark.asyncio
async def test_directory_paginates_with_stable_order_and_filtered_totals(client, directory):
    pages = [(await client.get(f"/api/v1/discovery/creators/page?limit=12&offset={offset}")).json()
             for offset in (0, 12, 24)]
    assert [len(page["items"]) for page in pages] == [12, 12, 4]
    assert all(page["total"] == 28 for page in pages)
    assert [page["offset"] for page in pages] == [0, 12, 24]
    all_creators = [item for page in pages for item in page["items"]]
    assert len({item["handle"] for item in all_creators}) == 28
    assert "maker_28" not in {item["handle"] for item in all_creators}
    assert all_creators == sorted(all_creators, key=lambda item: (
        -item["is_verified"], -item["rating"], item["handle"]))
    assert (await client.get("/api/v1/discovery/creators/page?limit=12")).json() == pages[0]
    filtered = (await client.get("/api/v1/discovery/creators/page", params={
        "q": " camera ", "niche": "TECH", "location": "mum", "limit": 2})).json()
    assert filtered["total"] == 5
    assert len(filtered["items"]) == 2
    assert all(item["niche"] == "Technology" and item["location"] == "Mumbai" for item in filtered["items"])
    assert not any(key in all_creators[0] for key in ("email", "user_id", "social_credentials", "verification_code"))
    beyond = (await client.get("/api/v1/discovery/creators/page?offset=99")).json()
    assert beyond["items"] == [] and beyond["total"] == 28
    # Existing list clients keep their response shape.
    assert isinstance((await client.get("/api/v1/discovery/creators")).json(), list)


@pytest.mark.asyncio
async def test_directory_searches_literal_handles_and_has_honest_empty_results(client, directory):
    for value in ("%", "_does_not_exist", "no-such-creator"):
        page = (await client.get("/api/v1/discovery/creators/page", params={"q": value})).json()
        assert page["total"] == 0 and page["items"] == []
    page = (await client.get("/api/v1/discovery/creators/page?q=maker_01")).json()
    assert [item["handle"] for item in page["items"]] == ["maker_01"]
    page = (await client.get("/api/v1/discovery/creators/page?q=Creator%2001")).json()
    assert page["total"] == 1
    page = (await client.get("/api/v1/discovery/creators/page?min_rating=4")).json()
    assert page["total"] == 7


@pytest.mark.asyncio
@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1},
    {"min_rating": 6}, {"q": "x" * 256}, {"niche": "x" * 129}, {"location": "x" * 129}])
async def test_directory_rejects_invalid_search_parameters(client, params):
    assert (await client.get("/api/v1/discovery/creators/page", params=params)).status_code == 422


@pytest.mark.asyncio
async def test_network_filters_require_matching_saved_authorization(client, db_session, directory, monkeypatch):
    import time
    import httpx
    from sqlalchemy import select
    rows = (await db_session.execute(select(Creator).order_by(Creator.id))).scalars().all()
    now = int(time.time())
    valid = {"encrypted_token": "encrypted-test-only", "expires_at": now + 3600}
    def setup(index, platform, credential=None, extra=False):
        creator = rows[index]
        handle = f"account-{index}"
        if extra:
            creator.social_links = {"_accounts": [{"platform": platform, "handle": handle, "is_verified": True, "connected": True}]}
        elif platform == "instagram":
            creator.instagram_handle = handle; creator.instagram_verified = True
        elif platform == "youtube":
            creator.youtube_channel = handle; creator.youtube_verified = True
        else:
            creator.social_links = {platform: handle}
        key = handle if platform == "instagram" else platform + ":" + handle
        creator.social_credentials = {key: credential} if credential else {}
        return creator
    setup(0, "instagram")
    setup(1, "instagram", valid)
    setup(2, "instagram", {**valid, "expires_at": now - 10})
    setup(3, "instagram", {**valid, "expires_at": None, "mode": "unified"})
    setup(4, "youtube", {**valid, "expires_at": now - 10, "encrypted_refresh_token": "refresh"})
    creator = setup(5, "youtube", valid, extra=True)
    creator.social_links = {"_accounts": creator.social_links["_accounts"] + [{"platform": "youtube", "handle": "second-channel", "is_verified": True}]}
    creator.social_credentials = {**creator.social_credentials, "youtube:second-channel": valid}
    setup(6, "youtube").social_credentials = {"youtube:orphan": valid}
    setup(7, "youtube", extra=True)
    setup(8, "linkedin", valid)
    setup(9, "linkedin", valid, extra=True)
    setup(10, "linkedin", {**valid, "expires_at": now - 10})
    setup(11, "x", {**valid, "expires_at": now - 10, "encrypted_refresh_token": "refresh"}, extra=True)
    setup(12, "facebook", valid, extra=True)
    setup(13, "facebook", {**valid, "expires_at": now - 10}, extra=True)
    setup(14, "instagram", valid, extra=True)
    setup(15, "instagram", {**valid, "expires_at": None, "mode": "direct"})
    setup(16, "instagram", valid).user.is_active = False
    setup(17, "instagram", extra=True).social_credentials = {"_flow": {"encrypted_token": "pending", "expires_at": now + 3600}}
    setup(18, "youtube", {"expires_at": now + 3600, "encrypted_token": ""})
    setup(19, "x").social_credentials = {"x:orphan": valid}
    await db_session.commit()
    def no_provider(*args, **kwargs):
        raise AssertionError("Discovery must not contact a provider")
    monkeypatch.setattr(httpx, "AsyncClient", no_provider)
    expected = {"instagram": [1, 3, 14], "youtube": [4, 5], "linkedin": [8, 9], "x": [11], "facebook": [12]}
    for network, indices in expected.items():
        response = await client.get("/api/v1/discovery/creators/page", params={"network": network, "limit": 1})
        assert response.status_code == 200, response.text
        assert response.json()["total"] == len(indices), (network, response.json())
        pages = [(await client.get("/api/v1/discovery/creators/page", params={"network": network, "limit": 1, "offset": offset})).json()
                 for offset in range(len(indices))]
        items = [page["items"][0] for page in pages]
        assert {item["handle"] for item in items} == {f"maker_{index:02}" for index in indices}
        assert all(network in item["connected_networks"] for item in items)
        assert not any("encrypted" in str(item) or "credentials" in str(item) for item in items)
    combined = (await client.get("/api/v1/discovery/creators/page", params={
        "network": "instagram", "q": "maker_14", "niche": "Technology", "location": "Delhi"})).json()
    assert combined["total"] == 1
    rows[1].social_credentials = {}
    await db_session.commit()
    assert (await client.get("/api/v1/discovery/creators/page?network=instagram")).json()["total"] == 2
    assert (await client.get("/api/v1/discovery/creators/page?q=maker_01")).json()["items"][0]["connected_networks"] == []


@pytest.mark.asyncio
@pytest.mark.parametrize("network", ["tiktok", "twitch", "twitter", "INSTAGRAM", "unknown"])
async def test_discovery_rejects_unsupported_networks(client, network):
    assert (await client.get("/api/v1/discovery/creators/page", params={"network": network})).status_code == 422


@pytest.mark.asyncio
async def test_saved_audience_filters_use_largest_account_and_matching_freshness(client, db_session, directory, monkeypatch):
    import time
    import httpx
    from sqlalchemy import select
    now = int(time.time())
    rows = (await db_session.execute(select(Creator).order_by(Creator.id))).scalars().all()
    def saved(index, count, age=0, **snapshot):
        handle = f'channel-{index}'
        creator = rows[index]
        creator.youtube_channel = handle
        creator.social_credentials = {'youtube:' + handle: {
            'encrypted_token': 'test-only', 'expires_at': now + 3600, 'fetched_at': now-age,
            'snapshot': {'followers': count, 'followersAvailable': True, **snapshot}}}
        return creator
    saved(0, 1000); saved(1, 20000, age=40*86400); saved(2, 0); saved(3, None)
    saved(4, 1009, followersAvailable=False, subscribersHidden=True)
    def extra(index, count, age):
        creator=rows[index]
        creator.social_links={'_accounts':[{'platform':'youtube','handle':f'extra-{index}','is_verified':True}]}
        creator.social_credentials={**creator.social_credentials, f'youtube:extra-{index}': {
            'encrypted_token':'test-only','expires_at':now+3600,'fetched_at':now-age,
            'snapshot':{'followers':count,'followersAvailable':True}}}
    saved(5, 100000, age=40*86400);extra(5, 2000, 0)
    saved(6, 20000, age=40*86400);extra(6, 20000, 0)
    saved(7, '3000');saved(8, -1);saved(9, 3.5);saved(10, True);saved(11, 1_000_000_000_001)
    creator=saved(12, 500)
    creator.social_credentials['youtube:channel-12'].pop('fetched_at')
    saved(13, 600, age=-1000);saved(14, None, followersAvailable=False)
    extra(15, 3000, 0)
    saved(16, 5000).social_credentials={'youtube:channel-16':{'encrypted_token':'test-only','expires_at':now-10,'snapshot':{'followers':5000}}}
    creator=saved(17,4500)
    creator.social_credentials={'youtube:channel-17':{**creator.social_credentials['youtube:channel-17'], 'expires_at':now-10,'encrypted_refresh_token':'test-refresh'}}
    await db_session.commit()
    monkeypatch.setattr(httpx, 'AsyncClient', lambda *a, **k: (_ for _ in ()).throw(AssertionError('No provider calls')))
    async def search(**params):
        response=await client.get('/api/v1/discovery/creators/page',params={'network':'youtube','limit':100,**params})
        assert response.status_code==200,response.text
        return response.json()
    page=await search(min_audience=1000,max_audience=5000)
    assert {item['handle'] for item in page['items']}=={'maker_00','maker_15','maker_17'}
    assert page['total']==3
    assert all(item['audiences'][0]['metric']=='subscribers' for item in page['items'])
    page=await search(min_audience=0,max_audience=0)
    assert page['total']==1 and page['items'][0]['handle']=='maker_02'
    page=await search(min_audience=20000,updated_within_days=7)
    assert {item['handle'] for item in page['items']}=={'maker_06'}
    assert page['items'][0]['audiences'][0]['updated_at'] is not None
    page=await search(min_audience=0)
    assert page['total']==9
    for item in page['items']:
        if item['handle'] in ('maker_12','maker_13'):
            assert item['audiences'][0]['updated_at'] is None
    unfiltered=await search()
    unknown=next(item for item in unfiltered['items'] if item['handle']=='maker_04')
    assert unknown['audiences'][0]['count'] is None
    assert unknown['audiences'][0]['updated_at'] is None
    assert not any('encrypted' in str(item) for item in unfiltered['items'])
    first=await search(min_audience=1000,max_audience=5000,limit=1)
    second=await search(min_audience=1000,max_audience=5000,limit=1,offset=1)
    assert first['total']==second['total']==3
    assert first['items'][0]['handle']!=second['items'][0]['handle']


@pytest.mark.asyncio
@pytest.mark.parametrize('params', [
    {'min_audience':0}, {'updated_within_days':7},
    {'network':'youtube','min_audience':-1}, {'network':'youtube','min_audience':'2.5'},
    {'network':'youtube','min_audience':1_000_000_000_001},
    {'network':'youtube','min_audience':100,'max_audience':10},
    {'network':'youtube','updated_within_days':8},
])
async def test_invalid_audience_filters_are_rejected(client,params):
    assert (await client.get('/api/v1/discovery/creators/page',params=params)).status_code==422
