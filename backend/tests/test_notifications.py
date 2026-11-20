from datetime import timedelta
import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker
from app.domains.enquiries.models import Enquiry
from app.domains.notifications.models import Notification, NotificationEmail, now
from app.domains.notifications.worker import process_one
from app.core.config import settings
from test_enquiries import setup


@pytest.mark.asyncio
async def test_creation_confirmation_privacy_and_retry_deduplication(client, auth_headers, db_session):
    creator, brand, stranger, _, body = await setup(client, auth_headers)
    request = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    assert (await client.post('/api/v1/enquiries', headers=brand, json=body)).status_code == 200
    received = (await client.get('/api/v1/notifications', headers=creator)).json()
    confirmation = (await client.get('/api/v1/notifications', headers=brand)).json()
    assert len(received) == len(confirmation) == 1
    assert received[0]['kind'] == 'sent' and received[0]['is_unread']
    assert confirmation[0]['kind'] == 'confirmation' and not confirmation[0]['is_unread']
    assert received[0]['href'] == '/dashboard/enquiries/' + request['id']
    assert (await client.get('/api/v1/notifications', headers=stranger)).json() == []
    assert (await client.get('/api/v1/notifications/unread-count', headers=creator)).json() == 1
    assert (await client.get('/api/v1/notifications/unread-count', headers=brand)).json() == 0
    assert await db_session.scalar(select(func.count()).select_from(NotificationEmail)) == 2
    assert request['brief'] not in received[0]['message']
    assert 'sender_email' not in received[0]
    for path in ['/api/v1/notifications', '/api/v1/notifications/unread-count', f'/api/v1/enquiries/{request["id"]}']:
        assert (await client.get(path)).status_code == 401
    assert (await client.get(f'/api/v1/enquiries/{request["id"]}', headers=stranger)).status_code == 404
    assert (await client.get(f'/api/v1/enquiries/{request["id"]}', headers=brand)).json()['viewer_role'] == 'brand'


@pytest.mark.asyncio
async def test_notification_reads_are_private_idempotent_and_distinct_from_enquiry_reads(client, auth_headers):
    creator, brand, stranger, _, body = await setup(client, auth_headers)
    request = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    notification = (await client.get('/api/v1/notifications', headers=creator)).json()[0]
    url = '/api/v1/notifications/' + notification['id'] + '/read'
    assert (await client.post(url)).status_code == 401
    for outsider in [brand, stranger]:
        assert (await client.post(url, headers=outsider)).status_code == 404
    for _ in range(2):
        read = await client.post(url, headers=creator)
        assert read.status_code == 200 and not read.json()['is_unread']
    assert (await client.get('/api/v1/notifications/unread-count', headers=creator)).json() == 0
    detail = (await client.get('/api/v1/enquiries/' + request['id'], headers=creator)).json()
    assert detail['is_unread'] and detail['revision'] == 1 and len(detail['history']) == 1
    await client.post('/api/v1/enquiries/' + request['id'] + '/read', headers=creator, json={'seen_revision': 1})
    assert len((await client.get('/api/v1/notifications', headers=creator)).json()) == 1


@pytest.mark.asyncio
async def test_replies_and_withdrawals_notify_only_counterparty(client, auth_headers, db_session):
    creator, brand, _, _, body = await setup(client, auth_headers)
    enquiry = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = '/api/v1/enquiries/' + enquiry['id']
    counter = {'action': 'counter', 'expected_revision': 1, 'amount_cents': 120000, 'note': 'New budget proposal for usage.'}
    assert (await client.post(url + '/respond', headers=creator, json=counter)).status_code == 200
    assert (await client.post(url + '/respond', headers=creator, json=counter)).status_code == 409
    assert (await client.get('/api/v1/notifications', headers=brand)).json()[0]['kind'] == 'counter'
    assert len((await client.get('/api/v1/notifications', headers=creator)).json()) == 1
    for _ in range(2):
        assert (await client.post(url + '/withdraw', headers=brand, json={'expected_revision': 2})).status_code == 200
    creator_items = (await client.get('/api/v1/notifications', headers=creator)).json()
    assert [item['kind'] for item in creator_items] == ['withdraw', 'sent']
    assert await db_session.scalar(select(func.count()).select_from(Notification)) == 4
    assert await db_session.scalar(select(func.count()).select_from(NotificationEmail)) == 4


@pytest.mark.asyncio
@pytest.mark.parametrize('action', ['accept', 'decline'])
async def test_creator_decisions_notify_brand(client, auth_headers, action):
    creator, brand, _, _, body = await setup(client, auth_headers)
    enquiry = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    await client.post('/api/v1/enquiries/' + enquiry['id'] + '/respond', headers=creator,
                      json={'action': action, 'expected_revision': 1})
    rows = (await client.get('/api/v1/notifications', headers=brand)).json()
    assert rows[0]['kind'] == action and rows[0]['is_unread']
    assert len(rows) == 2


