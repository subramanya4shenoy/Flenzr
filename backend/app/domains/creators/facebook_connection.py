"""Facebook Pages: owner-bound OAuth, explicit Page selection and encrypted Page tokens."""
import asyncio
import hashlib
import hmac
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

router = APIRouter(prefix='/creators/me/facebook', tags=['Facebook Pages connection'])
creator_role = require_role([SystemRole.CREATOR])
FLOW = '_facebook_flow'
PERMISSIONS = {'pages_show_list', 'pages_read_engagement'}


def fail(code, message, status=503, details=None):
    raise FlenzrException(code, message, status, details=details)


def configuration():
    explicit = bool(settings.FACEBOOK_APP_ID or settings.FACEBOOK_APP_SECRET)
    app_id = settings.FACEBOOK_APP_ID if explicit else settings.INSTAGRAM_APP_ID
    secret = settings.FACEBOOK_APP_SECRET if explicit else settings.INSTAGRAM_APP_SECRET
    try:
        callback = urlparse(settings.FACEBOOK_REDIRECT_URI)
        if (not app_id or not secret or not settings.FACEBOOK_CONFIG_ID.isdigit()
                or not re.fullmatch(r'v\d+\.\d+', settings.FACEBOOK_API_VERSION)
                or callback.scheme != 'https' or not callback.hostname or callback.username
                or callback.password or callback.query or callback.fragment):
            raise ValueError()
        return app_id, secret, Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode()), callback
    except (ValueError, TypeError):
        fail('FACEBOOK_NOT_CONFIGURED', 'Facebook Pages connection is not configured yet.')


def binding(app_id):
    return {'app_id': app_id, 'config_id': settings.FACEBOOK_CONFIG_ID,
            'redirect_uri': settings.FACEBOOK_REDIRECT_URI, 'api_version': settings.FACEBOOK_API_VERSION}


def valid_flow(flow, app_id, status):
    if (flow.get('status') != status or flow.get('expires_at', 0) < time.time()
            or any(flow.get(key) != value for key, value in binding(app_id).items())):
        fail('FACEBOOK_FLOW_EXPIRED', 'Facebook Pages connection expired or changed. Please start again.', 403)


def graph(path):
    return f'https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/{path}'


def auth(token, secret):
    return {'Authorization': f'Bearer {token}'}, hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()


async def provider(client, method, path, stage, **kwargs):
    try:
        response = await client.request(method, graph(path), **kwargs)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        fail('FACEBOOK_UNAVAILABLE', 'Facebook could not be reached. Please try again.', details=[{'stage': stage}])
    if not response.is_success:
        error = data.get('error') if isinstance(data, dict) else None
        diagnostic = {'stage': stage, 'http_status': response.status_code}
        if isinstance(error, dict):
            for field in ('code', 'error_subcode'):
                if type(error.get(field)) is int:
                    diagnostic[f'provider_{field}'] = error[field]
        if response.status_code == 429 or diagnostic.get('provider_code') in (4, 17, 32, 613):
            fail('FACEBOOK_RATE_LIMITED', 'Facebook’s request limit has been reached. Please try again later.', details=[diagnostic])
        fail('FACEBOOK_AUTHORIZATION_FAILED', 'Facebook Page access could not be confirmed. Please reconnect and approve Page access.', 409, [diagnostic])
    if not isinstance(data, dict):
        fail('FACEBOOK_UNAVAILABLE', 'Facebook returned an unreadable response.', details=[{'stage': stage}])
    return data


class ConnectRequest(BaseModel):
    handle: str | None = Field(default=None, min_length=1, max_length=32, pattern=r'^\d+$')
    model_config = ConfigDict(extra='forbid')


class CompleteRequest(BaseModel):
    code: str = Field(min_length=1, max_length=4096)
    state: str = Field(min_length=32, max_length=128)
    model_config = ConfigDict(extra='forbid')


class SelectRequest(BaseModel):
    selection_id: str = Field(min_length=32, max_length=128)
    page_ids: list[str] = Field(min_length=1, max_length=20)
    model_config = ConfigDict(extra='forbid')

    @field_validator('page_ids')
    @classmethod
    def unique_ids(cls, values):
        if len(set(values)) != len(values) or any(not re.fullmatch(r'\d{1,32}', value) for value in values):
            raise ValueError('Select distinct valid Facebook Page IDs.')
        return values


def linked(creator, page_id):
    return next((a for a in social_accounts(creator) if a.platform == 'facebook' and a.handle == page_id), None)


def avatar(data):
    picture = data.get('picture')
    picture = picture.get('data') if isinstance(picture, dict) else None
    picture = picture if isinstance(picture, dict) else {}
    url = picture.get('url')
    if isinstance(url, str) and url.startswith('https://') and len(url) <= 4096:
        return '/api/proxy-image?' + urlencode({'url': url, 'name': str(data.get('name') or 'Facebook Page')[:255]})
    return None


