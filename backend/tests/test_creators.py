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
