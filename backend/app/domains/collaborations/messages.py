"""Private, append-only conversations with stable sequence cursors, read receipts, reactions, and live presence."""
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from sqlalchemy import select
from app.core.exceptions import EntityNotFoundError, FlenzrException
from app.domains.brands.models import Organization
from app.domains.identity.models import User
from .agreements import stamp
from .deliveries import DeliveryService
from .models import CollaborationMessage, CollaborationMessageReaction, CollaborationMessageRead
from .realtime import chat_hub


async def _participant_avatars(db, brand_user_id: str, creator_user_id: str) -> tuple[str | None, str | None, datetime | None, datetime | None]:
    users = (await db.execute(
        select(User.id, User.avatar_url, User.last_seen_at).where(User.id.in_([brand_user_id, creator_user_id]))
    )).all()
    user_map = {u.id: (u.avatar_url, u.last_seen_at) for u in users}
    org_logo = await db.scalar(select(Organization.logo_url).where(Organization.owner_id == brand_user_id))
    brand_avatar = org_logo or (user_map.get(brand_user_id) or (None, None))[0]
    creator_avatar = (user_map.get(creator_user_id) or (None, None))[0]
    brand_seen = (user_map.get(brand_user_id) or (None, None))[1]
    creator_seen = (user_map.get(creator_user_id) or (None, None))[1]
    return brand_avatar, creator_avatar, brand_seen, creator_seen


def _project_reactions(reaction_rows, user_id: str) -> list[dict]:
    by_emoji: dict[str, dict] = {}
    for r in reaction_rows:
        entry = by_emoji.setdefault(r.emoji, {'emoji': r.emoji, 'count': 0, 'reacted_by_me': False})
        entry['count'] += 1
        if r.user_id == user_id:
            entry['reacted_by_me'] = True
    return list(by_emoji.values())


