from uuid import uuid4
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from app.domains.notifications.models import Notification, NotificationEmail
from app.domains.collaborations.models import Collaboration, ProposalRevision, ProposalAcceptance, DeliverySubmission, DeliveryReview, CollaborationCompletion
from test_proposals import collaboration, save, send_body, terms
from test_agreements import acceptance, sent
from test_deliveries import agreed, payload
from test_delivery_reviews import submitted, review_body
from test_completions import completion_body
from test_publishing_proof import proof_body
from test_proof_confirmations import confirm_body


async def alerts(client, actor, record):
    response = await client.get('/api/v1/notifications', headers=actor)
    assert response.status_code == 200 and response.headers['cache-control'] == 'no-store'
    return [row for row in response.json() if row['collaboration_id'] == record]


@pytest.mark.asyncio
async def test_milestones_notify_only_counterparty_with_stable_private_links_and_retries(client, auth_headers, db_session):
    brand, creator, outsider, path = await collaboration(client, auth_headers, db_session)
    record = path.split('/')[-2]
    assert (await save(client, brand, path)).status_code == 200
    assert not await alerts(client, creator, record)  # private draft
    send = send_body()
    proposal = (await client.post(path+'/send', headers=brand, json=send)).json()
    assert (await client.post(path+'/send', headers=brand, json=send)).status_code == 200
    assert not await alerts(client, brand, record)
    assert [r['kind'] for r in await alerts(client, creator, record)] == ['proposal_sent']
    for actor in [creator, brand]:
        response = await client.post(path+'/accept', headers=actor, json=acceptance(proposal))
        assert response.status_code == 200, response.text
        assert (await client.post(path+'/accept', headers=actor, json=acceptance(proposal))).status_code == 200
    agreement = response.json()['agreement']
    base = path.removesuffix('/proposals')
    delivery_path = base+'/deliveries'
    for version, action in [(1, 'request_revision'), (2, 'approve')]:
        body = payload(agreement['id'], version=version-1, notes='PRIVATE DELIVERY DETAILS')
        response = await client.post(delivery_path, headers=creator, json=body)
        assert response.status_code == 200, response.text
        delivery = response.json()
        assert (await client.post(delivery_path, headers=creator, json=body)).status_code == 200
        review = review_body(action=action, version=version)
        endpoint = delivery_path+'/'+delivery['id']+'/review'
        decision = (await client.post(endpoint, headers=brand, json=review)).json()
        assert (await client.post(endpoint, headers=brand, json=review)).status_code == 200
    proof_request = proof_body(delivery, decision)
    proof = (await client.post(base+'/publishing-proof', headers=creator, json=proof_request)).json()
    assert (await client.post(base+'/publishing-proof', headers=creator, json=proof_request)).status_code == 200
    confirm = confirm_body()
    confirm_path = base+'/publishing-proof/'+proof['id']+'/confirm'
    assert (await client.post(confirm_path, headers=brand, json=confirm)).status_code == 200
    assert (await client.post(confirm_path, headers=brand, json=confirm)).status_code == 200
    complete = completion_body(delivery, decision)
    assert (await client.post(base+'/complete', headers=brand, json=complete)).status_code == 200
    assert (await client.post(base+'/complete', headers=brand, json=complete)).status_code == 200
    brand_rows, creator_rows = await alerts(client, brand, record), await alerts(client, creator, record)
    assert {r['kind'] for r in brand_rows} == {'proposal_accepted', 'delivery_submitted', 'proof_submitted'}
    assert len(brand_rows) == 4
    assert {r['kind'] for r in creator_rows} == {'proposal_sent', 'agreement_confirmed', 'revision_requested', 'delivery_approved', 'proof_confirmed', 'collaboration_completed'}
    assert len(creator_rows) == 6
    assert not await alerts(client, outsider, record)
    assert await db_session.scalar(select(func.count()).select_from(NotificationEmail)) == 0
    for actor, rows in [(brand, brand_rows), (creator, creator_rows)]:
        for row in rows:
            assert row['enquiry_id'] is None and row['is_unread']
            assert row['href'].startswith('/dashboard/collaborations/'+record+'?view=')
            assert not {'event_key', 'user_id', 'actor_id'} & row.keys()
            assert 'PRIVATE DELIVERY DETAILS' not in row['message']
        # Reading the collaboration itself does not acknowledge every alert.
        assert (await client.get(base, headers=actor)).status_code == 200
        assert all(r['is_unread'] for r in await alerts(client, actor, record))
    first = creator_rows[0]
    url = '/api/v1/notifications/'+first['id']+'/read'
    assert (await client.post(url, headers=outsider)).status_code == 404
    assert (await client.post(url, headers=brand)).status_code == 404
    for _ in range(2):
        assert (await client.post(url, headers=creator)).json()['is_unread'] is False
    assert (await client.get('/api/v1/notifications/unread-count', headers=creator)).json() == 5
    assert (await client.get(base, headers=outsider)).status_code == 404


