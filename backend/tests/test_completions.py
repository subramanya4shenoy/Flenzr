import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import CollaborationCompletion
from test_deliveries import payload
from test_delivery_reviews import submitted, review_body


def completion_body(row, review, **changes):
    return dict(request_id=str(uuid.uuid4()), delivery_id=row['id'], review_id=review['id'],
                expected_latest_version=row['version'], confirmed=True, **changes)


async def approved(client, auth_headers, db):
    owner, creator, outsider, path, agreement, row = await submitted(client, auth_headers, db)
    review = (await client.post(path+'/'+row['id']+'/review', headers=owner, json=review_body())).json()
    return owner, creator, outsider, path, agreement, row, review


@pytest.mark.asyncio
async def test_completion_receipt_shared_and_replay_safe_closes_all_writes(client, auth_headers, db_session):
    owner, creator, outsider, path, agreement, row, review = await approved(client, auth_headers, db_session)
    base=path.removesuffix('/deliveries'); body=completion_body(row, review)
    assert (await client.get(path, headers=owner)).json()['can_complete'] is True
    assert (await client.get(path, headers=creator)).json()['can_complete'] is False
    response=await client.post(base+'/complete', headers=owner, json=body)
    assert response.status_code==200,response.text
    receipt=response.json()
    assert receipt['delivery_id']==row['id'] and receipt['review_id']==review['id'] and receipt['version']==1
    assert receipt['completed_at'].endswith('+00:00')
    assert not {'completed_by','request_id','request_hash'} & receipt.keys()
    assert (await client.post(base+'/complete', headers=owner, json=body)).json()==receipt
    for actor in (owner,creator):
        state=(await client.get(path, headers=actor)).json()
        assert state['completion']==receipt and state['collaboration_status']=='completed'
        assert not any(state[key] for key in ('can_submit','can_review','can_complete'))
        assert (await client.get(base, headers=actor)).json()['status']=='completed'
        assert (await client.get(base+'/proposals', headers=actor)).json()['collaboration_status']=='completed'
        assert (await client.get(base+'/agreement', headers=actor)).json()==agreement
    assert (await client.post(path, headers=creator, json=payload(agreement['id'],version=1))).status_code==409
    assert (await client.post(path+'/'+row['id']+'/review', headers=owner, json=review_body())).status_code==409
    assert (await client.post(base+'/complete', headers=owner,json=completion_body(row,review))).status_code==409
    assert (await client.post(base+'/complete', headers=owner,json={**body,'expected_latest_version':2})).status_code==409
    assert await db_session.scalar(select(func.count()).select_from(CollaborationCompletion))==1


@pytest.mark.asyncio
async def test_completion_rejects_old_approval_new_unreviewed_and_revision_request(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db_session)
    url=path.removesuffix('/deliveries')+'/complete';body=completion_body(row,review)
    second=(await client.post(path,headers=creator,json=payload(agreement['id'],version=1))).json()
    assert (await client.post(url,headers=owner,json=body)).status_code==409
    assert (await client.post(url,headers=owner,json={**body,'delivery_id':second['id'],'expected_latest_version':2})).status_code==409
    revised=(await client.post(path+'/'+second['id']+'/review',headers=owner,json=review_body('request_revision',version=2))).json()
    assert (await client.post(url,headers=owner,json=completion_body(second,revised))).status_code==409
    assert (await client.get(path,headers=owner)).json()['completion'] is None
    assert (await client.get(path,headers=owner)).json()['can_complete'] is False


@pytest.mark.asyncio
async def test_completion_actor_scope_and_explicit_confirmation(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db_session)
    url=path.removesuffix('/deliveries')+'/complete';body=completion_body(row,review)
    for actor,code in (({},401),(creator,403),(outsider,404)):
        assert (await client.post(url,headers=actor,json=body)).status_code==code
    for change in ({'confirmed':False},{'confirmed':'true'},{'expected_latest_version':True},{'completed_by':'forged'}):
        assert (await client.post(url,headers=owner,json={**body,**change})).status_code==422
    for field in ('delivery_id','review_id'):
        assert (await client.post(url,headers=owner,json={**body,field:str(uuid.uuid4())})).status_code==409
    assert await db_session.scalar(select(func.count()).select_from(CollaborationCompletion))==0
