import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_qr_code(client: AsyncClient, auth_headers):
    headers = auth_headers(sub="supabase-qr-user", email="qr@flenzr.com")
    payload = {
        "url": "https://flenzr.com/r/shure-sm7b",
        "fill_color": "#059669",
        "back_color": "#ffffff",
        "box_size": 10,
        "border": 2,
    }
    response = await client.post("/api/v1/qrcodes/generate", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["target_url"] == payload["url"]
    assert data["data_url"].startswith("data:image/png;base64,")
    assert len(data["data_url"]) > 100
