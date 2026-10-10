from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.domains.brands.services import BrandService
from app.domains.campaigns.models import CampaignStatus
from app.domains.campaigns.schemas import (
    CampaignApplicationCreate,
    CampaignApplicationRead,
    CampaignCreate,
    CampaignInvitationCreate,
    CampaignInvitationRead,
    CampaignRead,
    CampaignUpdate,
)
from app.domains.campaigns.services import CampaignService
from app.domains.identity.models import SystemRole, User
from app.domains.identity.services import IdentityService

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Opportunities"])


@router.get("/me", response_model=List[CampaignRead])
async def list_my_brand_campaigns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all campaigns owned by the current brand organization.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.list_for_organization(db, org.id)


@router.post("", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new campaign brief for the current brand organization.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.create(db, org.id, body)


@router.get("/explore", response_model=List[CampaignRead])
async def explore_active_campaigns(
    niche: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Publicly browsable open campaigns for creators seeking sponsorship opportunities.
    """
    return await CampaignService.list_active_public(db, niche=niche)


@router.get("/{campaign_id}", response_model=CampaignRead)
async def get_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_by_id(db, campaign_id)
    if not campaign:
        raise EntityNotFoundError("Campaign", campaign_id)
    return campaign


@router.post("/{campaign_id}/apply", response_model=CampaignApplicationRead, status_code=status.HTTP_201_CREATED)
async def apply_to_campaign(
    campaign_id: str,
    body: CampaignApplicationCreate,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Creator submits pitch and proposed quote for an active brand campaign.
    """
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await CampaignService.apply_to_campaign(db, campaign_id, creator_id, body)


@router.post("/{campaign_id}/invite", response_model=CampaignInvitationRead, status_code=status.HTTP_201_CREATED)
async def invite_creator_to_campaign(
    campaign_id: str,
    body: CampaignInvitationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Brand invites shortlisted creator to collaborate with an offered rate.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.invite_creator(db, campaign_id, body)
