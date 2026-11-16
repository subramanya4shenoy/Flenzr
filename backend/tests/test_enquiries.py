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
