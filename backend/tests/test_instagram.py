import httpx
import pytest
from app.domains.creators.instagram import public_bio, read_instagram_bio

PAGE = '''<meta property="og:url" content="https://www.instagram.com/example/">
<meta name="description" content="15 Followers - Example (&#064;example) on Instagram: &quot;My bio\nFLENZR-TEST&quot;">'''


def test_public_metadata_extracts_only_the_requested_profiles_bio():
    assert public_bio(PAGE, 'example') == 'My bio\nFLENZR-TEST'
    assert public_bio(PAGE, 'other') is None
    assert public_bio(PAGE.replace('instagram.com/example/', 'evil.example/example/'), 'example') is None
    assert public_bio(PAGE.replace('&#064;example', '&#064;other'), 'example') is None
    assert public_bio('<script>FLENZR-TEST</script>', 'example') is None
    assert public_bio(PAGE.replace(' on Instagram: &quot;', ' elsewhere &quot;'), 'example') is None


@pytest.mark.asyncio
async def test_deleted_category_error_falls_back_to_public_profile(monkeypatch):
    monkeypatch.setattr("app.domains.creators.instagram.fetch_public_profile", lambda handle: PAGE)
    calls = []
    def handler(request):
        calls.append(request.url.path)
        if 'web_profile_info' in request.url.path:
            return httpx.Response(400, json={'status': 'fail', 'message': 'Asset has been deleted'})
        return httpx.Response(200, text=PAGE)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        assert await read_instagram_bio(client, 'example') == 'My bio\nFLENZR-TEST'
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_readable_json_bio_does_not_need_fallback():
    def handler(request):
        return httpx.Response(200, json={'data': {'user': {'username': 'example', 'biography': 'A real bio'}}})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        assert await read_instagram_bio(client, 'example') == 'A real bio'


@pytest.mark.asyncio
async def test_login_page_cannot_verify_ownership(monkeypatch):
    monkeypatch.setattr("app.domains.creators.instagram.fetch_public_profile", lambda handle: "<html>Log in FLENZR-TEST</html>")
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, text='<html>Log in FLENZR-TEST</html>'))) as client:
        assert await read_instagram_bio(client, 'example') is None
