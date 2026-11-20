from datetime import datetime, timedelta, timezone
import uuid

import pytest
from sqlalchemy import select

from app.domains.campaigns.models import Campaign, CampaignApplication, CampaignInvitation


async def setup_brand(client, auth_headers, suffix):
    headers = auth_headers(sub=f'lifecycle-{suffix}', email=f'{suffix}@example.com')
    response = await client.post('/api/v1/organizations', headers=headers, json={'name': f'Brand {suffix}', 'billing_email': f'{suffix}@example.com'})
    assert response.status_code == 201
    return headers


def complete_brief():
    return {'title': 'Creator launch campaign', 'brief': 'Review the product and share an honest first impression.',
            'target_niche': 'Technology', 'deliverable_summary': 'One dedicated video', 'budget_total_cents': 150000,
            'currency': 'INR', 'end_date': (datetime.now(timezone.utc)+timedelta(days=10)).isoformat()}


async def transition(client, headers, campaign, action):
    return await client.post(f"/api/v1/campaigns/{campaign['id']}/transition", headers=headers,
                             json={'action': action, 'expected_revision': campaign['revision'], 'expected_status': campaign['status']})


@pytest.mark.asyncio
async def test_publish_pause_resume_close_and_safe_retries(client, auth_headers, db_session):
    owner = await setup_brand(client, auth_headers, 'owner')
    other = await setup_brand(client, auth_headers, 'other')
    creator = auth_headers(sub='lifecycle-creator', email='creator@example.com')
    creator_id = (await client.get('/api/v1/creators/me', headers=creator)).json()['id']
    draft = (await client.post('/api/v1/campaigns/drafts', headers=owner, json={'title':'Unfinished draft','request_id':str(uuid.uuid4())})).json()
    assert (await transition(client,owner,draft,'publish')).status_code == 422
    assert (await client.get('/api/v1/campaigns/explore')).json() == []
    full = complete_brief()
    draft = (await client.patch(f"/api/v1/campaigns/{draft['id']}/draft", headers=owner, json={**full,'expected_revision':1})).json()
    for headers in (other,creator):
        assert (await transition(client,headers,draft,'publish')).status_code == 403
    assert (await client.post(f"/api/v1/campaigns/{draft['id']}/transition", json={'action':'publish','expected_revision':draft['revision'],'expected_status':'draft'})).status_code == 401
    published = await transition(client,owner,draft,'publish')
    assert published.status_code == 200,published.text
    active = published.json()
    assert active['status'] == 'active' and active['revision'] == draft['revision']+1
    replay = await transition(client,owner,draft,'publish')
    assert replay.json()['revision'] == active['revision']
    assert [item['id'] for item in (await client.get('/api/v1/campaigns/explore')).json()] == [draft['id']]
    assert (await client.post(f"/api/v1/campaigns/{draft['id']}/apply",headers=creator,json={'proposed_rate_cents':1000})).status_code == 201
    assert (await client.post(f"/api/v1/campaigns/{draft['id']}/invite",headers=owner,json={'creator_id':creator_id,'offered_rate_cents':1000})).status_code == 201
    assert (await client.get(f"/api/v1/campaigns/{draft['id']}",headers=owner)).json()['applicants_count'] == 1
    paused = (await transition(client,owner,active,'pause')).json()
    assert paused['status'] == 'paused' and paused['applicants_count'] == 1
    assert (await client.get('/api/v1/campaigns/explore')).json() == []
    new_creator = auth_headers(sub='lifecycle-new-creator', email='new-creator@example.com')
    await client.get('/api/v1/creators/me', headers=new_creator)
    for endpoint,payload,headers in [('apply',{'proposed_rate_cents':1000},new_creator),('invite',{'creator_id':str(uuid.uuid4()),'offered_rate_cents':1000},owner)]:
        assert (await client.post(f"/api/v1/campaigns/{draft['id']}/{endpoint}",headers=headers,json=payload)).status_code == 422
    assert (await transition(client,owner,active,'close')).status_code == 409
    resumed = (await transition(client,owner,paused,'resume')).json()
    assert resumed['status'] == 'active'
    closed = (await transition(client,owner,resumed,'close')).json()
    assert closed['status'] == 'completed'
    assert (await client.get('/api/v1/campaigns/explore')).json() == []
    assert (await transition(client,owner,closed,'resume')).status_code == 409
    assert (await transition(client,owner,closed,'publish')).status_code == 409
    application = await db_session.scalar(select(CampaignApplication).where(CampaignApplication.campaign_id==draft['id']))
    invitation = await db_session.scalar(select(CampaignInvitation).where(CampaignInvitation.campaign_id==draft['id']))
    assert application.status.value == 'pending' and invitation.status.value == 'invited'


