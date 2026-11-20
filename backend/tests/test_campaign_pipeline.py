from datetime import datetime, timedelta, timezone
import uuid

import pytest
from sqlalchemy import select

from app.domains.campaigns.models import Campaign, CampaignApplication, CampaignInvitation, CampaignStatus, ApplicationStatus, InvitationStatus
from test_campaign_lifecycle import setup_brand, complete_brief


@pytest.mark.asyncio
async def test_pipeline_owner_scope_all_statuses_and_no_cross_product(client, auth_headers, db_session):
    owner = await setup_brand(client, auth_headers, 'pipeline-owner')
    other = await setup_brand(client, auth_headers, 'pipeline-other')
    campaigns = []
    for headers, currency in [(owner, 'INR'), (owner, 'USD'), (other, 'INR')]:
        response = await client.post('/api/v1/campaigns/drafts', headers=headers,
            json={**complete_brief(), 'currency': currency, 'request_id': str(uuid.uuid4())})
        assert response.status_code == 201, response.text
        campaigns.append(response.json())
    creator_ids = []
    for index in range(4):
        headers = auth_headers(sub=f'pipeline-creator-{index}', email=f'pipeline-{index}@example.com')
        creator_ids.append((await client.get('/api/v1/creators/me', headers=headers)).json()['id'])
    for campaign in campaigns:
        for index, state in enumerate(ApplicationStatus):
            db_session.add(CampaignApplication(campaign_id=campaign['id'], creator_id=creator_ids[index], proposed_rate_cents=1000, status=state))
        for index, state in enumerate(InvitationStatus):
            db_session.add(CampaignInvitation(campaign_id=campaign['id'], creator_id=creator_ids[index], offered_rate_cents=1000, status=state))
    first = await db_session.scalar(select(Campaign).where(Campaign.id == campaigns[0]['id']))
    first.status = CampaignStatus.ACTIVE
    first.end_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    second = await db_session.scalar(select(Campaign).where(Campaign.id == campaigns[1]['id']))
    second.status = CampaignStatus.COMPLETED
    await db_session.commit()
    response = await client.get('/api/v1/campaigns/me/summary', headers=owner)
    assert response.status_code == 200, response.text
    summary = response.json()
    assert summary['campaign_count'] == 2
    assert summary['active_campaign_count'] == 1
    assert summary['planned_budgets'] == [{'currency': 'INR', 'cents': 150000}, {'currency': 'USD', 'cents': 150000}]
    assert summary['applications'] == {'total': 8, 'pending': 2, 'accepted': 2, 'rejected': 2, 'withdrawn': 2}
    assert summary['invitations'] == {'total': 6, 'invited': 2, 'accepted': 2, 'declined': 2}
    assert summary['updated_at']
    assert 'creators' not in summary and 'spend' not in summary
    # Expired active campaigns no longer count as open, but their history stays.
    first.end_date = datetime.now(timezone.utc) - timedelta(days=1)
    await db_session.commit()
    refreshed = (await client.get('/api/v1/campaigns/me/summary', headers=owner)).json()
    assert refreshed['active_campaign_count'] == 0
    assert refreshed['applications']['total'] == 8
    isolated = (await client.get('/api/v1/campaigns/me/summary', headers=other)).json()
    assert isolated['campaign_count'] == 1 and isolated['applications']['total'] == 4


@pytest.mark.asyncio
async def test_pipeline_empty_and_authentication(client, auth_headers):
    owner = await setup_brand(client, auth_headers, 'pipeline-empty')
    result = (await client.get('/api/v1/campaigns/me/summary', headers=owner)).json()
    assert result['campaign_count'] == result['active_campaign_count'] == 0
    assert result['planned_budgets'] == []
    assert all(value == 0 for value in result['applications'].values())
    assert all(value == 0 for value in result['invitations'].values())
    assert (await client.get('/api/v1/campaigns/me/summary')).status_code == 401
    creator = auth_headers(sub='pipeline-forbidden', email='pipeline-forbidden@example.com')
    assert (await client.get('/api/v1/campaigns/me/summary', headers=creator)).status_code == 403


@pytest.mark.asyncio
async def test_offer_interest_preview_is_owner_only_bounded_and_matches_total(client, auth_headers, db_session):
    from app.domains.creators.models import Creator
    from app.domains.identity.models import User
    owner = await setup_brand(client, auth_headers, 'interest-owner')
    other = await setup_brand(client, auth_headers, 'interest-other')
    offer = (await client.post('/api/v1/campaigns', headers=owner, json=complete_brief())).json()
    empty = (await client.post('/api/v1/campaigns', headers=owner, json=complete_brief())).json()
    other_offer = (await client.post('/api/v1/campaigns', headers=other, json=complete_brief())).json()
    people = []
    for index in range(6):
        headers = auth_headers(sub=f'interest-creator-{index}', email=f'interest-{index}@example.com')
        profile = (await client.get('/api/v1/creators/me', headers=headers)).json()
        creator = await db_session.get(Creator, profile['id'])
        creator.display_name = f'Interested creator {index}'
        user = await db_session.get(User, creator.user_id)
        user.avatar_url = f'https://lh3.googleusercontent.com/interest-{index}.png'
        db_session.add(CampaignApplication(campaign_id=offer['id'], creator_id=creator.id, proposed_rate_cents=1000,
            created_at=datetime.now(timezone.utc)+timedelta(seconds=index)))
        people.append(creator.id)
    db_session.add(CampaignApplication(campaign_id=other_offer['id'], creator_id=people[0], proposed_rate_cents=1000))
    await db_session.commit()
    rows = (await client.get('/api/v1/campaigns/me', headers=owner)).json()
    preview = next(row for row in rows if row['id'] == offer['id'])
    assert preview['applicants_count'] == 6 and len(preview['applicant_preview']) == 4
    assert [p['id'] for p in preview['applicant_preview']] == list(reversed(people[2:]))
    assert preview['applicant_preview'][0]['avatar_url'] == 'https://lh3.googleusercontent.com/interest-5.png'
    assert set(preview['applicant_preview'][0]) == {'id','display_name','avatar_url'}
    untouched = next(row for row in rows if row['id'] == empty['id'])
    assert untouched['applicants_count'] == 0 and untouched['applicant_preview'] == []
    isolated = (await client.get('/api/v1/campaigns/me', headers=other)).json()
    assert len(isolated) == 1 and isolated[0]['applicants_count'] == 1
    assert len(isolated[0]['applicant_preview']) == 1
    public = (await client.get('/api/v1/campaigns/explore')).json()
    assert all(not row['applicant_preview'] for row in public)
    assert (await client.get('/api/v1/campaigns/me')).status_code == 401