class MessageService:
    @staticmethod
    def project(row, user_id, reactions=None):
        return dict(
            id=row.id,
            sequence=row.sequence,
            author_role=row.author_role,
            is_mine=row.author_id == user_id,
            text=row.text,
            message_type=getattr(row, 'message_type', 'text') or 'text',
            reactions=reactions if reactions is not None else [],
            sent_at=stamp(row.created_at),
        )

    @staticmethod
    async def touch_last_seen(db, user_id: str) -> None:
        user = await db.scalar(select(User).where(User.id == user_id))
        if user:
            user.last_seen_at = datetime.now(timezone.utc)
            await db.commit()

    @staticmethod
    async def list(db, user_id, record_id, before=None, limit=20):
        collab = await DeliveryService.collaboration(db, user_id, record_id)
        upper = min(before, collab.message_version + 1) if before is not None else collab.message_version + 1
        rows = (await db.scalars(select(CollaborationMessage).where(
            CollaborationMessage.collaboration_id == record_id, CollaborationMessage.sequence < upper)
            .order_by(CollaborationMessage.sequence.desc()).limit(limit))).all()
        rows.reverse()

        reactions_by_msg: dict[str, list] = defaultdict(list)
        if rows:
            msg_ids = [r.id for r in rows]
            all_reactions = (await db.scalars(
                select(CollaborationMessageReaction).where(CollaborationMessageReaction.message_id.in_(msg_ids))
            )).all()
            for r in all_reactions:
                reactions_by_msg[r.message_id].append(r)

        read_rows = (await db.scalars(
            select(CollaborationMessageRead).where(CollaborationMessageRead.collaboration_id == record_id)
        )).all()
        read_map = {r.user_id: r.last_read_sequence for r in read_rows}

        is_brand = user_id == collab.brand_user_id
        peer_user_id = collab.creator_user_id if is_brand else collab.brand_user_id
        brand_avatar, creator_avatar, brand_seen, creator_seen = await _participant_avatars(
            db, collab.brand_user_id, collab.creator_user_id
        )
        peer_seen = creator_seen if is_brand else brand_seen

        meta = dict(
            peer_name=collab.creator_name if is_brand else collab.brand_name,
            peer_role='creator' if is_brand else 'brand',
            peer_avatar_url=creator_avatar if is_brand else brand_avatar,
            my_avatar_url=brand_avatar if is_brand else creator_avatar,
            peer_online=chat_hub.is_online(peer_user_id),
            peer_last_seen_at=stamp(peer_seen) if peer_seen else None,
            peer_last_read_sequence=read_map.get(peer_user_id, 0),
            my_last_read_sequence=read_map.get(user_id, 0),
        )

        return dict(
            items=[MessageService.project(row, user_id, _project_reactions(reactions_by_msg.get(row.id, []), user_id)) for row in rows],
            latest_sequence=collab.message_version,
            next_before=rows[0].sequence if rows and rows[0].sequence > 1 else None,
            limit=limit,
            meta=meta,
        )

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
        now = datetime.now(timezone.utc)
        row = CollaborationMessage(
            collaboration_id=record_id,
            author_id=user_id,
            author_role='brand' if user_id == collab.brand_user_id else 'creator',
            sequence=collab.message_version,
            text=body.text,
            message_type=body.message_type,
            request_id=str(body.request_id),
            request_hash=fingerprint,
        )
        db.add(row)
        # Sender has implicitly read up to their own message; also update last_seen_at.
        read_row = await db.scalar(select(CollaborationMessageRead).where(
            CollaborationMessageRead.collaboration_id == record_id, CollaborationMessageRead.user_id == user_id))
        if read_row:
            if collab.message_version > read_row.last_read_sequence:
                read_row.last_read_sequence = collab.message_version
                read_row.read_at = now
        else:
            db.add(CollaborationMessageRead(
                collaboration_id=record_id, user_id=user_id, last_read_sequence=collab.message_version, read_at=now
            ))
        sender = await db.scalar(select(User).where(User.id == user_id))
        if sender:
            sender.last_seen_at = now
        await db.commit()
        await db.refresh(row)

        projected_for_sender = MessageService.project(row, user_id)
        projected_for_peer = MessageService.project(row, '')
        chat_hub.publish(record_id, 'message', projected_for_peer, exclude_user_id=user_id)
        return projected_for_sender

    @staticmethod
    async def mark_read(db, user_id: str, record_id: str, last_read_sequence: int):
        collab = await DeliveryService.collaboration(db, user_id, record_id)
        clamped = min(last_read_sequence, collab.message_version)
        now = datetime.now(timezone.utc)
        row = await db.scalar(select(CollaborationMessageRead).where(
            CollaborationMessageRead.collaboration_id == record_id, CollaborationMessageRead.user_id == user_id))
        if row:
            if clamped > row.last_read_sequence:
                row.last_read_sequence = clamped
                row.read_at = now
        else:
            row = CollaborationMessageRead(
                collaboration_id=record_id, user_id=user_id, last_read_sequence=clamped, read_at=now
            )
            db.add(row)
        reader = await db.scalar(select(User).where(User.id == user_id))
        if reader:
            reader.last_seen_at = now
        await db.commit()
        chat_hub.publish(
            record_id,
            'read',
            {'user_id': user_id, 'last_read_sequence': row.last_read_sequence, 'read_at': stamp(row.read_at)},
            exclude_user_id=user_id,
        )
        return dict(last_read_sequence=row.last_read_sequence, read_at=stamp(row.read_at))

    @staticmethod
    async def toggle_reaction(db, user_id: str, record_id: str, message_id: str, emoji: str):
        await DeliveryService.collaboration(db, user_id, record_id)
        msg = await db.scalar(select(CollaborationMessage).where(
            CollaborationMessage.id == message_id, CollaborationMessage.collaboration_id == record_id))
        if not msg:
            raise EntityNotFoundError('Message', message_id)
        existing = await db.scalar(select(CollaborationMessageReaction).where(
            CollaborationMessageReaction.message_id == message_id,
            CollaborationMessageReaction.user_id == user_id,
            CollaborationMessageReaction.emoji == emoji,
        ))
        if existing:
            await db.delete(existing)
        else:
            db.add(CollaborationMessageReaction(
                message_id=message_id, collaboration_id=record_id, user_id=user_id, emoji=emoji
            ))
        await db.commit()
        all_rows = (await db.scalars(
            select(CollaborationMessageReaction).where(CollaborationMessageReaction.message_id == message_id)
        )).all()
        peer_reactions = _project_reactions(all_rows, '')
        my_reactions = _project_reactions(all_rows, user_id)
        chat_hub.publish(record_id, 'reaction', {'message_id': message_id, 'reactions': peer_reactions}, exclude_user_id=user_id)
        return my_reactions
