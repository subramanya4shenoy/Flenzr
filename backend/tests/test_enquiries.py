import uuid

import pytest
from sqlalchemy import select

from app.domains.enquiries.models import Enquiry


async def setup(client, auth_headers):
    creator = auth_headers(sub="enquiry-creator", email="creator@example.com")
    brand = auth_headers(sub="enquiry-brand", email="brand@example.com")
    stranger = auth_headers(sub="enquiry-stranger", email="stranger@example.com")
    profile = (await client.get("/api/v1/creators/me", headers=creator)).json()
    await client.post("/api/v1/organizations", headers=brand, json={
        "name": "Test Brand", "company_name": "Test Brand", "billing_email": "brand@example.com"})
    await client.get("/api/v1/creators/me", headers=stranger)
    body = {"request_id": str(uuid.uuid4()), "creator_handle": profile["handle"],
            "brand_name": "Test Brand", "brief": "A real launch campaign with one original product video.",
            "deliverable": "1 video", "amount_cents": 100000, "currency": "INR"}
    return creator, brand, stranger, profile, body


@pytest.mark.asyncio
async def test_enquiry_survives_reload_and_is_private(client, auth_headers, db_session):
    creator, brand, stranger, profile, body = await setup(client, auth_headers)
    sent = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert sent.status_code == 201, sent.text
    enquiry = sent.json()
    assert enquiry["sender_email"] == "brand@example.com"
    assert enquiry["status"] == "pending"
    assert enquiry["created_at"].endswith("Z")
    assert enquiry["history"][0]["action"] == "sent"
    assert "sender_id" not in enquiry and "payload_hash" not in enquiry
    # A new ORM load, not the just-created in-memory object.
    db_session.expire_all()
    inbox = await client.get("/api/v1/enquiries/me", headers=creator)
    assert inbox.headers["cache-control"] == "no-store"
    assert [e["id"] for e in inbox.json()] == [enquiry["id"]]
    assert (await client.get("/api/v1/enquiries/me?view=sent", headers=brand)).json()[0]["id"] == enquiry["id"]
    for view in ("received", "sent"):
        assert (await client.get(f"/api/v1/enquiries/me?view={view}", headers=stranger)).json() == []
    assert (await client.post(f'/api/v1/enquiries/{enquiry["id"]}/respond', headers=stranger,
                             json={"action": "accept", "expected_revision": 1})).status_code == 404


@pytest.mark.asyncio
async def test_create_retries_and_changed_retry_conflicts(client, auth_headers, db_session):
    _, brand, _, _, body = await setup(client, auth_headers)
    first = await client.post("/api/v1/enquiries", json=body, headers=brand)
    again = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert again.status_code == 200
    assert first.json()["id"] == again.json()["id"]
    assert len((await db_session.scalars(select(Enquiry))).all()) == 1
    body["brief"] += " Changed request."
    assert (await client.post("/api/v1/enquiries", json=body, headers=brand)).status_code == 409


