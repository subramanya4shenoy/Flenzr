"""One immutable, private review from each participant after completion."""
import hashlib
import json
from sqlalchemy import select
from app.core.exceptions import FlenzrException
from .agreements import stamp
from .deliveries import DeliveryService
from .models import CollaborationCompletion, CollaborationFeedback


class FeedbackService:
    @staticmethod
    def project(row, user_id):
        return dict(id=row.id, completion_id=row.completion_id, author_role=row.author_role,
                    is_mine=row.author_id == user_id, rating=row.rating, comment=row.comment,
                    submitted_at=stamp(row.created_at))

    @staticmethod
    async def workspace(db, user_id, record_id):
        collab = await DeliveryService.collaboration(db, user_id, record_id)
        completion = await db.scalar(select(CollaborationCompletion).where(CollaborationCompletion.collaboration_id == record_id))
        # Requiring both status and the receipt prevents fabricated completion eligibility.
        completed = collab.status == 'completed' and completion is not None
        rows = (await db.scalars(select(CollaborationFeedback).where(
            CollaborationFeedback.collaboration_id == record_id).order_by(CollaborationFeedback.author_role))).all() if completed else []
        is_brand = user_id == collab.brand_user_id
        return dict(collaboration_status=collab.status,
                    completion_id=completion.id if completed else None,
                    completed_at=stamp(completion.created_at) if completed else None,
                    can_submit=completed and collab.brand_user_id != collab.creator_user_id and not any(row.author_id == user_id for row in rows),
                    your_role='brand' if is_brand else 'creator', recipient_role='creator' if is_brand else 'brand',
                    recipient_name=collab.creator_name if is_brand else collab.brand_name,
                    visibility='participants_only', items=[FeedbackService.project(row, user_id) for row in rows])

    @staticmethod
    async def submit(db, user_id, record_id, body):
        # Serialize with completion and other participant writes. No duplicate review
        # can be inserted by competing tabs; exact retries return the same receipt.
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        is_brand = user_id == collab.brand_user_id
        recipient_id = collab.creator_user_id if is_brand else collab.brand_user_id
        if recipient_id == user_id:
            raise FlenzrException('FEEDBACK_SELF_REVIEW', 'You cannot leave feedback about yourself.', 409)
        fingerprint = hashlib.sha256(json.dumps(body.model_dump(mode='json'), sort_keys=True,
            ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        existing = await db.scalar(select(CollaborationFeedback).where(
            CollaborationFeedback.collaboration_id == record_id, CollaborationFeedback.author_id == user_id))
        if existing:
            if existing.request_id == str(body.request_id) and existing.request_hash == fingerprint:
                return FeedbackService.project(existing, user_id)
            raise FlenzrException('FEEDBACK_ALREADY_SUBMITTED', 'Your feedback is already saved. Refresh to see it; submitted feedback cannot be edited or replaced.', 409)
        completion = await db.scalar(select(CollaborationCompletion).where(CollaborationCompletion.collaboration_id == record_id))
        if collab.status != 'completed' or not completion or str(body.completion_id) != completion.id:
            raise FlenzrException('FEEDBACK_COMPLETION_REQUIRED', 'Complete the approved collaboration before leaving feedback. Refresh to check its current completion.', 409)
        row = CollaborationFeedback(collaboration_id=record_id, completion_id=completion.id,
            author_id=user_id, recipient_id=recipient_id, author_role='brand' if is_brand else 'creator',
            rating=body.rating, comment=body.comment, request_id=str(body.request_id), request_hash=fingerprint)
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return FeedbackService.project(row, user_id)
