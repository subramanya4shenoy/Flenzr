import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import DeliveryReview
from test_deliveries import agreed, payload


async def submitted(client,auth_headers,db):
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db)
    row=(await client.post(path,headers=creator,json=payload(agreement['id']))).json()
    return owner,creator,outsider,path,agreement,row


def review_body(action='approve',version=1,**changes):
    return {'request_id':str(uuid.uuid4()),'expected_latest_version':version,'action':action,
            'feedback':'Please adjust the captions.' if action=='request_revision' else '',**changes}


@pytest.mark.parametrize('action,decision',[('approve','approved'),('request_revision','revisions_requested')])
@pytest.mark.asyncio
async def test_exact_review_persists_for_both_participants_and_retries_safely(client,auth_headers,db_session,action,decision):
    owner,creator,outsider,path,agreement,row=await submitted(client,auth_headers,db_session)
    url=path+'/'+row['id']+'/review';body=review_body(action)
    saved=await client.post(url,headers=owner,json=body)
    assert saved.status_code==200,saved.text
    receipt=saved.json();assert receipt['delivery_id']==row['id'] and receipt['version']==1 and receipt['decision']==decision
    assert receipt['reviewed_at'].endswith('+00:00') and receipt['feedback']==body['feedback']
    assert not {'reviewer_user_id','request_id','request_hash'} & receipt.keys()
    assert (await client.post(url,headers=owner,json=body)).json()==receipt
    for actor,allowed in ((owner,True),(creator,False)):
        state=(await client.get(path,headers=actor)).json()
        assert state['can_review'] is allowed and state['items'][0]['review']==receipt
        assert state['items'][0]['notes']==row['notes'] and state['items'][0]['links']==row['links']
    assert (await client.get(path.removesuffix('/deliveries')+'/agreement',headers=creator)).json()==agreement
    assert (await client.get(path.removesuffix('/deliveries'),headers=owner)).json()['status']=='agreed'
    assert await db_session.scalar(select(func.count()).select_from(DeliveryReview))==1


@pytest.mark.asyncio
async def test_new_versions_do_not_inherit_decisions_or_allow_stale_reviews(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,first=await submitted(client,auth_headers,db_session)
    body=review_body('request_revision')
    receipt=(await client.post(path+'/'+first['id']+'/review',headers=owner,json=body)).json()
    second=(await client.post(path,headers=creator,json=payload(agreement['id'],version=1,title='Revised cut'))).json()
    state=(await client.get(path,headers=owner)).json()
    assert state['latest_version']==2 and state['items'][0]['review'] is None and state['items'][1]['review']==receipt
    assert (await client.post(path+'/'+first['id']+'/review',headers=owner,json=review_body())).status_code==409
    assert (await client.post(path+'/'+first['id']+'/review',headers=owner,json=body)).json()==receipt
    assert (await client.post(path+'/'+second['id']+'/review',headers=owner,json=review_body())).status_code==409
    approved=(await client.post(path+'/'+second['id']+'/review',headers=owner,json=review_body(version=2))).json()
    assert approved['decision']=='approved'
    old=(await client.get(path+'?page=2&page_size=1',headers=creator)).json()['items'][0]
    assert old['review']==receipt and old['submitted_at']==first['submitted_at']
    # Even an approved version is not an approval of a later update.
    third=(await client.post(path,headers=creator,json=payload(agreement['id'],version=2,title='A later edit'))).json()
    assert third['review'] is None
    assert (await client.get(path,headers=creator)).json()['items'][0]['review'] is None


@pytest.mark.asyncio
async def test_review_is_final_per_version_and_request_keys_cannot_change_decisions(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row=await submitted(client,auth_headers,db_session)
    url=path+'/'+row['id']+'/review';body=review_body()
    first=(await client.post(url,headers=owner,json=body)).json()
    for other in (review_body('request_revision'),{**body,'feedback':'Changed'},{**body,'action':'request_revision','feedback':'Request different work'}):
        assert (await client.post(url,headers=owner,json=other)).status_code==409
    assert (await client.get(path,headers=creator)).json()['items'][0]['review']==first


@pytest.mark.asyncio
async def test_review_is_reviewer_scoped_and_unknown_deliveries_stay_private(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row=await submitted(client,auth_headers,db_session)
    url=path+'/'+row['id']+'/review'
    for actor,code in (({},401),(creator,403),(outsider,404)):
        assert (await client.post(url,headers=actor,json=review_body())).status_code==code
    assert (await client.post(path+'/'+str(uuid.uuid4())+'/review',headers=owner,json=review_body())).status_code==404
    assert (await client.post(url,headers=owner,json={**review_body(),'reviewer_user_id':'forged'})).status_code==422
    assert await db_session.scalar(select(func.count()).select_from(DeliveryReview))==0


@pytest.mark.parametrize('invalid',[
    {'action':'request_revision','feedback':''}, {'action':'request_revision','feedback':'    '},
    {'feedback':'x'*5001}, {'action':'complete'}, {'expected_latest_version':True}, {'expected_latest_version':0},
])
@pytest.mark.asyncio
async def test_review_payload_validation(client,auth_headers,db_session,invalid):
    owner,creator,outsider,path,agreement,row=await submitted(client,auth_headers,db_session)
    response=await client.post(path+'/'+row['id']+'/review',headers=owner,json=review_body(**invalid))
    assert response.status_code==422,response.text
    assert (await client.get(path,headers=owner)).json()['items'][0]['review'] is None