@pytest.mark.asyncio
async def test_counter_then_brand_accepts_with_history_and_stale_guard(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    enquiry = (await client.post("/api/v1/enquiries", json=body, headers=brand)).json()
    url = f'/api/v1/enquiries/{enquiry["id"]}/respond'
    assert (await client.post(url, headers=brand, json={"action": "accept", "expected_revision": 1})).status_code == 409
    stale = await client.post(url, headers=creator, json={"action": "accept", "expected_revision": 2})
    assert stale.status_code == 409
    counter = await client.post(url, headers=creator, json={"action": "counter", "expected_revision": 1,
        "note": "Including usage rights for one month.", "amount_cents": 150000})
    assert counter.status_code == 200, counter.text
    assert counter.json()["status"] == "countered" and counter.json()["revision"] == 2
    assert (await client.post(url, headers=creator, json={"action": "accept", "expected_revision": 1})).status_code == 409
    assert (await client.post(url, headers=brand, json={"action": "accept", "expected_revision": 1})).status_code == 409
    accepted = await client.post(url, headers=brand, json={"action": "accept", "expected_revision": 2, "note": "Works for us."})
    assert accepted.status_code == 200
    assert accepted.json()["amount_cents"] == 150000
    assert [e["action"] for e in accepted.json()["history"]] == ["sent", "counter", "accept"]
    assert (await client.post(url, headers=creator, json={"action": "decline", "expected_revision": 3})).status_code == 409
    assert (await client.get("/api/v1/enquiries/me?view=sent", headers=brand)).json()[0]["status"] == "accepted"


@pytest.mark.asyncio
@pytest.mark.parametrize("action", ["accept", "decline"])
async def test_creator_can_decide_without_changing_price(client, auth_headers, action):
    creator, brand, _, _, body = await setup(client, auth_headers)
    enquiry = (await client.post("/api/v1/enquiries", json=body, headers=brand)).json()
    result = await client.post(f'/api/v1/enquiries/{enquiry["id"]}/respond', headers=creator,
        json={"action": action, "expected_revision": 1})
    assert result.status_code == 200
    assert result.json()["status"] == ("accepted" if action == "accept" else "declined")
    assert result.json()["amount_cents"] == 100000


@pytest.mark.asyncio
async def test_package_ownership_and_price_snapshot(client, auth_headers):
    creator, brand, stranger, profile, body = await setup(client, auth_headers)
    card = (await client.post("/api/v1/ratecards", headers=creator, json={
        "platform": "instagram", "deliverable_type": "reel_shorts", "title": "Launch reel",
        "base_price_cents": 250000, "currency": "USD", "turnaround_days": 5})).json()
    body["rate_card_id"] = card["id"]
    sent = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert sent.status_code == 201, sent.text
    assert sent.json()["amount_cents"] == 250000 and sent.json()["currency"] == "USD"
    assert sent.json()["deliverable"] == "Launch reel"
    await client.patch(f'/api/v1/ratecards/{card["id"]}', headers=creator, json={"base_price_cents": 900000})
    assert (await client.get("/api/v1/enquiries/me", headers=creator)).json()[0]["amount_cents"] == 250000
    other = (await client.get("/api/v1/creators/me", headers=stranger)).json()
    body.update(request_id=str(uuid.uuid4()), creator_handle=other["handle"])
    assert (await client.post("/api/v1/enquiries", json=body, headers=brand)).status_code == 404
    body.update(request_id=str(uuid.uuid4()), creator_handle=profile["handle"])
    await client.patch(f'/api/v1/ratecards/{card["id"]}', headers=creator, json={"is_active": False})
    assert (await client.post("/api/v1/enquiries", json=body, headers=brand)).status_code == 404


@pytest.mark.asyncio
async def test_auth_validation_and_self_enquiries(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    assert (await client.post("/api/v1/enquiries", json=body)).status_code == 401
    assert (await client.get("/api/v1/enquiries/me")).status_code == 401
    assert (await client.post("/api/v1/enquiries", json=body, headers=creator)).status_code == 403
    for patch in ({"brief": " " * 30}, {"amount_cents": -5}, {"sender_id": "spoof"}, {"currency": "ABC"}):
        assert (await client.post("/api/v1/enquiries", json={**body, **patch}, headers=brand)).status_code == 422
    # Brand/creator can be the same user; never allow self-enquiries.
    own = (await client.get("/api/v1/creators/me", headers=creator)).json()
    await client.post("/api/v1/organizations", headers=creator, json={"name": "Own Brand", "company_name": "Own Brand", "billing_email": "creator@example.com"})
    assert (await client.post("/api/v1/enquiries", json={**body, "creator_handle": own["handle"]}, headers=creator)).status_code == 403


@pytest.mark.asyncio
async def test_daily_limit_and_retry_still_allowed(client, auth_headers, db_session):
    _, brand, _, _, body = await setup(client, auth_headers)
    first = (await client.post("/api/v1/enquiries", json=body, headers=brand)).json()
    row = await db_session.get(Enquiry, first["id"])
    for _ in range(29):
        db_session.add(Enquiry(creator_id=row.creator_id, sender_id=row.sender_id, request_id=str(uuid.uuid4()),
            payload_hash="0" * 64, brand_name=row.brand_name, brief=row.brief, deliverable=row.deliverable,
            amount_cents=None, currency="INR", status="pending", revision=1, history=[]))
    await db_session.commit()
    assert (await client.post("/api/v1/enquiries", json=body, headers=brand)).status_code == 200
    assert (await client.post("/api/v1/enquiries", json={**body, "request_id": str(uuid.uuid4())}, headers=brand)).status_code == 429


@pytest.mark.asyncio
@pytest.mark.parametrize("with_package", [False, True])
async def test_requested_delivery_date_persists_for_both_participants(client, auth_headers, db_session, with_package):
    from datetime import datetime, timedelta, timezone
    creator, brand, _, _, body = await setup(client, auth_headers)
    requested = (datetime.now(timezone.utc).date() + timedelta(days=14)).isoformat()
    if with_package:
        card = (await client.post("/api/v1/ratecards", headers=creator, json={
            "platform": "instagram", "deliverable_type": "reel_shorts", "title": "Launch reel",
            "base_price_cents": 250000, "currency": "INR", "turnaround_days": 7})).json()
        body["rate_card_id"] = card["id"]
    body["preferred_delivery_date"] = requested
    result = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert result.status_code == 201, result.text
    enquiry = result.json()
    assert enquiry["preferred_delivery_date"] == requested
    assert enquiry["history"][0]["preferred_delivery_date"] == requested
    db_session.expire_all()
    for headers, view in ((creator, "received"), (brand, "sent")):
        saved = (await client.get(f"/api/v1/enquiries/me?view={view}", headers=headers)).json()[0]
        assert saved["preferred_delivery_date"] == requested
    counter = await client.post(f'/api/v1/enquiries/{enquiry["id"]}/respond', headers=creator,
        json={"action": "counter", "expected_revision": 1, "amount_cents": 300000, "note": "A revised budget for the requested work."})
    assert counter.status_code == 200
    assert counter.json()["preferred_delivery_date"] == requested
    accepted = await client.post(f'/api/v1/enquiries/{enquiry["id"]}/respond', headers=brand,
        json={"action": "accept", "expected_revision": 2})
    assert accepted.status_code == 200
    assert accepted.json()["preferred_delivery_date"] == requested
    # Responding cannot silently turn a budget counter into a change of requested date.
    assert (await client.post(f'/api/v1/enquiries/{enquiry["id"]}/respond', headers=creator,
        json={"action": "accept", "expected_revision": 3, "preferred_delivery_date": requested})).status_code == 422


@pytest.mark.asyncio
async def test_delivery_date_is_optional_and_legacy_retry_hash_is_preserved(client, auth_headers, db_session):
    import hashlib
    from app.domains.enquiries.schemas import EnquiryCreate
    _, brand, _, _, body = await setup(client, auth_headers)
    result = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert result.status_code == 201
    assert result.json()["preferred_delivery_date"] is None
    enquiry = await db_session.get(Enquiry, result.json()["id"])
    # This is the pre-date-feature request hash, as stored for existing enquiries.
    legacy = EnquiryCreate(**body).model_dump_json(exclude={"preferred_delivery_date"})
    assert enquiry.payload_hash == hashlib.sha256(legacy.encode()).hexdigest()
    result = await client.post("/api/v1/enquiries", json={**body, "preferred_delivery_date": None}, headers=brand)
    assert result.status_code == 200
    assert result.json()["id"] == enquiry.id


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid", ["2026-02-30", "2028-02-30", "2026-1-1", "20261120", "2026-11-20T00:00:00Z", "", 1795219200, True])
async def test_delivery_date_rejects_invalid_or_non_calendar_values(client, auth_headers, invalid):
    _, brand, _, _, body = await setup(client, auth_headers)
    result = await client.post("/api/v1/enquiries", json={**body, "preferred_delivery_date": invalid}, headers=brand)
    assert result.status_code == 422, result.text
    assert (await client.get("/api/v1/enquiries/me?view=sent", headers=brand)).json() == []


@pytest.mark.asyncio
async def test_past_delivery_date_rejected_but_existing_retry_survives_midnight(client, auth_headers, monkeypatch):
    from datetime import datetime, timedelta, timezone
    from app.domains.enquiries import router as module
    creator, brand, _, _, body = await setup(client, auth_headers)
    today = datetime.now(timezone.utc).date()
    result = await client.post("/api/v1/enquiries", json={**body, "preferred_delivery_date": (today - timedelta(days=1)).isoformat()}, headers=brand)
    assert result.status_code == 422
    assert result.json()["error"]["code"] == "INVALID_DELIVERY_DATE"
    body["preferred_delivery_date"] = today.isoformat()
    created = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert created.status_code == 201
    class Tomorrow(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime.now(tz) + timedelta(days=1)
    monkeypatch.setattr(module, "datetime", Tomorrow)
    retry = await client.post("/api/v1/enquiries", json=body, headers=brand)
    assert retry.status_code == 200
    assert retry.json()["id"] == created.json()["id"]
    # History may legitimately contain elapsed requests; reads and responses still work.
    assert (await client.get("/api/v1/enquiries/me", headers=creator)).json()[0]["preferred_delivery_date"] == today.isoformat()
    assert (await client.post(f'/api/v1/enquiries/{created.json()["id"]}/respond', headers=creator,
        json={"action": "decline", "expected_revision": 1})).status_code == 200
    body["request_id"] = str(uuid.uuid4())
    assert (await client.post("/api/v1/enquiries", json=body, headers=brand)).status_code == 422


def test_delivery_date_migration_keeps_existing_enquiries():
    import importlib.util
    from pathlib import Path
    from unittest.mock import patch
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import create_engine, text
    path = Path(__file__).parents[1] / "alembic/versions/0009_enquiry_delivery_date.py"
    spec = importlib.util.spec_from_file_location("delivery_date_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE enquiries (id TEXT PRIMARY KEY, brief TEXT NOT NULL)"))
        conn.execute(text("INSERT INTO enquiries VALUES ('existing', 'Keep this enquiry')"))
        with patch.object(migration, "op", Operations(MigrationContext.configure(conn))):
            migration.upgrade()
            assert conn.execute(text("SELECT id, brief, preferred_delivery_date FROM enquiries")).one() == ("existing", "Keep this enquiry", None)
            migration.downgrade()
            assert conn.execute(text("SELECT id, brief FROM enquiries")).one() == ("existing", "Keep this enquiry")
    engine.dispose()


@pytest.mark.asyncio
async def test_new_enquiry_is_unread_only_for_recipient_and_reads_are_explicit(client, auth_headers, db_session):
    creator, brand, stranger, _, body = await setup(client, auth_headers)
    sent = (await client.post("/api/v1/enquiries", json=body, headers=brand)).json()
    assert sent["read_revision"] == 1 and not sent["is_unread"]
    counts = await client.get("/api/v1/enquiries/unread-counts", headers=creator)
    assert counts.headers["cache-control"] == "no-store"
    assert counts.json() == {"received": 1, "sent": 0}
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=brand)).json() == {"received": 0, "sent": 0}
    for _ in range(2):
        inbox = (await client.get("/api/v1/enquiries/me", headers=creator)).json()
        assert inbox[0]["is_unread"] and inbox[0]["read_revision"] == 0
    row = await db_session.get(Enquiry, sent["id"])
    assert row.creator_read_revision == 0
    opened = await client.post(f'/api/v1/enquiries/{sent["id"]}/read', headers=creator, json={"seen_revision": 1})
    assert opened.status_code == 200
    assert opened.headers["cache-control"] == "no-store"
    assert not opened.json()["is_unread"] and opened.json()["read_revision"] == 1
    assert "creator_read_revision" not in opened.json() and "sender_read_revision" not in opened.json()
    db_session.expire_all()
    assert not (await client.get("/api/v1/enquiries/me", headers=creator)).json()[0]["is_unread"]
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 0
    # Replaying a send is not a new event and does not reset the recipient's cursor.
    assert (await client.post("/api/v1/enquiries", headers=brand, json=body)).status_code == 200
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=stranger)).json() == {"received": 0, "sent": 0}
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 0


