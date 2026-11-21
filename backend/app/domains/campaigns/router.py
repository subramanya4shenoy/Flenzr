from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.domains.brands.services import BrandService
from app.domains.campaigns.models import CampaignStatus
from app.domains.campaigns.schemas import (
    CampaignPipelineSummary,
    CampaignOpportunityRead,
    CampaignOpportunityPage,
    CampaignActivityPage,
    CampaignActivityRead,
    CampaignApplicationResponse,
    CampaignApplicationWithdrawal,
    CampaignInvitationResponse,
    CampaignApplicationCreate,
    CampaignApplicationRead,
    CampaignCreate,
    CampaignDraftCreate,
    CampaignDraftUpdate,
    CampaignInvitationCreate,
    CampaignInvitationRecipient,
    CampaignInvitationRead,
    CampaignRead,
    CampaignUpdate,
    CampaignTransition,
)
from app.domains.campaigns.services import CampaignService
from app.domains.campaigns.folders import router as folder_router
from app.domains.identity.models import SystemRole, User
from app.domains.identity.services import IdentityService

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Opportunities"])

# Static folder routes must precede the legacy /{campaign_id} offer route.
router.include_router(folder_router)


@router.get("/me", response_model=List[CampaignRead])
async def list_my_brand_campaigns(
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all campaigns owned by the current brand organization.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.list_for_organization(db, org.id)


@router.get("/me/summary", response_model=CampaignPipelineSummary)
async def brand_pipeline_summary(
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.pipeline_summary(db, org.id)


async def _activity(db, user, audience, kind, campaign_id, page, page_size):
    if audience == "brand":
        org = await BrandService.get_organization_by_owner(db, user.id)
        if not org:
            raise EntityNotFoundError("Organization", user.id)
        if campaign_id:
            campaign = await CampaignService.get_by_id(db, campaign_id)
            if not campaign:
                raise EntityNotFoundError("Campaign", campaign_id)
            if campaign.organization_id != org.id:
                raise PermissionDeniedError("Only the owning brand can list campaign activity")
        scope = {"organization_id": org.id}
    else:
        creator_id = await IdentityService.get_creator_id_for_user(db, user.id)
        if not creator_id:
            raise EntityNotFoundError("CreatorProfile", user.id)
        scope = {"creator_id": creator_id}
    return await CampaignService.list_activity(db, kind=kind, campaign_id=campaign_id,
                                               page=page, page_size=page_size, **scope)


@router.get("/me/applications", response_model=CampaignActivityPage)
async def list_brand_applications(
    campaign_id: Optional[str] = Query(None, min_length=1, max_length=36),
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    return await _activity(db, current_user, "brand", "applications", campaign_id, page, page_size)


@router.get("/me/invitations", response_model=CampaignActivityPage)
async def list_brand_invitations(
    campaign_id: Optional[str] = Query(None, min_length=1, max_length=36),
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    return await _activity(db, current_user, "brand", "invitations", campaign_id, page, page_size)


@router.get("/creator/applications", response_model=CampaignActivityPage)
async def list_creator_applications(
    campaign_id: Optional[str] = Query(None, min_length=1, max_length=36),
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    return await _activity(db, current_user, "creator", "applications", campaign_id, page, page_size)


@router.get("/creator/invitations", response_model=CampaignActivityPage)
async def list_creator_invitations(
    campaign_id: Optional[str] = Query(None, min_length=1, max_length=36),
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    return await _activity(db, current_user, "creator", "invitations", campaign_id, page, page_size)


async def _record_scope(db, user, audience):
    if audience == "brand":
        org = await BrandService.get_organization_by_owner(db, user.id)
        if not org:
            raise EntityNotFoundError("Organization", user.id)
        return {"organization_id": org.id}
    creator_id = await IdentityService.get_creator_id_for_user(db, user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", user.id)
    return {"creator_id": creator_id}


@router.get("/me/applications/{record_id}", response_model=CampaignActivityRead)
async def read_brand_applications_record(
    record_id: str,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "brand")
    return await CampaignService.get_activity(db, kind="applications", record_id=record_id, **scope)


@router.post("/me/applications/{record_id}/respond", response_model=CampaignActivityRead)
async def respond_brand_applications(
    record_id: str,
    body: CampaignApplicationResponse,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "brand")
    return await CampaignService.respond_activity(db, kind="applications", record_id=record_id, body=body, **scope)


@router.get("/me/invitations/{record_id}", response_model=CampaignActivityRead)
async def read_brand_invitations_record(
    record_id: str,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "brand")
    return await CampaignService.get_activity(db, kind="invitations", record_id=record_id, **scope)


@router.get("/creator/applications/{record_id}", response_model=CampaignActivityRead)
async def read_creator_applications_record(
    record_id: str,
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "creator")
    return await CampaignService.get_activity(db, kind="applications", record_id=record_id, **scope)


@router.post("/creator/applications/{record_id}/respond", response_model=CampaignActivityRead)
async def respond_creator_applications(
    record_id: str,
    body: CampaignApplicationWithdrawal,
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "creator")
    return await CampaignService.respond_activity(db, kind="applications", record_id=record_id, body=body, **scope)


@router.get("/creator/invitations/{record_id}", response_model=CampaignActivityRead)
async def read_creator_invitations_record(
    record_id: str,
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "creator")
    return await CampaignService.get_activity(db, kind="invitations", record_id=record_id, **scope)


@router.post("/creator/invitations/{record_id}/respond", response_model=CampaignActivityRead)
async def respond_creator_invitations(
    record_id: str,
    body: CampaignInvitationResponse,
    current_user: User = Depends(require_role([SystemRole.CREATOR])),
    db: AsyncSession = Depends(get_db),
):
    scope = await _record_scope(db, current_user, "creator")
    return await CampaignService.respond_activity(db, kind="invitations", record_id=record_id, body=body, **scope)


@router.get("/invitation-recipient/{handle}", response_model=CampaignInvitationRecipient)
async def resolve_invitation_recipient(
    handle: str,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    return await CampaignService.invitation_recipient(db, handle)


@router.get("/{campaign_id}/invitation/{creator_id}", response_model=Optional[CampaignInvitationRead])
async def read_existing_invitation(
    campaign_id: str,
    creator_id: str,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    campaign = await CampaignService.get_by_id(db, campaign_id)
    if not campaign:
        raise EntityNotFoundError("Campaign", campaign_id)
    if not org or campaign.organization_id != org.id:
        raise PermissionDeniedError("Only the owning brand can view sent invitations")
    return await CampaignService.existing_invitation(db, campaign_id, creator_id)


@router.get("/opportunities", response_model=CampaignOpportunityPage)
async def list_creator_opportunities(
    q: Optional[str] = Query(None, max_length=255),
    niche: Optional[str] = Query(None, max_length=128),
    page: int = Query(1, ge=1, le=10000),
    page_size: int = Query(12, ge=1, le=50),
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await CampaignService.list_opportunities(db, creator_id, q=q, niche=niche, page=page, page_size=page_size)


@router.get("/opportunities/{campaign_id}", response_model=CampaignOpportunityRead)
async def read_creator_opportunity(
    campaign_id: str,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    result = await CampaignService.list_opportunities(db, creator_id, campaign_id=campaign_id, page_size=1)
    if not result["items"]:
        raise EntityNotFoundError("Open campaign", campaign_id)
    return result["items"][0]


@router.post("", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicitly creates and publishes a complete campaign for the current brand organization.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.create(db, org.id, body)


@router.post("/drafts", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign_draft(
    body: CampaignDraftCreate,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.create_draft(db, org.id, body)


@router.patch("/{campaign_id}/draft", response_model=CampaignRead)
async def edit_campaign_draft(
    campaign_id: str,
    body: CampaignDraftUpdate,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.update_draft(db, org.id, campaign_id, body)


@router.post("/{campaign_id}/transition", response_model=CampaignRead)
async def transition_campaign(
    campaign_id: str,
    body: CampaignTransition,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    """Explicit owner-confirmed publish, pause, resume, close or cancel action."""
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return await CampaignService.transition(db, org.id, campaign_id, body)


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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_by_id(db, campaign_id)
    if not campaign:
        raise EntityNotFoundError("Campaign", campaign_id)
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org or campaign.organization_id != org.id:
        raise PermissionDeniedError("Campaign details are restricted to the owning organization; use explore for public opportunities")
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
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    """
    Brand invites shortlisted creator to collaborate with an offered rate.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    campaign = await CampaignService.get_by_id(db, campaign_id)
    if not campaign:
        raise EntityNotFoundError("Campaign", campaign_id)
    if campaign.organization_id != org.id:
        raise PermissionDeniedError("Cannot invite creators to another organization's campaign")
    return await CampaignService.invite_creator(db, campaign_id, body, organization_id=org.id)
