"""Brand offer-level collaboration grouping and multi-influencer workflow summaries."""
from datetime import date, datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from app.core.exceptions import EntityNotFoundError
from app.domains.brands.models import Organization
from app.domains.campaigns.models import (
    ApplicationStatus, Campaign, CampaignApplication, CampaignInvitation, InvitationStatus,
)
from app.domains.creators.models import Creator
from .models import (
    Collaboration, CollaborationAgreement, CollaborationCompletion, CollaborationFeedback,
    CollaborationMessage, DeliveryReview, DeliverySubmission, ProposalAcceptance,
    ProposalRevision, PublishingProof, PublishingProofConfirmation,
)
from .schemas import CollaborationRead


class CollaborationGroupItem(BaseModel):
    kind: Literal['offer', 'collaboration']
    id: str
    title: str
    brand_name: str
    creator_name: str | None = None
    source_kind: Literal['offer', 'application', 'invitation', 'enquiry']
    creator_count: int = Field(ge=1)
    started_count: int = Field(ge=0)
    agreed_count: int = Field(ge=0)
    completed_count: int = Field(ge=0)
    status: Literal['discussion', 'agreed', 'completed']
    quoted_amount_cents: int | None = None
    currency: str
    requested_delivery_date: date | None = None
    updated_at: datetime


class CollaborationGroupPage(BaseModel):
    items: list[CollaborationGroupItem]
    total: int = Field(ge=0)
    page: int
    page_size: int


class OfferParticipantSummary(BaseModel):
    key: str
    creator_id: str
    creator_name: str
    creator_handle: str
    source_kind: Literal['application', 'invitation']
    source_id: str
    collaboration_id: str | None = None
    collaboration: CollaborationRead | None = None
    quoted_amount_cents: int | None = None
    currency: str
    proposal_status: Literal['not_started', 'no_proposal', 'in_discussion', 'awaiting_other', 'agreed']
    proposal_version: int = 0
    delivery_status: Literal['locked', 'awaiting_submission', 'awaiting_review', 'revisions_requested', 'approved', 'completed']
    delivery_version: int = 0
    proof_status: Literal['locked', 'awaiting_proof', 'awaiting_confirmation', 'confirmed']
    proof_version: int = 0
    feedback_status: Literal['locked', 'pending', 'partial', 'both_submitted']
    brand_feedback_submitted: bool = False
    creator_feedback_submitted: bool = False
    message_count: int = 0
    updated_at: datetime


class OfferCollaborationWorkspace(BaseModel):
    offer_id: str
    title: str
    brand_name: str
    brief: str
    deliverable: str
    budget_total_cents: int | None = None
    currency: str
    requested_delivery_date: date | None = None
    offer_status: str
    created_at: datetime
    updated_at: datetime
    participants: list[OfferParticipantSummary]


