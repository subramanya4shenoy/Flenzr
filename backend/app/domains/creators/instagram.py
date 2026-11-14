"""Read public Instagram bios; never treat unavailable content as ownership proof."""
import asyncio
import logging
from html.parser import HTMLParser
import re
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import URLError, HTTPError
from urllib.parse import urlparse
import httpx


logger = logging.getLogger(__name__)


class ProfileMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.values = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('property') or attrs.get('name')
            if key:
                self.values[key] = attrs.get('content', '')


def public_bio(page: str, handle: str):
    metadata = ProfileMetadata()
    metadata.feed(page)
    values = metadata.values
    canonical = urlparse(values.get('og:url', ''))
    if canonical.scheme != 'https' or canonical.hostname not in ('instagram.com', 'www.instagram.com'):
        return None
    if canonical.path.strip('/').lower() != handle.lower():
        return None
    description = values.get('description', '')
    # A generic profile summary has no bio. Only accept the bio-specific metadata,
    # with an exact handle boundary and the platform's quoted biography format.
    marker = f'(@{handle}) on Instagram: "'
    start = description.lower().find(marker.lower())
    if start < 0 or not description.endswith('"'):
        return None
    return description[start + len(marker):-1]


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_public_profile(handle: str):
    # A bounded public request, with no credentials or redirects. A login page
    # or a different profile must never become ownership evidence.
    if not re.fullmatch(r'[a-zA-Z0-9_.]{1,128}', handle):
        return None
    request = Request(f'https://www.instagram.com/{handle}/')
    try:
        with build_opener(NoRedirect).open(request, timeout=10) as response:
            content = response.read(2_000_001)
            if len(content) > 2_000_000:
                logger.warning("Instagram public bio unavailable: response exceeds size limit")
                return None
            return content.decode('utf-8', errors='replace')
    except HTTPError as error:
        location = urlparse(error.headers.get("Location", "")).path
        reason = "login_redirect" if location.startswith("/accounts/login") else "http_error"
        logger.warning("Instagram public bio unavailable: status=%s reason=%s", error.code, reason)
        return None
    except (URLError, TimeoutError, OSError) as error:
        logger.warning("Instagram public bio unavailable: transport_error=%s", type(error).__name__)
        return None


async def read_instagram_bio(client: httpx.AsyncClient, handle: str):
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'x-ig-app-id': '936619743392459',
        'Referer': 'https://www.instagram.com/',
    }
    try:
        response = await client.get(
            f'https://www.instagram.com/api/v1/users/web_profile_info/?username={handle}',
            headers=headers,
        )
        if response.status_code == 200:
            user = (response.json().get('data') or {}).get('user') or {}
            # The endpoint is scoped to the requested handle; validate an explicit
            # username too when Instagram includes it in the response.
            if user.get('username', handle).lower() == handle.lower() and isinstance(user.get('biography'), str):
                return user['biography']
        redirected_to_login = any(urlparse(r.headers.get("Location", "")).path.startswith("/accounts/login") for r in [*response.history, response])
        reason = "login_redirect" if redirected_to_login else "rate_limited" if response.status_code == 429 else "missing_biography" if response.status_code == 200 else "http_error"
        logger.warning("Instagram profile API unavailable: status=%s reason=%s; trying public page", response.status_code, reason)
    except (httpx.HTTPError, ValueError, AttributeError, TypeError) as error:
        logger.warning("Instagram profile API unavailable: response_error=%s; trying public page", type(error).__name__)
    # Some business profiles fail the JSON endpoint with a deleted-category schema
    # error while their public page still exposes a complete biography.
    page = await asyncio.to_thread(fetch_public_profile, handle)
    bio = public_bio(page, handle) if page is not None else None
    if page is not None and bio is None:
        logger.warning("Instagram public bio unavailable: reason=missing_or_mismatched_profile_metadata")
    return bio
