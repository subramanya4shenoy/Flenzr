"""Read-only participant timeline derived from durable collaboration records."""
import base64
import binascii
import json
from datetime import datetime, timezone

from sqlalchemy import Integer, String, and_, case, cast, literal, or_, select, union_all
from app.core.exceptions import FlenzrException
from .agreements import stamp
from .models import (
    Collaboration, CollaborationAgreement, CollaborationCompletion, DeliveryReview,
    DeliverySubmission, ProposalAcceptance, ProposalRevision, PublishingProof,
    PublishingProofConfirmation, ScopeChange, ScopeDecision,
)
from .service import CollaborationService

RANKS = {0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100}


def encode_cursor(row):
    value = [stamp(row.occurred_at), row.sort_rank, row.event_id]
    return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')


def decode_cursor(value):
    try:
        decoded = json.loads(base64.b64decode(value + '=' * (-len(value) % 4), altchars=b'-_', validate=True))
        if not isinstance(decoded, list) or len(decoded) != 3:
            raise ValueError
        at, rank, event_id = decoded
        at = datetime.fromisoformat(at)
        if at.tzinfo is None or type(rank) is not int or rank not in RANKS or not isinstance(event_id, str) or not 1 <= len(event_id) <= 100:
            raise ValueError
        return at.astimezone(timezone.utc), rank, event_id
    except (ValueError, TypeError, binascii.Error, OverflowError):
        raise FlenzrException('INVALID_ACTIVITY_CURSOR', 'Refresh activity history to load a valid page.', 400) from None


def event_query(table, prefix, rank, kind, actor=None, version=None):
    return select(
        (literal(prefix + ':') + table.id).label('event_id'),
        table.created_at.label('occurred_at'), literal(rank).label('sort_rank'),
        (literal(kind) if isinstance(kind, str) else kind).label('kind'),
        (actor if actor is not None else cast(literal(None), String(36))).label('actor_id'),
        (version if version is not None else cast(literal(None), Integer)).label('version'),
    ).select_from(table)


