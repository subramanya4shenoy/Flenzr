from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import and_, desc, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainRuleViolation, EntityNotFoundError, PermissionDeniedError, FlenzrException
from app.domains.campaigns.models import (
    ApplicationStatus,
    Campaign,
    CampaignApplication,
    CampaignInvitation,
    MarketingCampaign,
    CampaignStatus,
    InvitationStatus,
)
from app.domains.campaigns.schemas import (
    CampaignApplicationCreate,
    CampaignCreate,
    CampaignDraftCreate,
    CampaignDraftFields,
    CampaignDraftUpdate,
    CampaignInvitationCreate,
    CampaignUpdate,
    CampaignPublishFields,
    CampaignTransition,
)


class CampaignService:
    @staticmethod
    async def validate_parent(db: AsyncSession, organization_id: str, parent_campaign_id: str | None):
        if parent_campaign_id is not None and not await db.scalar(select(MarketingCampaign.id).where(
            MarketingCampaign.id == parent_campaign_id, MarketingCampaign.organization_id == organization_id
        )):
            raise EntityNotFoundError("Campaign", parent_campaign_id)

    @staticmethod
    async def pipeline_summary(db: AsyncSession, organization_id: str):
        # Independent scalar aggregates avoid multiplying applications by invitations.
        owned = select(Campaign.id).where(Campaign.organization_id == organization_id)
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        columns = [
            select(func.count(Campaign.id)).where(Campaign.organization_id == organization_id).scalar_subquery().label("campaign_count"),
            select(func.count(Campaign.id)).where(Campaign.organization_id == organization_id,
                Campaign.status == CampaignStatus.ACTIVE,
                or_(Campaign.end_date.is_(None), Campaign.end_date >= today)).scalar_subquery().label("active_campaign_count"),
        ]
        for prefix, model, statuses in (("applications", CampaignApplication, ApplicationStatus),
                                         ("invitations", CampaignInvitation, InvitationStatus)):
            scope = model.campaign_id.in_(owned)
            columns.append(select(func.count(model.id)).where(scope).scalar_subquery().label(prefix + "_total"))
            for state in statuses:
                columns.append(select(func.count(model.id)).where(scope, model.status == state)
                               .scalar_subquery().label(prefix + "_" + state.value))
        row = (await db.execute(select(*columns))).one()._mapping
        budgets = (await db.execute(select(Campaign.currency, func.sum(Campaign.budget_total_cents))
            .where(Campaign.organization_id == organization_id, Campaign.budget_total_cents > 0)
            .group_by(Campaign.currency).order_by(Campaign.currency))).all()
        return {"campaign_count": row["campaign_count"], "active_campaign_count": row["active_campaign_count"],
                "planned_budgets": [{"currency": currency, "cents": cents} for currency, cents in budgets],
                "applications": {key.removeprefix("applications_"): value for key, value in row.items() if key.startswith("applications_")},
                "invitations": {key.removeprefix("invitations_"): value for key, value in row.items() if key.startswith("invitations_")},
                "updated_at": datetime.now(timezone.utc)}

    @staticmethod
    async def list_for_organization(
        db: AsyncSession, organization_id: str
    ) -> List[Campaign]:
        count = select(func.count(CampaignApplication.id)).where(CampaignApplication.campaign_id == Campaign.id).correlate(Campaign).scalar_subquery()
        result = await db.execute(select(Campaign, count).where(Campaign.organization_id == organization_id)
                                  .order_by(desc(Campaign.created_at), Campaign.id))
        campaigns = []
        for campaign, applicants in result.all():
            campaign.applicants_count = applicants
            campaign.applicant_preview = []
            campaigns.append(campaign)
        if campaigns:
            from app.domains.creators.models import Creator
            from app.domains.identity.models import User
            # One bounded preview query for the whole list, rather than a request/query per Offer.
            ranked = select(
                CampaignApplication.campaign_id, Creator.id, Creator.display_name, User.avatar_url,
                func.row_number().over(partition_by=CampaignApplication.campaign_id,
                    order_by=(CampaignApplication.created_at.desc(), CampaignApplication.id)).label("position"),
            ).join(Creator, Creator.id == CampaignApplication.creator_id).join(User, User.id == Creator.user_id).where(
                CampaignApplication.campaign_id.in_(select(Campaign.id).where(Campaign.organization_id == organization_id))
            ).subquery()
            previews = (await db.execute(select(ranked).where(ranked.c.position <= 4)
                                        .order_by(ranked.c.campaign_id, ranked.c.position))).mappings().all()
            by_id = {campaign.id: campaign for campaign in campaigns}
            for row in previews:
                by_id[row["campaign_id"]].applicant_preview.append(
                    {"id": row["id"], "display_name": row["display_name"], "avatar_url": row["avatar_url"]})
        return campaigns

    @staticmethod
    async def list_active_public(
        db: AsyncSession, niche: Optional[str] = None
    ) -> List[Campaign]:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = select(Campaign).where(Campaign.visibility == "public", Campaign.status == CampaignStatus.ACTIVE,
                                      or_(Campaign.end_date.is_(None), Campaign.end_date >= today))
        if niche:
            stmt = stmt.where(Campaign.target_niche == niche)
        stmt = stmt.order_by(desc(Campaign.created_at))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, campaign_id: str, for_update: bool = False) -> Optional[Campaign]:
        count = select(func.count(CampaignApplication.id)).where(CampaignApplication.campaign_id == Campaign.id).correlate(Campaign).scalar_subquery()
        stmt = select(Campaign, count).where(Campaign.id == campaign_id).execution_options(populate_existing=True)
        if for_update:
            stmt = stmt.with_for_update(of=Campaign)
        result = (await db.execute(stmt)).first()
        if not result:
            return None
        campaign, applicants = result
        campaign.applicants_count = applicants
        return campaign

    @staticmethod
    def accepts_applications(campaign):
        if not campaign or campaign.status != CampaignStatus.ACTIVE:
            return False
        end = campaign.end_date
        if end and end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return end is None or end.astimezone(timezone.utc).date() >= datetime.now(timezone.utc).date()

    @staticmethod
    async def create(
        db: AsyncSession, organization_id: str, payload: CampaignCreate
    ) -> Campaign:
        await CampaignService.validate_parent(db, organization_id, payload.parent_campaign_id)
        campaign = Campaign(
            organization_id=organization_id,
            status=CampaignStatus.ACTIVE,  # Validated legacy create-and-publish request
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
    def _application_retry(existing, payload):
        if existing.proposed_rate_cents == payload.proposed_rate_cents and existing.pitch_message == payload.pitch_message:
            return existing
        raise FlenzrException("APPLICATION_EXISTS", "You already have an application for this campaign. Review the saved application instead of submitting another.", 409)

    @staticmethod
    async def apply_to_campaign(
        db: AsyncSession, campaign_id: str, creator_id: str, payload: CampaignApplicationCreate,
    ) -> CampaignApplication:
        campaign = await CampaignService.get_by_id(db, campaign_id, for_update=True)
        if campaign is None:
            raise EntityNotFoundError("Campaign", campaign_id)
        if campaign.visibility == "invited" and not await CampaignService.existing_invitation(db, campaign_id, creator_id):
            raise EntityNotFoundError("Offer", campaign_id)
        existing = await db.scalar(select(CampaignApplication).where(
            CampaignApplication.campaign_id == campaign_id, CampaignApplication.creator_id == creator_id))
        if existing:
            return CampaignService._application_retry(existing, payload)
        if payload.expected_campaign_revision is not None and campaign.revision != payload.expected_campaign_revision:
            raise FlenzrException("CAMPAIGN_CHANGED", "This campaign changed. Reload the brief and review your application again.", 409)
        if not CampaignService.accepts_applications(campaign):
            raise DomainRuleViolation("CAMPAIGN_NOT_ACTIVE", "This campaign is not accepting new applications")
        application = CampaignApplication(campaign_id=campaign_id, creator_id=creator_id,
            pitch_message=payload.pitch_message, proposed_rate_cents=payload.proposed_rate_cents,
            status=ApplicationStatus.PENDING)
        db.add(application)
        try:
            await db.commit()
            await db.refresh(application)
            return application
        except IntegrityError:
            await db.rollback()
            existing = await db.scalar(select(CampaignApplication).where(
                CampaignApplication.campaign_id == campaign_id, CampaignApplication.creator_id == creator_id))
            if existing:
                return CampaignService._application_retry(existing, payload)
            raise

    @staticmethod
    async def list_opportunities(db: AsyncSession, creator_id: str, *, q=None, niche=None,
                                 page=1, page_size=12, campaign_id=None):
        from app.domains.brands.models import Organization
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        app = CampaignApplication
        query = select(Campaign.id, Campaign.title, Campaign.brief, Organization.name.label("organization_name"),
            Campaign.target_niche, Campaign.deliverable_summary, Campaign.budget_total_cents, Campaign.currency,
            Campaign.status, Campaign.revision, Campaign.start_date, Campaign.end_date,
            app.id.label("application_id"), app.pitch_message.label("application_pitch"),
            app.proposed_rate_cents.label("application_rate"), app.status.label("application_status"),
            app.created_at.label("application_created"),
        ).join(Organization, Campaign.organization_id == Organization.id).outerjoin(app,
            and_(app.campaign_id == Campaign.id, app.creator_id == creator_id)).where(
            Campaign.status == CampaignStatus.ACTIVE,
            or_(Campaign.visibility == "public", select(CampaignInvitation.id).where(CampaignInvitation.campaign_id == Campaign.id, CampaignInvitation.creator_id == creator_id).exists()),
            or_(Campaign.end_date.is_(None), Campaign.end_date >= today))
        def contains(value):
            return "%" + value.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        if q and q.strip():
            term = contains(q)
            query = query.where(or_(Campaign.title.ilike(term, escape="\\"), Campaign.brief.ilike(term, escape="\\"), Organization.name.ilike(term, escape="\\")))
        if niche and niche.strip():
            query = query.where(Campaign.target_niche.ilike(contains(niche), escape="\\"))
        if campaign_id is not None:
            query = query.where(Campaign.id == campaign_id)
        total = await db.scalar(select(func.count()).select_from(query.subquery())) if campaign_id is None else None
        result = await db.execute(query.order_by(Campaign.created_at.desc(), Campaign.id.desc()).offset((page-1)*page_size).limit(page_size))
        items = []
        for row in result.mappings():
            item = dict(row)
            application_id = item.pop("application_id")
            pitch, rate, application_status, created = (item.pop(key) for key in (
                "application_pitch", "application_rate", "application_status", "application_created"))
            item["application"] = {"id":application_id, "campaign_id":item["id"], "creator_id":creator_id,
                "pitch_message":pitch, "proposed_rate_cents":rate, "status":application_status,
                "created_at":created} if application_id else None
            items.append(item)
        return {"items":items, "total":(total or 0) if campaign_id is None else len(items), "page":page, "page_size":page_size}

    @staticmethod
    async def invitation_recipient(db: AsyncSession, handle: str):
        from app.domains.creators.models import Creator
        from app.domains.identity.models import User
        row = (await db.execute(select(Creator.id, Creator.handle, Creator.display_name)
            .join(User, Creator.user_id == User.id).where(Creator.handle == handle, User.is_active.is_(True)))).mappings().one_or_none()
        if row is None:
            raise EntityNotFoundError("Available creator", handle)
        return row

    @staticmethod
    async def existing_invitation(db: AsyncSession, campaign_id: str, creator_id: str):
        return await db.scalar(select(CampaignInvitation).where(
            CampaignInvitation.campaign_id == campaign_id, CampaignInvitation.creator_id == creator_id))

    @staticmethod
    def _invitation_retry(existing, payload):
        if existing.offered_rate_cents == payload.offered_rate_cents and existing.message == payload.message:
            return existing  # Safe after a lost response, even if campaign/recipient status changed afterward.
        raise FlenzrException("INVITATION_EXISTS", "This creator already has an invitation for this campaign. Review the saved invitation instead of sending another.", 409)

    @staticmethod
    async def invite_creator(
        db: AsyncSession, campaign_id: str, payload: CampaignInvitationCreate, organization_id=None,
    ) -> CampaignInvitation:
        from app.domains.creators.models import Creator
        from app.domains.identity.models import User
        campaign = await CampaignService.get_by_id(db, campaign_id, for_update=True)
        if campaign is None:
            raise EntityNotFoundError("Campaign", campaign_id)
        if organization_id is not None and campaign.organization_id != organization_id:
            raise PermissionDeniedError("Cannot invite creators to another organization's campaign")
        existing = await CampaignService.existing_invitation(db, campaign_id, payload.creator_id)
        if existing:
            return CampaignService._invitation_retry(existing, payload)
        if payload.expected_campaign_revision is not None and campaign.revision != payload.expected_campaign_revision:
            raise FlenzrException("CAMPAIGN_CHANGED", "This campaign changed. Reload campaigns and review the invitation again.", 409)
        if not CampaignService.accepts_applications(campaign):
            raise DomainRuleViolation("CAMPAIGN_NOT_ACTIVE", "This campaign is not accepting new invitations")
        available = await db.scalar(select(Creator.id).join(User, Creator.user_id == User.id)
            .where(Creator.id == payload.creator_id, User.is_active.is_(True)))
        if available is None:
            raise EntityNotFoundError("Available creator", payload.creator_id)
        invitation = CampaignInvitation(campaign_id=campaign_id, creator_id=payload.creator_id,
            offered_rate_cents=payload.offered_rate_cents, message=payload.message, status=InvitationStatus.INVITED)
        db.add(invitation)
        try:
            await db.commit()
            await db.refresh(invitation)
            return invitation
        except IntegrityError:
            await db.rollback()
            existing = await CampaignService.existing_invitation(db, campaign_id, payload.creator_id)
            if existing:
                return CampaignService._invitation_retry(existing, payload)
            raise


    @staticmethod
    def _draft_values(payload):
        return payload.model_dump(exclude={"request_id", "expected_revision"}, exclude_unset=isinstance(payload, CampaignDraftUpdate))

    @staticmethod
    def _same_draft(campaign, values):
        def normalized(value):
            if isinstance(value, datetime):
                return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
            return value
        return all(normalized(getattr(campaign, key)) == normalized(value) for key, value in values.items())

    @staticmethod
    def _check_draft(campaign, organization_id):
        if campaign.organization_id != organization_id:
            raise PermissionDeniedError("Only the owning brand can edit this draft")
        if campaign.status != CampaignStatus.DRAFT:
            raise FlenzrException("CAMPAIGN_NOT_DRAFT", "This campaign is no longer a draft. Reload to see its current status.", 409)

    @staticmethod
    async def create_draft(db: AsyncSession, organization_id: str, payload: CampaignDraftCreate):
        await CampaignService.validate_parent(db, organization_id, payload.parent_campaign_id)
        draft_id = str(payload.request_id)
        values = CampaignService._draft_values(payload)
        existing = await CampaignService.get_by_id(db, draft_id)
        if existing is None:
            campaign = Campaign(id=draft_id, organization_id=organization_id, status=CampaignStatus.DRAFT, **values)
            db.add(campaign)
            try:
                await db.commit()
                await db.refresh(campaign)
                return campaign
            except IntegrityError:
                await db.rollback()
                existing = await CampaignService.get_by_id(db, draft_id)
                if existing is None:
                    raise
        CampaignService._check_draft(existing, organization_id)
        if CampaignService._same_draft(existing, values):
            return existing
        raise FlenzrException("DRAFT_ALREADY_SAVED", "This draft was already saved with different details. Reload the saved draft before editing it.", 409)

    @staticmethod
    async def update_draft(db: AsyncSession, organization_id: str, draft_id: str, payload: CampaignDraftUpdate):
        campaign = await CampaignService.get_by_id(db, draft_id)
        if campaign is None:
            raise EntityNotFoundError("Campaign", draft_id)
        CampaignService._check_draft(campaign, organization_id)
        values = CampaignService._draft_values(payload)
        if "parent_campaign_id" in values:
            await CampaignService.validate_parent(db, organization_id, values["parent_campaign_id"])
        if campaign.revision != payload.expected_revision:
            if campaign.revision == payload.expected_revision + 1 and CampaignService._same_draft(campaign, values):
                return campaign
            raise FlenzrException("DRAFT_CHANGED", "This draft changed in another session. Reload the saved draft before saving again.", 409)
        merged = {key: getattr(campaign, key) for key in CampaignDraftFields.model_fields}
        for key, value in merged.items():
            if isinstance(value, datetime) and value.tzinfo is None:
                merged[key] = value.replace(tzinfo=timezone.utc)
        try:
            CampaignDraftFields.model_validate({**merged, **values})
        except ValidationError:
            raise DomainRuleViolation("INVALID_DRAFT_DETAILS", "Check campaign details; the end date must be on or after the start date.")
        changed = await db.execute(update(Campaign).where(
            Campaign.id == draft_id, Campaign.organization_id == organization_id,
            Campaign.status == CampaignStatus.DRAFT, Campaign.revision == payload.expected_revision,
        ).values(**values, revision=Campaign.revision + 1, updated_at=datetime.now(timezone.utc))
          .execution_options(synchronize_session=False))
        if changed.rowcount != 1:
            await db.rollback()
            campaign = await CampaignService.get_by_id(db, draft_id)
            if campaign and campaign.organization_id == organization_id and campaign.status == CampaignStatus.DRAFT and campaign.revision == payload.expected_revision + 1 and CampaignService._same_draft(campaign, values):
                return campaign
            raise FlenzrException("DRAFT_CHANGED", "This draft changed in another session. Reload the saved draft before saving again.", 409)
        await db.commit()
        await db.refresh(campaign)
        return campaign


    @staticmethod
    async def transition(db: AsyncSession, organization_id: str, campaign_id: str, body: CampaignTransition):
        allowed = {
            "publish": ({CampaignStatus.DRAFT}, CampaignStatus.ACTIVE),
            "pause": ({CampaignStatus.ACTIVE}, CampaignStatus.PAUSED),
            "resume": ({CampaignStatus.PAUSED}, CampaignStatus.ACTIVE),
            "close": ({CampaignStatus.ACTIVE, CampaignStatus.PAUSED}, CampaignStatus.COMPLETED),
            "cancel": ({CampaignStatus.DRAFT, CampaignStatus.ACTIVE, CampaignStatus.PAUSED}, CampaignStatus.CANCELLED),
        }
        campaign = await CampaignService.get_by_id(db, campaign_id)
        if campaign is None:
            raise EntityNotFoundError("Campaign", campaign_id)
        if campaign.organization_id != organization_id:
            raise PermissionDeniedError("Only the owning brand can change this campaign")
        sources, target = allowed[body.action]
        if body.expected_status not in sources:
            raise FlenzrException("INVALID_CAMPAIGN_TRANSITION", "This action is not available from that campaign status.", 409)
        if campaign.revision == body.expected_revision + 1 and campaign.status == target:
            return campaign  # Safe retry of a completed action.
        if campaign.revision != body.expected_revision or campaign.status != body.expected_status:
            raise FlenzrException("CAMPAIGN_CHANGED", "This campaign changed in another session. Reload before confirming this action.", 409)
        if body.action in ("publish", "resume"):
            values = {key: getattr(campaign, key) for key in CampaignDraftFields.model_fields}
            for key, value in values.items():
                if isinstance(value, datetime) and value.tzinfo is None:
                    values[key] = value.replace(tzinfo=timezone.utc)
            try:
                CampaignPublishFields.model_validate(values)
            except ValidationError as error:
                details = [{"field": ".".join(map(str, item["loc"])), "message": item["msg"]} for item in error.errors()]
                raise FlenzrException("CAMPAIGN_NOT_READY", "Complete the brief, niche, deliverables and budget, and check the planned dates before publishing or resuming.", 422, details=details)
        changed = await db.execute(update(Campaign).where(
            Campaign.id == campaign_id, Campaign.organization_id == organization_id,
            Campaign.revision == body.expected_revision, Campaign.status == body.expected_status,
        ).values(status=target, revision=Campaign.revision + 1, updated_at=datetime.now(timezone.utc))
          .execution_options(synchronize_session=False))
        if changed.rowcount != 1:
            await db.rollback()
            current = await CampaignService.get_by_id(db, campaign_id)
            if current and current.organization_id == organization_id and current.revision == body.expected_revision + 1 and current.status == target:
                return current
            raise FlenzrException("CAMPAIGN_CHANGED", "This campaign changed in another session. Reload before confirming this action.", 409)
        await db.commit()
        await db.refresh(campaign)
        return campaign


    @staticmethod
    async def list_activity(db: AsyncSession, *, kind: str, organization_id=None, creator_id=None,
                            campaign_id=None, page=1, page_size=20, record_id=None):
        # Project only fields participants need; never serialize creator credentials or billing details.
        from app.domains.creators.models import Creator
        from app.domains.brands.models import Organization
        model = CampaignApplication if kind == "applications" else CampaignInvitation
        rate = model.proposed_rate_cents if kind == "applications" else model.offered_rate_cents
        message = model.pitch_message if kind == "applications" else model.message
        filters = []
        if organization_id is not None:
            filters.append(Campaign.organization_id == organization_id)
        elif creator_id is not None:
            filters.append(model.creator_id == creator_id)
        else:
            raise PermissionDeniedError("An account scope is required")
        if campaign_id is not None:
            filters.append(model.campaign_id == campaign_id)
        if record_id is not None:
            filters.append(model.id == record_id)
        base = select(model.id).join(Campaign, model.campaign_id == Campaign.id).where(*filters)
        total = await db.scalar(select(func.count()).select_from(base.subquery())) if record_id is None else None
        query = select(
            model.id, model.campaign_id, Campaign.title.label("campaign_title"),
            Campaign.status.label("campaign_status"), Campaign.revision.label("campaign_revision"),
            Campaign.end_date.label("campaign_end_date"), Organization.name.label("organization_name"),
            model.creator_id, Creator.display_name.label("creator_name"), Creator.handle.label("creator_handle"),
            Campaign.currency, rate.label("rate_cents"), message.label("message"), model.status,
            model.created_at, model.updated_at,
        ).join(Campaign, model.campaign_id == Campaign.id).join(Organization, Campaign.organization_id == Organization.id).join(
            Creator, model.creator_id == Creator.id,
        ).where(*filters).order_by(model.created_at.desc(), model.id.desc()).offset((page - 1) * page_size).limit(page_size)
        items = (await db.execute(query)).mappings().all()
        return {"items": items, "total": (total or 0) if record_id is None else len(items), "page": page, "page_size": page_size}


    @staticmethod
    async def get_activity(db: AsyncSession, *, kind, record_id, organization_id=None, creator_id=None):
        result = await CampaignService.list_activity(db, kind=kind, record_id=record_id,
                                                    organization_id=organization_id, creator_id=creator_id)
        if not result["items"]:
            raise EntityNotFoundError("Campaign activity", record_id)
        return dict(result["items"][0])

    @staticmethod
    async def respond_activity(db: AsyncSession, *, kind, record_id, body, organization_id=None, creator_id=None):
        # Scope is resolved by authenticated role-specific routes, never by payload IDs.
        if kind == "applications":
            allowed = {"accept", "reject"} if organization_id is not None else {"withdraw"}
            model, initial = CampaignApplication, ApplicationStatus.PENDING
            targets = {"accept": ApplicationStatus.ACCEPTED, "reject": ApplicationStatus.REJECTED,
                       "withdraw": ApplicationStatus.WITHDRAWN}
        else:
            allowed = {"accept", "decline"} if creator_id is not None and organization_id is None else set()
            model, initial = CampaignInvitation, InvitationStatus.INVITED
            targets = {"accept": InvitationStatus.ACCEPTED, "decline": InvitationStatus.DECLINED}
        if body.action not in allowed:
            raise PermissionDeniedError("This account cannot perform that response")
        scope = {"organization_id": organization_id, "creator_id": creator_id}
        item = await CampaignService.get_activity(db, kind=kind, record_id=record_id, **scope)
        campaign = (await db.execute(select(Campaign.id, Campaign.revision, Campaign.status, Campaign.end_date)
            .where(Campaign.id == item["campaign_id"]).with_for_update(of=Campaign))).one_or_none()
        if campaign is None:
            raise EntityNotFoundError("Campaign activity", record_id)
        # Serialize with publication/pause/close and other responses on PostgreSQL.
        current_status = await db.scalar(select(model.status).where(model.id == record_id))
        if kind == "applications" and body.action == "accept":
            application_revision = await db.scalar(select(CampaignApplication.negotiation_revision).where(CampaignApplication.id == record_id))
            if application_revision and getattr(body, "expected_application_revision", None) != application_revision:
                raise FlenzrException("OFFER_NEGOTIATION_CHANGED", "Review and accept the current terms on the Offer page.", 409)
        target = targets[body.action]
        if current_status == target:
            return await CampaignService.get_activity(db, kind=kind, record_id=record_id, **scope)
        if current_status != initial or campaign.revision != body.expected_campaign_revision:
            raise FlenzrException("CAMPAIGN_ACTIVITY_CHANGED", "This record or campaign changed. Reload the response before confirming again.", 409)
        if body.action == "accept" and not CampaignService.accepts_applications(campaign):
            raise FlenzrException("CAMPAIGN_NOT_OPEN", "This campaign is not open for acceptance. Reload to see its current status.", 409)
        guard = select(Campaign.id).where(Campaign.id == campaign.id, Campaign.revision == body.expected_campaign_revision)
        if body.action == "accept":
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            guard = guard.where(Campaign.status == CampaignStatus.ACTIVE, or_(Campaign.end_date.is_(None), Campaign.end_date >= today))
        changed = await db.execute(update(model).where(model.id == record_id, model.status == initial,
            model.campaign_id.in_(guard)).values(status=target, updated_at=datetime.now(timezone.utc)).execution_options(synchronize_session=False))
        if changed.rowcount != 1:
            await db.rollback()
            saved = await CampaignService.get_activity(db, kind=kind, record_id=record_id, **scope)
            if saved["status"] == target:
                return saved
            raise FlenzrException("CAMPAIGN_ACTIVITY_CHANGED", "This record or campaign changed. Reload the response before confirming again.", 409)
        await db.commit()
        return await CampaignService.get_activity(db, kind=kind, record_id=record_id, **scope)
