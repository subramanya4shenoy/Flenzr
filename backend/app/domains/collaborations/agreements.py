import copy
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.exceptions import EntityNotFoundError, FlenzrException
from .models import Collaboration, CollaborationAgreement, ProposalAcceptance, ProposalRevision
from .service import CollaborationService


def stamp(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value.tzinfo is None else value.astimezone(timezone.utc).isoformat()


def snapshot_hash(snapshot):
    return hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


class AgreementService:
    @staticmethod
    async def read(db, user_id, record_id):
        await CollaborationService.read(db, user_id, record_id)
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id))
        if not agreement:
            raise EntityNotFoundError('Agreement', record_id)
        return agreement

    @staticmethod
    async def state(db, user_id, collab):
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == collab.id))
        proposal = await db.scalar(select(ProposalRevision).where(ProposalRevision.collaboration_id == collab.id,
                                                                 ProposalRevision.version == collab.proposal_version))
        acceptance = None
        if proposal:
            rows = (await db.scalars(select(ProposalAcceptance).where(ProposalAcceptance.proposal_id == proposal.id))).all()
            dates = {row.user_id: stamp(row.created_at) for row in rows}
            you_accepted = user_id in dates
            acceptance = dict(proposal_id=proposal.id, version=proposal.version,
                brand_accepted_at=dates.get(collab.brand_user_id), creator_accepted_at=dates.get(collab.creator_user_id),
                you_accepted=you_accepted, can_accept=not agreement and not you_accepted and
                bool(proposal.terms.get('delivery_date') and proposal.terms['delivery_date'] >= datetime.now(timezone.utc).date().isoformat()))
        return dict(acceptance=acceptance, agreement=agreement, collaboration_status=collab.status)

    @staticmethod
    async def accept(db, user_id, record_id, body):
        # The same collaboration lock is used by proposal sends, so terms cannot change during acceptance.
        collab = await db.scalar(select(Collaboration).where(Collaboration.id == record_id,
            CollaborationService.scope(user_id)).with_for_update(of=Collaboration).execution_options(populate_existing=True))
        if not collab:
            raise EntityNotFoundError('Collaboration', record_id)
        proposal = await db.scalar(select(ProposalRevision).where(ProposalRevision.id == str(body.proposal_id),
            ProposalRevision.collaboration_id == record_id, ProposalRevision.version == body.expected_version))
        if not proposal or collab.proposal_version != body.expected_version:
            raise FlenzrException(code='STALE_ACCEPTANCE', message='The proposal changed. Refresh and review the latest version before accepting.', status_code=409)
        existing = await db.scalar(select(ProposalAcceptance).where(ProposalAcceptance.proposal_id == proposal.id,
                                                                   ProposalAcceptance.user_id == user_id))
        if existing:
            return await AgreementService.state(db, user_id, collab)
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id))
        if agreement or collab.status != 'discussion':
            raise FlenzrException(code='AGREEMENT_LOCKED', message='This collaboration already has an agreement.', status_code=409)
        if not proposal.terms.get('delivery_date') or proposal.terms['delivery_date'] < datetime.now(timezone.utc).date().isoformat():
            raise FlenzrException(code='PROPOSAL_DATE_PASSED', message='The proposed delivery date has passed. Send and review a revised proposal before accepting.', status_code=409)
        now = datetime.now(timezone.utc)
        db.add(ProposalAcceptance(proposal_id=proposal.id, user_id=user_id, created_at=now, updated_at=now))
        await db.flush()
        acceptances = (await db.scalars(select(ProposalAcceptance).where(ProposalAcceptance.proposal_id == proposal.id))).all()
        dates = {row.user_id: stamp(row.created_at) for row in acceptances}
        if collab.brand_user_id in dates and collab.creator_user_id in dates:
            snapshot = dict(schema_version=1, collaboration_id=collab.id, proposal_id=proposal.id,
                proposal_version=proposal.version, title=collab.title, brand_name=collab.brand_name, creator_name=collab.creator_name,
                source_kind=collab.source_kind, source_id=collab.source_id, terms=copy.deepcopy(proposal.terms),
                proposal_sent_at=stamp(proposal.created_at), brand_accepted_at=dates[collab.brand_user_id],
                creator_accepted_at=dates[collab.creator_user_id], agreed_at=stamp(now))
            db.add(CollaborationAgreement(collaboration_id=collab.id, proposal_id=proposal.id,
                snapshot=snapshot, snapshot_hash=snapshot_hash(snapshot), created_at=now, updated_at=now))
            collab.status = 'agreed'
        await db.commit()
        return await AgreementService.state(db, user_id, collab)
