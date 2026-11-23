"""Offer pages expose a public brief and strictly private per-creator negotiations."""
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
import hashlib
import json
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from app.domains.identity.models import User
from app.domains.creators.models import Creator
from app.domains.brands.models import Organization
from .models import Campaign, CampaignApplication, CampaignInvitation, CampaignStatus, ApplicationStatus, MarketingCampaign
from .services import CampaignService

router = APIRouter(prefix='/offers', tags=['Offers'])

class PublicOffer(BaseModel):
    id: str
    title: str
    brief: str
    brand_name: str
    deliverables: str | None
    niche: str | None
    budget_cents: int
    currency: str
    starts_at: datetime | None
    ends_at: datetime | None
    status: str
    visibility: str
    revision: int
    accepting: bool

class Application(BaseModel):
    id: str
    creator_name: str
    creator_handle: str
    creator_avatar_url: str | None = None
    amount_cents: int
    pitch: str | None
    status: str
    revision: int
    proposed_by: str
    history: list[dict]
    collaboration_id: str | None = None
    claimed: bool = False

class OfferWorkspace(PublicOffer):
    parent_campaign_id: str | None = None
    parent_campaign_title: str | None = None
    viewer_role: Literal['brand', 'creator']
    applications: list[Application]
    total_applications: int
    page: int
    invited: bool

class Negotiate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    action: Literal['counter', 'accept', 'reject', 'withdraw']
    request_id: UUID
    expected_revision: int = Field(ge=0)
    expected_offer_revision: int = Field(ge=1)
    amount_cents: int | None = Field(None, strict=True, ge=100, le=2_000_000_000)
    message: str = Field(default='', max_length=5000)

async def offer_row(db, offer_id):
    row = await db.scalar(select(Campaign).where(Campaign.id == offer_id).execution_options(populate_existing=True))
    if not row:
        raise EntityNotFoundError('Offer', offer_id)
    return row

async def access(db, offer, user):
    owner = await db.scalar(select(Organization.owner_id).where(Organization.id == offer.organization_id))
    if owner == user.id:
        return 'brand', None, False
    creator = await db.scalar(select(Creator.id).where(Creator.user_id == user.id))
    invitation = creator and await db.scalar(select(CampaignInvitation.id).where(CampaignInvitation.campaign_id == offer.id, CampaignInvitation.creator_id == creator))
    if not creator or offer.status == CampaignStatus.DRAFT or (offer.visibility == 'invited' and not invitation):
        raise EntityNotFoundError('Offer', offer.id)
    return 'creator', creator, bool(invitation)

async def document(db, row):
    brand = await db.scalar(select(Organization.name).where(Organization.id == row.organization_id))
    expired = row.end_date and row.end_date.date() < datetime.now(timezone.utc).date()
    return dict(id=row.id, title=row.title, brief=row.brief, brand_name=brand or 'Brand',
        deliverables=row.deliverable_summary, niche=row.target_niche, budget_cents=row.budget_total_cents,
        currency=row.currency, starts_at=row.start_date, ends_at=row.end_date,
        status='expired' if expired and row.status == CampaignStatus.ACTIVE else row.status.value,
        visibility=row.visibility, revision=row.revision, accepting=CampaignService.accepts_applications(row))

async def application_view(db, row):
    creator = (await db.execute(select(Creator.display_name, Creator.handle, User.avatar_url)
        .join(User, User.id == Creator.user_id).where(Creator.id == row.creator_id))).one()
    from app.domains.collaborations.models import Collaboration, CollaborationAgreement
    collaboration = await db.scalar(select(Collaboration.id).where(Collaboration.application_id == row.id))
    claimed = bool(collaboration and await db.scalar(select(CollaborationAgreement.id).where(CollaborationAgreement.collaboration_id == collaboration)))
    return dict(collaboration_id=collaboration, claimed=claimed, id=row.id, creator_name=creator.display_name, creator_handle=creator.handle, creator_avatar_url=creator.avatar_url,
        amount_cents=row.proposed_rate_cents, pitch=row.pitch_message, status=row.status.value,
        revision=row.negotiation_revision, proposed_by=row.negotiation_author,
        history=[{k:v for k,v in event.items() if k not in ('request_id','request_hash')} for event in row.negotiation_history])

@router.get('/{offer_id}/public', response_model=PublicOffer)
async def public_offer(offer_id: UUID, db: AsyncSession = Depends(get_db)):
    row = await offer_row(db, str(offer_id))
    if row.visibility != 'public' or row.status == CampaignStatus.DRAFT:
        raise EntityNotFoundError('Offer', str(offer_id))
    return await document(db, row)

