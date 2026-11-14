"""Owner-bound Unified Login with encrypted per-account credentials and legacy support."""
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

router = APIRouter(prefix='/creators/me/instagram', tags=['Instagram connection'])
creator_role = require_role([SystemRole.CREATOR])


def fail(code, message, status=503):
    raise FlenzrException(code, message, status)


def cipher():
    try:
        return Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode())
    except (ValueError, TypeError):
        fail('INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not configured yet.')


def configured():
    callback = urlparse(settings.INSTAGRAM_REDIRECT_URI)
    if not settings.INSTAGRAM_APP_ID or not settings.INSTAGRAM_APP_SECRET or callback.scheme != 'https' or not callback.netloc or callback.username or callback.password or callback.query or callback.fragment:
        fail('INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not configured yet.')
    if not re.fullmatch(r'v\d+\.\d+', settings.INSTAGRAM_API_VERSION):
        fail('INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not configured yet.')
    if settings.INSTAGRAM_LOGIN_MODE not in ('unified', 'instagram') or (settings.INSTAGRAM_LOGIN_MODE == 'unified' and not settings.INSTAGRAM_CONFIG_ID.isdigit()):
        fail('INSTAGRAM_NOT_CONFIGURED', 'Instagram connection is not configured yet.')
    cipher()


class ConnectRequest(BaseModel):
    handle: str | None = Field(default=None, min_length=1, max_length=128, pattern=r'^[a-zA-Z0-9_.]+$')
    account_id: str | None = Field(default=None, min_length=1, max_length=32, pattern=r'^\d+$')
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
    return next((a for a in social_accounts(creator) if a.platform == 'instagram' and a.handle == handle), None)


async def provider_json(client, method, url, **kwargs):
    try:
        response = await client.request(method, url, **kwargs)
    except httpx.HTTPError:
        fail('INSTAGRAM_UNAVAILABLE', 'Instagram could not be reached. Please try again later.')
    try:
        data = response.json()
    except ValueError:
        fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
    if not response.is_success:
        error = data.get('error') if isinstance(data, dict) else None
        if response.status_code == 429 or (isinstance(error, dict) and error.get('code') in (4, 17, 32, 613)):
            fail('INSTAGRAM_RATE_LIMITED', 'Instagram’s request limit has been reached. Please try again later.')
        # Never expose provider error text, tokens, or request URLs.
        fail('INSTAGRAM_AUTHORIZATION_FAILED', 'Instagram authorization could not be confirmed. Please reconnect your Creator or Business account.', 409)
    if not isinstance(data, dict):
        fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
    return data


def single(data):
    if 'data' in data:
        if 'access_token' in data:
            fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
        items = data['data']
        if not isinstance(items, list) or len(items) != 1 or not isinstance(items[0], dict):
            fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
        return items[0]
    return data


async def profile(client, token):
    return single(await provider_json(client, 'GET', f'https://graph.instagram.com/{settings.INSTAGRAM_API_VERSION}/me',
        params={'fields': 'user_id,username,name,profile_picture_url,followers_count,follows_count,media_count'},
        headers={'Authorization': f'Bearer {token}'}))



def graph_url(path):
    return f'https://graph.facebook.com/{settings.INSTAGRAM_API_VERSION}/{path}'


