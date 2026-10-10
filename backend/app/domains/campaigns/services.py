from typing import List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainRuleViolation, EntityNotFoundError, PermissionDeniedError
from app.domains.campaigns.models import (
    ApplicationStatus,
    Campaign,
    CampaignApplication,
    CampaignInvitation,
    CampaignStatus,
    InvitationStatus,
)
from app.domains.campaigns.schemas import (
    CampaignApplicationCreate,
    CampaignCreate,
    CampaignInvitationCreate,
    CampaignUpdate,
)


class CampaignService:
    @staticmethod
    async def list_for_organization(
        db: AsyncSession, organization_id: str
    ) -> List[Campaign]:
        stmt = (
            select(Campaign)
            .where(Campaign.organization_id == organization_id)
            .order_by(desc(Campaign.created_at))
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_active_public(
        db: AsyncSession, niche: Optional[str] = None
    ) -> List[Campaign]:
        stmt = select(Campaign).where(Campaign.status == CampaignStatus.ACTIVE)
        if niche:
            stmt = stmt.where(Campaign.target_niche == niche)
        stmt = stmt.order_by(desc(Campaign.created_at))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, campaign_id: str) -> Optional[Campaign]:
        stmt = select(Campaign).where(Campaign.id == campaign_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession, organization_id: str, payload: CampaignCreate
    ) -> Campaign:
        campaign = Campaign(
            organization_id=organization_id,
            status=CampaignStatus.ACTIVE,  # Default to active when created
            **payload.model_dump(),
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        return campaign

    @staticmethod
    async def update(
        db: AsyncSession, campaign: Campaign, updates: CampaignUpdate
    ) -> Campaign:
        update_data = updates.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(campaign, key, value)
        await db.commit()
        await db.refresh(campaign)
        return campaign

    @staticmethod
    async def apply_to_campaign(
        db: AsyncSession, campaign_id: str, creator_id: str, payload: CampaignApplicationCreate
    ) -> CampaignApplication:
        campaign = await CampaignService.get_by_id(db, campaign_id)
        if not campaign or campaign.status != CampaignStatus.ACTIVE:
            raise DomainRuleViolation("CAMPAIGN_NOT_ACTIVE", "Can only apply to active campaigns")

        # Check existing application
        stmt = select(CampaignApplication).where(
            CampaignApplication.campaign_id == campaign_id,
            CampaignApplication.creator_id == creator_id,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise DomainRuleViolation("ALREADY_APPLIED", "You have already applied to this campaign")

        application = CampaignApplication(
            campaign_id=campaign_id,
            creator_id=creator_id,
            pitch_message=payload.pitch_message,
            proposed_rate_cents=payload.proposed_rate_cents,
            status=ApplicationStatus.PENDING,
        )
        db.add(application)
        await db.commit()
        await db.refresh(application)
        return application

    @staticmethod
    async def invite_creator(
        db: AsyncSession, campaign_id: str, payload: CampaignInvitationCreate
    ) -> CampaignInvitation:
        campaign = await CampaignService.get_by_id(db, campaign_id)
        if not campaign or campaign.status != CampaignStatus.ACTIVE:
            raise DomainRuleViolation("CAMPAIGN_NOT_ACTIVE", "Can only invite to active campaigns")

        invitation = CampaignInvitation(
            campaign_id=campaign_id,
            creator_id=payload.creator_id,
            offered_rate_cents=payload.offered_rate_cents,
            message=payload.message,
            status=InvitationStatus.INVITED,
        )
        db.add(invitation)
        await db.commit()
        await db.refresh(invitation)
        return invitation
