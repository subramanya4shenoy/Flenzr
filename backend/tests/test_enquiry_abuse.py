import uuid
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import func, select, update
from app.core.config import settings
from app.domains.enquiries.models import Enquiry
from app.domains.notifications.models import Notification, NotificationEmail
from test_enquiries import setup


@pytest.fixture(autouse=True)
def production_guards(monkeypatch):
    monkeypatch.setattr(settings, 'ENQUIRY_SEND_COOLDOWN_SECONDS', 30)
    monkeypatch.setattr(settings, 'ENQUIRY_CREATOR_DAILY_LIMIT', 3)
    monkeypatch.setattr(settings, 'ENQUIRY_BLOCK_DUPLICATES', True)


def retry(response, code):
    assert response.status_code == 429, response.text
    error = response.json()['error']
    assert error['code'] == code
    detail = error['details'][0]
    seconds = int(response.headers['retry-after'])
    assert seconds == detail['retry_after_seconds'] and seconds > 0
    assert datetime.fromisoformat(detail['retry_at']).tzinfo is not None
    assert response.headers['cache-control'] == 'no-store'
    return seconds


async def age(db, enquiry_id, seconds):
    await db.execute(update(Enquiry).where(Enquiry.id == enquiry_id)
                     .values(created_at=datetime.now(timezone.utc) - timedelta(seconds=seconds)))
    await db.commit()


@pytest.mark.asyncio
async def test_new_request_cooldown_and_successful_retry_bypass(client, auth_headers, db_session):
    _, brand, stranger, _, body = await setup(client, auth_headers)
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    # Another creator proves the cooldown applies across the sender's targets.
    other = (await client.get('/api/v1/creators/me', headers=stranger)).json()
    second_body = {**body, 'request_id': str(uuid.uuid4()), 'creator_handle': other['handle']}
    blocked = await client.post('/api/v1/enquiries', headers=brand, json=second_body)
    assert 1 <= retry(blocked, 'ENQUIRY_COOLDOWN') <= 30
    repeated = await client.post('/api/v1/enquiries', headers=brand, json=body)
    assert repeated.status_code == 200 and repeated.json()['id'] == first['id']
    assert await db_session.scalar(select(func.count()).select_from(Enquiry)) == 1
    assert await db_session.scalar(select(func.count()).select_from(Notification)) == 2
    assert await db_session.scalar(select(func.count()).select_from(NotificationEmail)) == 2
    await age(db_session, first['id'], 31)
    assert (await client.post('/api/v1/enquiries', headers=brand, json=second_body)).status_code == 201


@pytest.mark.asyncio
async def test_duplicate_content_survives_new_ids_case_spacing_and_withdrawal(client, auth_headers, db_session):
    _, brand, _, _, body = await setup(client, auth_headers)
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    await age(db_session, first['id'], 60)
    await client.post('/api/v1/enquiries/' + first['id'] + '/withdraw', headers=brand, json={'expected_revision': 1})
    duplicate = {**body, 'request_id': str(uuid.uuid4()), 'brand_name': 'Different display name',
                 'brief': '  ' + body['brief'].upper().replace(' ', '  ') + '  ',
                 'deliverable': body['deliverable'].upper()}
    assert retry(await client.post('/api/v1/enquiries', headers=brand, json=duplicate), 'ENQUIRY_DUPLICATE') > 86000
    assert await db_session.scalar(select(func.count()).select_from(Enquiry)) == 1
    # Same campaign with materially different budget remains a distinct request.
    duplicate['amount_cents'] += 1000
    assert (await client.post('/api/v1/enquiries', headers=brand, json=duplicate)).status_code == 201


@pytest.mark.asyncio
async def test_three_per_creator_including_withdrawals_then_window_expires(client, auth_headers, db_session):
    _, brand, stranger, _, body = await setup(client, auth_headers)
    ids = []
    for i in range(3):
        sent = await client.post('/api/v1/enquiries', headers=brand,
                                 json={**body, 'request_id': str(uuid.uuid4()), 'amount_cents': 100000 + i * 100})
        assert sent.status_code == 201
        ids.append(sent.json()['id'])
        await client.post('/api/v1/enquiries/' + ids[-1] + '/withdraw', headers=brand, json={'expected_revision': 1})
        await age(db_session, ids[-1], 60)
    new_body = {**body, 'request_id': str(uuid.uuid4()), 'amount_cents': 120000}
    retry(await client.post('/api/v1/enquiries', headers=brand, json=new_body), 'ENQUIRY_CREATOR_LIMIT')
    other = (await client.get('/api/v1/creators/me', headers=stranger)).json()
    other_request = await client.post('/api/v1/enquiries', headers=brand,
                                     json={**new_body, 'creator_handle': other['handle']})
    assert other_request.status_code == 201
    await age(db_session, other_request.json()['id'], 60)
    for enquiry_id in ids:
        await age(db_session, enquiry_id, 86401)
    new_body['request_id'] = str(uuid.uuid4())
    assert (await client.post('/api/v1/enquiries', headers=brand, json=new_body)).status_code == 201


