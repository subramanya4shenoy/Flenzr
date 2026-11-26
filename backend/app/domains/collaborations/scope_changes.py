"""Explicit two-party amendments; original agreement rows stay immutable."""
import copy
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import func, select
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from app.domains.notifications.service import record_collaboration_notification
from .agreements import stamp, snapshot_hash
from .current_agreement import current_agreement_stmt
from .deliveries import DeliveryService
from .models import (CollaborationAgreement, ScopeChange, ScopeDecision, DeliveryReview,
                     DeliverySubmission, PublishingProof, PublishingProofConfirmation)


def conflict(message):
    raise FlenzrException('SCOPE_CHANGED',message,409)


def fingerprint(body):
    return hashlib.sha256(json.dumps(body.model_dump(mode='json'),sort_keys=True,separators=(',',':')).encode()).hexdigest()


class ScopeChanges:
    @staticmethod
    async def work_state(db, collab):
        delivery=await db.scalar(select(DeliverySubmission).where(DeliverySubmission.collaboration_id==collab.id,
                                                                 DeliverySubmission.version==collab.delivery_version))
        review=await db.scalar(select(DeliveryReview.id).where(DeliveryReview.delivery_id==delivery.id)) if delivery else None
        proof=await db.scalar(select(PublishingProof).where(PublishingProof.collaboration_id==collab.id).order_by(PublishingProof.version.desc()).limit(1))
        confirmed=await db.scalar(select(PublishingProofConfirmation.id).where(PublishingProofConfirmation.proof_id==proof.id)) if proof else None
        return hashlib.sha256(json.dumps([collab.status,collab.delivery_version,review,proof.id if proof else None,confirmed],separators=(',',':')).encode()).hexdigest()

    @staticmethod
    async def pending(db, record_id):
        return await db.scalar(select(ScopeChange).outerjoin(ScopeDecision,ScopeDecision.scope_change_id==ScopeChange.id)
            .where(ScopeChange.collaboration_id==record_id,ScopeDecision.id.is_(None)))

    @staticmethod
    async def project(db, row, collab, user_id, agreement, work_state):
        decision=await db.scalar(select(ScopeDecision).where(ScopeDecision.scope_change_id==row.id))
        accepted=await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.scope_change_id==row.id)) if decision and decision.action=='accept' else None
        stale=not agreement or agreement.id!=row.base_agreement_id or work_state!=row.work_state_hash or collab.status!='agreed'
        date_valid=bool(row.terms.get('delivery_date') and row.terms['delivery_date']>=datetime.now(timezone.utc).date().isoformat())
        mine=row.author_id==user_id
        return dict(id=row.id,version=row.version,base_agreement_id=row.base_agreement_id,terms=row.terms,reason=row.reason,
            delivery_version=row.delivery_version,author_role='brand' if row.author_id==collab.brand_user_id else 'creator',is_mine=mine,
            proposed_at=stamp(row.created_at),decision=dict(action=decision.action,actor_role='brand' if decision.actor_id==collab.brand_user_id else 'creator',
                note=decision.note,decided_at=stamp(decision.created_at)) if decision else None,agreement=accepted,
            stale=stale if not decision else False,can_accept=not decision and not mine and not stale and date_valid,
            can_decline=not decision and not mine,can_withdraw=not decision and mine)

    @staticmethod
    async def workspace(db,user_id,record_id,page=1,page_size=10):
        collab=await DeliveryService.collaboration(db,user_id,record_id)
        agreement=await db.scalar(current_agreement_stmt(record_id))
        state=await ScopeChanges.work_state(db,collab)
        pending=await ScopeChanges.pending(db,record_id)
        rows=(await db.scalars(select(ScopeChange).where(ScopeChange.collaboration_id==record_id)
              .order_by(ScopeChange.version.desc()).offset((page-1)*page_size).limit(page_size))).all()
        return dict(current_agreement=agreement,work_state=state,can_propose=bool(agreement and collab.status=='agreed' and not pending),
            pending=await ScopeChanges.project(db,pending,collab,user_id,agreement,state) if pending else None,
            items=[await ScopeChanges.project(db,row,collab,user_id,agreement,state) for row in rows],
            total=await db.scalar(select(func.count()).select_from(ScopeChange).where(ScopeChange.collaboration_id==record_id)),page=page,page_size=page_size)

    @staticmethod
    async def create(db,user_id,record_id,body):
        collab=await DeliveryService.collaboration(db,user_id,record_id,lock=True)
        digest=fingerprint(body)
        existing=await db.scalar(select(ScopeChange).where(ScopeChange.collaboration_id==record_id,ScopeChange.author_id==user_id,ScopeChange.request_id==str(body.request_id)))
        current=await db.scalar(current_agreement_stmt(record_id))
        state=await ScopeChanges.work_state(db,collab)
        if existing:
            if existing.request_hash!=digest:conflict('This request was already used for different scope terms.')
            return await ScopeChanges.project(db,existing,collab,user_id,current,state)
        if not current or collab.status!='agreed':conflict('Scope changes require an open agreed collaboration. Completed work cannot be reopened.')
        if current.id!=str(body.expected_agreement_id) or state!=body.expected_work_state:conflict('The agreement or work changed. Refresh and review it before proposing updated scope.')
        if await ScopeChanges.pending(db,record_id):conflict('A scope request is already pending. Resolve or withdraw it before sending another.')
        terms=body.terms.model_dump(mode='json')
        if terms['currency']!=current.snapshot['terms']['currency']:
            raise FlenzrException('SCOPE_CURRENCY_LOCKED','The agreement currency cannot change.',422)
        if terms['amount_cents'] is None or len(terms['deliverables'])<5 or len(terms['usage_rights'])<5 or terms.get('revision_limit') is None or not terms.get('delivery_date') or terms['delivery_date']<datetime.now(timezone.utc).date().isoformat():
            raise FlenzrException('INCOMPLETE_SCOPE','Include a price, deliverables, revision allowance, usage rights and a delivery date today or later.',422)
        if terms==current.snapshot['terms']:raise FlenzrException('UNCHANGED_SCOPE','Change at least one agreement term before sending a scope request.',422)
        version=1+(await db.scalar(select(func.coalesce(func.max(ScopeChange.version),0)).where(ScopeChange.collaboration_id==record_id)))
        row=ScopeChange(collaboration_id=record_id,base_agreement_id=current.id,author_id=user_id,version=version,terms=terms,
            reason=body.reason,work_state_hash=state,delivery_version=collab.delivery_version,request_id=str(body.request_id),request_hash=digest)
        db.add(row);collab.updated_at=datetime.now(timezone.utc)
        await record_collaboration_notification(db,collaboration=collab,actor_id=user_id,kind='scope_proposed',event_key=f'scope_proposed:{version}')
        await db.commit();await db.refresh(row)
        return await ScopeChanges.project(db,row,collab,user_id,current,state)

    @staticmethod
    async def decide(db,user_id,record_id,change_id,body):
        collab=await DeliveryService.collaboration(db,user_id,record_id,lock=True)
        row=await db.scalar(select(ScopeChange).where(ScopeChange.id==change_id,ScopeChange.collaboration_id==record_id))
        if not row:raise EntityNotFoundError('Scope change',change_id)
        digest=fingerprint(body)
        replay=await db.scalar(select(ScopeDecision).where(ScopeDecision.collaboration_id==record_id,ScopeDecision.actor_id==user_id,ScopeDecision.request_id==str(body.request_id)))
        current=await db.scalar(current_agreement_stmt(record_id));state=await ScopeChanges.work_state(db,collab)
        if replay:
            if replay.request_hash!=digest or replay.scope_change_id!=row.id:conflict('This decision request was already used for another scope decision.')
            return await ScopeChanges.project(db,row,collab,user_id,current,state)
        if await db.scalar(select(ScopeDecision.id).where(ScopeDecision.scope_change_id==row.id)):conflict('This scope request already has a saved decision.')
        if (body.action=='withdraw')!=(row.author_id==user_id):
            raise PermissionDeniedError('Only the proposer can withdraw; only the other participant can accept or decline.')
        if body.action=='accept':
            if collab.status!='agreed' or not current or current.id!=row.base_agreement_id or state!=row.work_state_hash:conflict('The agreement or work changed after this request. Decline or withdraw it and review a fresh request.')
            if row.terms['delivery_date']<datetime.now(timezone.utc).date().isoformat():conflict('The proposed date has passed. Review a new scope request before accepting.')
        now=datetime.now(timezone.utc)
        decision=ScopeDecision(collaboration_id=record_id,scope_change_id=row.id,actor_id=user_id,action=body.action,note=body.note,
            request_id=str(body.request_id),request_hash=digest,created_at=now,updated_at=now)
        db.add(decision)
        if body.action=='accept':
            snapshot=copy.deepcopy(current.snapshot)
            snapshot.update(schema_version=2,terms=copy.deepcopy(row.terms),agreed_at=stamp(now),
                brand_accepted_at=stamp(row.created_at if row.author_id==collab.brand_user_id else now),
                creator_accepted_at=stamp(row.created_at if row.author_id==collab.creator_user_id else now),
                scope_change=dict(scope_change_id=row.id,scope_version=row.version,base_agreement_id=current.id,
                    base_snapshot_hash=current.snapshot_hash,reason=row.reason,proposed_at=stamp(row.created_at)))
            db.add(CollaborationAgreement(collaboration_id=record_id,proposal_id=None,scope_change_id=row.id,
                revision=current.revision+1,snapshot=snapshot,snapshot_hash=snapshot_hash(snapshot),created_at=now,updated_at=now))
        collab.updated_at=now
        kind={'accept':'scope_accepted','decline':'scope_declined','withdraw':'scope_withdrawn'}[body.action]
        await record_collaboration_notification(db,collaboration=collab,actor_id=user_id,kind=kind,event_key=f'scope_decision:{row.version}')
        await db.commit()
        current=await db.scalar(current_agreement_stmt(record_id))
        return await ScopeChanges.project(db,row,collab,user_id,current,await ScopeChanges.work_state(db,collab))
