from datetime import datetime, timedelta, timezone
import uuid
import pytest
from test_collaborations import sources


async def collaboration(client, auth_headers, db):
    owner, creator, outsider, records = await sources(client, auth_headers, db)
    record = (await client.post('/api/v1/collaborations', headers=owner,
        json={'source_kind':'application','source_id':records[0][1].id})).json()
    return owner, creator, outsider, '/api/v1/collaborations/'+record['id']+'/proposals'


def terms(**changes):
    return {'amount_cents':12345,'currency':'INR','deliverables':'One product review reel, one revision included',
            'delivery_date':(datetime.now(timezone.utc).date()+timedelta(days=10)).isoformat(),
            'usage_rights':'Organic reposting for 30 days; no paid advertising.', 'note':'Please review the scope.', **changes}


async def save(client, headers, path, value=None, revision=0, version=0):
    return await client.put(path+'/draft',headers=headers,json={'expected_revision':revision,'expected_latest_version':version,'terms':terms() if value is None else value})


def send_body(revision=1, version=0):
    return {'request_id':str(uuid.uuid4()),'expected_draft_revision':revision,'expected_latest_version':version}


@pytest.mark.asyncio
async def test_private_draft_save_send_and_counterproposal_preserve_history(client,auth_headers,db_session):
    owner,creator,outsider,path = await collaboration(client,auth_headers,db_session)
    initial=(await client.get(path,headers=owner)).json()
    assert initial['latest_version']==0 and initial['draft'] is None and initial['items']==[]
    saved=await save(client,owner,path);assert saved.status_code==200,saved.text
    assert saved.json()['revision']==1
    assert (await save(client,owner,path)).json()['revision']==1  # Identical save replay.
    assert (await client.get(path,headers=creator)).json()['draft'] is None
    assert (await client.get(path,headers=owner)).json()['draft']['terms']==terms()
    body=send_body();sent=await client.post(path+'/send',headers=owner,json=body)
    assert sent.status_code==200,sent.text
    first=sent.json();assert first['version']==1 and first['author_role']=='brand' and first['is_mine']
    assert (await client.post(path+'/send',headers=owner,json=body)).json()==first
    shared=(await client.get(path,headers=creator)).json()
    assert shared['draft'] is None and shared['items'][0]['terms']==terms() and not shared['items'][0]['is_mine']
    assert not {'author_id','request_id','request_hash'} & shared['items'][0].keys()
    assert (await client.get(path,headers=owner)).json()['draft'] is None
    assert (await save(client,creator,path,terms(amount_cents=23456),version=1)).status_code==200
    counter=(await client.post(path+'/send',headers=creator,json=send_body(version=1))).json()
    assert counter['version']==2 and counter['author_role']=='creator'
    history=(await client.get(path+'?page_size=1',headers=owner)).json()
    assert history['total']==history['latest_version']==2 and history['items'][0]['terms']['amount_cents']==23456
    old=(await client.get(path+'?page_size=1&page=2',headers=creator)).json()['items'][0]
    assert old['id']==first['id'] and old['terms']==first['terms'] and old['created_at']==first['created_at']
    assert (await client.post(path+'/send',headers=owner,json=body)).json()==first
    assert (await client.post(path+'/send',headers=owner,json={**body,'expected_latest_version':2})).status_code==409


@pytest.mark.asyncio
async def test_stale_drafts_and_sends_require_review_and_do_not_overwrite(client,auth_headers,db_session):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    assert (await save(client,owner,path)).status_code==200
    assert (await save(client,creator,path,terms(note='Private creator work'))).status_code==200
    assert (await save(client,owner,path,terms(amount_cents=20000))).status_code==409
    assert (await save(client,owner,path,terms(amount_cents=20000),revision=1)).json()['revision']==2
    assert (await client.post(path+'/send',headers=owner,json=send_body())).status_code==409
    assert (await client.post(path+'/send',headers=owner,json=send_body(revision=2))).status_code==200
    assert (await client.post(path+'/send',headers=creator,json=send_body())).status_code==409
    assert (await save(client,creator,path,terms(note='Private creator work'),revision=1)).status_code==409
    # Refresh, review latest version, explicitly rebase/save the private draft, then send.
    refreshed=(await client.get(path,headers=creator)).json()
    assert refreshed['draft']['terms']['note']=='Private creator work'
    assert (await save(client,creator,path,terms(note='Revised after review'),revision=1,version=1)).status_code==200
    assert (await client.post(path+'/send',headers=creator,json=send_body(revision=2,version=1))).json()['version']==2


@pytest.mark.parametrize('value',[{},terms(amount_cents=None),terms(deliverables=''),terms(usage_rights=''),terms(delivery_date=None),terms(delivery_date='2020-01-01')])
@pytest.mark.asyncio
async def test_incomplete_drafts_save_but_cannot_send(client,auth_headers,db_session,value):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    assert (await save(client,owner,path,value)).status_code==200
    response=await client.post(path+'/send',headers=owner,json=send_body())
    assert response.status_code==422,response.text
    current=(await client.get(path,headers=owner)).json()
    assert current['latest_version']==0 and current['draft'] is not None


@pytest.mark.parametrize('invalid',[{'amount_cents':True},{'amount_cents':-1},{'currency':'XYZ'},{'delivery_date':'2026-02-30'},{'delivery_date':'2026-12-01T12:00:00Z'},{'author_id':'forged'},{'deliverables':'a'*5001}])
@pytest.mark.asyncio
async def test_proposal_terms_validation(client,auth_headers,db_session,invalid):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    assert (await save(client,owner,path,terms(**invalid))).status_code==422


@pytest.mark.asyncio
async def test_proposal_access_controls_and_no_implicit_agreement(client,auth_headers,db_session):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    for headers,code in [({},401),(outsider,404)]:
        assert (await client.get(path,headers=headers)).status_code==code
        assert (await save(client,headers,path)).status_code==code
        assert (await client.post(path+'/send',headers=headers,json=send_body())).status_code==code
    assert (await client.get(path+'?page_size=100',headers=owner)).status_code==422
    assert (await client.put(path+'/draft',headers=owner,json={'expected_revision':0,'expected_latest_version':0,'terms':terms(),'author_id':'forged'})).status_code==422
    await save(client,owner,path)
    await client.post(path+'/send',headers=owner,json=send_body())
    record=(await client.get(path.removesuffix('/proposals'),headers=creator)).json()
    assert record['status']=='discussion'