@router.get('/{offer_id}', response_model=OfferWorkspace)
async def workspace(offer_id: UUID, page: int = Query(1, ge=1, le=10000), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await offer_row(db, str(offer_id))
    role, creator, invited = await access(db, row, user)
    query = select(CampaignApplication).where(CampaignApplication.campaign_id == row.id)
    if role == 'creator':
        query = query.where(CampaignApplication.creator_id == creator)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    records = (await db.scalars(query.order_by(CampaignApplication.created_at.desc(), CampaignApplication.id).offset((page-1)*20).limit(20))).all()
    parent = await db.scalar(select(MarketingCampaign).where(MarketingCampaign.id == row.parent_campaign_id,
        MarketingCampaign.organization_id == row.organization_id)) if role == 'brand' and row.parent_campaign_id else None
    return {**await document(db, row), 'parent_campaign_id': parent.id if parent else None,
        'parent_campaign_title': parent.title if parent else None, 'viewer_role':role,
        'applications':[await application_view(db, a) for a in records], 'total_applications':total, 'page':page, 'invited':invited}

@router.post('/{offer_id}/applications/{application_id}/negotiate', response_model=Application)
async def negotiate(offer_id: UUID, application_id: UUID, body: Negotiate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    offer = await CampaignService.get_by_id(db, str(offer_id), for_update=True)
    if not offer:
        raise EntityNotFoundError('Offer', str(offer_id))
    role, creator, _ = await access(db, offer, user)
    row = await db.scalar(select(CampaignApplication).where(CampaignApplication.id == str(application_id), CampaignApplication.campaign_id == offer.id).execution_options(populate_existing=True))
    if not row or (role == 'creator' and row.creator_id != creator):
        raise EntityNotFoundError('Application', str(application_id))
    digest = hashlib.sha256(json.dumps(body.model_dump(mode='json'), sort_keys=True).encode()).hexdigest()
    for event in row.negotiation_history:
        if event.get('request_id') == str(body.request_id) and event['author'] == role:
            if event['request_hash'] != digest:
                raise FlenzrException('REQUEST_CHANGED', 'This retry contains different terms. Reload the application.', 409)
            return await application_view(db, row)
    allowed = ('counter','accept','reject') if role == 'brand' else ('counter','accept','withdraw')
    if body.action not in allowed:
        raise PermissionDeniedError('This action is not available for your role')
    if row.status != ApplicationStatus.PENDING or row.negotiation_revision != body.expected_revision or offer.revision != body.expected_offer_revision:
        raise FlenzrException('OFFER_CHANGED', 'The Offer or application changed. Refresh before responding.', 409)
    if body.action in ('accept','counter') and not CampaignService.accepts_applications(offer):
        raise FlenzrException('OFFER_CLOSED', 'This Offer is not accepting selections or counter-offers.', 409)
    if body.action == 'accept' and row.negotiation_author == role:
        raise FlenzrException('OWN_TERMS', 'Wait for your collaborator to respond to your terms.', 409)
    if body.action == 'counter' and body.amount_cents is None:
        raise FlenzrException('QUOTE_REQUIRED', 'Enter your proposed amount.', 422)
    amount = body.amount_cents if body.action == 'counter' else row.proposed_rate_cents
    state = {'accept':ApplicationStatus.ACCEPTED,'reject':ApplicationStatus.REJECTED,'withdraw':ApplicationStatus.WITHDRAWN}.get(body.action, ApplicationStatus.PENDING)
    history = list(row.negotiation_history)
    if not history:
        history.append(dict(action='applied', author='creator', amount_cents=row.proposed_rate_cents, message=row.pitch_message or '', at=row.created_at.isoformat()))
    event = dict(action=body.action, author=role, amount_cents=amount, message=body.message, at=datetime.now(timezone.utc).isoformat(), request_id=str(body.request_id), request_hash=digest)
    changed = await db.execute(update(CampaignApplication).where(CampaignApplication.id == row.id, CampaignApplication.status == ApplicationStatus.PENDING,
        CampaignApplication.negotiation_revision == body.expected_revision).values(proposed_rate_cents=amount, status=state,
        negotiation_revision=row.negotiation_revision+1, negotiation_author=role,
        negotiation_history=[*history, event], updated_at=datetime.now(timezone.utc)).execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        await db.rollback()
        raise FlenzrException('OFFER_CHANGED', 'Someone responded already. Refresh before continuing.', 409)
    await db.commit()
    await db.refresh(row)
    return await application_view(db, row)