@pytest.mark.asyncio
async def test_reply_flags_other_participant_not_author_and_read_cursors_are_independent(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    sent = (await client.post("/api/v1/enquiries", headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}'
    counter = await client.post(url + "/respond", headers=creator, json={"action": "counter", "expected_revision": 1, "amount_cents": 120000, "note": "A revised quote including usage."})
    assert counter.status_code == 200
    assert counter.json()["read_revision"] == 2 and not counter.json()["is_unread"]
    brand_inbox = (await client.get("/api/v1/enquiries/me?view=sent", headers=brand)).json()[0]
    assert brand_inbox["revision"] == 2 and brand_inbox["read_revision"] == 1 and brand_inbox["is_unread"]
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=brand)).json()["sent"] == 1
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 0
    await client.post(url + "/read", headers=brand, json={"seen_revision": 2})
    accepted = await client.post(url + "/respond", headers=brand, json={"action": "accept", "expected_revision": 2})
    assert accepted.status_code == 200
    assert not accepted.json()["is_unread"] and accepted.json()["read_revision"] == 3
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=brand)).json()["sent"] == 0
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 1
    creator_inbox = (await client.get("/api/v1/enquiries/me", headers=creator)).json()[0]
    assert creator_inbox["is_unread"] and creator_inbox["read_revision"] == 2
    await client.post(url + "/read", headers=creator, json={"seen_revision": 3})
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 0


