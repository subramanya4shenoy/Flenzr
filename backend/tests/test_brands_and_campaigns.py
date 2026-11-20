import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_brands_and_campaign_workflow(client: AsyncClient, auth_headers):
    brand_headers = auth_headers(sub="supabase-brand-owner-1", email="founder@lumina.io")
    creator_headers = auth_headers(sub="supabase-creator-candidate", email="creator@video.io")

    # 1. Onboard Brand Organization
    org_payload = {
        "name": "Lumina Audio",
        "billing_email": "billing@lumina.io",
        "company_name": "Lumina Audio Inc",
        "industry": "Consumer Electronics",
        "website": "https://lumina.io",
        "description": "Premium wireless noise-canceling headphones for creators.",
    }
    org_res = await client.post("/api/v1/organizations", json=org_payload, headers=brand_headers)
    assert org_res.status_code == 201
    org = org_res.json()
    assert org["name"] == "Lumina Audio"
    assert org["brand_profile"]["company_name"] == "Lumina Audio Inc"

    # 2. Get My Organization
    org_me_res = await client.get("/api/v1/organizations/me", headers=brand_headers)
    assert org_me_res.status_code == 200
    assert org_me_res.json()["id"] == org["id"]

    # 3. Create a Campaign
    campaign_payload = {
        "title": "Lumina Horizon Headphone Launch",
        "brief": "We are launching the Lumina Horizon headphones and need dedicated video reviews from audio and tech creators.",
        "target_niche": "Technology",
        "deliverable_summary": "1x Dedicated 8-10 min YouTube review with unboxing and sound test",
        "budget_total_cents": 1500000,  # $15,000 budget
        "currency": "USD",
    }
    camp_res = await client.post("/api/v1/campaigns", json=campaign_payload, headers=brand_headers)
    assert camp_res.status_code == 201
    campaign = camp_res.json()
    assert campaign["title"] == campaign_payload["title"]
    assert campaign["status"] == "active"
    campaign_id = campaign["id"]

    # 4. Explore active campaigns (as creator)
    explore_res = await client.get("/api/v1/campaigns/explore")
    assert explore_res.status_code == 200
    active_campaigns = explore_res.json()
    assert any(c["id"] == campaign_id for c in active_campaigns)

    # 5. Creator applies to campaign
    # Ensure creator is provisioned first
    creator_me_res = await client.get("/api/v1/creators/me", headers=creator_headers)
    assert creator_me_res.status_code == 200
    creator_id = creator_me_res.json()["id"]

    apply_payload = {
        "pitch_message": "I run an audiophile channel with 150k subscribers. Would love to test and feature these!",
        "proposed_rate_cents": 180000,  # $1,800
    }
    apply_res = await client.post(
        f"/api/v1/campaigns/{campaign_id}/apply",
        json=apply_payload,
        headers=creator_headers,
    )
    assert apply_res.status_code == 201
    application = apply_res.json()
    assert application["status"] == "pending"
    assert application["proposed_rate_cents"] == 180000

    # 6. Brand invites creator directly
    invite_payload = {
        "creator_id": creator_id,
        "offered_rate_cents": 200000,  # $2,000
        "message": "We love your channel and want to partner exclusively for our launch week.",
    }
    invite_res = await client.post(
        f"/api/v1/campaigns/{campaign_id}/invite",
        json=invite_payload,
        headers=brand_headers,
    )
    assert invite_res.status_code == 201
    invitation = invite_res.json()
    assert invitation["status"] == "invited"
    assert invitation["offered_rate_cents"] == 200000


@pytest.mark.asyncio
async def test_creator_discovery_search(client: AsyncClient, auth_headers):
    # Provision a creator with specific niche & handle
    c_headers = auth_headers(sub="supabase-audio-creator", email="audiophile@flenzr.com")
    await client.get("/api/v1/creators/me", headers=c_headers)
    await client.patch(
        "/api/v1/creators/me",
        json={"niche": "Audiophile Gear", "location": "Austin, TX"},
        headers=c_headers,
    )

    # Search by niche
    search_res = await client.get("/api/v1/discovery/creators?niche=Audiophile")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert any("Audiophile" in (r["niche"] or "") for r in results)


@pytest.mark.asyncio
async def test_brand_profile_persists_and_isolates_owners(client: AsyncClient, auth_headers):
    owner = auth_headers(sub="profile-owner", email="owner@example.com")
    other = auth_headers(sub="profile-other", email="other@example.com")
    outsider = auth_headers(sub="profile-outsider", email="outsider@example.com")
    for headers, name in [(owner, "First Brand"), (other, "Other Brand")]:
        response = await client.post("/api/v1/organizations", headers=headers,
                                     json={"name": name, "billing_email": "billing@example.com"})
        assert response.status_code == 201, response.text
    original = (await client.get("/api/v1/organizations/me", headers=owner)).json()
    patch = {"name": " Updated Brand ", "company_name": "Updated Ltd", "billing_email": "new@example.com",
             "industry": " Design ", "website": "https://example.com/brand", "description": "A real brand."}
    response = await client.patch("/api/v1/organizations/me", headers=owner, json=patch)
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved["name"] == "Updated Brand"
    assert saved["billing_email"] == "new@example.com"
    assert saved["brand_profile"]["company_name"] == "Updated Ltd"
    assert saved["brand_profile"]["industry"] == "Design"
    assert saved["brand_profile"]["website"] == patch["website"]
    assert saved["brand_profile"]["description"] == patch["description"]
    assert saved["slug"] == original["slug"]
    assert saved["owner_id"] == original["owner_id"]
    assert saved["brand_profile"]["is_verified"] is False
    assert (await client.get("/api/v1/organizations/me", headers=owner)).json() == saved
    assert (await client.get("/api/v1/organizations/me", headers=other)).json()["name"] == "Other Brand"
    assert (await client.patch("/api/v1/organizations/me", headers=outsider, json={"name": "Intruder"})).status_code == 403
    assert (await client.patch("/api/v1/organizations/me", json={"name": "Intruder"})).status_code == 401
    assert (await client.patch(f"/api/v1/organizations/{original['id']}", headers=other, json={"name": "Intruder"})).status_code in (404, 405)
    # Partial updates preserve omitted fields; optional fields can be explicitly cleared.
    cleared = await client.patch("/api/v1/organizations/me", headers=owner, json={"industry": "", "website": None, "description": "  "})
    assert cleared.status_code == 200
    assert cleared.json()["name"] == "Updated Brand"
    assert cleared.json()["brand_profile"]["company_name"] == "Updated Ltd"
    assert all(cleared.json()["brand_profile"][key] is None for key in ("industry", "website", "description"))


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [
    {"name": "  "}, {"company_name": None}, {"billing_email": "invalid"},
    {"website": "javascript:alert(1)"}, {"website": "https://user:password@example.com"},
    {"industry": "a" * 129}, {"description": "a" * 5001},
    {"owner_id": "someone-else"}, {"slug": "changed"}, {"is_verified": True}, {"billing_status": "paid"},
])
async def test_brand_profile_rejects_invalid_or_privileged_changes(client: AsyncClient, auth_headers, payload):
    headers = auth_headers(sub="profile-validation", email="owner@example.com")
    created = await client.post("/api/v1/organizations", headers=headers,
                                json={"name": "Original Brand", "billing_email": "billing@example.com"})
    assert created.status_code == 201
    result = await client.patch("/api/v1/organizations/me", headers=headers, json=payload)
    assert result.status_code == 422, result.text
    assert (await client.get("/api/v1/organizations/me", headers=headers)).json()["name"] == "Original Brand"
