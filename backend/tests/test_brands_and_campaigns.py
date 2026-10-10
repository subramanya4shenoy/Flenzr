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
