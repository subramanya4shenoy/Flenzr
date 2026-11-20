import uuid
import pytest
from sqlalchemy import func, select
from app.domains.collaborations.models import DeliverySubmission
from test_agreements import sent, acceptance


async def agreed(client,auth_headers,db):
    owner,creator,outsider,proposal_path,proposal,_=await sent(client,auth_headers,db)
    for actor in (owner,creator):
        response=await client.post(proposal_path+'/accept',headers=actor,json=acceptance(proposal))
        assert response.status_code==200,response.text
    agreement=response.json()['agreement']
    return owner,creator,outsider,proposal_path.removesuffix('/proposals')+'/deliveries',agreement


def payload(agreement_id,version=0,**changes):
    return {'request_id':str(uuid.uuid4()),'agreement_id':agreement_id,'expected_latest_version':version,
            'title':'Product reel preview','notes':'Original edit with one revision round.',
            'links':[{'label':'Review video','url':'https://example.com/review?v=1'}],**changes}


@pytest.mark.asyncio
async def test_delivery_shared_history_exact_retries_and_unchanged_agreement(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    for actor,allowed in ((owner,False),(creator,True)):
        state=(await client.get(path,headers=actor)).json()
        assert state['can_submit'] is allowed and state['agreement_id']==agreement['id']
        assert state['items']==[] and state['total']==state['latest_version']==0
    body=payload(agreement['id'])
    first=await client.post(path,headers=creator,json=body)
    assert first.status_code==200,first.text
    row=first.json();assert row['version']==1 and row['title']==body['title'] and row['submitted_at'].endswith('+00:00')
    assert not {'creator_user_id','request_id','request_hash'} & row.keys()
    assert (await client.post(path,headers=creator,json=body)).json()==row
    for actor in (owner,creator):
        assert (await client.get(path,headers=actor)).json()['items']==[row]
    second=await client.post(path,headers=creator,json=payload(agreement['id'],version=1,title='Updated review cut',links=[{'label':'Final preview','url':'https://example.com/review?v=2'}]))
    assert second.status_code==200 and second.json()['version']==2
    latest=(await client.get(path+'?page_size=1',headers=owner)).json()
    earlier=(await client.get(path+'?page_size=1&page=2',headers=creator)).json()
    assert latest['total']==earlier['total']==2
    assert latest['items']==[second.json()] and earlier['items']==[row]
    assert (await client.post(path,headers=creator,json=body)).json()==row
    assert (await client.get(path.removesuffix('/deliveries')+'/agreement',headers=creator)).json()==agreement
    assert (await client.get(path.removesuffix('/deliveries'),headers=owner)).json()['status']=='agreed'
    assert await db_session.scalar(select(func.count()).select_from(DeliverySubmission))==2


@pytest.mark.asyncio
async def test_submission_authentication_creator_scope_and_explicit_agreement(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    body=payload(agreement['id'])
    for actor,code in (({},401),(outsider,404)):
        assert (await client.get(path,headers=actor)).status_code==code
        assert (await client.post(path,headers=actor,json=body)).status_code==code
    assert (await client.post(path,headers=owner,json=body)).status_code==403
    assert (await client.post(path,headers=creator,json={**body,'creator_user_id':'forged'})).status_code==422
    assert (await client.post(path,headers=creator,json={**body,'agreement_id':str(uuid.uuid4())})).status_code==409
    assert (await client.get(path+'?page_size=100',headers=creator)).status_code==422


@pytest.mark.asyncio
async def test_stale_delivery_version_and_reused_request_do_not_overwrite(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    body=payload(agreement['id'])
    first=(await client.post(path,headers=creator,json=body)).json()
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],title='Other tab version'))).status_code==409
    assert (await client.post(path,headers=creator,json={**body,'notes':'Different request contents'})).status_code==409
    current=(await client.get(path,headers=creator)).json()
    assert current['total']==1 and current['items']==[first]


@pytest.mark.asyncio
async def test_delivery_requires_completed_mutual_acceptance(client,auth_headers,db_session):
    owner,creator,outsider,path,proposal,_=await sent(client,auth_headers,db_session)
    delivery_path=path.removesuffix('/proposals')+'/deliveries'
    assert not (await client.get(delivery_path,headers=creator)).json()['can_submit']
    assert (await client.post(delivery_path,headers=creator,json=payload(str(uuid.uuid4())))).status_code==409
    await client.post(path+'/accept',headers=owner,json=acceptance(proposal))
    assert not (await client.get(delivery_path,headers=creator)).json()['can_submit']
    assert (await client.post(delivery_path,headers=creator,json=payload(str(uuid.uuid4())))).status_code==409


@pytest.mark.parametrize('invalid',[
    {'title':'  '},{'title':'a'*161},{'notes':'a'*5001},{'links':[]},
    {'links':[{'label':'Copy','url':'https://example.com'}]*11},
    {'links':[{'label':'Copy','url':'https://example.com'},{'label':'Duplicate','url':'https://example.com/'}]},
    {'links':[{'label':'','url':'https://example.com'}]},
    {'links':[{'label':'Bad','url':'javascript:alert(1)'}]},
    {'links':[{'label':'Bad','url':'http://example.com/'}]},
    {'links':[{'label':'Bad','url':'https://user:pass@example.com/'}]},
    {'links':[{'label':'Bad','url':'https://example.com/a b'}]},
    {'links':[{'label':'Bad','url':'https://example.com/\nprivate'}]},
    {'links':[{'label':'Bad','url':'https://example.com/\\bad'}]},
    {'links':[{'label':'Bad','url':'/relative/path'}]},
    {'expected_latest_version':True},
])
@pytest.mark.asyncio
async def test_delivery_payload_validation(client,auth_headers,db_session,invalid):
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    response=await client.post(path,headers=creator,json=payload(agreement['id'],**invalid))
    assert response.status_code==422,response.text
    assert (await client.get(path,headers=creator)).json()['total']==0
