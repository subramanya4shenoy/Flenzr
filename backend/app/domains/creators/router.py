from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError
from app.domains.creators.schemas import (
    CreatorRead,
    CreatorUpdate,
    PublicCreatorProfile,
)
from app.domains.creators.services import CreatorService
from app.domains.identity.models import SystemRole, User

router = APIRouter(prefix="/creators", tags=["Creators"])


@router.get("/me", response_model=CreatorRead)
async def get_my_creator_profile(
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the creator profile associated with the currently authenticated user.
    """
    creator = await CreatorService.get_by_user_id(db, current_user.id)
    if not creator:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return creator


@router.patch("/me", response_model=CreatorRead)
async def update_my_creator_profile(
    body: CreatorUpdate,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the creator profile of the currently authenticated user.
    """
    creator = await CreatorService.get_by_user_id(db, current_user.id)
    if not creator:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await CreatorService.update_profile(db, creator, body)


@router.get("/public/{handle}", response_model=PublicCreatorProfile)
async def get_public_creator_profile(
    handle: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Publicly accessible endpoint for creator profiles and link-in-bio rendering (SEO & SSR).
    """
    creator = await CreatorService.get_by_handle(db, handle)
    if not creator:
        raise EntityNotFoundError("Creator", handle)

    avatar_url = creator.user.avatar_url if creator.user else None
    return PublicCreatorProfile(
        handle=creator.handle,
        display_name=creator.display_name,
        bio=creator.bio,
        niche=creator.niche,
        location=creator.location,
        is_verified=creator.is_verified,
        rating=creator.rating,
        profile_theme=creator.profile_theme or "default",
        avatar_url=avatar_url,
    )
