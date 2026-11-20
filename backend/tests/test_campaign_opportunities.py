from datetime import datetime,timedelta,timezone
import uuid
import pytest
from sqlalchemy import select,func
from app.domains.campaigns.models import Campaign,CampaignApplication,ApplicationStatus
from test_campaign_lifecycle import setup_brand,complete_brief,transition


async def actors(client,auth_headers):
    owner=await setup_brand(client,auth_headers,'opportunity-owner')
    creator=auth_headers(sub='opportunity-creator',email='opportunity-creator@example.com')
    other=auth_headers(sub='opportunity-other',email='opportunity-other@example.com')
    a=(await client.get('/api/v1/creators/me',headers=creator)).json()
    b=(await client.get('/api/v1/creators/me',headers=other)).json()
    return owner,creator,other,a,b


@pytest.mark.asyncio
async def test_opportunity_pagination_filters_private_briefs_and_own_application_only(client,auth_headers,db_session):
    owner,creator,other,a,b=await actors(client,auth_headers)
    active=[]
    for title in ['Launch 100%_Review','Technology launch','Another launch']:
        active.append((await client.post('/api/v1/campaigns',headers=owner,json={**complete_brief(),'title':title})).json())
    draft=(await client.post('/api/v1/campaigns/drafts',headers=owner,json={'request_id':str(uuid.uuid4()),'title':'Private draft'})).json()
    hidden=[draft['id']]
    for action in ['pause','close','cancel','expire']:
        campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
        hidden.append(campaign['id'])
        if action=='expire':
            row=await db_session.get(Campaign,campaign['id']);row.end_date=datetime.now(timezone.utc)-timedelta(days=2);await db_session.commit()
        else:await transition(client,owner,campaign,action)
    for item in active:
        row=await db_session.get(Campaign,item['id']);row.created_at=datetime(2026,1,1,tzinfo=timezone.utc)
    # Today's end date remains inclusive.
    row.end_date=datetime.now(timezone.utc).replace(hour=0,minute=0,second=0,microsecond=0)
    await db_session.commit()
    await client.post(f"/api/v1/campaigns/{active[0]['id']}/apply",headers=other,json={'proposed_rate_cents':9999,'pitch_message':'Other creator private pitch'})
    own=(await client.post(f"/api/v1/campaigns/{active[1]['id']}/apply",headers=creator,json={'proposed_rate_cents':12345,'pitch_message':'Own pitch'})).json()
    application=await db_session.get(CampaignApplication,own['id']);application.status=ApplicationStatus.REJECTED;await db_session.commit()
    path='/api/v1/campaigns/opportunities'
    response=await client.get(path,headers=creator);assert response.status_code==200,response.text
    page=response.json();assert page['total']==3
    assert [item['id'] for item in page['items']]==sorted([item['id'] for item in active],reverse=True)
    assert (await client.get(path,headers=creator,params={'page_size':1,'page':2})).json()['items'][0]['id']==page['items'][1]['id']
    assert (await client.get(path,headers=creator,params={'page_size':1,'page':4})).json()['items']==[]
    assert (await client.get(path,headers=creator,params={'q':'%_'})).json()['total']==1
    assert (await client.get(path,headers=creator,params={'q':'nonexistent'})).json()['total']==0
    assert (await client.get(path,headers=creator,params={'niche':'TECH'})).json()['total']==3
    assert (await client.get(path,headers=creator,params={'page_size':51})).status_code==422
    assert (await client.get(path,headers=creator,params={'page':0})).status_code==422
    assert (await client.get(path)).status_code==401
    for id in hidden:assert (await client.get(path+'/'+id,headers=creator)).status_code==404
    details=(await client.get(path+'/'+active[0]['id'],headers=creator)).json()
    assert details['application'] is None
    details=(await client.get(path+'/'+active[1]['id'],headers=creator)).json()
    assert details['application']['id']==own['id'] and details['application']['status']=='rejected'
    assert details['application']['pitch_message']=='Own pitch'
    assert set(details)=={'id','title','brief','organization_name','target_niche','deliverable_summary','budget_total_cents','currency','status','revision','start_date','end_date','application'}
    other_details=(await client.get(path+'/'+active[1]['id'],headers=other)).json();assert other_details['application'] is None
    assert (await client.get(f"/api/v1/campaigns/{active[1]['id']}",headers=creator)).status_code==403


