import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import PublishingProof
from test_completions import approved, completion_body
from test_deliveries import payload
from test_delivery_reviews import submitted, review_body


def proof_body(row, review, version=0, **changes):
    return dict(request_id=str(uuid.uuid4()), delivery_id=row['id'], review_id=review['id'],
        expected_delivery_version=row['version'], expected_latest_proof_version=version,
        notes='Published final reel.', links=[{'label':'Final post','url':'https://www.instagram.com/p/example/'}], **changes)


@pytest.mark.asyncio
async def test_creator_proof_shared_immutable_versions_retries_and_completed_updates(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db_session)
    base=path.removesuffix('/deliveries');url=base+'/publishing-proof';body=proof_body(row,review)
    for actor,allowed in ((creator,True),(owner,False)):
        state=(await client.get(url,headers=actor)).json()
        assert state['can_publish'] is allowed and state['eligible_delivery']['id']==row['id'] and state['items']==[]
    result=await client.post(url,headers=creator,json=body);assert result.status_code==200,result.text
    receipt=result.json();assert receipt['version']==receipt['delivery_version']==1 and receipt['saved_at'].endswith('+00:00')
    assert not {'creator_user_id','request_id','request_hash'} & receipt.keys()
    assert (await client.post(url,headers=creator,json=body)).json()==receipt
    assert (await client.post(url,headers=creator,json={**body,'notes':'Changed'})).status_code==409
    assert (await client.post(url,headers=creator,json=proof_body(row,review))).status_code==409
    for actor in (creator,owner):assert (await client.get(url,headers=actor)).json()['items']==[receipt]
    await client.post(base+'/complete',headers=owner,json=completion_body(row,review))
    updated=await client.post(url,headers=creator,json=proof_body(row,review,1))
    assert updated.status_code==200 and updated.json()['version']==2
    old=(await client.get(url+'?page=2&page_size=1',headers=owner)).json()
    assert old['items']==[receipt] and old['total']==2 and old['eligible_delivery']['id']==row['id']
    assert (await client.get(base,headers=owner)).json()['status']=='completed'
    assert (await client.get(base+'/agreement',headers=creator)).json()==agreement
    assert (await client.get(path,headers=owner)).json()['items'][0]['review']==review
    assert await db_session.scalar(select(func.count()).select_from(PublishingProof))==2


@pytest.mark.asyncio
async def test_stale_target_cannot_receive_new_proof_and_old_history_is_preserved(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,first,review=await approved(client,auth_headers,db_session)
    url=path.removesuffix('/deliveries')+'/publishing-proof';body=proof_body(first,review)
    receipt=(await client.post(url,headers=creator,json=body)).json()
    second=(await client.post(path,headers=creator,json=payload(agreement['id'],version=1))).json()
    state=(await client.get(url,headers=creator)).json()
    assert not state['can_publish'] and state['eligible_delivery'] is None and state['items']==[receipt]
    assert (await client.post(url,headers=creator,json=proof_body(first,review,1))).status_code==409
    assert (await client.post(url,headers=creator,json=body)).json()==receipt
    decision=(await client.post(path+'/'+second['id']+'/review',headers=owner,json=review_body(version=2))).json()
    assert (await client.post(url,headers=creator,json=proof_body(second,review,1))).status_code==409
    latest=(await client.post(url,headers=creator,json=proof_body(second,decision,1))).json()
    assert latest['version']==latest['delivery_version']==2
    assert (await client.get(url,headers=owner)).json()['items']==[latest,receipt]


@pytest.mark.asyncio
async def test_proof_requires_approval_and_saved_creator_actor(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row=await submitted(client,auth_headers,db_session)
    url=path.removesuffix('/deliveries')+'/publishing-proof';body=proof_body(row,{'id':str(uuid.uuid4())})
    assert (await client.post(url,headers=creator,json=body)).status_code==409
    for actor,status in (({},401),(owner,403),(outsider,404)):
        assert (await client.post(url,headers=actor,json=body)).status_code==status
    assert (await client.get(url,headers=outsider)).status_code==404
    assert (await client.get(url)).status_code==401
    review=(await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body('request_revision'))).json()
    assert (await client.post(url,headers=creator,json=proof_body(row,review))).status_code==409
    assert await db_session.scalar(select(func.count()).select_from(PublishingProof))==0


@pytest.mark.parametrize('change',[
    {'links':[]}, {'links':[{'label':'Post','url':'http://example.com'}]},
    {'links':[{'label':'Post','url':'https://user:secret@example.com'}]},
    {'links':[{'label':'','url':'https://example.com'}]}, {'notes':'x'*5001},
    {'links':[{'label':'Post','url':'https://example.com'}]*2},
    {'links':[{'label':str(i),'url':f'https://example.com/{i}'} for i in range(11)]},
    {'expected_delivery_version':True}, {'expected_latest_proof_version':-1}, {'creator_user_id':'forged'},
])
@pytest.mark.asyncio
async def test_proof_validation(client,auth_headers,db_session,change):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db_session)
    body={**proof_body(row,review),**change}
    result=await client.post(path.removesuffix('/deliveries')+'/publishing-proof',headers=creator,json=body)
    assert result.status_code==422,result.text
    assert await db_session.scalar(select(func.count()).select_from(PublishingProof))==0