@pytest.mark.asyncio
async def test_stale_read_cannot_clear_newer_reply_or_roll_back_cursor(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    sent = (await client.post("/api/v1/enquiries", headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}'
    # Brand tab still displays revision 1 while the creator sends revision 2.
    await client.post(url + "/respond", headers=creator, json={"action": "counter", "expected_revision": 1, "amount_cents": 120000, "note": "An updated budget for this brief."})
    stale = await client.post(url + "/read", headers=brand, json={"seen_revision": 1})
    assert stale.status_code == 200
    assert stale.json()["is_unread"] and stale.json()["revision"] == 2 and stale.json()["read_revision"] == 1
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=brand)).json()["sent"] == 1
    await client.post(url + "/read", headers=brand, json={"seen_revision": 2})
    repeat_stale = await client.post(url + "/read", headers=brand, json={"seen_revision": 1})
    assert repeat_stale.json()["read_revision"] == 2 and not repeat_stale.json()["is_unread"]
    future = await client.post(url + "/read", headers=brand, json={"seen_revision": 3})
    assert future.status_code == 409
    assert (await client.get("/api/v1/enquiries/me?view=sent", headers=brand)).json()[0]["read_revision"] == 2


@pytest.mark.asyncio
async def test_read_receipts_do_not_change_activity_or_history(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    sent = (await client.post("/api/v1/enquiries", headers=brand, json=body)).json()
    before = (await client.get("/api/v1/enquiries/me", headers=creator)).json()[0]
    for _ in range(2):
        read = (await client.post(f'/api/v1/enquiries/{sent["id"]}/read', headers=creator, json={"seen_revision": 1})).json()
        for key in ("revision", "status", "history", "created_at", "updated_at", "amount_cents", "preferred_delivery_date"):
            assert read[key] == before[key]
    assert not read["is_unread"]


@pytest.mark.asyncio
async def test_read_tracking_requires_auth_and_participant_ownership(client, auth_headers):
    creator, brand, stranger, _, body = await setup(client, auth_headers)
    sent = (await client.post("/api/v1/enquiries", headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}/read'
    assert (await client.get("/api/v1/enquiries/unread-counts")).status_code == 401
    assert (await client.post(url, json={"seen_revision": 1})).status_code == 401
    assert (await client.post(url, headers=stranger, json={"seen_revision": 1})).status_code == 404
    assert (await client.post('/api/v1/enquiries/missing/read', headers=stranger, json={"seen_revision": 1})).status_code == 404
    for patch in ({"seen_revision": 0}, {"seen_revision": "1"}, {"seen_revision": True}, {"seen_revision": 1.5}, {"seen_revision": 1, "sender_id": "spoof"}):
        assert (await client.post(url, headers=creator, json=patch)).status_code == 422
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 1


@pytest.mark.asyncio
async def test_unread_totals_cover_all_pages_and_count_enquiries_not_events(client, auth_headers, db_session):
    creator, brand, stranger, _, body = await setup(client, auth_headers)
    sent = (await client.post("/api/v1/enquiries", headers=brand, json=body)).json()
    row = await db_session.get(Enquiry, sent["id"])
    for _ in range(31):
        db_session.add(Enquiry(creator_id=row.creator_id, sender_id=row.sender_id, request_id=str(uuid.uuid4()),
            payload_hash="0" * 64, brand_name=row.brand_name, brief=row.brief, deliverable=row.deliverable,
            amount_cents=None, currency="INR", status="pending", revision=3, history=[], creator_read_revision=1, sender_read_revision=3))
    await db_session.commit()
    assert len((await client.get("/api/v1/enquiries/me", headers=creator)).json()) == 30
    assert len((await client.get("/api/v1/enquiries/me?offset=30", headers=creator)).json()) == 2
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=creator)).json()["received"] == 32
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=stranger)).json() == {"received": 0, "sent": 0}
    assert (await client.get("/api/v1/enquiries/unread-counts", headers=brand)).json()["sent"] == 0