@pytest.mark.asyncio
async def test_counterproposal_and_failed_stale_unauthorized_actions_do_not_duplicate_alerts(client, auth_headers, db_session):
    brand, creator, outsider, path, proposal, body = await sent(client, auth_headers, db_session)
    record = path.split('/')[-2]
    before = await db_session.scalar(select(func.count()).select_from(Notification))
    assert (await client.post(path+'/send', headers=outsider, json=body)).status_code == 404
    assert (await client.post(path+'/send', headers=creator, json=body)).status_code == 409
    assert (await client.post(path+'/accept', headers=creator, json=acceptance(proposal)|{'expected_version':99})).status_code == 409
    assert (await save(client, creator, path, terms(note='PRIVATE DRAFT'), version=1)).status_code == 200
    assert await db_session.scalar(select(func.count()).select_from(Notification)) == before
    request = send_body(version=1)
    assert (await client.post(path+'/send', headers=creator, json=request)).status_code == 200
    assert (await client.post(path+'/send', headers=creator, json=request)).status_code == 200
    assert [r['kind'] for r in await alerts(client, brand, record)] == ['proposal_sent']
    assert len(await alerts(client, creator, record)) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('action', ['proposal', 'acceptance', 'delivery', 'review', 'completion'])
async def test_notification_failure_rolls_back_the_business_transition(client, auth_headers, db_session, monkeypatch, action):
    if action == 'proposal':
        from app.domains.collaborations import proposals as module
        brand, creator, _, path = await collaboration(client, auth_headers, db_session)
        await save(client, brand, path)
        endpoint, actor, body, model = path+'/send', brand, send_body(), ProposalRevision
    elif action == 'acceptance':
        from app.domains.collaborations import agreements as module
        brand, creator, _, path, proposal, _ = await sent(client, auth_headers, db_session)
        endpoint, actor, body, model = path+'/accept', creator, acceptance(proposal), ProposalAcceptance
    elif action == 'delivery':
        from app.domains.collaborations import deliveries as module
        brand, creator, _, path, agreement = await agreed(client, auth_headers, db_session)
        endpoint, actor, body, model = path, creator, payload(agreement['id']), DeliverySubmission
    else:
        from app.domains.collaborations import deliveries as module
        brand, creator, _, path, agreement, delivery = await submitted(client, auth_headers, db_session)
        if action == 'completion':
            review = (await client.post(path+'/'+delivery['id']+'/review', headers=brand, json=review_body())).json()
            endpoint, actor, body, model = path.removesuffix('/deliveries')+'/complete', brand, completion_body(delivery, review), CollaborationCompletion
        else:
            endpoint, actor, body, model = path+'/'+delivery['id']+'/review', brand, review_body(), DeliveryReview
    previous = await db_session.scalar(select(func.count()).select_from(Notification))
    async def fail(*args, **kwargs):
        raise RuntimeError('Notification write failed')
    monkeypatch.setattr(module, 'record_collaboration_notification', fail)
    with pytest.raises(RuntimeError):
        await client.post(endpoint, headers=actor, json=body)
    await db_session.rollback()
    assert await db_session.scalar(select(func.count()).select_from(model)) == 0
    assert await db_session.scalar(select(func.count()).select_from(Notification)) == previous


@pytest.mark.asyncio
async def test_database_enforces_target_and_recipient_event_uniqueness(client, auth_headers, db_session):
    brand, creator, _, path, _, _ = await sent(client, auth_headers, db_session)
    row = await db_session.scalar(select(Notification).where(Notification.collaboration_id.is_not(None)))
    for values in [dict(collaboration_id=row.collaboration_id,event_key=row.event_key),
                   dict(collaboration_id=row.collaboration_id), dict(event_key='orphan')]:
        with pytest.raises(IntegrityError):
            async with db_session.begin_nested():
                db_session.add(Notification(user_id=row.user_id,kind=row.kind,title=row.title,message=row.message,**values))
                await db_session.flush()
    assert len(await alerts(client, creator, path.split('/')[-2])) == 1
