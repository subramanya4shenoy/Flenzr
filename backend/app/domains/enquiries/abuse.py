"""Account-scoped submission guards; caller must hold the sender's user-row lock."""
import math
import unicodedata
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.exceptions import FlenzrException
from app.domains.enquiries.models import Enquiry

DAY = timedelta(days=1)
DAILY_LIMIT = 30


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def signature(brief, deliverable, amount, currency, delivery_date, rate_card_id):
    def text(value):
        return ' '.join(unicodedata.normalize('NFKC', value).casefold().split())
    return (text(brief), text(deliverable), amount, currency, delivery_date, rate_card_id)


async def enforce_submission_limits(db: AsyncSession, *, sender_id: str, creator_id: str,
                                    proposed: tuple, at: datetime):
    rows = (await db.scalars(select(Enquiry).where(
        Enquiry.sender_id == sender_id, Enquiry.created_at > at - DAY)
        .order_by(Enquiry.created_at.desc(), Enquiry.id.desc()).limit(DAILY_LIMIT))).all()
    blocked = []
    if len(rows) >= DAILY_LIMIT:
        blocked.append(('ENQUIRY_LIMIT', 'You have reached the limit of 30 new enquiries in 24 hours.', aware(rows[-1].created_at) + DAY))
    if rows and settings.ENQUIRY_SEND_COOLDOWN_SECONDS:
        until = aware(rows[0].created_at) + timedelta(seconds=settings.ENQUIRY_SEND_COOLDOWN_SECONDS)
        if until > at:
            blocked.append(('ENQUIRY_COOLDOWN', 'Please leave a short gap between new enquiries.', until))
    same_creator = [row for row in rows if row.creator_id == creator_id]
    if len(same_creator) >= settings.ENQUIRY_CREATOR_DAILY_LIMIT:
        # The Nth newest must expire before another request can be admitted.
        until = aware(same_creator[settings.ENQUIRY_CREATOR_DAILY_LIMIT - 1].created_at) + DAY
        blocked.append(('ENQUIRY_CREATOR_LIMIT', f'You can send up to {settings.ENQUIRY_CREATOR_DAILY_LIMIT} enquiries to this creator in 24 hours.', until))
    if settings.ENQUIRY_BLOCK_DUPLICATES:
        for row in same_creator:
            # A counter changes the current budget, not the original submission.
            sent = row.history[0] if row.history and row.history[0].get('action') == 'sent' else {}
            original_amount = sent.get('amount_cents', row.amount_cents)
            existing = signature(row.brief, row.deliverable, original_amount, row.currency,
                                 row.preferred_delivery_date, row.rate_card_id)
            if existing == proposed:
                blocked.append(('ENQUIRY_DUPLICATE', 'You already sent this enquiry. You can view it in Sent enquiries.', aware(row.created_at) + DAY))
                break
    if blocked:
        code, message, until = max(blocked, key=lambda item: item[2])
        seconds = max(1, math.ceil((until - at).total_seconds()))
        wait = f'{seconds}s' if seconds < 60 else (f'{math.ceil(seconds / 60)} minutes' if seconds < 3600 else f'{math.ceil(seconds / 3600)} hours')
        raise FlenzrException(code, message + f' Try again in {wait}.', 429,
            details=[{'retry_after_seconds': seconds, 'retry_at': until.isoformat()}],
            headers={'Retry-After': str(seconds), 'Cache-Control': 'no-store'})
