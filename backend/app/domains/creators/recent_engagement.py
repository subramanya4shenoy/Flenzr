"""Owner-only recent-post metrics. No post text, provider messages or tokens leave the backend."""
import re
import time

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import FlenzrException, PermissionDeniedError
from app.domains.creators import facebook_connection as facebook, instagram_connection as instagram, youtube_connection as youtube, x_connection as x
from app.domains.creators.x_public_posts import fetch_public_posts
from app.domains.creators.socials import SocialPlatform, owned_creator, social_accounts
from app.domains.identity.models import SystemRole, User

router = APIRouter(prefix='/creators/me', tags=['Recent engagement'])
creator_role = require_role([SystemRole.CREATOR])
HANDLERS = {'youtube': youtube.stats, 'instagram': instagram.stats, 'facebook': facebook.stats, 'x': x.stats}


def number(value):
    if isinstance(value, str) and re.fullmatch(r'\d{1,16}', value):
        value = int(value)
    return value if type(value) is int and 0 <= value <= 9007199254740991 else None


def post(post_id, published, likes, comments):
    likes, comments = number(likes), number(comments)
    return {'id': str(post_id), 'publishedAt': published if isinstance(published, str) else None,
        'likes': likes, 'comments': comments, 'total': likes + comments if likes is not None and comments is not None else None}


def summarize(platform, handle, posts):
    complete = [p for p in posts if p['total'] is not None]
    available = bool(complete) or not posts
    return {'platform': platform, 'handle': handle, 'status': 'ready', 'posts': posts,
        'postsRead': len(posts), 'measuredPosts': len(complete), 'limit': 10,
        'likes': sum(p['likes'] for p in complete) if available else None,
        'comments': sum(p['comments'] for p in complete) if available else None,
        'total': sum(p['total'] for p in complete) if available else None,
        'fetchedAt': int(time.time())}


async def request(client, url, headers, params):
    try:
        response = await client.get(url, headers=headers, params=params)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        raise FlenzrException('ENGAGEMENT_UNAVAILABLE', 'Recent post counts are temporarily unavailable.', 503)
    if not response.is_success:
        if url.startswith('https://api.x.com/') and response.status_code == 402:
            raise FlenzrException('X_BILLING_REQUIRED',
                'X API credits are depleted. Flenzr’s X developer account needs credits before recent posts can be loaded.',
                503, details=[{'stage': 'recent_posts', 'http_status': 402}])
        if url.startswith('https://api.x.com/') and response.status_code == 429:
            raise FlenzrException('X_RATE_LIMITED',
                'X’s request limit has been reached. Please try again after the limit resets.',
                503, details=[{'stage': 'recent_posts', 'http_status': 429}])
        error = data.get('error') if isinstance(data, dict) else None
        if (url.startswith('https://graph.facebook.com/') and url.endswith('/published_posts')
                and isinstance(error, dict) and error.get('code') in (10, 200)
                and re.search(r'\bpages_read_user_content\b', str(error.get('message', '')))):
            raise FlenzrException('FACEBOOK_POST_PERMISSION_REQUIRED',
                'Facebook needs additional access for Page reactions and comments. Reconnect after Flenzr’s Page permissions are updated.',
                409, details=[{'required_permission': 'pages_read_user_content', 'provider_code': error['code']}])
        code = 'ENGAGEMENT_ACCESS_REQUIRED' if response.status_code in (400, 401, 403) else 'ENGAGEMENT_RATE_LIMITED' if response.status_code in (402, 429) else 'ENGAGEMENT_UNAVAILABLE'
        raise FlenzrException(code, 'Recent post access is unavailable. Check this network’s permissions or API access.' if code == 'ENGAGEMENT_ACCESS_REQUIRED' else 'Recent post counts are temporarily unavailable. Please try later.', 409 if code == 'ENGAGEMENT_ACCESS_REQUIRED' else 503)
    if not isinstance(data, dict) or data.get('errors'):
        raise FlenzrException('ENGAGEMENT_UNAVAILABLE', 'The network did not return complete post details.', 503)
    return data


def items(data, key):
    result = data.get(key)
    if not isinstance(result, list) or any(not isinstance(item, dict) or not item.get('id') for item in result):
        raise FlenzrException('ENGAGEMENT_UNAVAILABLE', 'The network returned unreadable post details.', 503)
    return result


