import uuid
import pytest
from sqlalchemy import text, update
from sqlalchemy.exc import IntegrityError
from app.domains.campaigns.models import Campaign, CampaignApplication, CampaignInvitation
from tests.test_campaign_drafts import brand

async def folder(client, headers, title='Summer launch'):
    response = await client.post('/api/v1/campaigns/folders', headers=headers, json={'request_id': str(uuid.uuid4()), 'title': title, 'objective': 'Private launch strategy'})
    assert response.status_code == 201, response.text
    return response.json()

async def draft(client, headers, parent=None):
    response = await client.post('/api/v1/campaigns/drafts', headers=headers, json={'request_id': str(uuid.uuid4()), 'title': 'Instagram reel offer', **({'parent_campaign_id': parent} if parent else {})})
    assert response.status_code == 201, response.text
    return response.json()

@pytest.mark.asyncio
async def test_folder_crud_is_private_scoped_validated_and_retry_safe(client, auth_headers):
    owner = await brand(client, auth_headers, 'hierarchy-owner')
    other = await brand(client, auth_headers, 'hierarchy-other')
    creator = auth_headers(sub='hierarchy-creator', email='hierarchy-creator@example.com')
    await client.get('/api/v1/creators/me', headers=creator)
    payload = {'request_id': str(uuid.uuid4()), 'title': '  Summer launch  ', 'objective': '  Awareness across platforms  '}
    response = await client.post('/api/v1/campaigns/folders', headers=owner, json=payload)
    assert response.status_code == 201, response.text
    saved = response.json()
    assert saved['title'] == 'Summer launch' and saved['objective'] == 'Awareness across platforms'
    assert (await client.post('/api/v1/campaigns/folders', headers=owner, json=payload)).json()['id'] == saved['id']
    assert (await client.post('/api/v1/campaigns/folders', headers=owner, json={**payload, 'title': 'Different campaign'})).status_code == 409
    assert len((await client.get('/api/v1/campaigns/folders', headers=owner)).json()) == 1
    assert (await client.get('/api/v1/campaigns/folders', headers=other)).json() == []
    path = f"/api/v1/campaigns/folders/{saved['id']}"
    assert (await client.get(path, headers=other)).status_code == 404
    assert (await client.get('/api/v1/campaigns/folders')).status_code == 401
    assert (await client.get('/api/v1/campaigns/folders', headers=creator)).status_code == 403
    assert (await client.post('/api/v1/campaigns/folders', headers=creator, json=payload)).status_code == 403
    edit = {'title': 'Summer product launch', 'objective': 'Updated objective', 'expected_revision': 1}
    assert (await client.patch(path, headers=other, json=edit)).status_code == 404
    updated = await client.patch(path, headers=owner, json=edit)
    assert updated.status_code == 200 and updated.json()['revision'] == 2
    assert (await client.patch(path, headers=owner, json=edit)).json()['revision'] == 2
    assert (await client.patch(path, headers=owner, json={**edit, 'title': 'Stale overwrite'})).status_code == 409
    for invalid in ({'title': '  '}, {'objective': 'x'*5001}, {'organization_id': 'forged'}, {'title': 'x'*256}):
        assert (await client.post('/api/v1/campaigns/folders', headers=owner, json={**payload, 'request_id': str(uuid.uuid4()), **invalid})).status_code == 422

@pytest.mark.asyncio
async def test_parent_assignment_is_owned_and_legacy_offers_remain_unassigned(client, auth_headers):
    owner = await brand(client, auth_headers, 'parent-owner')
    other = await brand(client, auth_headers, 'parent-other')
    first, foreign = await folder(client, owner), await folder(client, other)
    legacy, child = await draft(client, owner), await draft(client, owner, first['id'])
    assert legacy['parent_campaign_id'] is None and child['parent_campaign_id'] == first['id']
    rows = (await client.get('/api/v1/campaigns/me', headers=owner)).json()
    assert {row['id'] for row in rows} == {legacy['id'], child['id']}
    for parent in (foreign['id'], str(uuid.uuid4())):
        assert (await client.post('/api/v1/campaigns/drafts', headers=owner, json={'request_id': str(uuid.uuid4()), 'title': 'Invalid child', 'parent_campaign_id': parent})).status_code == 404
        assert (await client.patch(f"/api/v1/campaigns/{child['id']}/draft", headers=owner, json={'expected_revision': 1, 'parent_campaign_id': parent})).status_code == 404
    sibling = await draft(client, owner, first['id'])
    assert sibling['id'] != child['id'] and sibling['parent_campaign_id'] == child['parent_campaign_id']