@pytest.mark.asyncio
async def test_outbox_failure_rolls_back_the_enquiry_too(client, auth_headers, db_session, monkeypatch):
    import app.domains.enquiries.router as router
    _, brand, _, _, body = await setup(client, auth_headers)
    async def fail(*args, **kwargs):
        raise RuntimeError('Simulated outbox failure')
    monkeypatch.setattr(router, 'record_notifications', fail)
    with pytest.raises(RuntimeError):
        await client.post('/api/v1/enquiries', headers=brand, json=body)
    await db_session.rollback()
    assert await db_session.scalar(select(func.count()).select_from(Enquiry)) == 0
    assert await db_session.scalar(select(func.count()).select_from(Notification)) == 0


@pytest.mark.asyncio
async def test_email_sink_and_retry_tracking(client, auth_headers, db_session, monkeypatch, tmp_path):
    _, brand, _, _, body = await setup(client, auth_headers)
    await client.post('/api/v1/enquiries', headers=brand, json=body)
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    monkeypatch.setattr(settings, 'NOTIFICATION_EMAIL_TRANSPORT', 'sink')
    monkeypatch.setattr(settings, 'NOTIFICATION_MAIL_SINK', str(tmp_path))
    assert await process_one(factory)
    files = list(tmp_path.glob('*.eml'))
    assert len(files) == 1
    from email import policy
    from email.parser import BytesParser
    mail = BytesParser(policy=policy.default).parsebytes(files[0].read_bytes())
    assert '<notification-' in mail['Message-ID'] and '/dashboard/enquiries/' in mail.get_content()
    def failing(*args):
        raise TimeoutError('Private SMTP diagnostic must not be saved')
    assert await process_one(factory, failing)
    async with factory() as db:
        pending = await db.scalar(select(NotificationEmail).where(NotificationEmail.status == 'pending'))
        assert pending.attempts == 1 and pending.last_error == 'TimeoutError'
        pending.next_attempt_at = now() - timedelta(seconds=1)
        await db.commit()
    assert await process_one(factory)
    assert len(list(tmp_path.glob('*.eml'))) == 2
    assert not await process_one(factory)
    async with factory() as db:
        rows = (await db.scalars(select(NotificationEmail))).all()
        assert all(row.status == 'delivered' and row.transport == 'sink' for row in rows)
        assert sorted(row.attempts for row in rows) == [1, 2]


@pytest.mark.asyncio
async def test_expired_lease_recovers_and_retries_stop_at_limit(client, auth_headers, db_session):
    _, brand, _, _, body = await setup(client, auth_headers)
    await client.post('/api/v1/enquiries', headers=brand, json=body)
    rows = (await db_session.scalars(select(NotificationEmail).order_by(NotificationEmail.id))).all()
    first, second = rows
    first.status = 'processing'; first.attempts = 1; first.locked_until = now() - timedelta(seconds=1)
    second.status = 'processing'; second.attempts = 5; second.locked_until = now() - timedelta(seconds=1)
    await db_session.commit()
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    assert await process_one(factory, lambda *args: None)
    assert not await process_one(factory, lambda *args: None)
    await db_session.refresh(first); await db_session.refresh(second)
    assert first.status == 'delivered' and first.attempts == 2
    assert second.status == 'failed' and second.last_error == 'lease_expired'


@pytest.mark.asyncio
async def test_inactive_accounts_skip_email_and_final_failure_is_terminal(client, auth_headers, db_session):
    from app.domains.identity.models import User
    creator, brand, _, _, body = await setup(client, auth_headers)
    await client.post('/api/v1/enquiries', headers=brand, json=body)
    user = await db_session.scalar(select(User).where(User.email == 'creator@example.com'))
    user.is_active = False
    emails = (await db_session.scalars(select(NotificationEmail).join(Notification)
             .order_by(Notification.kind))).all()
    for row in emails:
        row.attempts = 4
    await db_session.commit()
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    calls = []
    def fail(*args):
        calls.append(args[1])
        raise ConnectionError('Do not store this response')
    while await process_one(factory, fail):
        pass
    async with factory() as db:
        rows = (await db.scalars(select(NotificationEmail))).all()
        assert sorted(row.status for row in rows) == ['failed', 'skipped']
        assert all(row.attempts == 5 for row in rows)
    assert calls == ['brand@example.com']


@pytest.mark.asyncio
async def test_viewing_enquiry_reads_only_notifications_for_observed_revision(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    enquiry = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = '/api/v1/enquiries/' + enquiry['id']
    await client.post(url + '/withdraw', headers=brand, json={'expected_revision': 1})
    await client.post(url + '/read', headers=creator, json={'seen_revision': 1})
    items = (await client.get('/api/v1/notifications', headers=creator)).json()
    assert [(item['kind'], item['is_unread']) for item in items] == [('withdraw', True), ('sent', False)]
    await client.post(url + '/read', headers=creator, json={'seen_revision': 2})
    assert (await client.get('/api/v1/notifications/unread-count', headers=creator)).json() == 0
