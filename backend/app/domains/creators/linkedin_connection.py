"""Connect LinkedIn members with server-side OAuth and the OIDC userinfo API.

This imports a name and picture, not a vanity URL or identity verification.
"""
import hashlib
import secrets
import time
from urllib.parse import urlencode, urlparse

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import FlenzrException, PermissionDeniedError
from app.domains.creators.socials import SocialAccountRead, owned_creator, social_accounts, store_accounts
from app.domains.identity.models import SystemRole, User

router = APIRouter(prefix='/creators/me/linkedin', tags=['LinkedIn connection'])
creator_role = require_role([SystemRole.CREATOR])
FLOW = '_linkedin_flow'


def fail(code, message, status=503):
    raise FlenzrException(code, message, status)


def configuration():
    try:
        callback = urlparse(settings.LINKEDIN_REDIRECT_URI)
        if (not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET
                or callback.scheme != 'https' or not callback.hostname or callback.username
                or callback.password or callback.query or callback.fragment):
            raise ValueError()
        return Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode()), callback
    except (ValueError, TypeError):
        fail('LINKEDIN_NOT_CONFIGURED', 'LinkedIn connection is not configured yet.')


class ConnectRequest(BaseModel):
    handle: str | None = Field(default=None, min_length=1, max_length=128, pattern=r'^[a-zA-Z0-9_.-]+$')
    model_config = ConfigDict(extra='forbid')


class CompleteRequest(BaseModel):
    code: str = Field(min_length=1, max_length=4096)
    state: str = Field(min_length=32, max_length=128)
    model_config = ConfigDict(extra='forbid')


def linked(creator, handle):
    return next((a for a in social_accounts(creator) if a.platform == 'linkedin' and a.handle == handle), None)


async def provider(client, method, url, **kwargs):
    try:
        response = await client.request(method, url, **kwargs)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        fail('LINKEDIN_UNAVAILABLE', 'LinkedIn could not be reached. Please try again.')
    if not response.is_success:
        if response.status_code == 429:
            fail('LINKEDIN_RATE_LIMITED', 'LinkedIn’s request limit has been reached. Try again later.')
        fail('LINKEDIN_AUTHORIZATION_FAILED', 'LinkedIn access could not be confirmed. Please connect again.', 409)
    if not isinstance(data, dict):
        fail('LINKEDIN_UNAVAILABLE', 'LinkedIn returned an unreadable response.')
    return data


async def member(client, token):
    data = await provider(client, 'GET', 'https://api.linkedin.com/v2/userinfo',
                          headers={'Authorization': f'Bearer {token}'})
    if not isinstance(data.get('sub'), str) or not 1 <= len(data['sub']) <= 255:
        fail('LINKEDIN_PROFILE_REQUIRED', 'LinkedIn did not return a member profile. Please connect again.', 409)
    return data


def snapshot(data, handle):
    name = data.get('name')
    name = name[:255] if isinstance(name, str) and name.strip() else 'LinkedIn member'
    picture = data.get('picture')
    # Browser images go through the existing restricted image proxy.
    avatar = '/api/proxy-image?' + urlencode({'url': picture, 'name': name}) if isinstance(picture, str) and picture.startswith('https://') and len(picture) <= 4096 else None
    return {'platform': 'linkedin', 'handle': handle, 'displayName': name, 'avatarUrl': avatar,
            'connected': True, 'source': 'linkedin-oidc', 'isRealData': True,
            'followers': None, 'followersAvailable': False, 'avgViews': None, 'engagementRate': None}


