"""Owner-bound X OAuth 2.0, S256 PKCE, encrypted tokens and cached public counts."""
import base64
import hashlib
import re
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

router = APIRouter(prefix='/creators/me/x', tags=['X connection'])
creator_role = require_role([SystemRole.CREATOR])
FLOW = '_x_flow'
SCOPES = 'tweet.read users.read offline.access'
CACHE_SECONDS = 900
TOKEN_URL = 'https://api.x.com/2/oauth2/token'


def fail(code, message, status=503):
    raise FlenzrException(code, message, status)


def configuration():
    try:
        callback = urlparse(settings.X_REDIRECT_URI)
        if (not settings.X_CLIENT_ID or not settings.X_CLIENT_SECRET or callback.scheme != 'https'
                or not callback.hostname or callback.username or callback.password or callback.query or callback.fragment):
            raise ValueError()
        return Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode()), callback
    except (ValueError, TypeError):
        fail('X_NOT_CONFIGURED', 'X connection is not configured yet.')


class ConnectRequest(BaseModel):
    handle: str | None = Field(default=None, min_length=1, max_length=15, pattern=r'^[A-Za-z0-9_]+$')
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
    return next((a for a in social_accounts(creator) if a.platform == 'x' and a.handle == handle), None)


async def provider(client, method, url, **kwargs):
    try:
        response = await client.request(method, url, **kwargs)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        fail('X_UNAVAILABLE', 'X could not be reached. Please try again.')
    if not response.is_success:
        # Retain fixed stages/statuses and allowlisted codes, never provider text.
        diagnostic = {'stage': 'token_exchange' if url == TOKEN_URL else 'profile_lookup',
                      'http_status': response.status_code}
        if isinstance(data, dict):
            error = data.get('error')
            if error in ('invalid_client', 'invalid_grant', 'invalid_request', 'invalid_scope', 'unauthorized_client'):
                diagnostic['provider_error'] = error
            reason = data.get('reason')
            if reason in ('client-not-enrolled', 'client-not-authorized'):
                diagnostic['provider_reason'] = reason
        code, message, status = 'X_AUTHORIZATION_FAILED', 'X access could not be confirmed. Please connect again.', 409
        if response.status_code == 402:
            code, message, status = 'X_BILLING_REQUIRED', 'X connection is temporarily unavailable. Please contact Flenzr support.', 503
        elif response.status_code == 429:
            code, message, status = 'X_RATE_LIMITED', 'X’s request limit has been reached. Try again later.', 503
        elif url == TOKEN_URL and diagnostic.get('provider_error') in ('invalid_client', 'unauthorized_client'):
            code, message = 'X_CLIENT_CONFIGURATION', 'X connection needs an application configuration update. Please contact Flenzr support.'
        elif url != TOKEN_URL and response.status_code == 403:
            code, message = 'X_API_ACCESS_REQUIRED', 'X did not allow profile access for Flenzr. Please contact Flenzr support.'
        raise FlenzrException(code, message, status, details=[diagnostic])
    if not isinstance(data, dict):
        fail('X_UNAVAILABLE', 'X returned an unreadable response.')
    return data


async def member(client, token):
    response = await provider(client, 'GET', 'https://api.x.com/2/users/me',
        params={'user.fields': 'profile_image_url,public_metrics'}, headers={'Authorization': f'Bearer {token}'})
    data = response.get('data')
    if (not isinstance(data, dict) or not isinstance(data.get('id'), str) or not data['id'].isdigit()
            or not isinstance(data.get('username'), str) or not re.fullmatch(r'[A-Za-z0-9_]{1,15}', data['username'])):
        fail('X_PROFILE_REQUIRED', 'X did not return an account profile. Please connect again.', 409)
    return data


def snapshot(data, handle):
    metrics = data.get('public_metrics')
    metrics = metrics if isinstance(metrics, dict) else {}
    def number(key):
        value = metrics.get(key)
        return value if type(value) is int and 0 <= value <= 9007199254740991 else None
    name = data.get('name')
    name = name[:255] if isinstance(name, str) and name.strip() else handle
    picture = data.get('profile_image_url')
    avatar = '/api/proxy-image?' + urlencode({'url': picture, 'name': name}) if isinstance(picture, str) and picture.startswith('https://') and len(picture) <= 4096 else None
    followers = number('followers_count')
    return {'platform': 'x', 'handle': handle, 'displayName': name, 'avatarUrl': avatar,
        'followers': followers, 'followersAvailable': followers is not None,
        'following': number('following_count'), 'postCount': number('post_count') if 'post_count' in metrics else number('tweet_count'),
        'avgViews': None, 'engagementRate': None, 'connected': True, 'isRealData': True,
        'source': 'x-oauth', 'cacheSeconds': CACHE_SECONDS}


