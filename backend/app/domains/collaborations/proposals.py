import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.exceptions import EntityNotFoundError, FlenzrException
from .models import Collaboration, ProposalDraft, ProposalRevision
from .service import CollaborationService


def conflict(message):
    raise FlenzrException(code='PROPOSAL_CONFLICT', message=message, status_code=409)


class ProposalService:
    @staticmethod
    async def collaboration(db, user_id, record_id, lock=False):
        stmt = select(Collaboration).where(Collaboration.id == record_id, CollaborationService.scope(user_id)).execution_options(populate_existing=True)
        if lock:
            stmt = stmt.with_for_update(of=Collaboration)
        row = await db.scalar(stmt)
        if not row:
            raise EntityNotFoundError('Collaboration', record_id)
        return row

    @staticmethod
    async def own_draft(db, user_id, record_id):
        return await db.scalar(select(ProposalDraft).where(ProposalDraft.collaboration_id == record_id,
                              ProposalDraft.author_id == user_id).execution_options(populate_existing=True))

    @staticmethod
    def project(row, collab, user_id):
        return dict(id=row.id, version=row.version, author_role='brand' if row.author_id == collab.brand_user_id else 'creator',
                    is_mine=row.author_id == user_id, terms=row.terms, created_at=row.created_at)

    @staticmethod
    async def workspace(db, user_id, record_id, page=1, page_size=10):
        collab = await ProposalService.collaboration(db, user_id, record_id)
        # Bound history to the version observed with the collaboration, even during a concurrent send.
        rows = (await db.scalars(select(ProposalRevision).where(ProposalRevision.collaboration_id == record_id,
            ProposalRevision.version <= collab.proposal_version).order_by(ProposalRevision.version.desc())
            .offset((page - 1) * page_size).limit(page_size))).all()
        from .agreements import AgreementService
        agreement_state = await AgreementService.state(db, user_id, collab)
        return dict(**agreement_state, latest_version=collab.proposal_version, draft=await ProposalService.own_draft(db, user_id, record_id),
                    items=[ProposalService.project(row, collab, user_id) for row in rows], total=collab.proposal_version,
                    page=page, page_size=page_size)

    @staticmethod
    async def save(db, user_id, record_id, body):
        collab = await ProposalService.collaboration(db, user_id, record_id, lock=True)
        if collab.status != 'discussion':
            conflict('The agreement is saved. Proposal editing is closed for this collaboration.')
        draft = await ProposalService.own_draft(db, user_id, record_id)
        terms = body.terms.model_dump(mode='json')
        # Currency is locked to the brand's original offer / enquiry currency.
        if collab.currency in ('INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD'):
            terms['currency'] = collab.currency
        if draft and draft.revision == body.expected_revision + 1 and draft.base_version == body.expected_latest_version and draft.terms == terms:
            return draft  # An identical retry after an ambiguous response is safe.
        if collab.proposal_version != body.expected_latest_version:
            conflict('A new proposal was sent. Refresh and review it before saving your draft.')
        if (draft.revision if draft else 0) != body.expected_revision:
            conflict('Your draft changed in another tab. Reload the saved draft before editing.')
        if draft:
            draft.terms = terms; draft.revision += 1; draft.base_version = collab.proposal_version
        else:
            draft = ProposalDraft(collaboration_id=record_id, author_id=user_id, terms=terms, base_version=collab.proposal_version)
            db.add(draft)
        await db.commit(); await db.refresh(draft)
        return draft

    @staticmethod
    async def send(db, user_id, record_id, body):
        collab = await ProposalService.collaboration(db, user_id, record_id, lock=True)
        fingerprint = hashlib.sha256(json.dumps(body.model_dump(mode='json'), sort_keys=True).encode()).hexdigest()
        existing = await db.scalar(select(ProposalRevision).where(ProposalRevision.collaboration_id == record_id,
            ProposalRevision.author_id == user_id, ProposalRevision.request_id == str(body.request_id)))
        if existing:
            if existing.request_hash != fingerprint:
                conflict('This send request was already used for different proposal details. Refresh before retrying.')
            return ProposalService.project(existing, collab, user_id)
        if collab.status != 'discussion':
            conflict('The agreement is saved. New proposals cannot change its terms.')
        draft = await ProposalService.own_draft(db, user_id, record_id)
        if not draft or draft.revision != body.expected_draft_revision:
            conflict('Your saved draft changed. Reload and review it before sending.')
        if collab.proposal_version != body.expected_latest_version or draft.base_version != collab.proposal_version:
            conflict('A new proposal was sent. Review it and save your revised draft before sending.')
        terms = draft.terms
        today = datetime.now(timezone.utc).date().isoformat()
        if terms['amount_cents'] is None or len(terms['deliverables']) < 5 or len(terms['usage_rights']) < 5 or not terms['delivery_date'] or terms['delivery_date'] < today:
            raise FlenzrException(code='INCOMPLETE_PROPOSAL', message='Add a price, deliverables, usage rights and a delivery date today or later before sending.', status_code=422)
        collab.proposal_version += 1
        row = ProposalRevision(collaboration_id=record_id, author_id=user_id, version=collab.proposal_version,
                               request_id=str(body.request_id), request_hash=fingerprint, terms=dict(terms))
        db.add(row); await db.delete(draft)
        await db.commit(); await db.refresh(row)
        return ProposalService.project(row, collab, user_id)
