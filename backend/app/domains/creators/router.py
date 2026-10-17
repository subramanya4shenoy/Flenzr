from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError
from app.domains.creators.schemas import (
    BioVerifyRequest,
    BioVerifyResponse,
    CreatorOnboardRequest,
    CreatorOnboardResponse,
    CreatorRead,
    CreatorUpdate,
    PublicCreatorProfile,
)
from app.domains.creators.services import CreatorService
from app.domains.identity.models import SystemRole, User

router = APIRouter(prefix="/creators", tags=["Creators"])


@router.post("/onboard", response_model=CreatorOnboardResponse, status_code=status.HTTP_201_CREATED)
async def onboard_creator(
    body: CreatorOnboardRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete frictionless creator onboarding in a single transaction:
    Provisions User, Creator profile, initial Rate Cards in ₹, universal bio link, and JWT token.
    """
    creator, token = await CreatorService.onboard_creator(db, body)
    return CreatorOnboardResponse(
        creator=CreatorRead.model_validate(creator),
        access_token=token,
        token_type="bearer",
        universal_bio_link=f"https://flenzr.com/@{creator.handle}",
        message="Creator onboarded successfully with active rate cards & universal bio link.",
    )


@router.post("/verify-bio", response_model=BioVerifyResponse)
async def verify_creator_bio(
    body: BioVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies creator ownership of Instagram or YouTube channels via temporary Bio/Description code.
    """
    verified, message = await CreatorService.verify_bio(
        db=db,
        platform=body.platform,
        handle=body.handle,
        code=body.verification_code,
        creator_handle=body.creator_handle,
    )
    return BioVerifyResponse(
        verified=verified,
        platform=body.platform,
        handle=body.handle,
        message=message,
    )


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


@router.get("/by-email/{email}", response_model=PublicCreatorProfile)
async def get_creator_by_email(
    email: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Look up creator profile by registered email.
    """
    creator = await CreatorService.get_by_email(db, email)
    if not creator:
        raise EntityNotFoundError("Creator with email", email)

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
        instagram_handle=creator.instagram_handle,
        instagram_verified=creator.instagram_verified,
        youtube_channel=creator.youtube_channel,
        youtube_verified=creator.youtube_verified,
    )


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
        instagram_handle=creator.instagram_handle,
        instagram_verified=creator.instagram_verified,
        youtube_channel=creator.youtube_channel,
        youtube_verified=creator.youtube_verified,
    )

