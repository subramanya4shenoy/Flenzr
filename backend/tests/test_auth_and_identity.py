import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    response = await client.get("/api/v1/identity/me")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHENTICATED"


@pytest.mark.asyncio
async def test_jit_user_provisioning_and_get_me(client: AsyncClient, auth_headers):
    headers = auth_headers(sub="supabase-user-xyz", email="test@flenzr.com")
    response = await client.get("/api/v1/identity/me", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["user"]["email"] == "test@flenzr.com"
    assert data["user"]["supabase_uid"] == "supabase-user-xyz"
    assert "creator" in data["active_roles"]
    assert data["creator_id"] is not None


@pytest.mark.asyncio
async def test_sync_user_profile(client: AsyncClient, auth_headers):
    headers = auth_headers(sub="supabase-user-sync-test", email="sync@flenzr.com")
    sync_payload = {
        "full_name": "Alex Rivers",
        "avatar_url": "https://images.flenzr.com/alex.jpg",
        "role": "creator",
    }
    response = await client.post("/api/v1/identity/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["full_name"] == "Alex Rivers"
    assert data["user"]["avatar_url"] == "https://images.flenzr.com/alex.jpg"
