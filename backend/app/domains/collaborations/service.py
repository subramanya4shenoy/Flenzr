from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import EntityNotFoundError, FlenzrException
from app.domains.brands.models import Organization
from app.domains.campaigns.models import Campaign, CampaignApplication, CampaignInvitation
from app.domains.creators.models import Creator
from app.domains.enquiries.models import Enquiry
from .models import Collaboration


class CollaborationService:
    @staticmethod
    def scope(user_id):
        return or_(Collaboration.brand_user_id == user_id, Collaboration.creator_user_id == user_id)

    @staticmethod
    async def read(db, user_id, record_id):
        row = await db.scalar(select(Collaboration).where(Collaboration.id == record_id, CollaborationService.scope(user_id)))
        if not row:
            raise EntityNotFoundError('Collaboration', record_id)
        return row

    @staticmethod
    async def list(db, user_id, page=1, page_size=20):
        scope = CollaborationService.scope(user_id)
        total = await db.scalar(select(func.count(Collaboration.id)).where(scope))
        items = (await db.scalars(select(Collaboration).where(scope).order_by(Collaboration.created_at.desc(), Collaboration.id)
                                 .offset((page - 1) * page_size).limit(page_size))).all()
        return {'items': items, 'total': total, 'page': page, 'page_size': page_size}

    @staticmethod
    async def create(db, user_id, body):
        source_id = str(body.source_id)
        model = {'application': CampaignApplication, 'invitation': CampaignInvitation, 'enquiry': Enquiry}[body.source_kind]
        # Serialize source conversion with response edits and other conversion requests.
        source = await db.scalar(select(model).where(model.id == source_id).with_for_update(of=model)
                                 .execution_options(populate_existing=True))
        if not source:
            raise EntityNotFoundError('Source', source_id)
        creator = (await db.execute(select(Creator.user_id, Creator.display_name).where(Creator.id == source.creator_id))).one_or_none()
        if not creator:
            raise EntityNotFoundError('Source', source_id)
        if body.source_kind == 'enquiry':
            brand_user_id = source.sender_id
            values = dict(title=source.deliverable, brand_name=source.brand_name, brief=source.brief,
                          deliverable=source.deliverable, quoted_amount_cents=source.amount_cents,
                          currency=source.currency, requested_delivery_date=source.preferred_delivery_date)
        else:
            campaign = (await db.execute(select(Campaign.title, Campaign.brief, Campaign.deliverable_summary, Campaign.currency,
                Campaign.end_date, Organization.owner_id, Organization.name).join(Organization, Campaign.organization_id == Organization.id)
                .where(Campaign.id == source.campaign_id))).one_or_none()
            if not campaign:
                raise EntityNotFoundError('Source', source_id)
            brand_user_id = campaign.owner_id
            values = dict(title=campaign.title, brand_name=campaign.name, brief=campaign.brief,
                          deliverable=campaign.deliverable_summary or 'To discuss', currency=campaign.currency,
                          requested_delivery_date=campaign.end_date.date() if campaign.end_date else None,
                          quoted_amount_cents=source.proposed_rate_cents if body.source_kind == 'application' else source.offered_rate_cents)
        if user_id not in (brand_user_id, creator.user_id):
            raise EntityNotFoundError('Source', source_id)
        field = getattr(Collaboration, body.source_kind + '_id')
        existing = await db.scalar(select(Collaboration).where(field == source_id))
        if existing:
            return existing
        state = source.status.value if hasattr(source.status, 'value') else source.status
        if state != 'accepted':
            raise FlenzrException(code='SOURCE_NOT_ACCEPTED', message='Accept this source before starting a collaboration.', status_code=409)
        if brand_user_id == creator.user_id:
            raise FlenzrException(code='SELF_COLLABORATION', message='A collaboration needs two different participants.', status_code=409)
        row = Collaboration(brand_user_id=brand_user_id, creator_user_id=creator.user_id,
                            creator_name=creator.display_name, **{body.source_kind + '_id': source_id}, **values)
        try:
            async with db.begin_nested():
                db.add(row)
                await db.flush()
        except IntegrityError:
            existing = await db.scalar(select(Collaboration).where(field == source_id))
            if not existing:
                raise
            return existing
        await db.commit()
        await db.refresh(row)
        return row
