"""Owner-bound YouTube OAuth, PKCE, encrypted tokens and on-demand refresh."""
import base64
import hashlib
import json
from pathlib import Path
import secrets
import time
from urllib.parse import urlencode, urlparse

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import FlenzrException, PermissionDeniedError
from app.domains.creators.socials import SocialAccountRead, owned_creator, social_accounts, store_accounts
from app.domains.identity.models import SystemRole, User

router = APIRouter(prefix='/creators/me/youtube', tags=['YouTube connection'])
creator_role = require_role([SystemRole.CREATOR])
SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
FLOW = '_youtube_flow'


def fail(code, message, status=503):
    raise FlenzrException(code, message, status)


def configuration():
    try:
        path = Path(settings.YOUTUBE_OAUTH_CLIENT_FILE)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[3] / path
        app = json.loads(path.read_text())['web']
        if not app.get('client_id') or not app.get('client_secret'):
            raise ValueError()
        encryption = Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode())
        callback = urlparse(settings.YOUTUBE_REDIRECT_URI)
        if (callback.scheme != 'https' and not (callback.scheme == 'http' and callback.hostname in ('localhost', '127.0.0.1'))) or not callback.netloc or callback.username or callback.password or callback.query or callback.fragment:
            raise ValueError()
        return app, encryption, callback
    except (OSError, ValueError, KeyError, TypeError):
        fail('YOUTUBE_NOT_CONFIGURED', 'YouTube connection is not configured yet.')


class ConnectRequest(BaseModel):
    handle: str | None = Field(default=None, min_length=1, max_length=128)
    model_config = ConfigDict(extra='forbid')

    @field_validator('handle', mode='before')
    @classmethod
    def clean(cls, value):
        return value.strip().lstrip('@').lower() if isinstance(value, str) else value


class CompleteRequest(BaseModel):
    code: str = Field(min_length=1, max_length=4096)
    state: str = Field(min_length=32, max_length=128)
    model_config = ConfigDict(extra='forbid')


def linked(creator, handle):
    return next((a for a in social_accounts(creator) if a.platform == 'youtube' and a.handle == handle), None)


async def provider(client, method, url, **kwargs):
    try:
        response = await client.request(method, url, **kwargs)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        fail('YOUTUBE_UNAVAILABLE', 'YouTube could not be reached. Please try again.')
    if not response.is_success:
        if response.status_code == 429:
            fail('YOUTUBE_RATE_LIMITED', 'YouTube’s request limit has been reached. Try again later.')
        fail('YOUTUBE_AUTHORIZATION_FAILED', 'YouTube access could not be confirmed. Check the API configuration or reconnect your channel.', 409)
    if not isinstance(data, dict):
        fail('YOUTUBE_UNAVAILABLE', 'YouTube returned an unreadable response.')
    return data


async def channel(client, token, **query):
    data = await provider(client, 'GET', 'https://www.googleapis.com/youtube/v3/channels',
        params={'part': 'snippet,statistics', **query}, headers={'Authorization': f'Bearer {token}'})
    items = data.get('items')
    if not isinstance(items, list) or len(items) != 1 or not isinstance(items[0], dict) or not items[0].get('id'):
        fail('YOUTUBE_CHANNEL_REQUIRED', 'Choose the matching YouTube channel, then try connecting again.', 409)
    return items[0]


def snapshot(data, handle):
    stats = data.get('statistics', {})
    def number(key):
        value = stats.get(key)
        if isinstance(value, bool):
            return None
        try:
            result = int(value)
            return result if 0 <= result <= 9007199254740991 else None
        except (ValueError, TypeError):
            return None
    hidden = stats.get('hiddenSubscriberCount') is True
    snippet = data.get('snippet', {})
    followers = None if hidden else number('subscriberCount')
    return {'platform': 'youtube', 'handle': handle, 'accountId': data['id'],
        'displayName': snippet.get('title') or handle,
        'thumbnailUrl': snippet.get('thumbnails', {}).get('default', {}).get('url'),
        'followers': followers, 'followersAvailable': followers is not None, 'subscribersHidden': hidden,
        'totalViews': number('viewCount'), 'videoCount': number('videoCount'),
        'avgViews': None, 'engagementRate': None, 'isRealData': True,
        'source': 'youtube-oauth', 'connected': True}


@router.post('/connect')
async def connect(body: ConnectRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    app, encryption, callback = configuration()
    creator = await owned_creator(db, user)
    if body.handle and not linked(creator, body.handle):
        raise PermissionDeniedError('Link this YouTube handle before connecting it.')
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    credentials = dict(creator.social_credentials or {})
    credentials[FLOW] = {'hash': hashlib.sha256(state.encode()).hexdigest(), 'handle': body.handle,
        'verifier': encryption.encrypt(verifier.encode()).decode(), 'expires_at': int(time.time()) + 600, 'status': 'pending'}
    creator.social_credentials = credentials
    await db.commit()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    params = {'client_id': app['client_id'], 'redirect_uri': settings.YOUTUBE_REDIRECT_URI,
        'response_type': 'code', 'scope': SCOPE, 'state': state, 'access_type': 'offline',
        'prompt': 'consent', 'code_challenge': challenge, 'code_challenge_method': 'S256'}
    return {'url': 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params),
        'callbackOrigin': f'{callback.scheme}://{callback.netloc}'}