@router.post('/connect')
async def connect(body: ConnectRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    _, callback = configuration()
    creator = await owned_creator(db, user)
    if body.handle and not linked(creator, body.handle):
        raise PermissionDeniedError('This LinkedIn account is no longer linked. Please start again.')
    credentials = dict(creator.social_credentials or {})
    # A manually entered vanity URL cannot be verified with OIDC. Import the
    # authorized member separately; only bind reconnection to an existing sub.
    handle = body.handle if credentials.get('linkedin:' + (body.handle or '')) else None
    state = secrets.token_urlsafe(32)
    credentials[FLOW] = {'hash': hashlib.sha256(state.encode()).hexdigest(), 'handle': handle,
                         'status': 'pending', 'expires_at': int(time.time()) + 600,
                         'client_id': settings.LINKEDIN_CLIENT_ID, 'redirect_uri': settings.LINKEDIN_REDIRECT_URI}
    creator.social_credentials = credentials
    await db.commit()
    params = {'response_type': 'code', 'client_id': settings.LINKEDIN_CLIENT_ID,
              'redirect_uri': settings.LINKEDIN_REDIRECT_URI, 'scope': 'openid profile', 'state': state}
    return {'url': 'https://www.linkedin.com/oauth/v2/authorization?' + urlencode(params),
            'callbackOrigin': f'{callback.scheme}://{callback.netloc}'}


@router.post('/callback')
async def complete(body: CompleteRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    encryption, _ = configuration()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    flow = credentials.get(FLOW, {})
    if (flow.get('status') != 'pending' or flow.get('expires_at', 0) < time.time()
            or not secrets.compare_digest(flow.get('hash', ''), hashlib.sha256(body.state.encode()).hexdigest())
            or flow.get('client_id') != settings.LINKEDIN_CLIENT_ID
            or flow.get('redirect_uri') != settings.LINKEDIN_REDIRECT_URI):
        fail('LINKEDIN_FLOW_EXPIRED', 'LinkedIn connection expired or was already used. Please start again.', 403)
    handle = flow.get('handle')
    previous = credentials.get('linkedin:' + (handle or ''))
    if handle and (not previous or not linked(creator, handle)):
        raise PermissionDeniedError('This LinkedIn account changed. Please start again.')
    credentials[FLOW] = {**flow, 'status': 'exchanging'}
    creator.social_credentials = credentials
    await db.commit()
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        grant = await provider(client, 'POST', 'https://www.linkedin.com/oauth/v2/accessToken', data={
            'grant_type': 'authorization_code', 'code': body.code,
            'redirect_uri': settings.LINKEDIN_REDIRECT_URI,
            'client_id': settings.LINKEDIN_CLIENT_ID, 'client_secret': settings.LINKEDIN_CLIENT_SECRET})
        token, expiry = grant.get('access_token'), grant.get('expires_in')
        if not isinstance(token, str) or not token or type(expiry) is not int or expiry <= 0:
            fail('LINKEDIN_AUTHORIZATION_FAILED', 'LinkedIn did not grant profile access. Please connect again.', 409)
        data = await member(client, token)
    if previous and previous.get('account_id') != data['sub']:
        raise PermissionDeniedError('LinkedIn authorized a different member. Choose the matching account.')
    # This is an internal account key, never a LinkedIn vanity URL.
    handle = handle or 'li-' + hashlib.sha256((settings.LINKEDIN_CLIENT_ID + ':' + data['sub']).encode()).hexdigest()[:24]
    result = snapshot(data, handle)
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(FLOW, {})
    if (current.get('hash') != flow['hash'] or current.get('status') != 'exchanging'
            or (flow.get('handle') and not linked(creator, flow['handle']))):
        raise PermissionDeniedError('This LinkedIn connection changed. Please start again.')
    credentials.pop(FLOW, None)
    credentials['linkedin:' + handle] = {'account_id': data['sub'], 'client_id': settings.LINKEDIN_CLIENT_ID,
        'encrypted_token': encryption.encrypt(token.encode()).decode(), 'expires_at': int(time.time()) + expiry,
        'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    account = linked(creator, handle)
    if account:
        accounts = [a for a in accounts if not (a.platform == 'linkedin' and a.handle == handle)]
    accounts.append(SocialAccountRead(platform='linkedin', handle=handle, is_verified=False,
        display_name=result['displayName'], avatar_url=result['avatarUrl'], connected=True))
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': True, 'handle': handle}


@router.get('/stats')
async def profile(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    if not linked(creator, handle):
        raise PermissionDeniedError('This LinkedIn account is not linked to your profile.')
    credential = (creator.social_credentials or {}).get('linkedin:' + handle)
    if not credential:
        fail('LINKEDIN_CONNECTION_REQUIRED', 'Connect LinkedIn to import your member profile.', 409)
    encryption, _ = configuration()
    if credential.get('expires_at', 0) <= time.time() or credential.get('client_id') != settings.LINKEDIN_CLIENT_ID:
        fail('LINKEDIN_CONNECTION_EXPIRED', 'Please reconnect your LinkedIn account.', 409)
    if credential.get('fetched_at', 0) > time.time() - 300:
        return credential['snapshot']
    try:
        token = encryption.decrypt(credential['encrypted_token'].encode()).decode()
    except (InvalidToken, KeyError, ValueError):
        fail('LINKEDIN_CONNECTION_EXPIRED', 'Please reconnect your LinkedIn account.', 409)
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        data = await member(client, token)
    if data['sub'] != credential['account_id']:
        raise PermissionDeniedError('LinkedIn returned a different member. Please reconnect.')
    result = snapshot(data, handle)
    credentials = dict(creator.social_credentials or {})
    credentials['linkedin:' + handle] = {**credential, 'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'linkedin' and account.handle == handle:
            account.display_name, account.avatar_url = result['displayName'], result['avatarUrl']
    store_accounts(creator, accounts)
    await db.commit()
    return result


@router.delete('/connection')
async def disconnect(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    credentials.pop('linkedin:' + handle, None)
    if credentials.get(FLOW, {}).get('handle') == handle:
        credentials.pop(FLOW, None)
    creator.social_credentials = credentials
    await db.commit()
    return {'connected': False, 'handle': handle}
