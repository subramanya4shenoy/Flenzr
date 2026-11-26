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


# Generic summaries deliberately omit proposal terms, delivery notes and URLs.
COLLABORATION_MESSAGES = {
    'scope_proposed': ('Scope change ready to review', 'Your collaborator proposed updated agreement terms.', 'proposal'),
    'scope_accepted': ('Scope change agreed', 'Both participants agreed to a new agreement revision. New scope needs a fresh delivery and review.', 'proposal'),
    'scope_declined': ('Scope change declined', 'Your collaborator declined the scope request. The current agreement is unchanged.', 'proposal'),
    'scope_withdrawn': ('Scope change withdrawn', 'Your collaborator withdrew the scope request. The current agreement is unchanged.', 'proposal'),
    'proposal_sent': ('Proposal ready to review', 'Your collaborator sent a proposal for review.', 'proposal'),
    'proposal_accepted': ('Proposal accepted', 'Your collaborator accepted the current proposal. Review the agreement status.', 'proposal'),
    'agreement_confirmed': ('Agreement confirmed', 'Both participants accepted the same proposal. Your agreement is ready.', 'proposal'),
    'delivery_submitted': ('Work ready for review', 'Your creator submitted a delivery for review.', 'deliveries'),
    'delivery_approved': ('Delivery approved', 'Your collaborator approved the submitted delivery.', 'deliveries'),
    'revision_requested': ('Revision requested', 'Your collaborator requested a revision to the submitted delivery.', 'deliveries'),
    'collaboration_completed': ('Collaboration completed', 'Your collaborator marked the approved work complete.', 'deliveries'),
    'proof_submitted': ('Publishing proof ready', 'Your creator shared publishing proof for review.', 'proof'),
    'proof_confirmed': ('Publishing proof confirmed', 'Your collaborator confirmed the publishing proof.', 'proof'),
}


def notification_href(row):
    if row.collaboration_id:
        tab = COLLABORATION_MESSAGES[row.kind][2]
        return f'/dashboard/collaborations/{row.collaboration_id}?view={tab}'
    return f'/dashboard/enquiries/{row.enquiry_id}'


async def record_collaboration_notification(db: AsyncSession, *, collaboration, actor_id: str,
                                           kind: str, event_key: str):
    """Called inside the locked successful transition, before its commit.

    Exact retries return before this hook; the database uniqueness constraint is
    the final deduplication boundary. These are in-app alerts, with no mail outbox.
    """
    if actor_id not in (collaboration.brand_user_id, collaboration.creator_user_id):
        raise ValueError('A saved collaboration participant is required')
    recipient = collaboration.creator_user_id if actor_id == collaboration.brand_user_id else collaboration.brand_user_id
    title, message, _ = COLLABORATION_MESSAGES[kind]
    db.add(Notification(user_id=recipient, collaboration_id=collaboration.id,
                        event_key=event_key, kind=kind, title=title, message=message))
    await db.flush()
