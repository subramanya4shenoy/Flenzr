import uuid
import pytest
from sqlalchemy import select
from app.domains.brands.models import Organization
from app.domains.campaigns.models import CampaignApplication, CampaignInvitation, ApplicationStatus, InvitationStatus, Campaign
from app.domains.enquiries.models import Enquiry
from test_campaign_lifecycle import setup_brand, complete_brief


async def sources(client, auth_headers, db):
    owner = await setup_brand(client, auth_headers, 'shared-owner')
    outsider = await setup_brand(client, auth_headers, 'shared-outsider')
    creator = auth_headers(sub='shared-creator', email='shared-creator@example.com')
    creator_id = (await client.get('/api/v1/creators/me', headers=creator)).json()['id']
    campaign = (await client.post('/api/v1/campaigns/drafts', headers=owner,
        json={**complete_brief(), 'request_id': str(uuid.uuid4())})).json()
    org = await db.scalar(select(Organization).where(Organization.id == campaign['organization_id']))
    application = CampaignApplication(campaign_id=campaign['id'], creator_id=creator_id, status=ApplicationStatus.ACCEPTED, proposed_rate_cents=12345)
    invitation = CampaignInvitation(campaign_id=campaign['id'], creator_id=creator_id, status=InvitationStatus.ACCEPTED, offered_rate_cents=23456)
    enquiry = Enquiry(creator_id=creator_id, sender_id=org.owner_id, request_id=str(uuid.uuid4()), payload_hash='a'*64,
        brand_name='Enquiry brand', brief='Original private brief', deliverable='One reel', amount_cents=None, currency='INR', status='accepted')
    db.add_all([application, invitation, enquiry]); await db.commit()
    return owner, creator, outsider, [('application', application), ('invitation', invitation), ('enquiry', enquiry)]


@pytest.mark.asyncio
async def test_shared_sources_participant_scope_snapshots_retry_and_reload(client, auth_headers, db_session):
    owner, creator, outsider, records = await sources(client, auth_headers, db_session)
    created = []
    for kind, source in records:
        body = {'source_kind': kind, 'source_id': source.id}
        response = await client.post('/api/v1/collaborations', headers=owner, json=body)
        assert response.status_code == 200, response.text
        row = response.json();created.append(row)
        assert row['source_kind'] == kind and row['source_id'] == source.id and row['status'] == 'discussion'
        assert not {'brand_user_id','creator_user_id','email','sender_id'} & row.keys()
        for headers in (owner, creator):
            assert (await client.get('/api/v1/collaborations/'+row['id'], headers=headers)).json() == row
            assert (await client.post('/api/v1/collaborations', headers=headers, json=body)).json()['id'] == row['id']
        assert (await client.get('/api/v1/collaborations/'+row['id'], headers=outsider)).status_code == 404
        assert (await client.post('/api/v1/collaborations', headers=outsider, json=body)).status_code == 404
    assert created[0]['quoted_amount_cents'] == 12345 and created[1]['quoted_amount_cents'] == 23456
    assert created[2]['quoted_amount_cents'] is None
    campaign = await db_session.scalar(select(Campaign).where(Campaign.id == records[0][1].campaign_id))
    campaign.title = 'Changed after snapshot'
    records[2][1].brief = 'Changed enquiry brief'
    await db_session.commit()
    assert (await client.get('/api/v1/collaborations/'+created[0]['id'],headers=creator)).json()['title'] == created[0]['title']
    assert (await client.get('/api/v1/collaborations/'+created[2]['id'],headers=creator)).json()['brief'] == 'Original private brief'
    for headers in (owner,creator):
        page1 = (await client.get('/api/v1/collaborations?page_size=2',headers=headers)).json()
        page2 = (await client.get('/api/v1/collaborations?page_size=2&page=2',headers=headers)).json()
        assert page1['total'] == page2['total'] == 3
        assert len(page1['items']) == 2 and len(page2['items']) == 1
        assert not {r['id'] for r in page1['items']} & {r['id'] for r in page2['items']}
    assert (await client.get('/api/v1/collaborations',headers=outsider)).json()['total'] == 0


@pytest.mark.parametrize('kind,state', [('application',s) for s in ApplicationStatus if s != ApplicationStatus.ACCEPTED] + [('invitation',s) for s in InvitationStatus if s != InvitationStatus.ACCEPTED] + [('enquiry','pending'),('enquiry','declined'),('enquiry','withdrawn')])
@pytest.mark.asyncio
async def test_unaccepted_source_cannot_create(client,auth_headers,db_session,kind,state):
    owner,creator,outsider,records = await sources(client,auth_headers,db_session)
    source = dict(records)[kind]; source.status = state
    await db_session.commit()
    response = await client.post('/api/v1/collaborations',headers=creator,json={'source_kind':kind,'source_id':source.id})
    assert response.status_code == 409, response.text
    assert (await client.get('/api/v1/collaborations',headers=owner)).json()['total'] == 0