@pytest.mark.asyncio
async def test_application_retry_preserves_quote_and_final_response_after_closure(client,auth_headers,db_session):
    owner,creator,other,a,b=await actors(client,auth_headers)
    campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    path=f"/api/v1/campaigns/{campaign['id']}/apply"
    payload={'proposed_rate_cents':12345,'pitch_message':'  A saved pitch.  ','expected_campaign_revision':campaign['revision']}
    created=await client.post(path,headers=creator,json=payload);assert created.status_code==201,created.text
    record=created.json();assert record['creator_id']==a['id'] and record['pitch_message']=='A saved pitch.'
    retry=await client.post(path,headers=creator,json=payload);assert retry.json()['id']==record['id']
    for patch in [{'proposed_rate_cents':22222},{'pitch_message':'New pitch'}]:
        assert (await client.post(path,headers=creator,json={**payload,**patch})).status_code==409
    withdrawal=await client.post(f"/api/v1/campaigns/creator/applications/{record['id']}/respond",headers=creator,json={'action':'withdraw','expected_status':'pending','expected_campaign_revision':campaign['revision']})
    assert withdrawal.status_code==200
    await transition(client,owner,campaign,'close')
    retried=await client.post(path,headers=creator,json=payload)
    assert retried.status_code==201 and retried.json()['status']=='withdrawn'
    assert await db_session.scalar(select(func.count()).select_from(CampaignApplication))==1
    assert (await client.get('/api/v1/campaigns/creator/applications',headers=creator)).json()['items'][0]['status']=='withdrawn'


@pytest.mark.asyncio
@pytest.mark.parametrize('action',['pause','close','cancel','expire','pause-resume'])
async def test_application_send_revalidates_campaign_and_review_revision(client,auth_headers,db_session,action):
    owner,creator,other,a,b=await actors(client,auth_headers)
    campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json();current=campaign
    if action=='expire':
        row=await db_session.get(Campaign,campaign['id']);row.end_date=datetime.now(timezone.utc)-timedelta(days=2);await db_session.commit()
    elif action=='pause-resume':
        current=(await transition(client,owner,campaign,'pause')).json();current=(await transition(client,owner,current,'resume')).json()
    else:current=(await transition(client,owner,campaign,action)).json()
    payload={'proposed_rate_cents':1000,'expected_campaign_revision':campaign['revision']}
    path=f"/api/v1/campaigns/{campaign['id']}/apply"
    assert (await client.post(path,headers=creator,json=payload)).status_code in (409,422)
    assert await db_session.scalar(select(func.count()).select_from(CampaignApplication))==0
    if action=='pause-resume':
        assert (await client.post(path,headers=creator,json={**payload,'expected_campaign_revision':current['revision']})).status_code==201


@pytest.mark.asyncio
@pytest.mark.parametrize('patch',[{'proposed_rate_cents':99},{'proposed_rate_cents':2_000_000_001},{'proposed_rate_cents':1.5},{'pitch_message':'x'*5001},{'creator_id':'forged'},{'status':'accepted'},{'expected_campaign_revision':0}])
async def test_application_payload_is_bounded_and_identity_is_session_owned(client,auth_headers,patch):
    owner,creator,other,a,b=await actors(client,auth_headers)
    campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    assert (await client.post(f"/api/v1/campaigns/{campaign['id']}/apply",headers=creator,json={'proposed_rate_cents':1000,**patch})).status_code==422
