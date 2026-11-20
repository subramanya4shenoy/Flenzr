from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import select, func
from app.domains.campaigns.models import Campaign, CampaignApplication, CampaignInvitation
from test_campaign_lifecycle import setup_brand, complete_brief, transition


async def records(client, auth_headers):
    owner=await setup_brand(client,auth_headers,'response-owner')
    other=await setup_brand(client,auth_headers,'response-other')
    creator=auth_headers(sub='response-creator',email='response-creator@example.com')
    outsider=auth_headers(sub='response-outsider',email='response-outsider@example.com')
    creator_id=(await client.get('/api/v1/creators/me',headers=creator)).json()['id']
    await client.get('/api/v1/creators/me',headers=outsider)
    campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    app=(await client.post(f"/api/v1/campaigns/{campaign['id']}/apply",headers=creator,json={'proposed_rate_cents':12345,'pitch_message':'Saved original pitch'})).json()
    invite=(await client.post(f"/api/v1/campaigns/{campaign['id']}/invite",headers=owner,json={'creator_id':creator_id,'offered_rate_cents':23456,'message':'Saved original invitation'})).json()
    return owner,other,creator,outsider,campaign,app,invite


@pytest.mark.asyncio
@pytest.mark.parametrize('kind,audience,action,target',[
    ('applications','me','accept','accepted'),('applications','me','reject','rejected'),
    ('applications','creator','withdraw','withdrawn'),('invitations','creator','accept','accepted'),
    ('invitations','creator','decline','declined'),
])
async def test_response_persists_final_state_is_retry_safe_and_scoped(client,auth_headers,db_session,kind,audience,action,target):
    owner,other,creator,outsider,campaign,app,invite=await records(client,auth_headers)
    record=app if kind=='applications' else invite
    url=f"/api/v1/campaigns/{audience}/{kind}/{record['id']}"
    actor=owner if audience=='me' else creator
    initial='pending' if kind=='applications' else 'invited'
    body={'action':action,'expected_status':initial,'expected_campaign_revision':campaign['revision']}
    # Detail and write require the same participant scope; another role/user cannot mutate by ID.
    stranger=other if audience=='me' else outsider
    assert (await client.get(url,headers=stranger)).status_code==404
    assert (await client.post(url+'/respond',headers=stranger,json=body)).status_code==404
    assert (await client.post(url+'/respond',json=body)).status_code==401
    if audience=='me':assert (await client.post(url+'/respond',headers=creator,json=body)).status_code==403
    response=await client.post(url+'/respond',headers=actor,json=body)
    assert response.status_code==200,response.text
    saved=response.json();assert saved['status']==target and saved['campaign_revision']==campaign['revision']
    assert saved['rate_cents']==(12345 if kind=='applications' else 23456)
    assert saved['message']==('Saved original pitch' if kind=='applications' else 'Saved original invitation')
    retry=await client.post(url+'/respond',headers=actor,json=body)
    assert retry.status_code==200 and retry.json()['updated_at']==saved['updated_at']
    assert (await client.get(url,headers=actor)).json()['status']==target
    for prefix,headers in [('me',owner),('creator',creator)]:
        assert (await client.get(f'/api/v1/campaigns/{prefix}/{kind}',headers=headers)).json()['items'][0]['status']==target
    # All final statuses are terminal, including attempts from the other participant.
    for prefix,headers,op in ([('me',owner,'reject' if action=='accept' else 'accept'),('creator',creator,'withdraw')] if kind=='applications' else [('creator',creator,'decline' if action=='accept' else 'accept')]):
        if op==action:continue
        result=await client.post(f"/api/v1/campaigns/{prefix}/{kind}/{record['id']}/respond",headers=headers,json={**body,'action':op})
        assert result.status_code==409,result.text
    assert await db_session.scalar(select(func.count()).select_from(CampaignApplication))==1
    assert await db_session.scalar(select(func.count()).select_from(CampaignInvitation))==1
    assert (await client.get(f"/api/v1/campaigns/{campaign['id']}",headers=owner)).json()['revision']==campaign['revision']
    # This is a response only, with no implicit downstream collaboration/payment records.
    for table in ('deals','payments'):
        from app.core.database import Base
        if table in Base.metadata.tables:
            assert await db_session.scalar(select(func.count()).select_from(Base.metadata.tables[table]))==0


