"""Best-effort public HTML counts; no API keys, cookies, scripts or challenge bypasses."""
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit

import httpx
from app.core.exceptions import FlenzrException

MAX_BYTES = 4 * 1024 * 1024
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class ProfileHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.articles = []
        self.nodes = 0

    def handle_starttag(self, tag, attrs):
        self.nodes += 1
        if self.nodes > 50000 or len(self.stack) > 256:
            raise ValueError('Oversized public page')
        node = {'tag': tag, 'attrs': dict(attrs), 'children': [], 'parent': self.stack[-1] if self.stack else None}
        if self.stack:
            self.stack[-1]['children'].append(node)
        if tag == 'article':
            self.articles.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]['tag'] == tag:
                del self.stack[index:]
                break


def walk(node):
    yield node
    for child in node['children']:
        yield from walk(child)


def permalink(value, handle):
    if not isinstance(value, str):
        return None
    url = urlsplit(value)
    if url.scheme and (url.scheme != 'https' or url.hostname not in ('x.com', 'www.x.com', 'twitter.com', 'www.twitter.com') or url.username or url.password):
        return None
    if url.netloc and not url.scheme:
        return None
    match = re.fullmatch(r'/([A-Za-z0-9_]{1,15})/status/([0-9]{1,24})/?', url.path)
    return match[2] if match and match[1].lower() == handle.lower() else None


def metric(labels, kind):
    # Accept exact integers only. Rounded labels such as 1.2K are not exact counts.
    pattern = r'([0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)\s+' + kind + r'\.\s*\w+'
    values = []
    for label in labels:
        match = re.fullmatch(pattern, label, re.I)
        if match:
            value = int(match[1].replace(',', ''))
            if value <= 9007199254740991:
                values.append(value)
    return values[0] if len(values) == 1 else None


def parse_public_posts(html, handle):
    parser = ProfileHTML()
    parser.feed(html)
    posts = {}
    for article in parser.articles:
        parent = article['parent']
        if not parent:
            continue
        # Current public markup places the canonical permalink beside the article.
        candidates = {value for node in parent['children'] if node['tag'] == 'a'
            if (value := permalink(node['attrs'].get('href'), handle))}
        if not candidates:
            candidates = {value for node in walk(article) if node['tag'] == 'a'
                if (value := permalink(node['attrs'].get('href'), handle))}
        if len(candidates) != 1:
            continue  # Never mix quoted/foreign posts or ambiguous article identities.
        post_id = next(iter(candidates))
        labels = [node['attrs']['aria-label'] for node in walk(article) if isinstance(node['attrs'].get('aria-label'), str)]
        likes = metric(labels, r'Likes?')
        comments = metric(labels, r'Repl(?:y|ies)')
        times = [node['attrs'].get('datetime') for node in walk(article) if node['tag'] == 'time' and node['attrs'].get('datetime')]
        posts[post_id] = {'id': post_id, 'publishedAt': times[0] if len(times) == 1 else None,
            'likes': likes, 'comments': comments, 'total': likes + comments if likes is not None and comments is not None else None}
    return sorted(posts.values(), key=lambda entry: int(entry['id']), reverse=True)[:10]


async def fetch_public_posts(client, handle):
    if not re.fullmatch(r'[A-Za-z0-9_]{1,15}', handle):
        raise FlenzrException('X_PUBLIC_UNAVAILABLE', 'This X handle cannot be read from a public profile.', 409)
    try:
        async with client.stream('GET', 'https://x.com/' + handle,
            headers={'Accept': 'text/html', 'User-Agent': 'Flenzr/1.0 (+https://flenzr.com)'}) as response:
            if response.status_code == 429:
                raise FlenzrException('X_PUBLIC_RATE_LIMITED', 'X’s public profile is rate-limited. Please try again later.', 503)
            if response.status_code != 200 or 'text/html' not in response.headers.get('content-type', '').lower():
                raise FlenzrException('X_PUBLIC_UNAVAILABLE', 'X is not exposing this public profile right now. Saved results have been kept.', 503)
            chunks, size = [], 0
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ValueError('Oversized public page')
                chunks.append(chunk)
        posts = parse_public_posts(b''.join(chunks).decode('utf-8', errors='replace'), handle)
    except (httpx.HTTPError, ValueError, RecursionError):
        raise FlenzrException('X_PUBLIC_UNAVAILABLE', 'X’s public post counts could not be read. Please try again later.', 503)
    if not posts or not any(post['total'] is not None for post in posts):
        raise FlenzrException('X_PUBLIC_COUNTS_UNAVAILABLE', 'X did not expose readable public post counts. Saved results have been kept.', 503)
    return posts
