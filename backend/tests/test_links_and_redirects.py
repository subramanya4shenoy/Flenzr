import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tracked_link_lifecycle_and_redirect(client: AsyncClient, auth_headers):
    headers = auth_headers(sub="supabase-link-creator", email="linkcreator@flenzr.com")

    # 1. Create a tracked link
    link_payload = {
        "title": "My Favorite Microphone - Shure SM7B",
        "destination_url": "https://brand.example.com/products/sm7b",
        "custom_short_code": "shure-sm7b",
        "utm_source": "flenzr",
        "utm_medium": "creator_bio",
        "utm_campaign": "audio_gear",
        "is_active": True,
    }
    create_res = await client.post("/api/v1/links", json=link_payload, headers=headers)
    assert create_res.status_code == 201
    created_link = create_res.json()
    assert created_link["short_code"] == "shure-sm7b"
    assert created_link["click_count"] == 0
    link_id = created_link["id"]

    # 2. List links
    list_res = await client.get("/api/v1/links", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Test short link redirect (HTTP 307)
    redirect_res = await client.get(
        "/r/shure-sm7b",
        headers={"referer": "https://instagram.com/creator", "user-agent": "Mozilla/5.0"},
        follow_redirects=False,
    )
    assert redirect_res.status_code == 307
    location = redirect_res.headers["location"]
    assert "https://brand.example.com/products/sm7b" in location
    assert "utm_source=flenzr" in location
    assert "utm_medium=creator_bio" in location
    assert "utm_campaign=audio_gear" in location

    # 4. Check stats endpoint
    stats_res = await client.get(f"/api/v1/links/{link_id}/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["link"]["id"] == link_id


@pytest.mark.asyncio
async def test_redirect_nonexistent_link(client: AsyncClient):
    response = await client.get("/r/non-existent-code-999", follow_redirects=False)
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "ENTITY_NOT_FOUND"
