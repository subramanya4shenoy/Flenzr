"""Owner-scoped social account management, independent of ownership verification."""
from typing import Literal, Optional
import time
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import EntityNotFoundError, FlenzrException
from app.domains.creators.models import Creator
from app.domains.identity.models import User, SystemRole

SocialPlatform = Literal['instagram', 'youtube', 'x', 'tiktok', 'linkedin', 'twitch']


class SocialAccountRead(BaseModel):
    platform: SocialPlatform
    handle: str
    is_verified: bool
    display_name: str | None = None
    avatar_url: str | None = None
    connected: bool | None = None


class SocialAccountWrite(BaseModel):
    handle: str = Field(min_length=1, max_length=128, pattern=r'^[a-zA-Z0-9_.-]+$')
    expected_handle: Optional[str] = None
    model_config = ConfigDict(extra='forbid')

    @field_validator('handle', 'expected_handle', mode='before')
    @classmethod
    def normalize_handle(cls, value):
        return value.strip().lstrip('@').lower() if isinstance(value, str) else value


def account_handle(creator: Creator, platform: str):
    if platform == 'instagram':
        return creator.instagram_handle
    if platform == 'youtube':
        return creator.youtube_channel
    return (creator.social_links or {}).get(platform)


def social_accounts(creator: Creator):
    accounts = []
    for platform in ('instagram', 'youtube', 'x', 'tiktok', 'linkedin', 'twitch'):
        handle = account_handle(creator, platform)
        if handle:
            verified = creator.instagram_verified if platform == 'instagram' else creator.youtube_verified if platform == 'youtube' else False
            accounts.append(SocialAccountRead(platform=platform, handle=handle, is_verified=verified))
    for account in (creator.social_links or {}).get("_accounts", []):
        accounts.append(SocialAccountRead(**account))
    for account in accounts:
        if account.platform == 'x':
            credential = (creator.social_credentials or {}).get('x:' + account.handle, {})
            if credential:
                account.connected = bool(credential.get('encrypted_refresh_token') or credential.get('expires_at', 0) > time.time())
                account.is_verified = True
        if account.platform == 'linkedin':
            credential = (creator.social_credentials or {}).get('linkedin:' + account.handle, {})
            account.connected = bool(credential and credential.get('expires_at', 0) > time.time())
            # OIDC confirms account access, not the person's real-world identity.
            account.is_verified = False
    return accounts


async def owned_creator(db, user):
    creator = (await db.execute(select(Creator).where(Creator.user_id == user.id)
                               .with_for_update().execution_options(populate_existing=True))).scalar_one_or_none()
    if not creator:
        raise EntityNotFoundError('CreatorProfile', user.id)
    return creator


def check_expected(current, expected):
    if expected is not None and (current or '').lstrip('@').lower() != expected.lstrip('@').lower():
        raise FlenzrException('SOCIAL_ACCOUNT_CHANGED', 'This account changed. Reload before trying again.', 409)


def replace_account(creator, platform, handle):
    if platform == 'instagram':
        creator.instagram_handle = handle
        creator.instagram_verified = False
    elif platform == 'youtube':
        creator.youtube_channel = handle
        creator.youtube_verified = False
    else:
        links = dict(creator.social_links or {})
        if handle:
            links[platform] = handle
        else:
            links.pop(platform, None)
        creator.social_links = links
    creator.is_verified = bool(creator.instagram_verified or creator.youtube_verified)


