from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_token_payload
from app.core.security import SupabaseTokenPayload
from app.domains.identity.models import User
from app.domains.identity.schemas import (
    UserProfileResponse,
    UserRead,
    UserSyncRequest,
)
from app.domains.identity.services import IdentityService

router = APIRouter(prefix="/identity", tags=["Identity"])


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns current authenticated user details, active roles, and associated entity IDs.
    """
    active_roles = [r.role.value for r in current_user.roles]
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)

    return UserProfileResponse(
        user=UserRead.model_validate(current_user),
        active_roles=active_roles,
        creator_id=creator_id,
        brand_id=None,
    )


@router.post("/sync", response_model=UserProfileResponse)
async def sync_user_profile(
    body: UserSyncRequest,
    token_payload: SupabaseTokenPayload = Depends(get_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicitly syncs or updates user details and role preferences directly from Supabase Auth session.
    """
    user = await IdentityService.get_or_create_user_from_token(
        db, token_payload, sync_req=body
    )
    active_roles = [r.role.value for r in user.roles]
    creator_id = await IdentityService.get_creator_id_for_user(db, user.id)

    return UserProfileResponse(
        user=UserRead.model_validate(user),
        active_roles=active_roles,
        creator_id=creator_id,
        brand_id=None,
    )
