import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.notifications.models import Notification, NotificationEmail, now

MESSAGES = {
    'sent': ('New collaboration enquiry', 'A brand sent you a collaboration enquiry.'),
    'confirmation': ('Enquiry sent', 'Your collaboration enquiry was saved and sent to the creator.'),
    'accept': ('Enquiry accepted', 'The other participant accepted your collaboration enquiry.'),
    'decline': ('Enquiry declined', 'The other participant declined your collaboration enquiry.'),
    'counter': ('New budget proposal', 'The creator proposed a different budget for your enquiry.'),
    'withdraw': ('Enquiry withdrawn', 'The brand withdrew this collaboration enquiry.'),
}


async def record_notifications(db: AsyncSession, *, enquiry_id: str, revision: int,
                               action: str, creator_user_id: str, sender_id: str, actor_id: str):
    # Call only after a successful state transition, within its transaction.
    recipients = [(creator_user_id if actor_id == sender_id else sender_id, action)]
    if action == 'sent':
        recipients.append((sender_id, 'confirmation'))
    for user_id, kind in recipients:
        title, message = MESSAGES[kind]
        notification_id = str(uuid.uuid4())
        db.add(Notification(id=notification_id, user_id=user_id, enquiry_id=enquiry_id,
                            enquiry_revision=revision, kind=kind, title=title, message=message,
                            read_at=now() if kind == 'confirmation' else None))
        # Flush the FK parent before the outbox row (no ORM relationship needed).
        await db.flush()
        db.add(NotificationEmail(notification_id=notification_id))