def test_read_tracking_migration_baselines_history_without_losing_enquiries():
    import importlib.util
    from pathlib import Path
    from unittest.mock import patch
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import create_engine, text
    spec = importlib.util.spec_from_file_location("read_tracking_migration", Path(__file__).parents[1] / "alembic/versions/0010_enquiry_read_tracking.py")
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE enquiries (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, status TEXT NOT NULL)"))
        conn.execute(text("INSERT INTO enquiries VALUES ('old', 3, 'accepted')"))
        with patch.object(migration, "op", Operations(MigrationContext.configure(conn))):
            migration.upgrade()
            assert conn.execute(text("SELECT id, revision, status, creator_read_revision, sender_read_revision FROM enquiries")).one() == ("old", 3, "accepted", 3, 3)
            migration.downgrade()
            assert conn.execute(text("SELECT id, revision, status FROM enquiries")).one() == ("old", 3, "accepted")
    engine.dispose()


@pytest.mark.asyncio
async def test_sender_withdraws_pending_enquiry_preserving_terms_and_history(client, auth_headers, db_session):
    creator, brand, _, _, body = await setup(client, auth_headers)
    sent = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}'
    await client.post(url + '/read', headers=creator, json={'seen_revision': 1})
    result = await client.post(url + '/withdraw', headers=brand,
                              json={'expected_revision': 1, 'note': '  Our launch has been postponed.  '})
    assert result.status_code == 200, result.text
    assert result.headers['cache-control'] == 'no-store'
    withdrawn = result.json()
    assert withdrawn['status'] == 'withdrawn' and withdrawn['revision'] == 2
    assert withdrawn['read_revision'] == 2 and not withdrawn['is_unread']
    for field in ('brief', 'deliverable', 'amount_cents', 'currency', 'rate_card_id', 'preferred_delivery_date', 'created_at'):
        assert withdrawn[field] == sent[field]
    assert withdrawn['history'][0] == sent['history'][0]
    assert withdrawn['history'][1]['actor'] == 'brand'
    assert withdrawn['history'][1]['action'] == 'withdraw'
    assert withdrawn['history'][1]['note'] == 'Our launch has been postponed.'
    db_session.expire_all()
    received = (await client.get('/api/v1/enquiries/me', headers=creator)).json()[0]
    assert received['status'] == 'withdrawn' and received['is_unread']
    assert (await client.get('/api/v1/enquiries/unread-counts', headers=creator)).json()['received'] == 1
    assert (await client.get('/api/v1/enquiries/unread-counts', headers=brand)).json()['sent'] == 0
    older = await client.post(url + '/read', headers=creator, json={'seen_revision': 1})
    assert older.json()['is_unread']
    latest = await client.post(url + '/read', headers=creator, json={'seen_revision': 2})
    assert not latest.json()['is_unread']


