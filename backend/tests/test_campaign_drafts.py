import uuid

import pytest
from sqlalchemy import select

from app.domains.campaigns.models import Campaign, CampaignStatus


async def brand(client, auth_headers, name):
    headers = auth_headers(sub=f'draft-{name}', email=f'{name}@example.com')
    response = await client.post('/api/v1/organizations', headers=headers,
                                json={'name': f'Brand {name}', 'billing_email': f'{name}@example.com'})
    assert response.status_code == 201
    return headers


@pytest.mark.asyncio
async def test_draft_persistence_partial_brief_retry_and_isolation(client, auth_headers):
    owner = await brand(client, auth_headers, 'owner')
    other = await brand(client, auth_headers, 'other')
    creator = auth_headers(sub='draft-creator', email='creator@example.com')
    creator_id = (await client.get('/api/v1/creators/me', headers=creator)).json()['id']
    payload = {'request_id': str(uuid.uuid4()), 'title': ' Unfinished campaign '}
    created = await client.post('/api/v1/campaigns/drafts', headers=owner, json=payload)
    assert created.status_code == 201, created.text
    campaign = created.json()
    assert campaign['status'] == 'draft' and campaign['revision'] == 1
    assert campaign['title'] == 'Unfinished campaign' and campaign['brief'] == ''
    assert campaign['budget_total_cents'] == 0 and campaign['currency'] == 'INR'
    retry = await client.post('/api/v1/campaigns/drafts', headers=owner, json=payload)
    assert retry.json()['id'] == campaign['id']
    assert len((await client.get('/api/v1/campaigns/me', headers=owner)).json()) == 1
    assert (await client.get('/api/v1/campaigns/explore')).json() == []
    assert (await client.get('/api/v1/campaigns/me', headers=other)).json() == []
    assert (await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=other)).status_code == 403
    update = {'title': 'Revised launch brief', 'brief': 'A saved brief for a real campaign.', 'target_niche': ' Technology ',
              'deliverable_summary': '1 video and 2 reels', 'budget_total_cents': 1234567, 'currency': 'INR',
              'start_date': '2026-12-01T00:00:00Z', 'end_date': '2026-12-12T00:00:00Z', 'expected_revision': 1}
    assert (await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=other, json=update)).status_code == 403
    assert (await client.post('/api/v1/campaigns/drafts', headers=other, json=payload)).status_code == 403
    for headers in (None, creator):
        kwargs = {'headers': headers} if headers else {}
        assert (await client.post('/api/v1/campaigns/drafts', json=payload, **kwargs)).status_code in (401, 403)
        assert (await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", json=update, **kwargs)).status_code in (401, 403)
    saved = await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=owner, json=update)
    assert saved.status_code == 200, saved.text
    assert saved.json()['revision'] == 2 and saved.json()['target_niche'] == 'Technology'
    assert saved.json()['budget_total_cents'] == 1234567
    assert saved.json()['start_date'].startswith('2026-12-01')
    assert (await client.get(f"/api/v1/campaigns/{campaign['id']}", headers=owner)).json() == saved.json()
    # Exact replay is safe; a different old editor cannot overwrite the saved revision.
    assert (await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=owner, json=update)).json()['revision'] == 2
    conflict = await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=owner, json={**update, 'title': 'Stale edit'})
    assert conflict.status_code == 409
    assert (await client.post('/api/v1/campaigns/drafts', headers=owner, json={**payload, 'title': 'Different retry'})).status_code == 409
    assert (await client.get('/api/v1/campaigns/explore')).json() == []
    assert (await client.post(f"/api/v1/campaigns/{campaign['id']}/apply", headers=creator, json={'proposed_rate_cents': 100})).status_code == 422
    assert (await client.post(f"/api/v1/campaigns/{campaign['id']}/invite", headers=owner, json={'creator_id': creator_id, 'offered_rate_cents': 100})).status_code == 422
    partial = await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=owner,
                                 json={'title': 'Partial title update', 'expected_revision': 2})
    assert partial.status_code == 200
    assert partial.json()['budget_total_cents'] == 1234567 and partial.json()['currency'] == 'INR'
    assert partial.json()['brief'] == update['brief'] and partial.json()['revision'] == 3
    invalid_date = await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=owner,
                                      json={'expected_revision': 3, 'start_date': '2026-12-20T00:00:00Z'})
    assert invalid_date.status_code == 422
    # Clearing optional details and an undecided budget remains a private draft.
    clear = {'title': 'Revised launch brief', 'expected_revision': 3, 'target_niche': '', 'deliverable_summary': '', 'budget_total_cents': 0, 'start_date': None, 'end_date': None}
    cleared = await client.patch(f"/api/v1/campaigns/{campaign['id']}/draft", headers=owner, json=clear)
    assert cleared.status_code == 200
    assert cleared.json()['revision'] == 4 and cleared.json()['budget_total_cents'] == 0
    assert cleared.json()['target_niche'] is None and cleared.json()['start_date'] is None


@pytest.mark.asyncio
@pytest.mark.parametrize('invalid', [
    {'title': '  '}, {'title': 'x' * 256}, {'brief': 'x' * 20001}, {'title': None},
    {'budget_total_cents': -1}, {'budget_total_cents': 2_000_000_001}, {'budget_total_cents': 1200.5},
    {'currency': 'usd'}, {'target_niche': 'x' * 129}, {'deliverable_summary': 'x' * 513},
    {'status': 'active'}, {'organization_id': str(uuid.uuid4())}, {'revision': 9},
    {'start_date': '2026-12-12T00:00:00Z', 'end_date': '2026-12-01T00:00:00Z'},
    {'start_date': '2026-12-12T00:00:00'},
])
async def test_draft_rejects_invalid_fields(client, auth_headers, invalid):
    owner = await brand(client, auth_headers, 'validation')
    payload = {'request_id': str(uuid.uuid4()), 'title': 'Valid draft', **invalid}
    assert (await client.post('/api/v1/campaigns/drafts', headers=owner, json=payload)).status_code == 422


@pytest.mark.asyncio
async def test_published_campaign_cannot_be_edited_as_draft(client, auth_headers, db_session):
    owner = await brand(client, auth_headers, 'published')
    created = await client.post('/api/v1/campaigns', headers=owner,
                                json={'title': 'Published campaign', 'brief': 'A complete published brief', 'budget_total_cents': 10000, 'target_niche': 'Technology', 'deliverable_summary': 'One video'})
    assert created.status_code == 201
    campaign_id = created.json()['id']
    result = await client.patch(f'/api/v1/campaigns/{campaign_id}/draft', headers=owner,
                               json={'title': 'Wrong state edit', 'expected_revision': 1})
    assert result.status_code == 409
    row = await db_session.scalar(select(Campaign).where(Campaign.id == campaign_id))
    assert row.status == CampaignStatus.ACTIVE and row.title == 'Published campaign'
