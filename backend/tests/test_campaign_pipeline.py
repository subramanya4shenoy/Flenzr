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