class CollaborationActivity:
    @staticmethod
    async def read(db, user_id, record_id, limit=25, before=None):
        collab = await CollaborationService.read(db, user_id, record_id)
        cursor = decode_cursor(before) if before else None
        # Select only event identity, actor, time and version. Drafts, comments,
        # chat, private feedback, notes, terms, files and URLs never enter this query.
        feed = union_all(
            event_query(Collaboration, 'started', 0, 'collaboration_started').where(Collaboration.id == record_id),
            event_query(ProposalRevision, 'proposal', 10, 'proposal_sent', ProposalRevision.author_id, ProposalRevision.version)
                .where(ProposalRevision.collaboration_id == record_id),
            event_query(ProposalAcceptance, 'acceptance', 20, 'proposal_accepted', ProposalAcceptance.user_id, ProposalRevision.version)
                .join(ProposalRevision, ProposalRevision.id == ProposalAcceptance.proposal_id).where(ProposalRevision.collaboration_id == record_id),
            event_query(CollaborationAgreement, 'agreement', 30, 'agreement_confirmed', version=ProposalRevision.version)
                .join(ProposalRevision, ProposalRevision.id == CollaborationAgreement.proposal_id)
                .where(CollaborationAgreement.collaboration_id == record_id, ProposalRevision.collaboration_id == record_id),
            event_query(DeliverySubmission, 'delivery', 40, 'delivery_submitted', DeliverySubmission.creator_user_id, DeliverySubmission.version)
                .where(DeliverySubmission.collaboration_id == record_id),
            event_query(DeliveryReview, 'review', 50, case((DeliveryReview.decision == 'approved', 'delivery_approved'), else_='revision_requested'), DeliveryReview.reviewer_user_id, DeliverySubmission.version)
                .join(DeliverySubmission, DeliverySubmission.id == DeliveryReview.delivery_id)
                .where(DeliveryReview.collaboration_id == record_id, DeliverySubmission.collaboration_id == record_id),
            event_query(PublishingProof, 'proof', 60, 'proof_submitted', PublishingProof.creator_user_id, PublishingProof.version)
                .where(PublishingProof.collaboration_id == record_id),
            event_query(PublishingProofConfirmation, 'confirmation', 70, 'proof_confirmed', PublishingProofConfirmation.reviewer_user_id, PublishingProof.version)
                .join(PublishingProof, PublishingProof.id == PublishingProofConfirmation.proof_id)
                .where(PublishingProofConfirmation.collaboration_id == record_id, PublishingProof.collaboration_id == record_id),
            event_query(CollaborationCompletion, 'completion', 80, 'collaboration_completed', CollaborationCompletion.completed_by, DeliverySubmission.version)
                .join(DeliverySubmission, DeliverySubmission.id == CollaborationCompletion.delivery_id)
                .where(CollaborationCompletion.collaboration_id == record_id, DeliverySubmission.collaboration_id == record_id),
            event_query(ScopeChange, 'scope', 90, 'scope_proposed', ScopeChange.author_id, ScopeChange.version)
                .where(ScopeChange.collaboration_id == record_id),
            event_query(ScopeDecision, 'scope-decision', 100, case((ScopeDecision.action == 'accept', 'scope_accepted'),
                (ScopeDecision.action == 'decline', 'scope_declined'), else_='scope_withdrawn'), ScopeDecision.actor_id, ScopeChange.version)
                .join(ScopeChange, ScopeChange.id == ScopeDecision.scope_change_id)
                .where(ScopeDecision.collaboration_id == record_id, ScopeChange.collaboration_id == record_id),
        ).subquery()
        query = select(feed)
        if cursor:
            at, rank, event_id = cursor
            query = query.where(or_(feed.c.occurred_at < at,
                and_(feed.c.occurred_at == at, feed.c.sort_rank < rank),
                and_(feed.c.occurred_at == at, feed.c.sort_rank == rank, feed.c.event_id < event_id)))
        rows = (await db.execute(query.order_by(feed.c.occurred_at.desc(), feed.c.sort_rank.desc(), feed.c.event_id.desc()).limit(limit+1))).all()
        visible = rows[:limit]
        return dict(items=[CollaborationActivity.project(row, collab, user_id) for row in visible],
                    next_cursor=encode_cursor(visible[-1]) if len(rows) > limit else None, limit=limit)

    @staticmethod
    def project(row, collab, user_id):
        details = {
            'scope_proposed': (f'Scope change {row.version} proposed', 'The proposer approved updated terms and shared them for the other participant to review.', 'proposals'),
            'scope_accepted': (f'Scope change {row.version} accepted', 'Both participants agreed to a new immutable agreement revision.', 'proposals'),
            'scope_declined': (f'Scope change {row.version} declined', 'The current agreement remains unchanged.', 'proposals'),
            'scope_withdrawn': (f'Scope change {row.version} withdrawn', 'The proposer withdrew the request. The current agreement remains unchanged.', 'proposals'),
            'collaboration_started': ('Collaboration started', 'A shared workspace was created from an accepted source.', 'overview'),
            'proposal_sent': (f'Proposal v{row.version} sent', 'A proposal version was shared for review.', 'proposals'),
            'proposal_accepted': (f'Proposal v{row.version} accepted', 'Acceptance was recorded for this proposal version.', 'proposals'),
            'agreement_confirmed': ('Agreement confirmed', f'Both participants accepted proposal v{row.version}.', 'proposals'),
            'delivery_submitted': (f'Delivery v{row.version} submitted', 'Work was submitted for review.', 'deliveries'),
            'delivery_approved': (f'Delivery v{row.version} approved', 'The submitted version was approved.', 'deliveries'),
            'revision_requested': (f'Revision requested for delivery v{row.version}', 'A revision was requested for this delivery version.', 'deliveries'),
            'proof_submitted': (f'Publishing proof v{row.version} shared', 'Publishing proof was recorded for review.', 'proof'),
            'proof_confirmed': (f'Publishing proof v{row.version} confirmed', 'The publishing proof version was confirmed.', 'proof'),
            'collaboration_completed': ('Collaboration completed', f'Approved delivery v{row.version} was marked complete.', 'deliveries'),
        }
        role, name = None, 'Actor not recorded'
        if row.kind == 'agreement_confirmed':
            role, name = 'both', 'Both participants'
        elif row.actor_id == collab.brand_user_id:
            role, name = 'brand', collab.brand_name
        elif row.actor_id == collab.creator_user_id:
            role, name = 'creator', collab.creator_name
        title, description, section = details[row.kind]
        return dict(id=row.event_id, kind=row.kind, title=title, description=description,
            actor_role=role, actor_name=name, is_mine=row.actor_id == user_id,
            version=row.version, occurred_at=stamp(row.occurred_at), section=section)