def _utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class CollaborationGroupService:
    @staticmethod
    async def list_groups(db, user_id: str, page: int = 1, page_size: int = 20):
        # 1. Load all collaborations this user participates in.
        collabs = (await db.scalars(
            select(Collaboration).where(
                or_(Collaboration.brand_user_id == user_id, Collaboration.creator_user_id == user_id)
            )
        )).all()

        # 2. Identify brand-owned organizations & offers so we can group brand offer collaborations
        #    and include accepted applicants/invitees who haven't started a collaboration yet.
        org_rows = (await db.execute(
            select(Organization.id, Organization.name).where(Organization.owner_id == user_id)
        )).all()
        org_map = {row.id: row.name for row in org_rows}

        offer_buckets: dict[str, dict] = {}
        app_to_campaign: dict[str, str] = {}
        inv_to_campaign: dict[str, str] = {}

        if org_map:
            campaigns = (await db.scalars(
                select(Campaign).where(Campaign.organization_id.in_(list(org_map)))
            )).all()
            campaign_map = {c.id: c for c in campaigns}

            if campaign_map:
                cid_list = list(campaign_map)
                accepted_apps = (await db.scalars(
                    select(CampaignApplication).where(
                        CampaignApplication.campaign_id.in_(cid_list),
                        CampaignApplication.status == ApplicationStatus.ACCEPTED,
                    )
                )).all()
                accepted_invs = (await db.scalars(
                    select(CampaignInvitation).where(
                        CampaignInvitation.campaign_id.in_(cid_list),
                        CampaignInvitation.status == InvitationStatus.ACCEPTED,
                    )
                )).all()

                # Also resolve any collaboration-linked apps/invs even if status drifted.
                brand_app_ids = [c.application_id for c in collabs if c.brand_user_id == user_id and c.application_id]
                brand_inv_ids = [c.invitation_id for c in collabs if c.brand_user_id == user_id and c.invitation_id]
                if brand_app_ids:
                    for row in (await db.execute(
                        select(CampaignApplication.id, CampaignApplication.campaign_id).where(CampaignApplication.id.in_(brand_app_ids))
                    )).all():
                        app_to_campaign[row.id] = row.campaign_id
                if brand_inv_ids:
                    for row in (await db.execute(
                        select(CampaignInvitation.id, CampaignInvitation.campaign_id).where(CampaignInvitation.id.in_(brand_inv_ids))
                    )).all():
                        inv_to_campaign[row.id] = row.campaign_id

                def bucket_for(cid: str):
                    if cid not in offer_buckets:
                        camp = campaign_map[cid]
                        offer_buckets[cid] = {
                            'campaign': camp,
                            'brand_name': org_map.get(camp.organization_id, 'Brand'),
                            'source_keys': set(),
                            'started': 0,
                            'agreed': 0,
                            'completed': 0,
                            'updated_at': _utc(camp.updated_at or camp.created_at),
                        }
                    return offer_buckets[cid]

                for app in accepted_apps:
                    app_to_campaign[app.id] = app.campaign_id
                    if app.campaign_id in campaign_map:
                        b = bucket_for(app.campaign_id)
                        b['source_keys'].add(('application', app.id))
                        b['updated_at'] = max(b['updated_at'], _utc(app.updated_at or app.created_at))

                for inv in accepted_invs:
                    inv_to_campaign[inv.id] = inv.campaign_id
                    if inv.campaign_id in campaign_map:
                        b = bucket_for(inv.campaign_id)
                        b['source_keys'].add(('invitation', inv.id))
                        b['updated_at'] = max(b['updated_at'], _utc(inv.updated_at or inv.created_at))

        grouped: list[CollaborationGroupItem] = []
        for c in collabs:
            # Brand offer collaborations merge into their offer bucket.
            if c.brand_user_id == user_id and c.enquiry_id is None:
                cid = app_to_campaign.get(c.application_id or '') or inv_to_campaign.get(c.invitation_id or '')
                if cid and cid in offer_buckets:
                    b = offer_buckets[cid]
                    key = ('application', c.application_id) if c.application_id else ('invitation', c.invitation_id)
                    b['source_keys'].add(key)
                    b['started'] += 1
                    if c.status in ('agreed', 'completed'):
                        b['agreed'] += 1
                    if c.status == 'completed':
                        b['completed'] += 1
                    b['updated_at'] = max(b['updated_at'], _utc(c.updated_at or c.created_at))
                    continue

            # Direct enquiries (brand or creator) and all creator collaborations stay 1 row each.
            grouped.append(CollaborationGroupItem(
                kind='collaboration',
                id=c.id,
                title=c.title,
                brand_name=c.brand_name,
                creator_name=c.creator_name,
                source_kind=c.source_kind,
                creator_count=1,
                started_count=1,
                agreed_count=1 if c.status in ('agreed', 'completed') else 0,
                completed_count=1 if c.status == 'completed' else 0,
                status=c.status,
                quoted_amount_cents=c.quoted_amount_cents,
                currency=c.currency,
                requested_delivery_date=c.requested_delivery_date,
                updated_at=_utc(c.updated_at or c.created_at),
            ))

        for cid, b in offer_buckets.items():
            total_creators = len(b['source_keys'])
            if total_creators == 0:
                continue
            camp: Campaign = b['campaign']
            if b['completed'] == total_creators:
                status: Literal['discussion', 'agreed', 'completed'] = 'completed'
            elif b['agreed'] > 0:
                status = 'agreed'
            else:
                status = 'discussion'
            grouped.append(CollaborationGroupItem(
                kind='offer',
                id=cid,
                title=camp.title,
                brand_name=b['brand_name'],
                creator_name=None,
                source_kind='offer',
                creator_count=total_creators,
                started_count=b['started'],
                agreed_count=b['agreed'],
                completed_count=b['completed'],
                status=status,
                quoted_amount_cents=camp.budget_total_cents,
                currency=camp.currency,
                requested_delivery_date=camp.end_date.date() if camp.end_date else None,
                updated_at=b['updated_at'],
            ))

        grouped.sort(key=lambda item: (item.updated_at, item.id), reverse=True)
        total = len(grouped)
        start = (page - 1) * page_size
        return CollaborationGroupPage(
            items=grouped[start:start + page_size],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def offer_workspace(db, user_id: str, offer_id: str) -> OfferCollaborationWorkspace:
        row = (await db.execute(
            select(Campaign, Organization.name.label('brand_name'))
            .join(Organization, Campaign.organization_id == Organization.id)
            .where(Campaign.id == offer_id, Organization.owner_id == user_id)
        )).one_or_none()
        if not row:
            raise EntityNotFoundError('Offer', offer_id)
        campaign: Campaign = row[0]
        brand_name: str = row.brand_name

        # Load all applications & invitations for this offer that are accepted OR already linked to a collaboration.
        all_apps = (await db.scalars(
            select(CampaignApplication).where(CampaignApplication.campaign_id == offer_id)
        )).all()
        all_invs = (await db.scalars(
            select(CampaignInvitation).where(CampaignInvitation.campaign_id == offer_id)
        )).all()

        app_ids = [a.id for a in all_apps]
        inv_ids = [i.id for i in all_invs]
        collabs: list[Collaboration] = []
        if app_ids or inv_ids:
            clauses = []
            if app_ids:
                clauses.append(Collaboration.application_id.in_(app_ids))
            if inv_ids:
                clauses.append(Collaboration.invitation_id.in_(inv_ids))
            collabs = (await db.scalars(
                select(Collaboration).where(Collaboration.brand_user_id == user_id, or_(*clauses))
            )).all()

        collab_by_app = {c.application_id: c for c in collabs if c.application_id}
        collab_by_inv = {c.invitation_id: c for c in collabs if c.invitation_id}

        sources: list[tuple[Literal['application', 'invitation'], object, Collaboration | None]] = []
        for app in all_apps:
            c = collab_by_app.get(app.id)
            if c is not None or app.status == ApplicationStatus.ACCEPTED:
                sources.append(('application', app, c))
        for inv in all_invs:
            c = collab_by_inv.get(inv.id)
            if c is not None or inv.status == InvitationStatus.ACCEPTED:
                sources.append(('invitation', inv, c))

        creator_ids = list({src.creator_id for _, src, _ in sources})
        creator_map: dict[str, tuple[str, str]] = {}
        if creator_ids:
            for cr in (await db.execute(
                select(Creator.id, Creator.display_name, Creator.handle).where(Creator.id.in_(creator_ids))
            )).all():
                creator_map[cr.id] = (cr.display_name, cr.handle)

        collab_ids = [c.id for _, _, c in sources if c is not None]
        agreements: dict[str, CollaborationAgreement] = {}
        latest_proposals: dict[str, ProposalRevision] = {}
        proposal_accepts: dict[str, set[str]] = {}
        latest_deliveries: dict[str, DeliverySubmission] = {}
        delivery_reviews: dict[str, DeliveryReview] = {}
        completions: set[str] = set()
        latest_proofs: dict[str, PublishingProof] = {}
        confirmed_proof_ids: set[str] = set()
        feedback_roles: dict[str, set[str]] = {}
        message_counts: dict[str, int] = {}

        if collab_ids:
            for ag in (await db.scalars(
                select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id.in_(collab_ids))
            )).all():
                agreements[ag.collaboration_id] = ag

            for pr in (await db.scalars(
                select(ProposalRevision)
                .where(ProposalRevision.collaboration_id.in_(collab_ids))
                .order_by(ProposalRevision.version.desc())
            )).all():
                latest_proposals.setdefault(pr.collaboration_id, pr)

            latest_pr_ids = [pr.id for pr in latest_proposals.values()]
            if latest_pr_ids:
                for acc in (await db.scalars(
                    select(ProposalAcceptance).where(ProposalAcceptance.proposal_id.in_(latest_pr_ids))
                )).all():
                    proposal_accepts.setdefault(acc.proposal_id, set()).add(acc.user_id)

            for d in (await db.scalars(
                select(DeliverySubmission)
                .where(DeliverySubmission.collaboration_id.in_(collab_ids))
                .order_by(DeliverySubmission.version.desc())
            )).all():
                latest_deliveries.setdefault(d.collaboration_id, d)

            latest_del_ids = [d.id for d in latest_deliveries.values()]
            if latest_del_ids:
                for rev in (await db.scalars(
                    select(DeliveryReview).where(DeliveryReview.delivery_id.in_(latest_del_ids))
                )).all():
                    delivery_reviews[rev.delivery_id] = rev

            for cid_comp in (await db.scalars(
                select(CollaborationCompletion.collaboration_id).where(
                    CollaborationCompletion.collaboration_id.in_(collab_ids)
                )
            )).all():
                completions.add(cid_comp)

            for pf in (await db.scalars(
                select(PublishingProof)
                .where(PublishingProof.collaboration_id.in_(collab_ids))
                .order_by(PublishingProof.version.desc())
            )).all():
                latest_proofs.setdefault(pf.collaboration_id, pf)

            latest_pf_ids = [pf.id for pf in latest_proofs.values()]
            if latest_pf_ids:
                for pid in (await db.scalars(
                    select(PublishingProofConfirmation.proof_id).where(
                        PublishingProofConfirmation.proof_id.in_(latest_pf_ids)
                    )
                )).all():
                    confirmed_proof_ids.add(pid)

            for fb in (await db.execute(
                select(CollaborationFeedback.collaboration_id, CollaborationFeedback.author_role)
                .where(CollaborationFeedback.collaboration_id.in_(collab_ids))
            )).all():
                feedback_roles.setdefault(fb.collaboration_id, set()).add(fb.author_role)

            for msg_row in (await db.execute(
                select(CollaborationMessage.collaboration_id, func.count(CollaborationMessage.id))
                .where(CollaborationMessage.collaboration_id.in_(collab_ids))
                .group_by(CollaborationMessage.collaboration_id)
            )).all():
                message_counts[msg_row[0]] = int(msg_row[1])

        participants: list[OfferParticipantSummary] = []
        for kind, src, c in sources:
            display_name, handle = creator_map.get(src.creator_id, (c.creator_name if c else 'Creator', ''))
            quote = (
                c.quoted_amount_cents if c is not None
                else (src.proposed_rate_cents if kind == 'application' else src.offered_rate_cents)
            )
            updated = _utc(c.updated_at or c.created_at) if c is not None else _utc(src.updated_at or src.created_at)

            if c is None:
                participants.append(OfferParticipantSummary(
                    key=f'{kind}:{src.id}',
                    creator_id=src.creator_id,
                    creator_name=display_name,
                    creator_handle=handle,
                    source_kind=kind,
                    source_id=src.id,
                    collaboration_id=None,
                    collaboration=None,
                    quoted_amount_cents=quote,
                    currency=campaign.currency,
                    proposal_status='not_started',
                    delivery_status='locked',
                    proof_status='locked',
                    feedback_status='locked',
                    updated_at=updated,
                ))
                continue

            has_agreement = c.id in agreements or c.status in ('agreed', 'completed')
            latest_pr = latest_proposals.get(c.id)
            if has_agreement:
                prop_status: Literal['not_started', 'no_proposal', 'in_discussion', 'awaiting_other', 'agreed'] = 'agreed'
            elif latest_pr is None:
                prop_status = 'no_proposal'
            elif len(proposal_accepts.get(latest_pr.id, set())) == 1:
                prop_status = 'awaiting_other'
            else:
                prop_status = 'in_discussion'

            latest_del = latest_deliveries.get(c.id)
            latest_rev = delivery_reviews.get(latest_del.id) if latest_del else None
            is_completed = c.id in completions or c.status == 'completed'
            if not has_agreement:
                del_status: Literal['locked', 'awaiting_submission', 'awaiting_review', 'revisions_requested', 'approved', 'completed'] = 'locked'
            elif is_completed:
                del_status = 'completed'
            elif latest_del is None:
                del_status = 'awaiting_submission'
            elif latest_rev is None:
                del_status = 'awaiting_review'
            elif latest_rev.decision == 'approved':
                del_status = 'approved'
            else:
                del_status = 'revisions_requested'

            latest_pf = latest_proofs.get(c.id)
            proof_eligible = is_completed or (latest_rev is not None and latest_rev.decision == 'approved')
            if not proof_eligible and latest_pf is None:
                pf_status: Literal['locked', 'awaiting_proof', 'awaiting_confirmation', 'confirmed'] = 'locked'
            elif latest_pf is None:
                pf_status = 'awaiting_proof'
            elif latest_pf.id in confirmed_proof_ids:
                pf_status = 'confirmed'
            else:
                pf_status = 'awaiting_confirmation'

            roles = feedback_roles.get(c.id, set())
            if not is_completed:
                fb_status: Literal['locked', 'pending', 'partial', 'both_submitted'] = 'locked'
            elif 'brand' in roles and 'creator' in roles:
                fb_status = 'both_submitted'
            elif roles:
                fb_status = 'partial'
            else:
                fb_status = 'pending'

            participants.append(OfferParticipantSummary(
                key=c.id,
                creator_id=src.creator_id,
                creator_name=display_name,
                creator_handle=handle,
                source_kind=kind,
                source_id=src.id,
                collaboration_id=c.id,
                collaboration=CollaborationRead.model_validate(c),
                quoted_amount_cents=quote,
                currency=c.currency,
                proposal_status=prop_status,
                proposal_version=latest_pr.version if latest_pr else 0,
                delivery_status=del_status,
                delivery_version=latest_del.version if latest_del else 0,
                proof_status=pf_status,
                proof_version=latest_pf.version if latest_pf else 0,
                feedback_status=fb_status,
                brand_feedback_submitted='brand' in roles,
                creator_feedback_submitted='creator' in roles,
                message_count=message_counts.get(c.id, 0),
                updated_at=updated,
            ))

        participants.sort(key=lambda p: (p.collaboration_id is None, -p.updated_at.timestamp(), p.creator_name.lower()))
        return OfferCollaborationWorkspace(
            offer_id=campaign.id,
            title=campaign.title,
            brand_name=brand_name,
            brief=campaign.brief,
            deliverable=campaign.deliverable_summary or 'To discuss',
            budget_total_cents=campaign.budget_total_cents,
            currency=campaign.currency,
            requested_delivery_date=campaign.end_date.date() if campaign.end_date else None,
            offer_status=campaign.status.value if hasattr(campaign.status, 'value') else str(campaign.status),
            created_at=_utc(campaign.created_at),
            updated_at=_utc(campaign.updated_at or campaign.created_at),
            participants=participants,
        )

