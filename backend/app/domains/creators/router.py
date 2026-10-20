from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, security_scheme
from fastapi.security import HTTPAuthorizationCredentials
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
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
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete the authenticated creator's own profile and initial rate cards.
    Reuses the verified caller's token; never issues an unauthenticated session.
    """
    creator = await CreatorService.onboard_creator(db, body, current_user)
    return CreatorOnboardResponse(
        creator=CreatorRead.model_validate(creator),
        access_token=credentials.credentials,
        token_type="bearer",
        universal_bio_link=f"https://flenzr.com/@{creator.handle}",
        message="Creator onboarded successfully with active rate cards & universal bio link.",
    )


@router.post("/verify-bio", response_model=BioVerifyResponse)
async def verify_creator_bio(
    body: BioVerifyRequest,
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies creator ownership of Instagram or YouTube channels via temporary Bio/Description code.
    """
    creator = await CreatorService.get_by_user_id(db, current_user.id)
    if not creator:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    if body.creator_handle and body.creator_handle != creator.handle:
        raise PermissionDeniedError("Cannot verify another creator's profile")
    verified, message = await CreatorService.verify_bio(
        db=db,
        platform=body.platform,
        handle=body.handle,
        code=body.verification_code,
        creator=creator,
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Look up only the signed-in account by its own registered email.
    """
    if email.strip().lower() != current_user.email.lower():
        raise PermissionDeniedError("Cannot look up another account by email")
    creator = await CreatorService.get_by_user_id(db, current_user.id)
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

