import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import PublishingProofConfirmation
from test_completions import approved, completion_body
from test_publishing_proof import proof_body
from test_deliveries import payload
from test_delivery_reviews import review_body


def confirm_body(version=1, **changes):
    return dict(request_id=str(uuid.uuid4()), expected_proof_version=version, confirmed=True, **changes)


async def recorded(client,auth_headers,db):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db)
    url=path.removesuffix('/deliveries')+'/publishing-proof'
    proof=(await client.post(url,headers=creator,json=proof_body(row,review))).json()
    return owner,creator,outsider,path,agreement,row,review,url,proof


@pytest.mark.asyncio
async def test_shared_confirmation_exact_retry_and_unchanged_collaboration(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review,url,proof=await recorded(client,auth_headers,db_session)
    for actor,allowed in ((owner,True),(creator,False)):
        assert (await client.get(url,headers=actor)).json()['can_confirm'] is allowed
    body=confirm_body();endpoint=url+'/'+proof['id']+'/confirm'
    response=await client.post(endpoint,headers=owner,json=body);assert response.status_code==200,response.text
    receipt=response.json();assert receipt['proof_id']==proof['id'] and receipt['proof_version']==1 and receipt['delivery_version']==1
    assert receipt['confirmed_at'].endswith('+00:00') and not {'reviewer_user_id','request_id','request_hash'} & receipt.keys()
    assert (await client.post(endpoint,headers=owner,json=body)).json()==receipt
    assert (await client.post(endpoint,headers=owner,json=confirm_body())).status_code==409
    assert (await client.post(endpoint,headers=owner,json={**body,'expected_proof_version':2})).status_code==409
    for actor in (owner,creator):
        state=(await client.get(url,headers=actor)).json()
        assert not state['can_confirm'] and state['items'][0]=={**proof,'confirmation':receipt}
    base=path.removesuffix('/deliveries')
    assert (await client.get(base+'/agreement',headers=creator)).json()==agreement
    assert (await client.get(base,headers=owner)).json()['status']=='agreed'
    assert (await client.get(path,headers=creator)).json()['items'][0]['review']==review
    assert await db_session.scalar(select(func.count()).select_from(PublishingProofConfirmation))==1


@pytest.mark.asyncio
async def test_new_proof_never_inherits_confirmation_even_after_completion(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review,url,proof=await recorded(client,auth_headers,db_session)
    body=confirm_body();receipt=(await client.post(url+'/'+proof['id']+'/confirm',headers=owner,json=body)).json()
    base=path.removesuffix('/deliveries')
    await client.post(base+'/complete',headers=owner,json=completion_body(row,review))
    updated=(await client.post(url,headers=creator,json=proof_body(row,review,1))).json()
    state=(await client.get(url,headers=owner)).json()
    assert state['can_confirm'] and state['items'][0]['confirmation'] is None and state['items'][1]['confirmation']==receipt
    assert (await client.post(url+'/'+proof['id']+'/confirm',headers=owner,json=body)).json()==receipt
    assert (await client.post(url+'/'+proof['id']+'/confirm',headers=owner,json=confirm_body())).status_code==409
    fresh=await client.post(url+'/'+updated['id']+'/confirm',headers=owner,json=confirm_body(2));assert fresh.status_code==200,fresh.text
    assert fresh.json()['proof_version']==2
    old=(await client.get(url+'?page=2&page_size=1',headers=creator)).json()['items'][0]
    assert old['confirmation']==receipt
    assert (await client.get(base,headers=owner)).json()['status']=='completed'


@pytest.mark.asyncio
async def test_new_delivery_invalidates_old_proof_confirmation_target(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review,url,proof=await recorded(client,auth_headers,db_session)
    second=(await client.post(path,headers=creator,json=payload(agreement['id'],version=1))).json()
    assert not (await client.get(url,headers=owner)).json()['can_confirm']
    assert (await client.post(url+'/'+proof['id']+'/confirm',headers=owner,json=confirm_body())).status_code==409
    await client.post(path+'/'+second['id']+'/review',headers=owner,json=review_body(version=2))
    assert not (await client.get(url,headers=owner)).json()['can_confirm']
    assert (await client.post(url+'/'+proof['id']+'/confirm',headers=owner,json=confirm_body())).status_code==409
    assert await db_session.scalar(select(func.count()).select_from(PublishingProofConfirmation))==0


@pytest.mark.asyncio
async def test_confirmation_actor_scope_and_unknown_records(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review,url,proof=await recorded(client,auth_headers,db_session)
    endpoint=url+'/'+proof['id']+'/confirm'
    for actor,status in (({},401),(creator,403),(outsider,404)):
        assert (await client.post(endpoint,headers=actor,json=confirm_body())).status_code==status
    assert (await client.post(url+'/'+str(uuid.uuid4())+'/confirm',headers=owner,json=confirm_body())).status_code==404
    assert await db_session.scalar(select(func.count()).select_from(PublishingProofConfirmation))==0


@pytest.mark.parametrize('change',[{'confirmed':False},{'confirmed':'true'},{'expected_proof_version':True},{'expected_proof_version':0},{'reviewer_user_id':'forged'}])
@pytest.mark.asyncio
async def test_confirmation_requires_explicit_valid_payload(client,auth_headers,db_session,change):
    owner,creator,outsider,path,agreement,row,review,url,proof=await recorded(client,auth_headers,db_session)
    response=await client.post(url+'/'+proof['id']+'/confirm',headers=owner,json={**confirm_body(),**change})
    assert response.status_code==422,response.text
    assert (await client.get(url,headers=owner)).json()['items'][0]['confirmation'] is None