def store_accounts(creator, accounts):
    """Keep legacy primary fields compatible; persist all additional accounts atomically."""
    links = {}
    extras = []
    for platform in ('instagram', 'youtube', 'x', 'tiktok', 'linkedin', 'twitch'):
        matching = [a for a in accounts if a.platform == platform]
        primary = matching[0] if matching else None
        if platform == 'instagram':
            creator.instagram_handle = primary.handle if primary else None
            creator.instagram_verified = primary.is_verified if primary else False
        elif platform == 'youtube':
            creator.youtube_channel = primary.handle if primary else None
            creator.youtube_verified = primary.is_verified if primary else False
        elif primary and platform not in ('linkedin', 'x'):
            links[platform] = primary.handle
        extras.extend(a.model_dump(exclude_none=True) for a in (matching if platform in ('linkedin', 'x') else matching[1:]))
    links['_accounts'] = extras
    creator.social_links = links
    handles = {a.handle for a in accounts if a.platform == 'instagram'}
    credentials = dict(creator.social_credentials or {})
    youtube_handles = {a.handle for a in accounts if a.platform == 'youtube'}
    linkedin_handles = {a.handle for a in accounts if a.platform == 'linkedin'}
    x_handles = {a.handle for a in accounts if a.platform == 'x'}
    creator.social_credentials = {key: value for key, value in credentials.items()
        if key in handles or (key == '_flow' and (not value.get('handle') or value.get('handle') in handles))
        or (key.startswith('youtube:') and key[8:] in youtube_handles)
        or (key == '_youtube_flow' and (not value.get('handle') or value.get('handle') in youtube_handles))
        or (key.startswith('linkedin:') and key[9:] in linkedin_handles)
        or (key == '_linkedin_flow' and (not value.get('handle') or value.get('handle') in linkedin_handles))
        or (key.startswith('x:') and key[2:] in x_handles)
        or (key == '_x_flow' and (not value.get('handle') or value.get('handle') in x_handles))}
    creator.is_verified = any(a.is_verified for a in accounts)


router = APIRouter(prefix='/creators/me/social-accounts', tags=['Creator social accounts'])


@router.get('', response_model=list[SocialAccountRead], response_model_exclude_none=True)
async def list_social_accounts(user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    return social_accounts(await owned_creator(db, user))


@router.patch('/{platform}', response_model=list[SocialAccountRead], response_model_exclude_none=True)
async def save_social_account(platform: SocialPlatform, body: SocialAccountWrite,
                              user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    accounts = social_accounts(creator)
    candidates = [a for a in accounts if a.platform == platform]
    expected = body.expected_handle
    current = next((a for a in candidates if a.handle == expected), None) if expected is not None else (candidates[0] if len(candidates) == 1 else None)
    if expected and current is None:
        check_expected(None, expected)
    if expected is None and len(candidates) > 1:
        raise FlenzrException('SOCIAL_ACCOUNT_AMBIGUOUS', 'Choose the account to edit.', 409)
    duplicate = next((a for a in candidates if a.handle == body.handle), None)
    if duplicate and duplicate is not current:
        raise FlenzrException('SOCIAL_ACCOUNT_EXISTS', 'This account is already linked.', 409)
    if current and current.handle == body.handle:
        return accounts
    replacement = SocialAccountRead(platform=platform, handle=body.handle, is_verified=False)
    if current:
        accounts[accounts.index(current)] = replacement
    else:
        accounts.append(replacement)
    store_accounts(creator, accounts)
    await db.commit()
    return social_accounts(creator)


@router.delete('/{platform}', response_model=list[SocialAccountRead], response_model_exclude_none=True)
async def remove_social_account(platform: SocialPlatform, expected_handle: Optional[str] = None,
                                user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    creator = await owned_creator(db, user)
    accounts = social_accounts(creator)
    candidates = [a for a in accounts if a.platform == platform]
    if expected_handle is None and len(candidates) > 1:
        raise FlenzrException('SOCIAL_ACCOUNT_AMBIGUOUS', 'Choose the account to remove.', 409)
    current = next((a for a in candidates if a.handle == expected_handle.lstrip('@').lower()), None) if expected_handle else next(iter(candidates), None)
    if candidates and current is None:
        check_expected(None, expected_handle)
    if current:
        accounts.remove(current)
        store_accounts(creator, accounts)
        await db.commit()
    return social_accounts(creator)
