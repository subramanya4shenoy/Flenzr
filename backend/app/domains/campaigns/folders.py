"""Private parent campaigns. Offer lifecycle and participant records remain independent."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import EntityNotFoundError, FlenzrException
from app.domains.brands.services import BrandService
from app.domains.identity.models import SystemRole, User
from .models import Campaign, MarketingCampaign
from .schemas import CampaignRead
from .services import CampaignService

router = APIRouter()


class CampaignFolderFields(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=255)
    objective: str = Field(default="", max_length=5000)


class CampaignFolderCreate(CampaignFolderFields):
    request_id: UUID


class CampaignFolderUpdate(CampaignFolderFields):
    expected_revision: int = Field(ge=1)


class CampaignFolderRead(CampaignFolderFields):
    model_config = ConfigDict(from_attributes=True)
    id: str
    revision: int
    created_at: datetime
    updated_at: datetime
    last_opened_at: datetime | None = None


class OfferFolderUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    parent_campaign_id: UUID
    expected_revision: int = Field(ge=1)


async def owner_organization(
    user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    org = await BrandService.get_organization_by_owner(db, user.id)
    if not org:
        raise EntityNotFoundError("Organization", user.id)
    return org


async def owned_folder(db, organization_id, folder_id):
    folder = await db.scalar(select(MarketingCampaign).where(
        MarketingCampaign.id == folder_id, MarketingCampaign.organization_id == organization_id
    ).execution_options(populate_existing=True))
    if not folder:
        raise EntityNotFoundError("Campaign", folder_id)
    return folder


@router.get("/folders", response_model=list[CampaignFolderRead])
async def list_folders(org=Depends(owner_organization), db: AsyncSession = Depends(get_db)):
    return list((await db.scalars(select(MarketingCampaign).where(
        MarketingCampaign.organization_id == org.id
    ).order_by(MarketingCampaign.created_at.desc(), MarketingCampaign.id))).all())


@router.post("/folders", response_model=CampaignFolderRead, status_code=status.HTTP_201_CREATED)
async def create_folder(body: CampaignFolderCreate, org=Depends(owner_organization), db: AsyncSession = Depends(get_db)):
    # Rollback expires ORM instances when concurrent retries hit the primary key.
    organization_id = org.id
    folder_id = str(body.request_id)
    values = body.model_dump(exclude={"request_id"})
    existing = await db.get(MarketingCampaign, folder_id)
    if not existing:
        folder = MarketingCampaign(id=folder_id, organization_id=organization_id, **values)
        db.add(folder)
        try:
            await db.commit()
            await db.refresh(folder)
            return folder
        except IntegrityError:
            await db.rollback()
            existing = await db.get(MarketingCampaign, folder_id)
            if not existing:
                raise
    if existing.organization_id != organization_id:
        raise EntityNotFoundError("Campaign", folder_id)
    if existing.title == body.title and existing.objective == body.objective:
        return existing
    raise FlenzrException("CAMPAIGN_ALREADY_SAVED", "This campaign was already saved with different details. Reload before editing.", 409)


@router.get("/folders/{folder_id}", response_model=CampaignFolderRead)
async def get_folder(folder_id: UUID, org=Depends(owner_organization), db: AsyncSession = Depends(get_db)):
    return await owned_folder(db, org.id, str(folder_id))


@router.patch("/folders/{folder_id}", response_model=CampaignFolderRead)
async def edit_folder(folder_id: UUID, body: CampaignFolderUpdate, org=Depends(owner_organization), db: AsyncSession = Depends(get_db)):
    folder = await owned_folder(db, org.id, str(folder_id))
    values = body.model_dump(exclude={"expected_revision"})
    if folder.revision == body.expected_revision + 1 and all(getattr(folder, key) == value for key, value in values.items()):
        return folder
    result = await db.execute(update(MarketingCampaign).where(
        MarketingCampaign.id == str(folder_id), MarketingCampaign.organization_id == org.id,
        MarketingCampaign.revision == body.expected_revision,
    ).values(**values, revision=MarketingCampaign.revision + 1, updated_at=datetime.now(timezone.utc))
      .execution_options(synchronize_session=False))
    if result.rowcount != 1:
        await db.rollback()
        raise FlenzrException("CAMPAIGN_CHANGED", "This campaign changed in another session. Reload before saving.", 409)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.post("/folders/{folder_id}/open", response_model=CampaignFolderRead)
async def record_folder_open(folder_id: UUID, org=Depends(owner_organization), db: AsyncSession = Depends(get_db)):
    folder = await owned_folder(db, org.id, str(folder_id))
    # Opening a folder records recency without changing its content revision or edit timestamp.
    await db.execute(update(MarketingCampaign).where(
        MarketingCampaign.id == folder.id, MarketingCampaign.organization_id == org.id,
    ).values(last_opened_at=datetime.now(timezone.utc), updated_at=MarketingCampaign.updated_at)
      .execution_options(synchronize_session=False))
    await db.commit()
    await db.refresh(folder)
    return folder


@router.patch("/{offer_id}/folder", response_model=CampaignRead)
async def move_offer(offer_id: UUID, body: OfferFolderUpdate, org=Depends(owner_organization), db: AsyncSession = Depends(get_db)):
    offer = await CampaignService.get_by_id(db, str(offer_id))
    if not offer or offer.organization_id != org.id:
        raise EntityNotFoundError("Offer", offer_id)
    target = await owned_folder(db, org.id, str(body.parent_campaign_id))
    if offer.revision == body.expected_revision + 1 and offer.parent_campaign_id == target.id:
        return offer
    result = await db.execute(update(Campaign).where(
        Campaign.id == offer.id, Campaign.organization_id == org.id, Campaign.revision == body.expected_revision,
    ).values(parent_campaign_id=target.id, revision=Campaign.revision + 1, updated_at=datetime.now(timezone.utc))
      .execution_options(synchronize_session=False))
    if result.rowcount != 1:
        await db.rollback()
        raise FlenzrException("OFFER_CHANGED", "This offer changed in another session. Reload before moving it.", 409)
    await db.commit()
    await db.refresh(offer)
    return offer
