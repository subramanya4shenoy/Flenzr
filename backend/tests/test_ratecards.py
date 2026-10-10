import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_manage_rate_cards(client: AsyncClient, auth_headers):
    headers = auth_headers(sub="supabase-ratecard-creator", email="ratecard@flenzr.com")

    # Access /creators/me to provision creator
    me_res = await client.get("/api/v1/creators/me", headers=headers)
    assert me_res.status_code == 200
    creator = me_res.json()
    handle = creator["handle"]

    # 1. Create a rate card
    create_payload = {
        "platform": "youtube",
        "deliverable_type": "dedicated_video",
        "title": "Dedicated 8-10 Minute YouTube Review",
        "description": "Full dedicated product review with custom demo and affiliate link in description.",
        "base_price_cents": 250000,  # $2,500.00
        "currency": "USD",
        "turnaround_days": 14,
        "is_active": True,
    }
    create_res = await client.post("/api/v1/ratecards", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    rate_card = create_res.json()
    assert rate_card["title"] == create_payload["title"]
    assert rate_card["base_price_cents"] == 250000
    ratecard_id = rate_card["id"]

    # 2. List creator's own rate cards
    list_res = await client.get("/api/v1/ratecards/me", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == ratecard_id

    # 3. Public handle endpoint
    public_res = await client.get(f"/api/v1/ratecards/creator/{handle}")
    assert public_res.status_code == 200
    public_items = public_res.json()
    assert len(public_items) == 1
    assert public_items[0]["title"] == create_payload["title"]

    # 4. Update rate card
    update_res = await client.patch(
        f"/api/v1/ratecards/{ratecard_id}",
        json={"base_price_cents": 300000},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["base_price_cents"] == 300000

    # 5. Delete rate card
    del_res = await client.delete(f"/api/v1/ratecards/{ratecard_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify deleted
    list_after_res = await client.get("/api/v1/ratecards/me", headers=headers)
    assert len(list_after_res.json()) == 0