def snapshot(data):
    def number(field):
        value = data.get(field)
        return value if type(value) is int and 0 <= value <= 9007199254740991 else None
    name = data.get('name')
    name = name[:255] if isinstance(name, str) and name.strip() else 'Facebook Page'
    followers = number('followers_count')
    # On New Pages Experience, fan_count can mean followers rather than likes.
    likes = number('fan_count') if data.get('has_transitioned_to_new_page_experience') is False else None
    return {'platform': 'facebook', 'handle': data['id'], 'displayName': name,
            'avatarUrl': avatar(data), 'category': data.get('category') if isinstance(data.get('category'), str) else None,
            'followers': followers, 'followersAvailable': followers is not None,
            'likes': likes, 'likesAvailable': likes is not None,
            'connected': True, 'source': 'facebook-pages', 'isRealData': True,
            'avgViews': None, 'engagementRate': None}


async def read_page(client, page_id, token, secret):
    headers, proof = auth(token, secret)
    data = await provider(client, 'GET', page_id, 'page_profile', headers=headers,
        params={'fields': 'id,name,category,picture.type(large){url,is_silhouette},followers_count,fan_count,has_transitioned_to_new_page_experience', 'appsecret_proof': proof})
    if data.get('id') != page_id:
        raise PermissionDeniedError('Facebook returned a different Page. Please reconnect.')
    return snapshot(data)


async def discover_pages(client, token, secret, encryption, expires_at):
    headers, proof = auth(token, secret)
    permission_data = await provider(client, 'GET', 'me/permissions', 'permissions', headers=headers, params={'appsecret_proof': proof})
    entries = permission_data.get('data')
    if not isinstance(entries, list):
        fail('FACEBOOK_UNAVAILABLE', 'Facebook returned unreadable permission details.')
    granted = {p.get('permission') for p in entries if isinstance(p, dict) and p.get('status') == 'granted' and isinstance(p.get('permission'), str)}
    if not PERMISSIONS.issubset(granted):
        fail('FACEBOOK_PERMISSION_REQUIRED', 'Approve Page-list and Page-read access, then try connecting again.', 409)
    pages, after = {}, None
    for _ in range(20):
        params = {'fields': 'id,name,access_token,picture.type(small){url}', 'limit': 100, 'appsecret_proof': proof}
        if after:
            params['after'] = after
        data = await provider(client, 'GET', 'me/accounts', 'page_discovery', headers=headers, params=params)
        entries = data.get('data')
        if not isinstance(entries, list):
            fail('FACEBOOK_UNAVAILABLE', 'Facebook returned an unreadable Page list.')
        for page in entries:
            if not isinstance(page, dict):
                fail('FACEBOOK_UNAVAILABLE', 'Facebook returned an unreadable Page.')
            page_id, page_token = page.get('id'), page.get('access_token')
            if not isinstance(page_id, str) or not re.fullmatch(r'\d{1,32}', page_id):
                fail('FACEBOOK_UNAVAILABLE', 'Facebook returned an unreadable Page identifier.')
            if not isinstance(page_token, str) or not page_token:
                continue
            name = page.get('name')
            pages[page_id] = {'id': page_id, 'name': name[:255] if isinstance(name, str) and name.strip() else 'Facebook Page',
                'avatarUrl': avatar(page), 'encrypted_token': encryption.encrypt(page_token.encode()).decode(), 'expires_at': expires_at}
            if len(pages) > 100:
                fail('FACEBOOK_TOO_MANY_PAGES', 'Share up to 100 Pages in the Facebook permission screen.', 409)
        paging = data.get('paging')
        if not isinstance(paging, dict) or not paging.get('next'):
            break
        cursors = paging.get('cursors')
        after = cursors.get('after') if isinstance(cursors, dict) else None
        if not isinstance(after, str) or not 1 <= len(after) <= 4096:
            fail('FACEBOOK_UNAVAILABLE', 'Facebook returned unreadable Page pagination.')
    else:
        fail('FACEBOOK_TOO_MANY_PAGES', 'Share fewer Pages in the Facebook permission screen.', 409)
    if not pages:
        fail('FACEBOOK_NO_PAGES', 'No accessible Facebook Pages were shared. Use an account with Page access and select the Pages you want to connect.', 409)
    return list(pages.values())