@pytest.mark.asyncio
async def test_daily_limit_reports_actual_expiry_and_idempotent_retry_still_works(client, auth_headers, db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENQUIRY_CREATOR_DAILY_LIMIT", 30)
    _, brand, _, _, body = await setup(client, auth_headers)
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    row = await db_session.get(Enquiry, first['id'])
    for i in range(29):
        db_session.add(Enquiry(creator_id=row.creator_id, sender_id=row.sender_id, request_id=str(uuid.uuid4()),
            payload_hash='0' * 64, brand_name=row.brand_name, brief=f'Other campaign {i}', deliverable='1 video',
            amount_cents=None, currency='INR', status='pending', revision=1, history=[],
            creator_read_revision=0, sender_read_revision=1,
            created_at=datetime.now(timezone.utc) - timedelta(hours=1)))
    await db_session.commit()
    seconds = retry(await client.post('/api/v1/enquiries', headers=brand,
                                     json={**body, 'request_id': str(uuid.uuid4()), 'amount_cents': 120000}), 'ENQUIRY_LIMIT')
    assert 82799 <= seconds <= 82800
    assert (await client.post('/api/v1/enquiries', headers=brand, json=body)).status_code == 200


@pytest.mark.asyncio
async def test_duplicate_window_is_not_reset_by_response_activity(client, auth_headers, db_session):
    creator, brand, _, _, body = await setup(client, auth_headers)
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    await age(db_session, first['id'], 86401)
    await client.post('/api/v1/enquiries/' + first['id'] + '/respond', headers=creator,
                      json={'action': 'decline', 'expected_revision': 1})
    fresh = await client.post('/api/v1/enquiries', headers=brand,
                              json={**body, 'request_id': str(uuid.uuid4())})
    assert fresh.status_code == 201


@pytest.mark.asyncio
async def test_package_requests_compare_server_terms_not_ignored_client_fields(client, auth_headers, db_session):
    creator, brand, _, _, body = await setup(client, auth_headers)
    card = (await client.post('/api/v1/ratecards', headers=creator, json={
        'platform': 'instagram', 'deliverable_type': 'reel_shorts', 'title': 'Launch reel',
        'base_price_cents': 250000, 'currency': 'USD', 'turnaround_days': 5})).json()
    body['rate_card_id'] = card['id']
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    await age(db_session, first['id'], 60)
    modified = {**body, 'request_id': str(uuid.uuid4()), 'deliverable': 'Ignored client title',
                'amount_cents': 99900, 'currency': 'INR'}
    retry(await client.post('/api/v1/enquiries', headers=brand, json=modified), 'ENQUIRY_DUPLICATE')


@pytest.mark.asyncio
async def test_one_senders_limits_do_not_block_another_brand(client, auth_headers):
    _, brand, _, _, body = await setup(client, auth_headers)
    assert (await client.post('/api/v1/enquiries', headers=brand, json=body)).status_code == 201
    other_brand = auth_headers(sub='second-abuse-brand', email='second-brand@example.com')
    await client.post('/api/v1/organizations', headers=other_brand, json={
        'name': 'Second Brand', 'company_name': 'Second Brand', 'billing_email': 'second-brand@example.com'})
    assert (await client.post('/api/v1/enquiries', headers=other_brand,
                             json={**body, 'request_id': str(uuid.uuid4())})).status_code == 201


@pytest.mark.asyncio
async def test_countered_budget_does_not_hide_duplicate_original_submission(client, auth_headers, db_session):
    creator, brand, _, _, body = await setup(client, auth_headers)
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    await age(db_session, first['id'], 60)
    await client.post('/api/v1/enquiries/' + first['id'] + '/respond', headers=creator,
                      json={'action': 'counter', 'expected_revision': 1, 'amount_cents': 200000,
                            'note': 'Includes additional organic usage rights.'})
    duplicate = await client.post('/api/v1/enquiries', headers=brand,
                                  json={**body, 'request_id': str(uuid.uuid4())})
    retry(duplicate, 'ENQUIRY_DUPLICATE')
