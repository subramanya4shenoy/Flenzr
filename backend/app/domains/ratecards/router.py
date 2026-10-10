from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.domains.creators.services import CreatorService
from app.domains.identity.models import SystemRole, User
from app.domains.identity.services import IdentityService
from app.domains.ratecards.schemas import (
    RateCardCreate,
    RateCardRead,
    RateCardUpdate,
)
from app.domains.ratecards.services import RateCardService

router = APIRouter(prefix="/ratecards", tags=["Rate Cards"])


@router.get("/me", response_model=List[RateCardRead])
async def get_my_rate_cards(
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all rate cards (active and inactive) for the current creator.
    """
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await RateCardService.list_for_creator(db, creator_id)


@router.post("", response_model=RateCardRead, status_code=status.HTTP_201_CREATED)
async def create_rate_card(
    body: RateCardCreate,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new deliverable rate card package.
    """
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await RateCardService.create(db, creator_id, body)


@router.patch("/{ratecard_id}", response_model=RateCardRead)
async def update_rate_card(
    ratecard_id: str,
    body: RateCardUpdate,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates an existing rate card.
    """
    ratecard = await RateCardService.get_by_id(db, ratecard_id)
    if not ratecard:
        raise EntityNotFoundError("RateCard", ratecard_id)

    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if ratecard.creator_id != creator_id and not current_user.is_superadmin:
        raise PermissionDeniedError("Cannot modify another creator's rate card")

    return await RateCardService.update(db, ratecard, body)


@router.delete("/{ratecard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rate_card(
    ratecard_id: str,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a rate card.
    """
    ratecard = await RateCardService.get_by_id(db, ratecard_id)
    if not ratecard:
        raise EntityNotFoundError("RateCard", ratecard_id)

    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if ratecard.creator_id != creator_id and not current_user.is_superadmin:
        raise PermissionDeniedError("Cannot delete another creator's rate card")

    await RateCardService.delete(db, ratecard)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/creator/{handle}", response_model=List[RateCardRead])
async def get_public_creator_rate_cards(
    handle: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Publicly exposes active rate cards for brands browsing a creator's media kit or profile.
    """
    creator = await CreatorService.get_by_handle(db, handle)
    if not creator:
        raise EntityNotFoundError("Creator", handle)

    return await RateCardService.list_for_creator(db, creator.id, only_active=True)