def grant_values(grant, require_refresh=True):
    token, expiry, refresh = grant.get('access_token'), grant.get('expires_in'), grant.get('refresh_token')
    scope = grant.get('scope')
    if (not isinstance(token, str) or not token or type(expiry) is not int or expiry <= 0
            or (require_refresh and (not isinstance(refresh, str) or not refresh))
            or (scope is not None and (not isinstance(scope, str) or not set(SCOPES.split()).issubset(scope.split())))
            or (require_refresh and scope is None)):
        fail('X_PERMISSION_REQUIRED', 'Grant read access to your X account and try connecting again.', 409)
    return token, expiry, refresh


@router.post('/connect')
async def connect(body: ConnectRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    encryption, callback = configuration()
    creator = await owned_creator(db, user)
    if body.handle and not linked(creator, body.handle):
        raise PermissionDeniedError('This X account is no longer linked. Please start again.')
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    credentials = dict(creator.social_credentials or {})
    credentials[FLOW] = {'hash': hashlib.sha256(state.encode()).hexdigest(), 'handle': body.handle,
        'verifier': encryption.encrypt(verifier.encode()).decode(), 'status': 'pending',
        'expires_at': int(time.time()) + 600, 'client_id': settings.X_CLIENT_ID, 'redirect_uri': settings.X_REDIRECT_URI}
    creator.social_credentials = credentials
    await db.commit()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    params = {'response_type': 'code', 'client_id': settings.X_CLIENT_ID, 'redirect_uri': settings.X_REDIRECT_URI,
              'scope': SCOPES, 'state': state, 'code_challenge': challenge, 'code_challenge_method': 'S256'}
    return {'url': 'https://x.com/i/oauth2/authorize?' + urlencode(params), 'callbackOrigin': f'{callback.scheme}://{callback.netloc}'}


@router.post('/callback')
async def complete(body: CompleteRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    encryption, _ = configuration()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    flow = credentials.get(FLOW, {})
    if (flow.get('status') != 'pending' or flow.get('expires_at', 0) < time.time()
            or not secrets.compare_digest(flow.get('hash', ''), hashlib.sha256(body.state.encode()).hexdigest())
            or flow.get('client_id') != settings.X_CLIENT_ID or flow.get('redirect_uri') != settings.X_REDIRECT_URI):
        fail('X_FLOW_EXPIRED', 'X connection expired or was already used. Please start again.', 403)
    expected_handle = flow.get('handle')
    previous = credentials.get('x:' + (expected_handle or ''))
    if expected_handle and not linked(creator, expected_handle):
        raise PermissionDeniedError('This X account changed. Please start again.')
    try:
        verifier = encryption.decrypt(flow['verifier'].encode()).decode()
    except (InvalidToken, KeyError, ValueError):
        fail('X_FLOW_EXPIRED', 'X connection expired. Please start again.', 403)
    credentials[FLOW] = {**flow, 'status': 'exchanging'}
    creator.social_credentials = credentials
    await db.commit()
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            grant = await provider(client, 'POST', TOKEN_URL, auth=httpx.BasicAuth(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET),
                data={'grant_type': 'authorization_code', 'code': body.code, 'redirect_uri': settings.X_REDIRECT_URI, 'code_verifier': verifier})
            token, expiry, refresh = grant_values(grant)
            data = await member(client, token)
    except FlenzrException as error:
        creator = await owned_creator(db, user)
        credentials = dict(creator.social_credentials or {})
        current = credentials.get(FLOW, {})
        if current.get('hash') == flow['hash'] and current.get('status') == 'exchanging':
            credentials[FLOW] = {**current, 'status': 'failed', 'error_code': error.code, 'diagnostic': error.details}
            creator.social_credentials = credentials
            await db.commit()
        raise
    handle = data['username'].lower()
    if ((previous and previous.get('account_id') != data['id'])
            or (expected_handle and not previous and expected_handle != handle)):
        raise PermissionDeniedError('X authorized a different account. Choose the matching account.')
    result = snapshot(data, handle)
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(FLOW, {})
    if (current.get('hash') != flow['hash'] or current.get('status') != 'exchanging'
            or (expected_handle and not linked(creator, expected_handle))):
        raise PermissionDeniedError('This X connection changed. Please start again.')
    # IDs remain stable across username changes; retire the old handle and token.
    old_handles = {key[2:] for key, value in credentials.items()
                   if key.startswith('x:') and value.get('account_id') == data['id']}
    if expected_handle:
        old_handles.add(expected_handle)
    accounts = [a for a in social_accounts(creator) if not (a.platform == 'x' and a.handle in old_handles | {handle})]
    credentials.pop(FLOW, None)
    credentials['x:' + handle] = {'account_id': data['id'], 'client_id': settings.X_CLIENT_ID,
        'encrypted_token': encryption.encrypt(token.encode()).decode(),
        'encrypted_refresh_token': encryption.encrypt(refresh.encode()).decode(),
        'expires_at': int(time.time()) + expiry, 'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    accounts.append(SocialAccountRead(platform='x', handle=handle, is_verified=True,
        display_name=result['displayName'], avatar_url=result['avatarUrl'], connected=True))
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': True, 'handle': handle}


@router.get('/stats')
async def stats(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.strip().lstrip('@').lower()
    creator = await owned_creator(db, user)
    if not linked(creator, handle):
        raise PermissionDeniedError('This X account is not linked to your profile.')
    key = 'x:' + handle
    credential = (creator.social_credentials or {}).get(key)
    if not credential:
        fail('X_CONNECTION_REQUIRED', 'Connect X to load your profile and account counts.', 409)
    encryption, _ = configuration()
    if credential.get('client_id') != settings.X_CLIENT_ID:
        fail('X_CONNECTION_EXPIRED', 'Please reconnect your X account.', 409)
    if credential.get('expires_at', 0) > time.time() + 60 and credential.get('fetched_at', 0) > time.time() - CACHE_SECONDS:
        return credential['snapshot']
    try:
        token = encryption.decrypt(credential['encrypted_token'].encode()).decode()
    except (InvalidToken, KeyError, ValueError):
        fail('X_CONNECTION_EXPIRED', 'Please reconnect your X account.', 409)
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        if credential.get('expires_at', 0) <= time.time() + 60:
            try:
                refresh = encryption.decrypt(credential['encrypted_refresh_token'].encode()).decode()
            except (InvalidToken, KeyError, ValueError):
                fail('X_CONNECTION_EXPIRED', 'Please reconnect your X account.', 409)
            grant = await provider(client, 'POST', TOKEN_URL, auth=httpx.BasicAuth(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET),
                data={'grant_type': 'refresh_token', 'refresh_token': refresh})
            token, expiry, rotated = grant_values(grant, require_refresh=False)
            updated = {**credential, 'encrypted_token': encryption.encrypt(token.encode()).decode(), 'expires_at': int(time.time()) + expiry}
            if isinstance(rotated, str) and rotated:
                updated['encrypted_refresh_token'] = encryption.encrypt(rotated.encode()).decode()
            # Save token rotation even if the following paid profile read fails.
            credentials = dict(creator.social_credentials or {})
            credentials[key] = updated
            creator.social_credentials = credentials
            await db.commit()
            creator = await owned_creator(db, user)
            credential = (creator.social_credentials or {}).get(key)
            if not credential or not linked(creator, handle) or credential['encrypted_token'] != updated['encrypted_token']:
                raise PermissionDeniedError('This X connection changed. Please try again.')
        data = await member(client, token)
    if data['id'] != credential['account_id']:
        raise PermissionDeniedError('X returned a different account. Please reconnect.')
    if data['username'].lower() != handle:
        fail('X_HANDLE_CHANGED', 'Your X username changed. Reconnect to update it in Flenzr.', 409)
    result = snapshot(data, handle)
    credentials = dict(creator.social_credentials or {})
    credentials[key] = {**credential, 'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'x' and account.handle == handle:
            account.display_name, account.avatar_url = result['displayName'], result['avatarUrl']
    store_accounts(creator, accounts)
    await db.commit()
    return result


@router.delete('/connection')
async def disconnect(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.strip().lstrip('@').lower()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    credentials.pop('x:' + handle, None)
    if credentials.get(FLOW, {}).get('handle') == handle:
        credentials.pop(FLOW, None)
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'x' and account.handle == handle:
            account.is_verified, account.connected = False, False
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': False, 'handle': handle}
