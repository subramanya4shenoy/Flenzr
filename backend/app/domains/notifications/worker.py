"""Run separately: python -m app.domains.notifications.worker [--once]."""
import argparse
import asyncio
import os
import random
import uuid
from datetime import timedelta
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy import and_, or_, select, update
from app.core.config import settings
from app.domains.notifications.smtp import send_smtp, validate_smtp
from app.core.database import async_session_factory, engine
from app.domains.identity.models import User
from app.domains.notifications.models import Notification, NotificationEmail, now

MAX_ATTEMPTS = 5


def deliver(notification_id, recipient, title, message, enquiry_id):
    origin = settings.NOTIFICATION_APP_ORIGIN.rstrip('/')
    parsed = urlsplit(origin)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError('Invalid notification origin')
    mail = EmailMessage()
    mail['From'] = settings.NOTIFICATION_EMAIL_FROM
    mail['To'] = recipient
    mail['Subject'] = title + ' · Flenzr'
    mail['Message-ID'] = f'<notification-{notification_id}@flenzr.notifications>'
    mail.set_content(f'{message}\n\nOpen your enquiry:\n{origin}/dashboard/enquiries/{enquiry_id}\n\nSign in to your Flenzr account to view the details.\n')
    transport = settings.NOTIFICATION_EMAIL_TRANSPORT
    if transport == 'sink':
        root = Path(settings.NOTIFICATION_MAIL_SINK)
        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        # Deterministic filename makes retries idempotent in the development sink.
        destination = root / f'{notification_id}.eml'
        temporary = root / f'.{notification_id}-{uuid.uuid4()}.tmp'
        try:
            with temporary.open('xb') as output:
                os.chmod(temporary, 0o600)
                output.write(mail.as_bytes())
            os.replace(temporary, destination)
        finally:
            temporary.unlink(missing_ok=True)
    elif transport == 'smtp':
        send_smtp(mail)
    else:
        raise ValueError('Unsupported email transport')


async def process_one(factory=async_session_factory, send=deliver):
    timestamp = now()
    lease = str(uuid.uuid4())
    eligible = and_(NotificationEmail.attempts < MAX_ATTEMPTS,
        or_(and_(NotificationEmail.status == 'pending', NotificationEmail.next_attempt_at <= timestamp),
            and_(NotificationEmail.status == 'processing', NotificationEmail.locked_until <= timestamp)))
    async with factory() as db:
        row = await db.scalar(select(NotificationEmail).where(eligible)
                              .order_by(NotificationEmail.next_attempt_at, NotificationEmail.id)
                              .with_for_update(skip_locked=True).limit(1))
        if row is None:
            # Exhausted leases become terminal instead of staying processing forever.
            await db.execute(update(NotificationEmail).where(NotificationEmail.status == 'processing',
                NotificationEmail.locked_until <= timestamp, NotificationEmail.attempts >= MAX_ATTEMPTS)
                .values(status='failed', lock_token=None, locked_until=None, last_error='lease_expired'))
            await db.commit()
            return False
        result = await db.execute(update(NotificationEmail).where(NotificationEmail.id == row.id, eligible)
            .values(status='processing', lock_token=lease, locked_until=timestamp + timedelta(minutes=5),
                    attempts=NotificationEmail.attempts + 1), execution_options={'synchronize_session': False})
        if result.rowcount != 1:
            await db.rollback()
            return True
        delivery_id = row.id
        await db.refresh(row)
        attempt = row.attempts
        notification = await db.get(Notification, row.notification_id)
        user = await db.get(User, notification.user_id)
        data = (notification.id, user.email, notification.title, notification.message, notification.enquiry_id)
        active = user.is_active
        await db.commit()  # Release the queue lock before network/file I/O.
    status, error = 'delivered', None
    if not active:
        status = 'skipped'
    else:
        try:
            await asyncio.to_thread(send, *data)
        except Exception as exc:
            # Track a safe error category; never log SMTP responses or recipient data.
            error = type(exc).__name__[:80]
            status = 'failed' if attempt >= MAX_ATTEMPTS else 'pending'
    async with factory() as db:
        await db.execute(update(NotificationEmail).where(NotificationEmail.id == delivery_id,
            NotificationEmail.lock_token == lease).values(status=status, last_error=error,
            transport=settings.NOTIFICATION_EMAIL_TRANSPORT, lock_token=None, locked_until=None,
            sent_at=now() if status == 'delivered' else None,
            next_attempt_at=now() + timedelta(seconds=min(3600, 30 * 2 ** (attempt - 1)) + random.uniform(0, 5))))
        await db.commit()
    return True


async def run(once=False):
    # Fail before claiming outbox rows when provider configuration is invalid.
    if settings.NOTIFICATION_EMAIL_TRANSPORT == 'smtp':
        validate_smtp()
    elif settings.NOTIFICATION_EMAIL_TRANSPORT != 'sink':
        raise ValueError('Unsupported email transport')
    try:
        while True:
            try:
                processed = await process_one()
            except Exception:
                if once:
                    raise
                # A temporary database outage must not kill the worker.
                await asyncio.sleep(5)
                continue
            if once:
                return
            if not processed:
                await asyncio.sleep(5)
    finally:
        await engine.dispose()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    asyncio.run(run(parser.parse_args().once))