@pytest.mark.asyncio
async def test_cancel_is_terminal_for_drafts_and_live_campaigns(client,auth_headers):
    owner=await setup_brand(client,auth_headers,'cancel')
    draft=(await client.post('/api/v1/campaigns/drafts',headers=owner,json={'title':'Cancel this draft','request_id':str(uuid.uuid4())})).json()
    cancelled=(await transition(client,owner,draft,'cancel')).json()
    assert cancelled['status']=='cancelled'
    assert (await transition(client,owner,draft,'cancel')).json()['revision']==cancelled['revision']
    for action in ('publish','resume','pause','close'):
        assert (await transition(client,owner,cancelled,action)).status_code==409
    assert (await client.patch(f"/api/v1/campaigns/{draft['id']}/draft",headers=owner,json={'title':'Cannot change','expected_revision':cancelled['revision']})).status_code==409
    live=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    assert (await transition(client,owner,live,'cancel')).json()['status']=='cancelled'


@pytest.mark.asyncio
async def test_past_end_date_and_legacy_create_obey_publication_rules(client,auth_headers,db_session):
    owner=await setup_brand(client,auth_headers,'dates')
    from app.domains.campaigns.schemas import CampaignCreate
    normalized = CampaignCreate(**{**complete_brief(), 'end_date': '2040-12-12T00:00:00+05:30'})
    assert normalized.end_date.utcoffset().total_seconds() == 0 and normalized.end_date.hour == 18

    creator=auth_headers(sub='lifecycle-dates-creator',email='dates-creator@example.com')
    creator_id=(await client.get('/api/v1/creators/me',headers=creator)).json()['id']
    past=(datetime.now(timezone.utc)-timedelta(days=2)).isoformat()
    assert (await client.post('/api/v1/campaigns',headers=owner,json={'title':'Incomplete legacy','brief':'A readable legacy brief','budget_total_cents':10000})).status_code==422
    assert (await client.post('/api/v1/campaigns',headers=owner,json={**complete_brief(),'end_date':past})).status_code==422
    draft=(await client.post('/api/v1/campaigns/drafts',headers=owner,json={**complete_brief(),'request_id':str(uuid.uuid4()),'end_date':past})).json()
    assert (await transition(client,owner,draft,'publish')).status_code==422
    live=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    row=await db_session.get(Campaign,live['id']);row.end_date=datetime.now(timezone.utc)-timedelta(days=1);await db_session.commit()
    assert (await client.get('/api/v1/campaigns/explore')).json()==[]
    assert (await client.post(f"/api/v1/campaigns/{live['id']}/apply",headers=creator,json={'proposed_rate_cents':1000})).status_code==422
    assert (await client.post(f"/api/v1/campaigns/{live['id']}/invite",headers=owner,json={'creator_id':creator_id,'offered_rate_cents':1000})).status_code==422
    paused=(await transition(client,owner,live,'pause')).json()
    assert (await transition(client,owner,paused,'resume')).status_code==422


@pytest.mark.asyncio
@pytest.mark.parametrize('extra',[{'action':'activate'},{'status':'active'},{'expected_revision':0},{'expected_status':'invalid'}])
async def test_transition_payloads_reject_invalid_or_extra_fields(client,auth_headers,extra):
    owner=await setup_brand(client,auth_headers,'invalid')
    payload={'action':'publish','expected_revision':1,'expected_status':'draft',**extra}
    assert (await client.post('/api/v1/campaigns/missing/transition',headers=owner,json=payload)).status_code==422