@pytest.mark.asyncio
async def test_withdrawal_retry_is_idempotent_and_cannot_rewrite_reason(client, auth_headers):
    _, brand, _, _, body = await setup(client, auth_headers)
    sent = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}/withdraw'
    request = {'expected_revision': 1, 'note': 'Plans changed.'}
    first = await client.post(url, headers=brand, json=request)
    retry = await client.post(url, headers=brand, json=request)
    assert first.status_code == retry.status_code == 200
    assert first.json() == retry.json()
    for changed in ({'expected_revision': 1, 'note': 'A different reason.'}, {'expected_revision': 2}):
        assert (await client.post(url, headers=brand, json=changed)).status_code == 409
    saved = (await client.get('/api/v1/enquiries/me?view=sent', headers=brand)).json()[0]
    assert len(saved['history']) == 2 and saved['revision'] == 2


@pytest.mark.asyncio
async def test_withdrawal_requires_authenticated_sender_and_valid_revision(client, auth_headers):
    creator, brand, stranger, _, body = await setup(client, auth_headers)
    sent = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}/withdraw'
    request = {'expected_revision': 1}
    assert (await client.post(url, json=request)).status_code == 401
    for denied in (creator, stranger):
        assert (await client.post(url, headers=denied, json=request)).status_code == 404
    assert (await client.post('/api/v1/enquiries/missing/withdraw', headers=brand, json=request)).status_code == 404
    for invalid in ({}, {'expected_revision': 0}, {'expected_revision': True}, {'expected_revision': '1'},
                    {'expected_revision': 1.5}, {'expected_revision': 1, 'status': 'accepted'},
                    {'expected_revision': 1, 'note': 'a' * 2001}):
        assert (await client.post(url, headers=brand, json=invalid)).status_code == 422
    assert (await client.post(url, headers=brand, json={'expected_revision': 2})).status_code == 409
    saved = (await client.get('/api/v1/enquiries/me?view=sent', headers=brand)).json()[0]
    assert saved['status'] == 'pending' and saved['revision'] == 1 and len(saved['history']) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('action', ['accept', 'decline', 'counter'])
