import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_and_update_creator_profile(client: AsyncClient, auth_headers):
    headers = auth_headers(sub="supabase-creator-1", email="creator1@flenzr.com")

    # Access /creators/me (triggers JIT provisioning)
    response = await client.get("/api/v1/creators/me", headers=headers)
    assert response.status_code == 200
    creator = response.json()
    assert creator["display_name"] == "Sarah Miller"
    initial_handle = creator["handle"]

    # Update creator profile
    update_data = {
        "bio": "Tech reviewer & lifestyle creator with 500k+ reach.",
        "niche": "Technology & Gadgets",
        "location": "San Francisco, CA",
        "profile_theme": "dark-emerald",
    }
    update_res = await client.patch("/api/v1/creators/me", json=update_data, headers=headers)
    assert update_res.status_code == 200
    updated_creator = update_res.json()
    assert updated_creator["bio"] == update_data["bio"]
    assert updated_creator["niche"] == update_data["niche"]
    assert updated_creator["profile_theme"] == "dark-emerald"

    # Fetch via public endpoint
    public_res = await client.get(f"/api/v1/creators/public/{initial_handle}")
    assert public_res.status_code == 200
    public_data = public_res.json()
    assert public_data["handle"] == initial_handle
    assert public_data["bio"] == update_data["bio"]
    assert public_data["profile_theme"] == "dark-emerald"


@pytest.mark.asyncio
async def test_public_creator_not_found(client: AsyncClient):
    response = await client.get("/api/v1/creators/public/non-existent-handle-404")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "ENTITY_NOT_FOUND"


@pytest.mark.asyncio
async def test_creator_onboard_and_verify_workflow(client: AsyncClient):
    payload = {
        "full_name": "Shlok Srivastava",
        "email": "shlok@techburner.in",
        "handle": "techburner_official",
        "niche": "Technology & Gadgets",
        "instagram_handle": "techburner",
        "instagram_verified": False,
        "youtube_channel": "TechBurner",
        "youtube_verified": False,
        "rate_cards": [
            {
                "platform": "YouTube",
                "deliverable": "Dedicated 8-10 Min Product Review",
                "price": 150000,
                "days": 10,
            },
            {
                "platform": "Instagram",
                "deliverable": "60-Second Dynamic Product Reel",
                "price": 75000,
                "days": 5,
            },
        ],
    }

    # 1. Onboard creator
    onboard_res = await client.post("/api/v1/creators/onboard", json=payload)
    assert onboard_res.status_code == 201
    onboard_data = onboard_res.json()
    assert onboard_data["creator"]["handle"] == "techburner_official"
    assert onboard_data["creator"]["display_name"] == "Shlok Srivastava"
    assert onboard_data["creator"]["instagram_handle"] == "techburner"
    assert "access_token" in onboard_data
    assert "universal_bio_link" in onboard_data
    token = onboard_data["access_token"]

    # 2. Verify that rate cards were created in bulk and are publicly readable
    rc_res = await client.get("/api/v1/ratecards/creator/techburner_official")
    assert rc_res.status_code == 200
    rcs = rc_res.json()
    assert len(rcs) == 2
    assert any(rc["platform"] == "youtube" for rc in rcs)
    assert any(rc["platform"] == "instagram" for rc in rcs)

    # 3. Test Bio Code verification
    verify_res = await client.post(
        "/api/v1/creators/verify-bio",
        json={
            "platform": "instagram",
            "handle": "techburner_official",
            "verification_code": "FLENZR-DEV-TEST-PASS",
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verified"] is True

    # 4. Confirm public profile is now verified
    pub_res = await client.get("/api/v1/creators/public/techburner_official")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["is_verified"] is True
    assert pub_data["instagram_verified"] is True
