import uuid
import pytest
from app.domains.collaborations.models import Collaboration, DeliverySubmission


@pytest.mark.asyncio
async def test_delivery_timestamped_comments_lifecycle(client, auth_headers, db_session):
    from test_deliveries import agreed

    # Use real source/proposal/agreement references so this fixture also works
    # after another suite enables SQLite foreign-key enforcement.
    bh, ch, oh, deliveries_path, agreement = await agreed(client, auth_headers, db_session)
    collab_id = deliveries_path.split('/')[-2]
    collab = await db_session.get(Collaboration, collab_id)
    collab.delivery_version = 1
    file_id = str(uuid.uuid4())
    delivery = DeliverySubmission(
        id=str(uuid.uuid4()),
        collaboration_id=collab.id,
        agreement_id=agreement['id'],
        creator_user_id=collab.creator_user_id,
        version=1,
        title='First Cut',
        notes='Initial reel cut',
        links=[],
        files=[{'id': file_id, 'filename': 'reel.mp4', 'content_type': 'video/mp4', 'size_bytes': 1024}],
        request_id=str(uuid.uuid4()),
        request_hash='b' * 64,
    )
    db_session.add(delivery)
    await db_session.commit()

    base = f'/api/v1/collaborations/{collab.id}/deliveries/{delivery.id}/comments'

    # Outsider cannot read or post
    assert (await client.get(base, headers=oh)).status_code == 404
    assert (await client.post(base, headers=oh, json={'body': 'nope'})).status_code == 404

    # Brand posts a timestamped comment on the video
    r = await client.post(base, headers=bh, json={
        'file_id': file_id,
        'timestamp_ms': 14250,
        'body': 'Swap the transition at 0:14 to a hard cut',
    })
    assert r.status_code == 201
    comment = r.json()
    assert comment['author_role'] == 'brand'
    assert comment['timestamp_ms'] == 14250
    assert comment['file_id'] == file_id
    assert comment['resolved'] is False

    # Creator sees it and replies without a timestamp
    listed = (await client.get(base, headers=ch)).json()
    assert len(listed) == 1 and listed[0]['id'] == comment['id']

    reply = (await client.post(base, headers=ch, json={'body': 'Got it, will update in v2'})).json()
    assert reply['author_role'] == 'creator'
    assert reply['timestamp_ms'] is None

    # Creator can mark brand's comment resolved, but cannot delete brand's comment
    patched = await client.patch(f"{base}/{comment['id']}", headers=ch, json={'resolved': True})
    assert patched.status_code == 200 and patched.json()['resolved'] is True
    assert (await client.delete(f"{base}/{comment['id']}", headers=ch)).status_code == 403

    # Brand can delete their own comment
    assert (await client.delete(f"{base}/{comment['id']}", headers=bh)).status_code == 200
    remaining = (await client.get(base, headers=bh)).json()
    assert len(remaining) == 1 and remaining[0]['id'] == reply['id']