@router.post('/callback')
async def complete(body: CompleteRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    app, encryption, _ = configuration()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    flow = credentials.get(FLOW, {})
    if flow.get('status') != 'pending' or flow.get('expires_at', 0) < time.time() or not secrets.compare_digest(flow.get('hash', ''), hashlib.sha256(body.state.encode()).hexdigest()):
        raise PermissionDeniedError('YouTube connection expired or was already used. Please start again.')
    handle = flow['handle']
    if handle and not linked(creator, handle):
        raise PermissionDeniedError('The linked account changed. Please start again.')
    try:
        verifier = encryption.decrypt(flow['verifier'].encode()).decode()
    except (InvalidToken, KeyError):
        raise PermissionDeniedError('YouTube connection expired. Please start again.')
    credentials[FLOW] = {**flow, 'status': 'exchanging'}
    creator.social_credentials = credentials
    await db.commit()
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        grant = await provider(client, 'POST', 'https://oauth2.googleapis.com/token', data={
            'client_id': app['client_id'], 'client_secret': app['client_secret'], 'code': body.code,
            'redirect_uri': settings.YOUTUBE_REDIRECT_URI, 'grant_type': 'authorization_code', 'code_verifier': verifier})
        token, refresh, expiry = grant.get('access_token'), grant.get('refresh_token'), grant.get('expires_in')
        if not isinstance(token, str) or not token or not isinstance(refresh, str) or not refresh or not isinstance(expiry, int) or expiry <= 0 or SCOPE not in grant.get('scope', '').split():
            fail('YOUTUBE_PERMISSION_REQUIRED', 'Grant read access to your YouTube channel and try again.', 409)
        authorized = await channel(client, token, mine='true')
        if handle:
            expected = await channel(client, token, forHandle=handle)
            if authorized['id'] != expected['id']:
                raise PermissionDeniedError('Google authorized a different YouTube channel. Choose the matching channel.')
        else:
            custom = authorized.get('snippet', {}).get('customUrl', '')
            if not isinstance(custom, str) or not custom.startswith('@') or not 1 < len(custom) <= 129:
                fail('YOUTUBE_HANDLE_REQUIRED', 'Set a handle on your YouTube channel, then connect again.', 409)
            handle = custom[1:].lower()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(FLOW, {})
    if current.get('hash') != flow['hash'] or current.get('status') != 'exchanging' or (flow.get('handle') and not linked(creator, flow['handle'])):
        raise PermissionDeniedError('This account changed during authorization. Please start again.')
    # Re-authorizing an already connected channel must not duplicate its account.
    if not flow.get('handle'):
        existing = next((key[8:] for key, value in credentials.items() if key.startswith('youtube:') and value.get('account_id') == authorized['id'] and linked(creator, key[8:])), None)
        if existing:
            handle = existing
    result = snapshot(authorized, handle)
    credentials.pop(FLOW, None)
    credentials['youtube:' + handle] = {'encrypted_token': encryption.encrypt(token.encode()).decode(),
        'encrypted_refresh_token': encryption.encrypt(refresh.encode()).decode(), 'account_id': authorized['id'],
        'expires_at': int(time.time()) + expiry, 'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    account = next((a for a in accounts if a.platform == 'youtube' and a.handle == handle), None)
    if account:
        account.is_verified = True
    else:
        accounts.append(SocialAccountRead(platform='youtube', handle=handle, is_verified=True))
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': True, 'handle': handle}


@router.get('/stats')
async def stats(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.strip().lstrip('@').lower()
    creator = await owned_creator(db, user)
    if not linked(creator, handle):
        raise PermissionDeniedError('This YouTube account is not linked to your profile.')
    key = 'youtube:' + handle
    credential = (creator.social_credentials or {}).get(key)
    if not credential:
        fail('YOUTUBE_CONNECTION_REQUIRED', 'Connect YouTube to authorize this channel.', 409)
    app, encryption, _ = configuration()
    # Lock the creator throughout refresh to serialize token updates and removal.
    try:
        token = encryption.decrypt(credential['encrypted_token'].encode()).decode()
        refresh = encryption.decrypt(credential['encrypted_refresh_token'].encode()).decode()
    except (InvalidToken, KeyError, ValueError):
        fail('YOUTUBE_CONNECTION_EXPIRED', 'Please reconnect this YouTube channel.', 409)
    if credential.get('expires_at', 0) > time.time() + 60 and credential.get('fetched_at', 0) > time.time() - 300:
        return credential['snapshot']
    updated = dict(credential)
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        if credential.get('expires_at', 0) <= time.time() + 60:
            grant = await provider(client, 'POST', 'https://oauth2.googleapis.com/token', data={
                'client_id': app['client_id'], 'client_secret': app['client_secret'],
                'grant_type': 'refresh_token', 'refresh_token': refresh})
            token, expiry = grant.get('access_token'), grant.get('expires_in')
            if not isinstance(token, str) or not token or not isinstance(expiry, int) or expiry <= 0:
                fail('YOUTUBE_CONNECTION_EXPIRED', 'Please reconnect this YouTube channel.', 409)
            updated.update(encrypted_token=encryption.encrypt(token.encode()).decode(), expires_at=int(time.time()) + expiry)
            if isinstance(grant.get('refresh_token'), str) and grant['refresh_token']:
                updated['encrypted_refresh_token'] = encryption.encrypt(grant['refresh_token'].encode()).decode()
        data = await channel(client, token, mine='true')
        if data['id'] != credential['account_id']:
            raise PermissionDeniedError('YouTube returned a different channel. Please reconnect.')
        result = snapshot(data, handle)
    credentials = dict(creator.social_credentials or {})
    credentials[key] = {**updated, 'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    await db.commit()
    return result


@router.delete('/connection')
async def disconnect(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.strip().lstrip('@').lower()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    credentials.pop('youtube:' + handle, None)
    if credentials.get(FLOW, {}).get('handle') == handle:
        credentials.pop(FLOW, None)
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'youtube' and account.handle == handle:
            account.is_verified = False
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': False, 'handle': handle}
