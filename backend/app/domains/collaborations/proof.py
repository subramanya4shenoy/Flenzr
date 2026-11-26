"""Creator-supplied final URLs, versioned separately from delivery previews."""
import hashlib
import json
from sqlalchemy import func, select
from app.domains.notifications.service import record_collaboration_notification
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from .agreements import stamp
from .current_agreement import current_agreement_filter, current_agreement_stmt
from .deliveries import DeliveryService
from .models import CollaborationAgreement, CollaborationCompletion, DeliverySubmission, DeliveryReview, PublishingProof, PublishingProofConfirmation


class PublishingProofService:
    @staticmethod
    async def target(db, collab):
        if collab.status not in ('agreed', 'completed'):
            return None
        row = (await db.execute(select(DeliverySubmission, DeliveryReview).join(DeliveryReview,
            DeliveryReview.delivery_id == DeliverySubmission.id).join(CollaborationAgreement,
            CollaborationAgreement.id == DeliverySubmission.agreement_id).where(
            DeliverySubmission.collaboration_id == collab.id, DeliverySubmission.version == collab.delivery_version,
            CollaborationAgreement.collaboration_id == collab.id, current_agreement_filter(), DeliveryReview.collaboration_id == collab.id,
            DeliveryReview.decision == 'approved'))).one_or_none()
        if row and collab.status == 'completed':
            final = await db.scalar(select(CollaborationCompletion.delivery_id).where(CollaborationCompletion.collaboration_id == collab.id))
            if row[0].id != final:
                return None
        return row

    @staticmethod
    async def latest(db, record_id):
        return await db.scalar(select(func.coalesce(func.max(PublishingProof.version), 0)).where(PublishingProof.collaboration_id == record_id))

    @staticmethod
    def project(row, delivery, confirmation=None):
        return dict(confirmation=PublishingProofService.confirmation_project(confirmation, row, delivery) if confirmation else None,
                    id=row.id, version=row.version, agreement_id=row.agreement_id, delivery_id=row.delivery_id,
                    delivery_version=delivery.version, review_id=row.review_id, notes=row.notes, links=row.links,
                    saved_at=stamp(row.created_at))

    @staticmethod
    async def workspace(db, user_id, record_id, page=1, page_size=10):
        collab = await DeliveryService.collaboration(db, user_id, record_id)
        target = await PublishingProofService.target(db, collab)
        latest = await PublishingProofService.latest(db, record_id)
        rows = (await db.execute(select(PublishingProof, DeliverySubmission, PublishingProofConfirmation).outerjoin(PublishingProofConfirmation,
            PublishingProofConfirmation.proof_id == PublishingProof.id).join(DeliverySubmission,
            DeliverySubmission.id == PublishingProof.delivery_id).where(PublishingProof.collaboration_id == record_id,
            PublishingProof.version <= latest).order_by(PublishingProof.version.desc())
            .offset((page-1)*page_size).limit(page_size))).all()
        latest_row = (await db.execute(select(PublishingProof, PublishingProofConfirmation).outerjoin(PublishingProofConfirmation,
            PublishingProofConfirmation.proof_id == PublishingProof.id).where(PublishingProof.collaboration_id == record_id,
            PublishingProof.version == latest))).one_or_none()
        can_confirm = user_id == collab.brand_user_id and bool(target and latest_row and not latest_row[1] and
            latest_row[0].delivery_id == target[0].id and latest_row[0].review_id == target[1].id)
        agreement = await db.scalar(current_agreement_stmt(record_id))
        return dict(current_agreement_id=agreement.id if agreement else None, can_confirm=can_confirm, can_publish=user_id == collab.creator_user_id and bool(target),
            eligible_delivery=DeliveryService.project(*target) if target else None,
            latest_proof_version=latest, items=[PublishingProofService.project(*row) for row in rows],
            total=latest, page=page, page_size=page_size)

    @staticmethod
    async def save(db, user_id, record_id, body):
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        if user_id != collab.creator_user_id:
            raise PermissionDeniedError('Only the saved creator can record publishing proof.')
        payload = body.model_dump(mode='json')
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        replay = await db.scalar(select(PublishingProof).where(PublishingProof.collaboration_id == record_id,
                                                               PublishingProof.request_id == str(body.request_id)))
        if replay:
            if replay.request_hash != fingerprint:
                raise FlenzrException(code='PROOF_REQUEST_REUSED', message='This proof request was already used for different details. Refresh publishing proof before saving again.', status_code=409)
            return PublishingProofService.project(replay, await db.get(DeliverySubmission, replay.delivery_id))
        target = await PublishingProofService.target(db, collab)
        if not target or target[0].id != str(body.delivery_id) or target[0].version != body.expected_delivery_version or target[1].id != str(body.review_id):
            raise FlenzrException(code='PROOF_REQUIRES_CURRENT_APPROVAL', message='The approved delivery changed or is unavailable. Refresh publishing proof and approve the latest delivery before recording final links.', status_code=409)
        latest = await PublishingProofService.latest(db, record_id)
        if latest != body.expected_latest_proof_version:
            raise FlenzrException(code='PROOF_VERSION_CHANGED', message='Another proof version was saved. Close the editor and refresh publishing proof before recording an update.', status_code=409)
        delivery, review = target
        row = PublishingProof(collaboration_id=record_id, agreement_id=delivery.agreement_id,
            delivery_id=delivery.id, review_id=review.id, creator_user_id=user_id, version=latest+1,
            notes=body.notes, links=payload['links'], request_id=str(body.request_id), request_hash=fingerprint)
        db.add(row)
        await record_collaboration_notification(db, collaboration=collab, actor_id=user_id,
            kind='proof_submitted', event_key=f'proof_submitted:{row.version}')
        await db.commit(); await db.refresh(row)
        return PublishingProofService.project(row, delivery)


    @staticmethod
    def confirmation_project(row, proof, delivery):
        return dict(id=row.id, proof_id=proof.id, proof_version=proof.version,
                    delivery_id=delivery.id, delivery_version=delivery.version, confirmed_at=stamp(row.created_at))

    @staticmethod
    async def confirm(db, user_id, record_id, proof_id, body):
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        if user_id != collab.brand_user_id:
            raise PermissionDeniedError('Only the saved brand/client can confirm publishing proof.')
        proof = await db.scalar(select(PublishingProof).where(PublishingProof.id == proof_id,
                                                              PublishingProof.collaboration_id == record_id))
        if not proof:
            raise EntityNotFoundError('Publishing proof', proof_id)
        fingerprint = hashlib.sha256(json.dumps(dict(proof_id=proof_id, **body.model_dump(mode='json')),
            sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        replay = await db.scalar(select(PublishingProofConfirmation).where(PublishingProofConfirmation.collaboration_id == record_id,
                                                                          PublishingProofConfirmation.request_id == str(body.request_id)))
        delivery = await db.get(DeliverySubmission, proof.delivery_id)
        if replay:
            if replay.request_hash != fingerprint:
                raise FlenzrException(code='PROOF_CONFIRMATION_REQUEST_REUSED', message='This confirmation request was already used for different details. Refresh publishing proof before confirming again.', status_code=409)
            return PublishingProofService.confirmation_project(replay, proof, delivery)
        target = await PublishingProofService.target(db, collab)
        latest = await PublishingProofService.latest(db, record_id)
        if not target or proof.delivery_id != target[0].id or proof.review_id != target[1].id or proof.version != latest or proof.version != body.expected_proof_version:
            raise FlenzrException(code='STALE_PROOF_CONFIRMATION', message='The proof or approved delivery changed. Refresh publishing proof and review the current links before confirming.', status_code=409)
        existing = await db.scalar(select(PublishingProofConfirmation.id).where(PublishingProofConfirmation.proof_id == proof.id))
        if existing:
            raise FlenzrException(code='PROOF_ALREADY_CONFIRMED', message='This proof version is already confirmed. Refresh publishing proof to see the saved confirmation.', status_code=409)
        row = PublishingProofConfirmation(collaboration_id=record_id, proof_id=proof.id, reviewer_user_id=user_id,
            request_id=str(body.request_id), request_hash=fingerprint)
        db.add(row)
        await record_collaboration_notification(db, collaboration=collab, actor_id=user_id,
            kind='proof_confirmed', event_key=f'proof_confirmed:{proof.version}')
        await db.commit(); await db.refresh(row)
        return PublishingProofService.confirmation_project(row, proof, delivery)
