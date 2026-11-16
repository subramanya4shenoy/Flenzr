import httpx
import pytest
from app.core.exceptions import FlenzrException
from app.domains.creators.x_public_posts import fetch_public_posts, parse_public_posts


def article(post_id='101', handle='example', likes='1,234', replies='0', extra=''):
    return f'<div><a href="/{handle}/status/{post_id}"></a><article><button aria-label="{likes} Likes. Like"></button><button aria-label="{replies} Replies. Reply"></button>{extra}</article></div>'


def test_exact_counts_owner_dedup_and_latest_visible_order():
    html = article('101') + article('102', likes='0') + article('101') + article('999', handle='someone_else')
    posts = parse_public_posts(html, 'example')
    assert [p['id'] for p in posts] == ['102', '101']
    assert posts[0]['total'] == 0 and posts[1]['likes'] == 1234 and posts[1]['comments'] == 0


def test_rounded_missing_or_ambiguous_counts_are_not_fabricated():
    posts = parse_public_posts(article('101', likes='1.2K') + article('102', extra='<button aria-label="9 Likes. Like"></button>'), 'example')
    assert all(post['total'] is None for post in posts)
    assert parse_public_posts('<html>Login required</html>', 'example') == []
    assert len(parse_public_posts(''.join(article(str(i)) for i in range(15)), 'example')) == 10


@pytest.mark.asyncio
async def test_public_request_has_no_tokens_or_cookies():
    async def handler(request):
        assert str(request.url) == 'https://x.com/example'
        assert 'authorization' not in request.headers and 'cookie' not in request.headers
        assert 'Flenzr' in request.headers['user-agent']
        return httpx.Response(200, headers={'Content-Type': 'text/html'}, text=article())
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False) as client:
        posts = await fetch_public_posts(client, 'example')
    assert posts[0]['total'] == 1234


@pytest.mark.asyncio
@pytest.mark.parametrize('status,body', [(429, ''), (403, ''), (302, ''), (200, '<html>Log in</html>'), (200, article(likes='1K'))])
async def test_blocks_and_unreadable_pages_do_not_become_zero_counts(status, body):
    calls = []
    async def handler(request):
        calls.append(request)
        return httpx.Response(status, headers={'Content-Type': 'text/html', 'Location': 'https://example.invalid/'}, text=body)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False) as client:
        with pytest.raises(FlenzrException):
            await fetch_public_posts(client, 'example')
    assert len(calls) == 1