@pytest.mark.asyncio
async def test_move_live_offer_preserves_records_and_public_folder_privacy(client, auth_headers, db_session):
    owner, other = await brand(client, auth_headers, 'move-owner'), await brand(client, auth_headers, 'move-other')
    first, second, foreign = await folder(client, owner), await folder(client, owner, 'Regional launch'), await folder(client, other)
    created = await client.post('/api/v1/campaigns', headers=owner, json={'parent_campaign_id': first['id'], 'title': 'Published offer', 'brief': 'A complete published brief', 'target_niche': 'Lifestyle', 'deliverable_summary': 'One reel', 'budget_total_cents': 1234567, 'currency': 'INR'})
    assert created.status_code == 201, created.text
    offer = created.json()
    creator = auth_headers(sub='move-creator', email='move-creator@example.com')
    creator_id = (await client.get('/api/v1/creators/me', headers=creator)).json()['id']
    application = (await client.post(f"/api/v1/campaigns/{offer['id']}/apply", headers=creator, json={'proposed_rate_cents': 50000})).json()
    invitation = (await client.post(f"/api/v1/campaigns/{offer['id']}/invite", headers=owner, json={'creator_id': creator_id, 'offered_rate_cents': 50000})).json()
    path, body = f"/api/v1/campaigns/{offer['id']}/folder", {'parent_campaign_id': second['id'], 'expected_revision': offer['revision']}
    assert (await client.patch(path, headers=other, json=body)).status_code == 404
    assert (await client.patch(path, headers=creator, json=body)).status_code == 403
    assert (await client.patch(path, headers=owner, json={**body, 'parent_campaign_id': foreign['id']})).status_code == 404
    moved = await client.patch(path, headers=owner, json=body)
    assert moved.status_code == 200, moved.text
    saved = moved.json()
    assert saved['parent_campaign_id'] == second['id'] and saved['revision'] == offer['revision']+1
    for key in ('id', 'status', 'budget_total_cents', 'brief', 'visibility'): assert saved[key] == offer[key]
    assert (await client.patch(path, headers=owner, json=body)).json()['revision'] == saved['revision']
    assert (await client.patch(path, headers=owner, json={**body, 'parent_campaign_id': first['id']})).status_code == 409
    assert (await db_session.get(CampaignApplication, application['id'])).campaign_id == offer['id']
    assert (await db_session.get(CampaignInvitation, invitation['id'])).campaign_id == offer['id']
    public = (await client.get(f"/api/v1/offers/{offer['id']}/public")).json()
    assert 'parent_campaign_id' not in public and 'Private launch strategy' not in str(public)
    own = (await client.get(f"/api/v1/offers/{offer['id']}", headers=owner)).json()
    assert own['parent_campaign_id'] == second['id'] and own['parent_campaign_title'] == second['title']
    recipient = (await client.get(f"/api/v1/offers/{offer['id']}", headers=creator)).json()
    assert recipient['parent_campaign_id'] is None and recipient['parent_campaign_title'] is None

@pytest.mark.asyncio
async def test_database_rejects_cross_organization_parent_even_without_service(client, auth_headers, db_session):
    await db_session.execute(text('PRAGMA foreign_keys=ON'))
    owner, other = await brand(client, auth_headers, 'constraint-owner'), await brand(client, auth_headers, 'constraint-other')
    foreign, offer = await folder(client, other), await draft(client, owner)
    with pytest.raises(IntegrityError):
        await db_session.execute(update(Campaign).where(Campaign.id == offer['id']).values(parent_campaign_id=foreign['id']))
        await db_session.commit()
    await db_session.rollback()

@pytest.mark.asyncio
async def test_opening_campaign_records_private_recency_without_conflicting_with_edits(client, auth_headers):
    owner = await brand(client, auth_headers, 'recent-owner')
    other = await brand(client, auth_headers, 'recent-other')
    saved = await folder(client, owner)
    path = f"/api/v1/campaigns/folders/{saved['id']}/open"
    assert saved['last_opened_at'] is None
    assert (await client.post(path, headers=other)).status_code == 404
    assert (await client.post(path)).status_code == 401
    opened = await client.post(path, headers=owner)
    assert opened.status_code == 200
    assert opened.json()['last_opened_at'] is not None
    assert opened.json()['revision'] == saved['revision']
    assert opened.json()['updated_at'] == saved['updated_at']
    reread = (await client.get('/api/v1/campaigns/folders', headers=owner)).json()[0]
    assert reread['last_opened_at'] == opened.json()['last_opened_at']
    # A draft editor opened before navigation is still valid after the read event.
    edited = await client.patch(f"/api/v1/campaigns/folders/{saved['id']}", headers=owner,
        json={'title': 'Edited recent campaign', 'objective': saved['objective'], 'expected_revision': saved['revision']})
    assert edited.status_code == 200