async def record_failure(db, user, flow, error):
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(FLOW, {})
    if current.get('hash') == flow.get('hash') and current.get('status') in ('exchanging', 'saving'):
        # Discard staged tokens after failure; retain only our safe diagnostics.
        credentials[FLOW] = {**{k: v for k, v in current.items() if k != 'pages'},
            'status': 'failed', 'error_code': error.code, 'diagnostic': error.details}
        creator.social_credentials = credentials
        await db.commit()


async def import_pages(db, user, selection_id, page_ids):
    app_id, secret, encryption, _ = configuration()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    flow = credentials.get(FLOW, {})
    valid_flow(flow, app_id, 'selecting')
    if not secrets.compare_digest(flow.get('selection_id', ''), selection_id):
        fail('FACEBOOK_FLOW_EXPIRED', 'This Page selection changed. Please start again.', 403)
    candidates = {page['id']: page for page in flow['pages']}
    if any(page_id not in candidates for page_id in page_ids) or (flow.get('handle') and page_ids != [flow['handle']]):
        raise PermissionDeniedError('Select only the Facebook Pages shared by this connection.')
    if flow.get('handle') and not linked(creator, flow['handle']):
        raise PermissionDeniedError('This Facebook Page was removed. Please start again.')
    credentials[FLOW] = {**flow, 'status': 'saving'}
    creator.social_credentials = credentials
    await db.commit()
    try:
        tokens = {}
        for page_id in page_ids:
            try:
                tokens[page_id] = encryption.decrypt(candidates[page_id]['encrypted_token'].encode()).decode()
            except (InvalidToken, ValueError, KeyError):
                fail('FACEBOOK_FLOW_EXPIRED', 'This Page selection expired. Please start again.', 403)
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            results = await asyncio.gather(*(read_page(client, page_id, tokens[page_id], secret) for page_id in page_ids), return_exceptions=True)
        for result in results:
            if isinstance(result, Exception):
                raise result
    except FlenzrException as error:
        await record_failure(db, user, flow, error)
        raise
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(FLOW, {})
    if (current.get('hash') != flow['hash'] or current.get('status') != 'saving'
            or (flow.get('handle') and not linked(creator, flow['handle']))):
        raise PermissionDeniedError('This Facebook Pages connection changed. Please start again.')
    accounts = social_accounts(creator)
    for result in results:
        page_id = result['handle']
        credentials['facebook:' + page_id] = {'account_id': page_id, 'app_id': app_id,
            'encrypted_token': candidates[page_id]['encrypted_token'], 'expires_at': candidates[page_id]['expires_at'],
            'snapshot': result, 'fetched_at': int(time.time())}
        accounts = [a for a in accounts if not (a.platform == 'facebook' and a.handle == page_id)]
        accounts.append(SocialAccountRead(platform='facebook', handle=page_id, is_verified=True,
            display_name=result['displayName'], avatar_url=result['avatarUrl'], connected=True))
    credentials.pop(FLOW, None)
    creator.social_credentials = credentials
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': True, 'handles': page_ids}


