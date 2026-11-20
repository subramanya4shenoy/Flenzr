import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import DeliveryReview, CollaborationAgreement
from app.domains.collaborations.agreements import snapshot_hash
from test_proposals import collaboration, save, terms, send_body
from test_agreements import acceptance
from test_deliveries import payload, agreed
from test_delivery_reviews import review_body


async def limited(client, auth_headers, db, limit):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db)
    response=await save(client,owner,path,terms(revision_limit=limit))
    assert response.status_code==200,response.text
    proposal=(await client.post(path+'/send',headers=owner,json=send_body())).json()
    assert proposal['terms']['revision_limit']==limit
    for actor in (owner,creator):
        result=await client.post(path+'/accept',headers=actor,json=acceptance(proposal));assert result.status_code==200,result.text
    agreement=result.json()['agreement']
    assert agreement['snapshot']['terms']['revision_limit']==limit
    return owner,creator,outsider,path.removesuffix('/proposals')+'/deliveries',agreement


@pytest.mark.asyncio
async def test_one_agreed_round_shared_replays_do_not_count_twice_and_approval_remains(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement=await limited(client,auth_headers,db_session,1)
    original=(await client.get(path.removesuffix('/deliveries')+'/agreement',headers=owner)).json()
    row=(await client.post(path,headers=creator,json=payload(agreement['id']))).json()
    body=review_body('request_revision');url=path+'/'+row['id']+'/review'
    receipt=(await client.post(url,headers=owner,json=body)).json()
    assert receipt['decision']=='revisions_requested'
    for _ in range(2):assert (await client.post(url,headers=owner,json=body)).json()==receipt
    for actor in (owner,creator):
        data=(await client.get(path,headers=actor)).json()
        assert data['revision_allowance']=={'limit':1,'used':1,'remaining':0}
        assert not data['can_request_revision']
    # New submissions alone do not consume more rounds.
    for version in (1,2):
        row=(await client.post(path,headers=creator,json=payload(agreement['id'],version=version))).json()
        blocked=await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body('request_revision',version=version+1))
        assert blocked.status_code==409 and blocked.json()['error']['code']=='REVISION_LIMIT_REACHED'
        assert (await client.get(path,headers=owner)).json()['revision_allowance']['used']==1
    approved=await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body(version=3))
    assert approved.status_code==200 and approved.json()['decision']=='approved'
    assert (await client.get(path.removesuffix('/deliveries')+'/agreement',headers=creator)).json()==original
    assert await db_session.scalar(select(func.count()).select_from(DeliveryReview))==2


@pytest.mark.asyncio
async def test_zero_revisions_is_explicit_and_does_not_block_approval(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement=await limited(client,auth_headers,db_session,0)
    row=(await client.post(path,headers=creator,json=payload(agreement['id']))).json()
    data=(await client.get(path,headers=owner)).json()
    assert data['revision_allowance']=={'limit':0,'used':0,'remaining':0} and data['can_review'] and not data['can_request_revision']
    assert (await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body('request_revision'))).status_code==409
    assert (await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body())).status_code==200


@pytest.mark.asyncio
async def test_legacy_no_limit_keeps_raw_snapshot_hash_and_no_invented_enforcement(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    assert 'revision_limit' not in agreement['snapshot']['terms']
    stored=await db_session.scalar(select(CollaborationAgreement).where(CollaborationAgreement.id==agreement['id']))
    assert agreement['snapshot_hash']==snapshot_hash(stored.snapshot)==snapshot_hash(agreement['snapshot'])
    for version in (0,1):
        row=(await client.post(path,headers=creator,json=payload(agreement['id'],version=version))).json()
        assert (await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body('request_revision',version=version+1))).status_code==200
    data=(await client.get(path,headers=owner)).json()
    assert data['revision_allowance']=={'limit':None,'used':2,'remaining':None} and data['can_request_revision']
    saved=(await client.get(path.removesuffix('/deliveries')+'/agreement',headers=owner)).json()
    assert saved==agreement and 'revision_limit' not in stored.snapshot['terms']


@pytest.mark.parametrize('value',[-1,21,True,1.5,'2'])
@pytest.mark.asyncio
async def test_revision_limit_rejects_invalid_fields(client,auth_headers,db_session,value):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    assert (await save(client,owner,path,terms(revision_limit=value))).status_code==422


@pytest.mark.asyncio
async def test_limit_change_requires_new_proposal_and_fresh_acceptance(client,auth_headers,db_session):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    await save(client,owner,path,terms(revision_limit=2))
    first=(await client.post(path+'/send',headers=owner,json=send_body())).json()
    await client.post(path+'/accept',headers=owner,json=acceptance(first))
    await save(client,creator,path,terms(revision_limit=1),version=1)
    second=(await client.post(path+'/send',headers=creator,json=send_body(version=1))).json()
    assert second['terms']['revision_limit']==1
    assert (await client.post(path+'/accept',headers=creator,json=acceptance(first))).status_code==409
    state=(await client.post(path+'/accept',headers=creator,json=acceptance(second))).json()
    assert state['agreement'] is None
    state=(await client.post(path+'/accept',headers=owner,json=acceptance(second))).json()
    assert state['agreement']['snapshot']['terms']['revision_limit']==1
    assert (await save(client,owner,path,terms(revision_limit=20),version=2)).status_code==409
    assert (await client.get(path.removesuffix('/proposals')+'/agreement',headers=creator)).json()['snapshot_hash']==snapshot_hash(state['agreement']['snapshot'])