async def youtube_posts(client, account_id, headers):
    base = 'https://www.googleapis.com/youtube/v3/'
    channel = await request(client, base + 'channels', headers, {'part': 'contentDetails', 'id': account_id})
    channels = items(channel, 'items')
    try:
        if len(channels) != 1 or channels[0]['id'] != account_id:
            raise ValueError()
        playlist = channels[0]['contentDetails']['relatedPlaylists']['uploads']
        if not isinstance(playlist, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', playlist):
            raise ValueError()
    except (KeyError, TypeError, ValueError):
        raise FlenzrException('ENGAGEMENT_UNAVAILABLE', 'The channel’s uploads could not be read.', 503)
    data = await request(client, base + 'playlistItems', headers, {'part': 'contentDetails', 'playlistId': playlist, 'maxResults': 10})
    entries = data.get('items')
    if not isinstance(entries, list):
        raise FlenzrException('ENGAGEMENT_UNAVAILABLE', 'The channel’s uploads could not be read.', 503)
    ids = [p.get('contentDetails', {}).get('videoId') for p in entries if isinstance(p, dict)]
    if len(ids) != len(entries) or any(not isinstance(v, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', v) for v in ids):
        raise FlenzrException('ENGAGEMENT_UNAVAILABLE', 'The channel’s uploads could not be read.', 503)
    if not ids:
        return []
    videos = items(await request(client, base + 'videos', headers, {'part': 'snippet,statistics,status', 'id': ','.join(ids)}), 'items')
    indexed = {v['id']: v for v in videos}
    result = []
    for video_id in ids:
        video = indexed.get(video_id)
        if not video or video.get('status', {}).get('privacyStatus') != 'public':
            continue
        if video.get('snippet', {}).get('channelId') != account_id:
            raise PermissionDeniedError('The video belongs to a different channel.')
        stats = video.get('statistics', {})
        result.append(post(video_id, video.get('snippet', {}).get('publishedAt'), stats.get('likeCount'), stats.get('commentCount')))
    return result


async def read_posts(client, platform, credential, token):
    account_id = credential.get('account_id')
    if not isinstance(account_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', account_id):
        raise FlenzrException('ENGAGEMENT_ACCESS_REQUIRED', 'Reconnect this account to read its posts.', 409)
    headers = {'Authorization': f'Bearer {token}'}
    if platform == 'youtube':
        return await youtube_posts(client, account_id, headers)
    if platform == 'facebook':
        _, secret, _, _ = facebook.configuration()
        headers, proof = facebook.auth(token, secret)
        url = facebook.graph(account_id + '/published_posts')
        params = {'limit': 10, 'fields': 'id,created_time,reactions.limit(0).summary(true),comments.limit(0).summary(true)', 'appsecret_proof': proof}
    elif credential.get('mode') == 'unified':
        headers, proof = instagram.provider_headers(token)
        url = instagram.graph_url(account_id + '/media')
        params = {'limit': 10, 'fields': 'id,timestamp,like_count,comments_count', 'appsecret_proof': proof}
    else:
        url = f'https://graph.instagram.com/{settings.INSTAGRAM_API_VERSION}/{account_id}/media'
        params = {'limit': 10, 'fields': 'id,timestamp,like_count,comments_count'}
    entries = items(await request(client, url, headers, params), 'data')[:10]
    if platform == 'instagram':
        return [post(p['id'], p.get('timestamp'), p.get('like_count'), p.get('comments_count')) for p in entries]
    def summary(p, key):
        edge = p.get(key)
        value = edge.get('summary') if isinstance(edge, dict) else None
        return value.get('total_count') if isinstance(value, dict) else None
    return [post(p['id'], p.get('created_time'), summary(p, 'reactions'), summary(p, 'comments')) for p in entries]


@router.get('/recent-engagement')
async def recent_engagement(platform: SocialPlatform, handle: str = Query(min_length=1, max_length=128, pattern=r'^[a-zA-Z0-9_.-]+$'),
    user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    """Read the last saved snapshot only. Never contact a social provider on page load."""
    handle = handle.lower()
    creator = await owned_creator(db, user)
    if not any(a.platform == platform and a.handle == handle for a in social_accounts(creator)):
        raise PermissionDeniedError('This account is not linked to your profile.')
    if platform not in HANDLERS:
        return {'platform': platform, 'handle': handle, 'status': 'unsupported', 'posts': [], 'total': None,
            'message': 'This connection does not provide post analytics.'}
    key = handle if platform == 'instagram' else platform + ':' + handle
    cached = (creator.social_credentials or {}).get(key, {}).get('recent_engagement')
    if isinstance(cached, dict):
        return cached
    return {'platform': platform, 'handle': handle, 'status': 'not_refreshed', 'posts': [], 'total': None,
        'message': 'Refresh to fetch and save recent post counts.'}


@router.post('/recent-engagement')
async def refresh_recent_engagement(platform: SocialPlatform, handle: str = Query(min_length=1, max_length=128, pattern=r'^[a-zA-Z0-9_.-]+$'),
    user: User = Depends(creator_role), db: AsyncSession = Depends(get_db)):
    handle = handle.lower()
    creator = await owned_creator(db, user)
    if not any(a.platform == platform and a.handle == handle for a in social_accounts(creator)):
        raise PermissionDeniedError('This account is not linked to your profile.')
    if platform not in HANDLERS:
        return {'platform': platform, 'handle': handle, 'status': 'unsupported', 'posts': [], 'total': None,
            'message': 'This connection does not provide post analytics.'}
    # Reuse the connection’s expiry, app-binding and token rotation checks.
    if platform != 'x':
        await HANDLERS[platform](handle=handle, user=user, db=db)
    creator = await owned_creator(db, user)
    key = handle if platform == 'instagram' else platform + ':' + handle
    credential = (creator.social_credentials or {}).get(key)
    if not credential:
        raise PermissionDeniedError('This connection changed. Please reconnect.')
    token = None
    if platform != 'x':
        try:
            token = Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode()).decrypt(credential['encrypted_token'].encode()).decode()
        except (InvalidToken, KeyError, ValueError):
            raise FlenzrException('ENGAGEMENT_ACCESS_REQUIRED', 'Please reconnect this account.', 409)
    await db.commit()
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        if platform == 'x':
            result = summarize(platform, handle, await fetch_public_posts(client, handle))
            result.update(source='x-public-profile', coverage='public_subset', latestTenGuaranteed=False)
        else:
            result = summarize(platform, handle, await read_posts(client, platform, credential, token))
    creator = await owned_creator(db, user)
    credentials = dict(creator.social_credentials or {})
    current = credentials.get(key)
    if not current or current.get('encrypted_token') != credential['encrypted_token'] or not any(a.platform == platform and a.handle == handle for a in social_accounts(creator)):
        raise PermissionDeniedError('This connection changed. Please reload.')
    credentials[key] = {**current, 'recent_engagement': result}
    creator.social_credentials = credentials
    await db.commit()
    return result