@router.post('/connect')
async def connect(body: ConnectRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    app_id, _, _, callback = configuration()
    creator = await owned_creator(db, user)
    if body.handle and not linked(creator, body.handle):
        raise PermissionDeniedError('This Facebook Page is not linked. Please start again.')
    state = secrets.token_urlsafe(32)
    credentials = dict(creator.social_credentials or {})
    credentials[FLOW] = {**binding(app_id), 'hash': hashlib.sha256(state.encode()).hexdigest(),
        'handle': body.handle, 'status': 'pending', 'expires_at': int(time.time()) + 600}
    creator.social_credentials = credentials
    await db.commit()
    params = {'client_id': app_id, 'config_id': settings.FACEBOOK_CONFIG_ID, 'redirect_uri': settings.FACEBOOK_REDIRECT_URI,
        'response_type': 'code', 'override_default_response_type': 'true', 'state': state}
    return {'url': 'https://www.facebook.com/dialog/oauth?' + urlencode(params), 'callbackOrigin': f'{callback.scheme}://{callback.netloc}'}


@router.post('/callback')
async def complete(body: CompleteRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    app_id, secret, encryption, _ = configuration()
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    flow = credentials.get(FLOW, {})
    valid_flow(flow, app_id, 'pending')
    if not secrets.compare_digest(flow.get('hash', ''), hashlib.sha256(body.state.encode()).hexdigest()):
        fail('FACEBOOK_FLOW_EXPIRED', 'Facebook Pages connection expired. Please start again.', 403)
    if flow.get('handle') and not linked(creator, flow['handle']):
        raise PermissionDeniedError('This Facebook Page was removed. Please start again.')
    credentials[FLOW] = {**flow, 'status': 'exchanging'}
    creator.social_credentials = credentials
    await db.commit()
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            grant = await provider(client, 'GET', 'oauth/access_token', 'code_exchange', params={
                'client_id': app_id, 'client_secret': secret, 'redirect_uri': settings.FACEBOOK_REDIRECT_URI, 'code': body.code})
            token = grant.get('access_token')
            if not isinstance(token, str) or not token:
                fail('FACEBOOK_AUTHORIZATION_FAILED', 'Facebook did not authorize Page access.', 409)
            grant = await provider(client, 'GET', 'oauth/access_token', 'long_lived_exchange', params={
                'grant_type': 'fb_exchange_token', 'client_id': app_id, 'client_secret': secret, 'fb_exchange_token': token})
            token, expiry = grant.get('access_token'), grant.get('expires_in')
            if not isinstance(token, str) or not token or type(expiry) is not int or expiry <= 0:
                fail('FACEBOOK_USER_LOGIN_REQUIRED', 'Facebook Pages needs a User access token configuration. Please contact Flenzr support.', 409)
            pages = await discover_pages(client, token, secret, encryption, int(time.time()) + expiry)
    except FlenzrException as error:
        await record_failure(db, user, flow, error)
        raise
    if flow.get('handle'):
        pages = [page for page in pages if page['id'] == flow['handle']]
        if not pages:
            error = PermissionDeniedError('Facebook did not share the matching Page. Reconnect and select it.')
            await record_failure(db, user, flow, error)
            raise error
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(FLOW, {})
    if current.get('hash') != flow['hash'] or current.get('status') != 'exchanging':
        raise PermissionDeniedError('This Facebook Pages connection changed. Please start again.')
    selection_id = secrets.token_urlsafe(32)
    credentials[FLOW] = {**current, 'status': 'selecting', 'pages': pages,
        'selection_id': selection_id, 'expires_at': int(time.time()) + 600}
    creator.social_credentials = credentials
    await db.commit()
    if len(pages) == 1:
        return await import_pages(db, user, selection_id, [pages[0]['id']])
    return {'selectionRequired': True}


@router.get('/pending-pages')
async def pending_pages(user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    app_id, _, _, _ = configuration()
    creator = await owned_creator(db, user)
    flow = (creator.social_credentials or {}).get(FLOW, {})
    valid_flow(flow, app_id, 'selecting')
    return {'selectionId': flow['selection_id'], 'pages': [
        {key: page[key] for key in ('id', 'name', 'avatarUrl')} for page in flow['pages']]}


@router.post('/select')
async def select_pages(body: SelectRequest, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    return await import_pages(db, user, body.selection_id, body.page_ids)


@router.delete('/pending-pages')
async def cancel_selection(user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    if credentials.get(FLOW, {}).get('status') == 'saving':
        fail('FACEBOOK_SELECTION_SAVING', 'Page connection is being saved. Please wait.', 409)
    credentials.pop(FLOW, None)
    creator.social_credentials = credentials
    await db.commit()
    return {'cancelled': True}


@router.get('/stats')
async def stats(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    if not linked(creator, handle):
        raise PermissionDeniedError('This Facebook Page is not linked to your profile.')
    credential = (creator.social_credentials or {}).get('facebook:' + handle)
    if not credential:
        fail('FACEBOOK_CONNECTION_REQUIRED', 'Connect Facebook to authorize this Page.', 409)
    app_id, secret, encryption, _ = configuration()
    if credential.get('app_id') != app_id or credential.get('expires_at', 0) <= time.time():
        fail('FACEBOOK_CONNECTION_EXPIRED', 'Please reconnect this Facebook Page.', 409)
    if credential.get('fetched_at', 0) > time.time() - 300:
        return credential['snapshot']
    try:
        token = encryption.decrypt(credential['encrypted_token'].encode()).decode()
    except (InvalidToken, ValueError, KeyError):
        fail('FACEBOOK_CONNECTION_EXPIRED', 'Please reconnect this Facebook Page.', 409)
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        result = await read_page(client, handle, token, secret)
    credentials = dict(creator.social_credentials or {})
    credentials['facebook:' + handle] = {**credential, 'snapshot': result, 'fetched_at': int(time.time())}
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'facebook' and account.handle == handle:
            account.display_name, account.avatar_url = result['displayName'], result['avatarUrl']
    store_accounts(creator, accounts)
    await db.commit()
    return result


@router.delete('/connection')
async def disconnect(handle: str, user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    credentials.pop('facebook:' + handle, None)
    if credentials.get(FLOW, {}).get('handle') == handle:
        credentials.pop(FLOW, None)
    creator.social_credentials = credentials
    accounts = social_accounts(creator)
    for account in accounts:
        if account.platform == 'facebook' and account.handle == handle:
            account.is_verified, account.connected = False, False
    store_accounts(creator, accounts)
    await db.commit()
    return {'connected': False, 'handle': handle}