async def test_response_and_withdrawal_cannot_both_succeed(client, auth_headers, action):
    creator, brand, _, _, body = await setup(client, auth_headers)
    response = {'action': action, 'expected_revision': 1}
    if action == 'counter':
        response.update(amount_cents=120000, note='Includes additional usage rights.')
    first = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{first["id"]}'
    assert (await client.post(url + '/respond', headers=creator, json=response)).status_code == 200
    assert (await client.post(url + '/withdraw', headers=brand, json={'expected_revision': 1})).status_code == 409
    body['request_id'] = str(uuid.uuid4())
    second = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{second["id"]}'
    assert (await client.post(url + '/withdraw', headers=brand, json={'expected_revision': 1})).status_code == 200
    assert (await client.post(url + '/respond', headers=creator, json=response)).status_code == 409
    saved = (await client.get('/api/v1/enquiries/me?view=sent', headers=brand)).json()[0]
    assert saved['status'] == 'withdrawn' and saved['revision'] == 2
    assert [item['action'] for item in saved['history']] == ['sent', 'withdraw']


@pytest.mark.asyncio
async def test_sender_can_withdraw_current_counter_without_losing_proposal(client, auth_headers):
    creator, brand, _, _, body = await setup(client, auth_headers)
    sent = (await client.post('/api/v1/enquiries', headers=brand, json=body)).json()
    url = f'/api/v1/enquiries/{sent["id"]}'
    proposed = (await client.post(url + '/respond', headers=creator, json={
        'action': 'counter', 'expected_revision': 1, 'amount_cents': 150000,
        'note': 'Including usage rights for one month.'})).json()
    assert (await client.post(url + '/withdraw', headers=brand, json={'expected_revision': 1})).status_code == 409
    result = await client.post(url + '/withdraw', headers=brand, json={'expected_revision': 2})
    assert result.status_code == 200
    withdrawn = result.json()
    assert withdrawn['revision'] == 3 and withdrawn['status'] == 'withdrawn'
    assert withdrawn['amount_cents'] == proposed['amount_cents']
    assert withdrawn['history'][:-1] == proposed['history']
    assert [e['action'] for e in withdrawn['history']] == ['sent', 'counter', 'withdraw']
    assert not withdrawn['is_unread']
    assert (await client.post(url + '/respond', headers=brand,
                             json={'expected_revision': 2, 'action': 'accept'})).status_code == 409
