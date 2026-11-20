"""Private, append-only conversations with stable sequence cursors."""
import hashlib
import json
from sqlalchemy import select
from app.core.exceptions import FlenzrException
from .agreements import stamp
from .deliveries import DeliveryService
from .models import CollaborationMessage


class MessageService:
    @staticmethod
    def project(row, user_id):
        return dict(id=row.id, sequence=row.sequence, author_role=row.author_role,
                    is_mine=row.author_id == user_id, text=row.text, sent_at=stamp(row.created_at))

    @staticmethod
    async def list(db, user_id, record_id, before=None, limit=20):
        collab = await DeliveryService.collaboration(db, user_id, record_id)
        upper = min(before, collab.message_version + 1) if before is not None else collab.message_version + 1
        rows = (await db.scalars(select(CollaborationMessage).where(
            CollaborationMessage.collaboration_id == record_id, CollaborationMessage.sequence < upper)
            .order_by(CollaborationMessage.sequence.desc()).limit(limit))).all()
        rows.reverse()
        return dict(items=[MessageService.project(row, user_id) for row in rows], latest_sequence=collab.message_version,
                    next_before=rows[0].sequence if rows and rows[0].sequence > 1 else None, limit=limit)

    @staticmethod
    async def send(db, user_id, record_id, body):
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        payload = body.model_dump(mode='json')
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        existing = await db.scalar(select(CollaborationMessage).where(
            CollaborationMessage.collaboration_id == record_id, CollaborationMessage.author_id == user_id,
            CollaborationMessage.request_id == str(body.request_id)))
        if existing:
            if existing.request_hash != fingerprint:
                raise FlenzrException('MESSAGE_REQUEST_REUSED', 'This send request was already used for different text. Refresh messages to check the saved conversation.', 409)
            return MessageService.project(existing, user_id)
        collab.message_version += 1
        row = CollaborationMessage(collaboration_id=record_id, author_id=user_id,
            author_role='brand' if user_id == collab.brand_user_id else 'creator', sequence=collab.message_version,
            text=body.text, request_id=str(body.request_id), request_hash=fingerprint)
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return MessageService.project(row, user_id)
