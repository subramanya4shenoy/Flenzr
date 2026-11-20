import hashlib
import json
from sqlalchemy import select, func
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from .agreements import stamp
from .models import Collaboration, CollaborationAgreement, DeliverySubmission, DeliveryReview, CollaborationCompletion
from .service import CollaborationService


class DeliveryService:
    @staticmethod
    async def collaboration(db, user_id, record_id, lock=False):
        stmt = select(Collaboration).where(Collaboration.id == record_id, CollaborationService.scope(user_id)).execution_options(populate_existing=True)
        if lock:
            stmt = stmt.with_for_update(of=Collaboration)
        collab = await db.scalar(stmt)
        if not collab:
            raise EntityNotFoundError('Collaboration', record_id)
        return collab

    @staticmethod
    def project(row, review=None):
        return dict(id=row.id, agreement_id=row.agreement_id, version=row.version, title=row.title,
                    notes=row.notes, links=row.links, submitted_at=stamp(row.created_at),
                    review=DeliveryService.review_project(review, row) if review else None)

    @staticmethod
    async def workspace(db, user_id, record_id, page=1, page_size=10):
        collab = await DeliveryService.collaboration(db, user_id, record_id)
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id))
        agreement_id = agreement.id if agreement else None
        rows = (await db.execute(select(DeliverySubmission, DeliveryReview).outerjoin(DeliveryReview,
            DeliveryReview.delivery_id == DeliverySubmission.id).where(DeliverySubmission.collaboration_id == record_id,
            DeliverySubmission.version <= collab.delivery_version).order_by(DeliverySubmission.version.desc())
            .offset((page - 1) * page_size).limit(page_size))).all()
        completion = await db.scalar(select(CollaborationCompletion).where(CollaborationCompletion.collaboration_id == record_id))
        latest = await db.scalar(select(DeliverySubmission).where(DeliverySubmission.collaboration_id == record_id,
                                                                 DeliverySubmission.version == collab.delivery_version))
        latest_review = await db.scalar(select(DeliveryReview).where(DeliveryReview.delivery_id == latest.id)) if latest else None
        allowance = await DeliveryService.revision_allowance(db, record_id, agreement)
        return dict(revision_allowance=allowance,
            can_request_revision=user_id == collab.brand_user_id and collab.status == 'agreed' and bool(agreement_id) and
                (allowance['remaining'] is None or allowance['remaining'] > 0),
            collaboration_status=collab.status,
            completion=DeliveryService.completion_project(completion, latest) if completion else None,
            can_complete=user_id == collab.brand_user_id and collab.status == 'agreed' and bool(latest_review and latest_review.decision == 'approved'),
            latest_version=collab.delivery_version, agreement_id=agreement_id,
            can_submit=user_id == collab.creator_user_id and collab.status == 'agreed' and bool(agreement_id),
            can_review=user_id == collab.brand_user_id and collab.status == 'agreed' and bool(agreement_id),
            items=[DeliveryService.project(row, review) for row, review in rows], total=collab.delivery_version, page=page, page_size=page_size)

    @staticmethod
    async def revision_allowance(db, record_id, agreement):
        if not agreement:
            return None
        used = await db.scalar(select(func.count(DeliveryReview.id)).join(DeliverySubmission,
            DeliveryReview.delivery_id == DeliverySubmission.id).where(DeliveryReview.collaboration_id == record_id,
            DeliverySubmission.agreement_id == agreement.id, DeliveryReview.decision == 'revisions_requested'))
        limit = agreement.snapshot['terms'].get('revision_limit')
        return dict(limit=limit, used=used, remaining=max(0, limit-used) if limit is not None else None)

    @staticmethod
    def review_project(review, delivery):
        return dict(id=review.id, delivery_id=delivery.id, version=delivery.version, decision=review.decision,
                    feedback=review.feedback, reviewed_at=stamp(review.created_at))

    @staticmethod
    async def submit(db, user_id, record_id, body):
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        if collab.creator_user_id != user_id:
            raise PermissionDeniedError('Only the saved creator can submit work for this collaboration.')
        payload = body.model_dump(mode='json')
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        existing = await db.scalar(select(DeliverySubmission).where(DeliverySubmission.collaboration_id == record_id,
                                                                   DeliverySubmission.request_id == str(body.request_id)))
        if existing:
            if existing.request_hash != fingerprint:
                raise FlenzrException(code='DELIVERY_REQUEST_REUSED', message='This submission request was already used for different details. Refresh deliveries before submitting again.', status_code=409)
            return DeliveryService.project(existing)
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id))
        if not agreement or collab.status != 'agreed' or str(body.agreement_id) != agreement.id:
            raise FlenzrException(code='DELIVERY_AGREEMENT_REQUIRED', message='Both participants must accept the same proposal before work can be submitted against its agreement.', status_code=409)
        if collab.delivery_version != body.expected_latest_version:
            raise FlenzrException(code='DELIVERY_VERSION_CHANGED', message='Another submission was saved. Refresh and review it before submitting a new version.', status_code=409)
        collab.delivery_version += 1
        row = DeliverySubmission(collaboration_id=record_id, agreement_id=agreement.id, creator_user_id=user_id,
            version=collab.delivery_version, title=body.title, notes=body.notes, links=payload['links'],
            request_id=str(body.request_id), request_hash=fingerprint)
        db.add(row)
        await db.commit(); await db.refresh(row)
        return DeliveryService.project(row)


    @staticmethod
    async def review(db, user_id, record_id, delivery_id, body):
        # Reviews and new submissions serialize on the same collaboration row.
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        if collab.brand_user_id != user_id:
            raise PermissionDeniedError('Only the saved brand/client can review this delivery.')
        delivery = await db.scalar(select(DeliverySubmission).where(DeliverySubmission.id == delivery_id,
                                                                   DeliverySubmission.collaboration_id == record_id))
        if not delivery:
            raise EntityNotFoundError('Delivery', delivery_id)
        fingerprint = hashlib.sha256(json.dumps(dict(delivery_id=delivery_id, **body.model_dump(mode='json')),
            sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        replay = await db.scalar(select(DeliveryReview).where(DeliveryReview.collaboration_id == record_id,
                                                             DeliveryReview.request_id == str(body.request_id)))
        if replay:
            if replay.request_hash != fingerprint:
                raise FlenzrException(code='REVIEW_REQUEST_REUSED', message='This review request was already used for different details. Refresh deliveries before reviewing again.', status_code=409)
            return DeliveryService.review_project(replay, delivery)
        if collab.status != 'agreed' or collab.delivery_version != body.expected_latest_version or delivery.version != collab.delivery_version:
            raise FlenzrException(code='STALE_DELIVERY_REVIEW', message='The delivery changed or is no longer open for review. Refresh and review the latest submitted version.', status_code=409)
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id))
        if not agreement or agreement.id != delivery.agreement_id:
            raise FlenzrException(code='DELIVERY_AGREEMENT_CHANGED', message='This delivery does not match the current saved agreement.', status_code=409)
        existing = await db.scalar(select(DeliveryReview).where(DeliveryReview.delivery_id == delivery_id))
        if existing:
            raise FlenzrException(code='DELIVERY_ALREADY_REVIEWED', message='A review decision is already saved for this version. Refresh to see it; further work must be submitted as a new version.', status_code=409)
        if body.action == 'request_revision':
            allowance = await DeliveryService.revision_allowance(db, record_id, agreement)
            if allowance['remaining'] is not None and allowance['remaining'] == 0:
                raise FlenzrException(code='REVISION_LIMIT_REACHED', message='The agreed revision allowance has been used. No additional revision request was saved. Review the agreed scope with your collaborator before requesting more work.', status_code=409)
        review = DeliveryReview(collaboration_id=record_id, delivery_id=delivery_id, reviewer_user_id=user_id,
            decision='approved' if body.action == 'approve' else 'revisions_requested', feedback=body.feedback,
            request_id=str(body.request_id), request_hash=fingerprint)
        db.add(review)
        await db.commit(); await db.refresh(review)
        return DeliveryService.review_project(review, delivery)


    @staticmethod
    def completion_project(row, delivery):
        return dict(id=row.id, agreement_id=row.agreement_id, delivery_id=row.delivery_id,
                    review_id=row.review_id, version=delivery.version, completed_at=stamp(row.created_at))

    @staticmethod
    async def complete(db, user_id, record_id, body):
        # Shares the submission/review lock: completion can never silently pin stale work.
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        if user_id != collab.brand_user_id:
            raise PermissionDeniedError('Only the saved brand/client can complete this collaboration.')
        fingerprint = hashlib.sha256(json.dumps(body.model_dump(mode='json'), sort_keys=True,
            ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        existing = await db.scalar(select(CollaborationCompletion).where(CollaborationCompletion.collaboration_id == record_id))
        if existing:
            if existing.request_id != str(body.request_id) or existing.request_hash != fingerprint:
                raise FlenzrException(code='COLLABORATION_ALREADY_COMPLETED', message='This collaboration is already complete. Refresh deliveries to see its final work.', status_code=409)
            delivery = await db.get(DeliverySubmission, existing.delivery_id)
            return DeliveryService.completion_project(existing, delivery)
        delivery = await db.scalar(select(DeliverySubmission).where(DeliverySubmission.collaboration_id == record_id,
            DeliverySubmission.id == str(body.delivery_id), DeliverySubmission.version == collab.delivery_version))
        review = await db.scalar(select(DeliveryReview).where(DeliveryReview.id == str(body.review_id),
            DeliveryReview.collaboration_id == record_id, DeliveryReview.delivery_id == str(body.delivery_id),
            DeliveryReview.decision == 'approved'))
        agreement = await db.scalar(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id))
        if collab.status != 'agreed' or collab.delivery_version != body.expected_latest_version or not delivery or not review or not agreement or delivery.agreement_id != agreement.id:
            raise FlenzrException(code='COMPLETION_REQUIRES_CURRENT_APPROVAL', message='Refresh deliveries and approve the latest submitted version before completing this collaboration.', status_code=409)
        row = CollaborationCompletion(collaboration_id=record_id, agreement_id=agreement.id,
            delivery_id=delivery.id, review_id=review.id, completed_by=user_id,
            request_id=str(body.request_id), request_hash=fingerprint)
        db.add(row)
        collab.status = 'completed'
        await db.commit(); await db.refresh(row)
        return DeliveryService.completion_project(row, delivery)