def provider_headers(token):
    import hmac
    proof = hmac.new(settings.INSTAGRAM_APP_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()
    return {'Authorization': f'Bearer {token}'}, proof


async def unified_account(client, token, handle, requested_account_id=None):
    headers, proof = provider_headers(token)
    business = await provider_json(client, 'GET', graph_url('me'),
        params={'fields': 'client_business_id', 'appsecret_proof': proof}, headers=headers)
    business_id = business.get('client_business_id')
    if not isinstance(business_id, str) or not business_id.isdigit():
        fail('INSTAGRAM_BUSINESS_REQUIRED', 'Select the business portfolio that owns your Instagram account, then reconnect.', 409)
    # Meta occasionally completes Unified Login consent without returning the
    # selected asset on any discovery edge. A user can supply the numeric ID
    # shown in Business Settings; the OAuth token must still authorize a direct
    # read of that exact account before Flenzr accepts it.
    if requested_account_id:
        try:
            data = await unified_profile(client, token, requested_account_id)
        except FlenzrException as error:
            if error.code == 'INSTAGRAM_AUTHORIZATION_FAILED':
                fail('INSTAGRAM_ACCOUNT_NOT_AUTHORIZED',
                    'Meta did not authorize the selected Instagram account. In Development mode, continue with the Facebook account that has an app role.', 403)
            raise
        if str(data.get('id')) != requested_account_id:
            fail('INSTAGRAM_ACCOUNT_MISMATCH', 'Instagram returned a different account. Please reconnect.', 403)
        if handle and str(data.get('username', '')).lower() != handle:
            fail('INSTAGRAM_ACCOUNT_MISMATCH', 'Instagram authorized a different account. Please reconnect.', 403)
        return [data], business_id
    after = None
    selected = {}
    assigned_count = 0
    missing_username_count = 0
    # Only follow provider cursors on a fixed endpoint, never provider-supplied URLs.
    for _ in range(20):
        params = {'fields': 'id,username', 'limit': 100, 'appsecret_proof': proof}
        if after:
            params['after'] = after
        page = await provider_json(client, 'GET', graph_url('me/assigned_instagram_accounts'), params=params, headers=headers)
        accounts = page.get('data')
        if not isinstance(accounts, list):
            fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
        assigned_count += len(accounts)
        for account in accounts:
            if not isinstance(account, dict):
                continue
            username = account.get('username')
            if not isinstance(username, str):
                missing_username_count += 1
            if handle is None or not isinstance(username, str) or username.lower() == handle:
                account_id = account.get('id')
                if not isinstance(account_id, str) or not account_id.isdigit():
                    fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
                data = await unified_profile(client, token, account_id)
                if str(data.get('id')) != account_id:
                    fail('INSTAGRAM_ACCOUNT_MISMATCH', 'Instagram returned a different account. Please reconnect.', 403)
                if handle and str(data.get('username', '')).lower() != handle:
                    continue
                selected[account_id] = data
                if handle:
                    return [data], business_id
                if len(selected) > 20:
                    fail('INSTAGRAM_TOO_MANY_ACCOUNTS', 'Select up to 20 Instagram accounts per connection.', 409)
        after = page.get('paging', {}).get('cursors', {}).get('after')
        if not page.get('paging', {}).get('next') or not isinstance(after, str) or not after:
            break
    if selected:
        return list(selected.values()), business_id
    # Some Unified Login grants expose the selected asset through the client
    # portfolio edge even when /me/assigned_instagram_accounts is empty.
    business_ids = await unified_business_account_ids(client, token, business_id)
    for account_id in business_ids:
        data = await unified_profile(client, token, account_id)
        if str(data.get('id')) != account_id:
            fail('INSTAGRAM_ACCOUNT_MISMATCH', 'Instagram returned a different account. Please reconnect.', 403)
        username = str(data.get('username', '')).lower()
        if handle and username != handle:
            continue
        selected[account_id] = data
        if handle:
            return [data], business_id
        if len(selected) > 20:
            fail('INSTAGRAM_TOO_MANY_ACCOUNTS', 'Select up to 20 Instagram accounts per connection.', 409)
    if selected:
        return list(selected.values()), business_id
    # Meta can include the selected Instagram asset in the token's granular
    # targets while returning an empty assigned_instagram_accounts edge.
    # Only trust numeric targets explicitly scoped to instagram_basic.
    target_ids = await unified_target_ids(client, token)
    for account_id in target_ids:
        data = await unified_profile(client, token, account_id)
        if str(data.get('id')) != account_id:
            fail('INSTAGRAM_ACCOUNT_MISMATCH', 'Instagram returned a different account. Please reconnect.', 403)
        username = str(data.get('username', '')).lower()
        if handle and username != handle:
            continue
        selected[account_id] = data
        if handle:
            return [data], business_id
        if len(selected) > 20:
            fail('INSTAGRAM_TOO_MANY_ACCOUNTS', 'Select up to 20 Instagram accounts per connection.', 409)
    if selected:
        return list(selected.values()), business_id
    permissions = await unified_permission_diagnostic(client, token)
    raise FlenzrException('INSTAGRAM_ACCOUNT_NOT_SHARED',
        'Meta did not return a matching assigned Instagram account. Reconnect and share the account from its business portfolio.',
        403, details=[{'assigned_count': assigned_count, 'missing_username_count': missing_username_count,
            'granted_permissions': permissions['granted'], 'declined_permissions': permissions['declined'],
            'business_account_count': len(business_ids), 'granular_target_count': len(target_ids)}])


async def unified_business_account_ids(client, token, business_id):
    """Best-effort fixed-edge lookup; authorization errors fall through safely."""
    headers, proof = provider_headers(token)
    try:
        response = await client.request('GET', graph_url(f'{business_id}/owned_instagram_accounts'),
            params={'fields': 'id', 'limit': 100, 'appsecret_proof': proof}, headers=headers)
    except httpx.HTTPError:
        return []
    if not response.is_success:
        return []
    try:
        payload = response.json()
    except ValueError:
        return []
    items = payload.get('data') if isinstance(payload, dict) else None
    if not isinstance(items, list):
        return []
    ids = {item.get('id') for item in items if isinstance(item, dict)}
    return sorted(item for item in ids if isinstance(item, str) and item.isdigit())


async def unified_target_ids(client, token):
    app_token = f'{settings.INSTAGRAM_APP_ID}|{settings.INSTAGRAM_APP_SECRET}'
    response = await provider_json(client, 'GET', graph_url('debug_token'),
        params={'input_token': token}, headers={'Authorization': f'Bearer {app_token}'})
    data = response.get('data')
    if not isinstance(data, dict) or data.get('is_valid') is not True:
        fail('INSTAGRAM_AUTHORIZATION_FAILED', 'Instagram did not authorize this connection.', 409)
    targets = set()
    granular = data.get('granular_scopes', [])
    if not isinstance(granular, list):
        fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
    for item in granular:
        if not isinstance(item, dict) or item.get('scope') != 'instagram_basic':
            continue
        ids = item.get('target_ids', [])
        if not isinstance(ids, list):
            fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
        for target_id in ids:
            if isinstance(target_id, str) and target_id.isdigit():
                targets.add(target_id)
    return sorted(targets)


async def unified_permission_diagnostic(client, token):
    """Return only permission names/statuses; never retain provider payloads or tokens."""
    headers, proof = provider_headers(token)
    response = await provider_json(client, 'GET', graph_url('me/permissions'),
        params={'appsecret_proof': proof}, headers=headers)
    items = response.get('data')
    if not isinstance(items, list):
        fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
    granted, declined = [], []
    for item in items:
        if not isinstance(item, dict):
            continue
        permission, status = item.get('permission'), item.get('status')
        if not isinstance(permission, str) or not re.fullmatch(r'[a-z0-9_]{1,128}', permission):
            continue
        if status == 'granted':
            granted.append(permission)
        elif status in ('declined', 'expired'):
            declined.append(permission)
    return {'granted': sorted(set(granted)), 'declined': sorted(set(declined))}


async def unified_profile(client, token, account_id):
    if not isinstance(account_id, str) or not account_id.isdigit():
        fail('INSTAGRAM_CONNECTION_EXPIRED', 'Please reconnect this Instagram account.', 409)
    headers, proof = provider_headers(token)
    return await provider_json(client, 'GET', graph_url(account_id),
        params={'fields': 'id,username,name,profile_picture_url,followers_count,follows_count,media_count', 'appsecret_proof': proof}, headers=headers)


def public_stats(data, handle):
    username = data.get('username')
    provider_id = str(data.get('user_id') or data.get('id') or '')
    if not isinstance(username, str) or not re.fullmatch(r'[a-zA-Z0-9_.]{1,128}', username) or username.lower() != handle or not provider_id.isdigit():
        raise PermissionDeniedError('Instagram authorized a different account. Please connect the matching handle.')
    def number(key):
        value = data.get(key)
        return value if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 9007199254740991 else None
    return {
        'platform': 'instagram', 'handle': handle, 'accountId': provider_id,
        'displayName': data.get('name') or username, 'thumbnailUrl': data.get('profile_picture_url'),
        'followers': number('followers_count'), 'followersAvailable': number('followers_count') is not None,
        'following': number('follows_count'), 'postCount': number('media_count'),
        'avgViews': None, 'engagementRate': None, 'isRealData': True,
        'source': 'instagram-api', 'connected': True,
    }


@router.post('/connect')
async def connect(body: ConnectRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    configured()
    creator = await owned_creator(db, user)
    if body.account_id and settings.INSTAGRAM_LOGIN_MODE != 'unified':
        fail('INSTAGRAM_ACCOUNT_ID_UNSUPPORTED', 'The Meta account ID fallback requires Unified Login.', 409)
    if body.handle and not linked(creator, body.handle):
        raise PermissionDeniedError('Link this Instagram handle before connecting it.')
    state = secrets.token_urlsafe(32)
    credentials = dict(creator.social_credentials or {})
    credentials['_flow'] = {'hash': hashlib.sha256(state.encode()).hexdigest(), 'handle': body.handle, 'account_id': body.account_id,
        'expires_at': int(time.time()) + 600, 'status': 'pending',
        'mode': settings.INSTAGRAM_LOGIN_MODE, 'app_id': settings.INSTAGRAM_APP_ID, 'config_id': settings.INSTAGRAM_CONFIG_ID}
    creator.social_credentials = credentials
    await db.commit()
    params = {'client_id': settings.INSTAGRAM_APP_ID, 'redirect_uri': settings.INSTAGRAM_REDIRECT_URI,
        'response_type': 'code', 'scope': 'instagram_business_basic', 'state': state, 'enable_fb_login': '0', 'force_authentication': '1'}
    authorization_url = 'https://www.instagram.com/oauth/authorize'
    if settings.INSTAGRAM_LOGIN_MODE == 'unified':
        params = {'client_id': settings.INSTAGRAM_APP_ID, 'config_id': settings.INSTAGRAM_CONFIG_ID,
            'redirect_uri': settings.INSTAGRAM_REDIRECT_URI, 'response_type': 'code', 'state': state,
            'override_default_response_type': 'true', 'prompt': 'login'}
        authorization_url = 'https://www.facebook.com/dialog/oauth'
    callback = urlparse(settings.INSTAGRAM_REDIRECT_URI)
    return {'url': authorization_url + '?' + urlencode(params), 'callbackOrigin': f'{callback.scheme}://{callback.netloc}'}


@router.post('/callback')
async def complete(body: CompleteRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    configured()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    flow = credentials.get('_flow', {})
    if flow.get('status') != 'pending' or flow.get('expires_at', 0) < time.time() or not secrets.compare_digest(flow.get('hash', ''), hashlib.sha256(body.state.encode()).hexdigest()):
        fail('INSTAGRAM_FLOW_EXPIRED', 'Instagram connection expired or was already used. Please start again.', 403)
    if flow.get('mode') != settings.INSTAGRAM_LOGIN_MODE or flow.get('app_id') != settings.INSTAGRAM_APP_ID or flow.get('config_id') != settings.INSTAGRAM_CONFIG_ID:
        fail('INSTAGRAM_CONFIGURATION_CHANGED', 'Instagram configuration changed. Please start again.', 403)
    handle = flow['handle']
    if handle and not linked(creator, handle):
        raise PermissionDeniedError('This Instagram account was removed or changed. Please start again.')
    # Persist consumption before network I/O so a code/state cannot race itself.
    credentials['_flow'] = {**flow, 'status': 'exchanging'}
    creator.social_credentials = credentials
    await db.commit()
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        business_id = None
        if flow['mode'] == 'unified':
            try:
                grant = await provider_json(client, 'GET', graph_url('oauth/access_token'), params={
                    'client_id': settings.INSTAGRAM_APP_ID, 'client_secret': settings.INSTAGRAM_APP_SECRET,
                    'redirect_uri': settings.INSTAGRAM_REDIRECT_URI, 'code': body.code})
                token, expiry = grant.get('access_token'), grant.get('expires_in', 0)
                if not isinstance(token, str) or not token or not isinstance(expiry, int) or isinstance(expiry, bool) or expiry < 0:
                    fail('INSTAGRAM_AUTHORIZATION_FAILED', 'Instagram did not authorize this connection.', 409)
                profiles, business_id = await unified_account(client, token, handle, flow.get('account_id'))
                snapshots = [public_stats(data, handle or str(data.get('username', '')).lower()) for data in profiles]
            except FlenzrException as error:
                # Retain only our fixed error code, never tokens or provider payloads.
                creator = await owned_creator(db, user)
                current_credentials = dict(creator.social_credentials or {})
                current = current_credentials.get('_flow', {})
                if current.get('hash') == flow['hash'] and current.get('status') == 'exchanging':
                    current_credentials['_flow'] = {**current, 'status': 'failed', 'error_code': error.code, 'diagnostic': error.details if error.code == 'INSTAGRAM_ACCOUNT_NOT_SHARED' else []}
                    creator.social_credentials = current_credentials
                    await db.commit()
                raise
            except Exception:
                # Keep unexpected provider-shape failures from stranding a
                # consumed OAuth flow or exposing provider details to clients.
                creator = await owned_creator(db, user)
                current_credentials = dict(creator.social_credentials or {})
                current = current_credentials.get('_flow', {})
                if current.get('hash') == flow['hash'] and current.get('status') == 'exchanging':
                    current_credentials['_flow'] = {**current, 'status': 'failed',
                        'error_code': 'INSTAGRAM_UNAVAILABLE',
                        'diagnostic': [{'stage': 'provider_account_resolution'}]}
                    creator.social_credentials = current_credentials
                    await db.commit()
                fail('INSTAGRAM_UNAVAILABLE', 'Instagram returned an unreadable response.')
        else:
            grant = single(await provider_json(client, 'POST', 'https://api.instagram.com/oauth/access_token', data={
                'client_id': settings.INSTAGRAM_APP_ID, 'client_secret': settings.INSTAGRAM_APP_SECRET,
                'grant_type': 'authorization_code', 'redirect_uri': settings.INSTAGRAM_REDIRECT_URI, 'code': body.code,
            }))
            short_token = grant.get('access_token')
            if not isinstance(short_token, str) or not short_token:
                fail('INSTAGRAM_AUTHORIZATION_FAILED', 'Instagram did not authorize this connection.', 409)
            long_grant = await provider_json(client, 'GET', 'https://graph.instagram.com/access_token', params={
                'grant_type': 'ig_exchange_token', 'client_secret': settings.INSTAGRAM_APP_SECRET, 'access_token': short_token,
            })
            token = long_grant.get('access_token')
            expiry = long_grant.get('expires_in')
            if not isinstance(token, str) or not token or not isinstance(expiry, int) or expiry <= 0:
                fail('INSTAGRAM_AUTHORIZATION_FAILED', 'Instagram did not authorize this connection.', 409)
            data = await profile(client, token)
            snapshots = [public_stats(data, handle or str(data.get('username', '')).lower())]
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current_flow = credentials.get('_flow', {})
    if current_flow.get('hash') != flow['hash'] or current_flow.get('status') != 'exchanging' or (flow.get('handle') and not linked(creator, flow['handle'])):
        raise PermissionDeniedError('This Instagram account changed during authorization. Please start again.')
    credentials.pop('_flow', None)
    accounts = social_accounts(creator)
    for snapshot in snapshots:
        account_handle = snapshot['handle']
        credentials[account_handle] = {'encrypted_token': cipher().encrypt(token.encode()).decode(),
            'account_id': snapshot['accountId'], 'expires_at': int(time.time()) + expiry if expiry else None,
            'snapshot': snapshot, 'fetched_at': int(time.time()), 'mode': flow['mode'],
            'business_id': business_id, 'config_id': flow['config_id'], 'app_id': flow['app_id']}
        existing = next((a for a in accounts if a.platform == 'instagram' and a.handle == account_handle), None)
        if existing:
            existing.is_verified = True
        else:
            accounts.append(SocialAccountRead(platform='instagram', handle=account_handle, is_verified=True))
    creator.social_credentials = credentials
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': True, 'handle': snapshots[0]['handle'], 'handles': [item['handle'] for item in snapshots]}



@router.get('/stats')
async def stats(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.strip().lstrip('@').lower()
    creator = await owned_creator(db, user)
    if not linked(creator, handle):
        raise PermissionDeniedError('This Instagram account is not linked to your profile.')
    credential = (creator.social_credentials or {}).get(handle)
    if not credential:
        fail('INSTAGRAM_CONNECTION_REQUIRED', 'Connect Instagram to load this account’s stats.', 409)
    expiry = credential.get('expires_at')
    if (expiry is None and credential.get('mode') != 'unified') or (expiry is not None and expiry <= time.time()):
        fail('INSTAGRAM_CONNECTION_EXPIRED', 'Your Instagram connection expired. Please reconnect.', 409)
    if credential.get('fetched_at', 0) > time.time() - 300:
        return credential['snapshot']
    try:
        token = cipher().decrypt(credential['encrypted_token'].encode()).decode()
    except (InvalidToken, KeyError, ValueError):
        fail('INSTAGRAM_CONNECTION_EXPIRED', 'Please reconnect this Instagram account.', 409)
    await db.commit()
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        if credential.get('mode') == 'unified':
            if credential.get('app_id') != settings.INSTAGRAM_APP_ID:
                fail('INSTAGRAM_CONNECTION_EXPIRED', 'Please reconnect this Instagram account.', 409)
            snapshot = public_stats(await unified_profile(client, token, credential['account_id']), handle)
        else:
            snapshot = public_stats(await profile(client, token), handle)
    if snapshot['accountId'] != credential['account_id']:
        fail('INSTAGRAM_ACCOUNT_MISMATCH', 'Instagram returned a different account. Please reconnect.', 403)
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    if not linked(creator, handle) or credentials.get(handle, {}).get('encrypted_token') != credential['encrypted_token']:
        raise PermissionDeniedError('This Instagram account changed. Please reload.')
    credentials[handle] = {**credential, 'snapshot': snapshot, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    await db.commit()
    return snapshot


@router.delete('/connection')
async def disconnect(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.strip().lstrip('@').lower()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    credentials.pop(handle, None)
    if credentials.get('_flow', {}).get('handle') == handle:
        credentials.pop('_flow', None)
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'instagram' and account.handle == handle:
            account.is_verified = False
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': False, 'handle': handle}