@pytest.mark.asyncio
async def test_collaborations_auth_validation_no_body_granted_access(client,auth_headers,db_session):
    owner,creator,outsider,records = await sources(client,auth_headers,db_session)
    body = {'source_kind':'application','source_id':records[0][1].id}
    for path in ('/api/v1/collaborations','/api/v1/collaborations/'+str(uuid.uuid4())):
        assert (await client.get(path)).status_code == 401
    assert (await client.post('/api/v1/collaborations',json=body)).status_code == 401
    for extra in ({'status':'agreed'},{'brand_user_id':str(uuid.uuid4())},{'quoted_amount_cents':1}):
        assert (await client.post('/api/v1/collaborations',headers=owner,json={**body,**extra})).status_code == 422
    assert (await client.post('/api/v1/collaborations',headers=owner,json={**body,'source_id':str(uuid.uuid4())})).status_code == 404
    assert (await client.get('/api/v1/collaborations?page_size=100',headers=owner)).status_code == 422


@pytest.mark.asyncio
async def test_self_collaboration_rejected_and_acceptance_is_explicit(client,auth_headers,db_session):
    owner,creator,outsider,records = await sources(client,auth_headers,db_session)
    assert (await client.get('/api/v1/collaborations',headers=owner)).json()['total'] == 0
    own_creator_id = (await client.get('/api/v1/creators/me',headers=owner)).json()['id']
    source = dict(records)['application'];source.creator_id = own_creator_id
    await db_session.commit()
    response = await client.post('/api/v1/collaborations',headers=owner,json={'source_kind':'application','source_id':source.id})
    assert response.status_code == 409
    assert response.json()['error']['code'] == 'SELF_COLLABORATION'


@pytest.mark.asyncio
async def test_individual_enquiry_sender_without_brand_organization_can_collaborate(client,auth_headers,db_session):
    from app.domains.creators.models import Creator
    owner,creator,outsider,records = await sources(client,auth_headers,db_session)
    individual = auth_headers(sub='individual-enquiry-client',email='individual-client@example.com')
    profile = (await client.get('/api/v1/creators/me',headers=individual)).json()
    sender = await db_session.scalar(select(Creator.user_id).where(Creator.id == profile['id']))
    source = Enquiry(creator_id=records[2][1].creator_id,sender_id=sender,request_id=str(uuid.uuid4()),payload_hash='b'*64,
        brand_name='Independent client',brief='Accepted individual client enquiry',deliverable='One review',amount_cents=1000,currency='INR',status='accepted')
    db_session.add(source);await db_session.commit()
    response = await client.post('/api/v1/collaborations',headers=individual,json={'source_kind':'enquiry','source_id':source.id})
    assert response.status_code == 200,response.text
    assert (await client.get('/api/v1/collaborations/'+response.json()['id'],headers=creator)).status_code == 200
    assert (await client.get('/api/v1/collaborations/'+response.json()['id'],headers=owner)).status_code == 404


@pytest.mark.asyncio
async def test_offer_collaboration_groups_and_multi_influencer_workspace(client,auth_headers,db_session):
    owner,creator,outsider,records = await sources(client,auth_headers,db_session)
    app_src = dict(records)['application']
    enq_src = dict(records)['enquiry']
    # Start collaboration for the direct enquiry only; leave accepted application unstarted.
    enq_collab = await client.post('/api/v1/collaborations',headers=owner,json={'source_kind':'enquiry','source_id':enq_src.id})
    assert enq_collab.status_code == 200
    # Brand sees the Offer grouped (with accepted application + accepted invitation) plus the direct enquiry row.
    groups = await client.get('/api/v1/collaborations/groups',headers=owner)
    assert groups.status_code == 200, groups.text
    items = groups.json()['items']
    offer_item = next(item for item in items if item['kind'] == 'offer')
    assert offer_item['id'] == app_src.campaign_id
    assert offer_item['creator_count'] == 2
    assert offer_item['started_count'] == 0
    assert any(item['kind'] == 'collaboration' and item['id'] == enq_collab.json()['id'] for item in items)
    # Offer workspace is strictly brand-owner scoped.
    ws = await client.get(f'/api/v1/collaborations/offers/{app_src.campaign_id}',headers=owner)
    assert ws.status_code == 200, ws.text
    assert len(ws.json()['participants']) == 2
    assert all(p['proposal_status'] == 'not_started' for p in ws.json()['participants'])
    assert (await client.get(f'/api/v1/collaborations/offers/{app_src.campaign_id}',headers=creator)).status_code == 404
    assert (await client.get(f'/api/v1/collaborations/offers/{app_src.campaign_id}',headers=outsider)).status_code == 404
    # Starting a collaboration for the application updates started_count and participant status.
    started = await client.post('/api/v1/collaborations',headers=owner,json={'source_kind':'application','source_id':app_src.id})
    assert started.status_code == 200
    ws2 = (await client.get(f'/api/v1/collaborations/offers/{app_src.campaign_id}',headers=owner)).json()
    started_p = next(p for p in ws2['participants'] if p['source_id'] == app_src.id)
    assert started_p['collaboration_id'] == started.json()['id']
    assert started_p['proposal_status'] == 'no_proposal'
    # Creator only ever sees their own individual collaborations, never grouped brand offers.
    creator_groups = (await client.get('/api/v1/collaborations/groups',headers=creator)).json()['items']
    assert all(item['kind'] == 'collaboration' for item in creator_groups)