@pytest.mark.asyncio
@pytest.mark.parametrize('closed', ['paused','completed','cancelled','expired'])
async def test_acceptance_requires_open_campaign_but_pending_cleanup_is_allowed(client,auth_headers,db_session,closed):
    owner,other,creator,outsider,campaign,app,invite=await records(client,auth_headers)
    if closed=='expired':
        row=await db_session.get(Campaign,campaign['id']);row.end_date=datetime.now(timezone.utc)-timedelta(days=2);await db_session.commit()
        updated=campaign
    else:
        updated=(await transition(client,owner,campaign,{'paused':'pause','completed':'close','cancelled':'cancel'}[closed])).json()
    for kind,record,actor,prefix in [('applications',app,owner,'me'),('invitations',invite,creator,'creator')]:
        url=f"/api/v1/campaigns/{prefix}/{kind}/{record['id']}"
        initial='pending' if kind=='applications' else 'invited'
        body={'action':'accept','expected_status':initial,'expected_campaign_revision':updated['revision']}
        assert (await client.post(url+'/respond',headers=actor,json=body)).status_code==409
        assert (await client.get(url,headers=actor)).json()['status']==initial
        if closed!='expired':
            stale=await client.post(url+'/respond',headers=actor,json={**body,'action':'reject' if kind=='applications' else 'decline','expected_campaign_revision':campaign['revision']})
            assert stale.status_code==409
        result=await client.post(url+'/respond',headers=actor,json={**body,'action':'reject' if kind=='applications' else 'decline'})
        assert result.status_code==200,result.text


@pytest.mark.asyncio
async def test_withdraw_after_closure_and_changed_campaign_reconfirmation(client,auth_headers):
    owner,other,creator,outsider,campaign,app,invite=await records(client,auth_headers)
    paused=(await transition(client,owner,campaign,'pause')).json()
    resumed=(await transition(client,owner,paused,'resume')).json()
    url=f"/api/v1/campaigns/me/applications/{app['id']}"
    body={'action':'accept','expected_status':'pending','expected_campaign_revision':campaign['revision']}
    # Active again is still a changed lifecycle revision; the old confirmation must not succeed.
    assert (await client.post(url+'/respond',headers=owner,json=body)).status_code==409
    closed=(await transition(client,owner,resumed,'close')).json()
    response=await client.post(f"/api/v1/campaigns/creator/applications/{app['id']}/respond",headers=creator,json={**body,'action':'withdraw','expected_campaign_revision':closed['revision']})
    assert response.status_code==200 and response.json()['status']=='withdrawn'


@pytest.mark.asyncio
async def test_response_payload_cannot_change_identity_quote_or_invalid_states(client,auth_headers):
    owner,other,creator,outsider,campaign,app,invite=await records(client,auth_headers)
    appurl=f"/api/v1/campaigns/me/applications/{app['id']}/respond"
    base={'action':'accept','expected_status':'pending','expected_campaign_revision':1}
    for patch in ({'creator_id':'forged'},{'rate_cents':1},{'status':'accepted'},{'action':'withdraw'},{'expected_status':'accepted'},{'expected_campaign_revision':0}):
        assert (await client.post(appurl,headers=owner,json={**base,**patch})).status_code==422
    assert (await client.post(f"/api/v1/campaigns/creator/applications/{app['id']}/respond",headers=creator,json=base)).status_code==422
    assert (await client.post(f"/api/v1/campaigns/creator/invitations/{app['id']}/respond",headers=creator,json={**base,'expected_status':'invited'})).status_code==404
    assert (await client.get(f"/api/v1/campaigns/me/applications/{app['id']}",headers=owner)).json()['status']=='pending'
