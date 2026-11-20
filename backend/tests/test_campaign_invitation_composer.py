from datetime import datetime,timedelta,timezone
import pytest
from sqlalchemy import select,func
from app.domains.campaigns.models import Campaign,CampaignInvitation,InvitationStatus
from app.domains.identity.models import User
from test_campaign_lifecycle import setup_brand,complete_brief,transition


async def setup(client,auth_headers):
    owner=await setup_brand(client,auth_headers,'invite-owner')
    other=await setup_brand(client,auth_headers,'invite-other')
    creator=auth_headers(sub='invite-recipient',email='recipient@example.com')
    person=(await client.get('/api/v1/creators/me',headers=creator)).json()
    campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    payload={'creator_id':person['id'],'offered_rate_cents':12345,'message':' An invitation to review. ','expected_campaign_revision':campaign['revision']}
    return owner,other,creator,person,campaign,payload


@pytest.mark.asyncio
async def test_invitation_lookup_create_safe_retry_and_saved_response(client,auth_headers,db_session):
    owner,other,creator,person,campaign,payload=await setup(client,auth_headers)
    resolve=f"/api/v1/campaigns/invitation-recipient/{person['handle']}"
    response=await client.get(resolve,headers=owner)
    assert response.status_code==200 and response.json()=={k:person[k] for k in ('id','handle','display_name')}
    assert (await client.get(resolve)).status_code==401
    assert (await client.get(resolve,headers=creator)).status_code==403
    lookup=f"/api/v1/campaigns/{campaign['id']}/invitation/{person['id']}"
    assert (await client.get(lookup,headers=owner)).json() is None
    assert (await client.get(lookup,headers=other)).status_code==403
    url=f"/api/v1/campaigns/{campaign['id']}/invite"
    assert (await client.post(url,headers=other,json=payload)).status_code==403
    assert (await client.post(url,headers=creator,json=payload)).status_code==403
    assert (await client.post(url,json=payload)).status_code==401
    result=await client.post(url,headers=owner,json=payload)
    assert result.status_code==201,result.text
    saved=result.json();assert saved['message']=='An invitation to review.' and saved['offered_rate_cents']==12345
    retry=await client.post(url,headers=owner,json=payload)
    assert retry.status_code==201 and retry.json()['id']==saved['id']
    assert (await client.get(lookup,headers=owner)).json()['id']==saved['id']
    for patch in ({'offered_rate_cents':99999},{'message':'Different offer'}):
        response=await client.post(url,headers=owner,json={**payload,**patch})
        assert response.status_code==409,response.text
    # A lost-response retry cannot reinvite a creator who has since responded.
    invitation=await db_session.get(CampaignInvitation,saved['id']);invitation.status=InvitationStatus.DECLINED;await db_session.commit()
    await transition(client,owner,campaign,'pause')
    retried=await client.post(url,headers=owner,json=payload)
    assert retried.status_code==201 and retried.json()['status']=='declined'
    assert await db_session.scalar(select(func.count()).select_from(CampaignInvitation))==1
    assert (await client.get('/api/v1/campaigns/creator/invitations',headers=creator)).json()['items'][0]['status']=='declined'


@pytest.mark.asyncio
async def test_creator_must_exist_and_remain_active(client,auth_headers,db_session):
    owner,other,creator,person,campaign,payload=await setup(client,auth_headers)
    url=f"/api/v1/campaigns/{campaign['id']}/invite"
    assert (await client.post(url,headers=owner,json={**payload,'creator_id':'missing'})).status_code==404
    from app.domains.creators.models import Creator
    profile=await db_session.get(Creator,person['id']);user=await db_session.get(User,profile.user_id);user.is_active=False;await db_session.commit()
    assert (await client.get(f"/api/v1/campaigns/invitation-recipient/{person['handle']}",headers=owner)).status_code==404
    assert (await client.post(url,headers=owner,json=payload)).status_code==404
    assert await db_session.scalar(select(func.count()).select_from(CampaignInvitation))==0


@pytest.mark.asyncio
@pytest.mark.parametrize('action',['pause','close','cancel','expire','pause-resume'])
async def test_new_invitation_rechecks_campaign_eligibility_and_revision(client,auth_headers,db_session,action):
    owner,other,creator,person,campaign,payload=await setup(client,auth_headers)
    current=campaign
    if action=='expire':
        row=await db_session.get(Campaign,campaign['id']);row.end_date=datetime.now(timezone.utc)-timedelta(days=2);await db_session.commit()
    elif action=='pause-resume':
        current=(await transition(client,owner,campaign,'pause')).json()
        current=(await transition(client,owner,current,'resume')).json()
    else:current=(await transition(client,owner,campaign,action)).json()
    url=f"/api/v1/campaigns/{campaign['id']}/invite"
    response=await client.post(url,headers=owner,json=payload)
    assert response.status_code in (409,422),response.text
    assert await db_session.scalar(select(func.count()).select_from(CampaignInvitation))==0
    if action=='pause-resume':
        response=await client.post(url,headers=owner,json={**payload,'expected_campaign_revision':current['revision']})
        assert response.status_code==201,response.text


@pytest.mark.asyncio
@pytest.mark.parametrize('patch',[{'offered_rate_cents':99},{'offered_rate_cents':2_000_000_001},{'offered_rate_cents':123.4},{'message':'x'*5001},{'expected_campaign_revision':0},{'status':'accepted'},{'organization_id':'forged'}])
async def test_invitation_payload_rejects_invalid_offer_and_identity_changes(client,auth_headers,patch):
    owner,other,creator,person,campaign,payload=await setup(client,auth_headers)
    assert (await client.post(f"/api/v1/campaigns/{campaign['id']}/invite",headers=owner,json={**payload,**patch})).status_code==422
