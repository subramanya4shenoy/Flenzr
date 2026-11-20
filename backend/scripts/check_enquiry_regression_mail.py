"""Exercise email failure/retry only on the disposable P05 SQLite stack."""
import asyncio
from datetime import timedelta
from pathlib import Path
from sqlalchemy import select, update, func
from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.domains.notifications.models import Notification, NotificationEmail, now
from app.domains.notifications.worker import process_one


async def main():
    assert settings.DATABASE_URL == 'sqlite+aiosqlite:////tmp/flenzr-p05-regression.sqlite'
    assert settings.NOTIFICATION_EMAIL_TRANSPORT == 'sink'
    assert str(Path(settings.NOTIFICATION_MAIL_SINK)).startswith('/tmp/flenzr-p05-')
    def fail(*args):
        raise TimeoutError('Injected test failure, no provider contacted')
    assert await process_one(send=fail)
    while await process_one():
        pass
    async with async_session_factory() as db:
        pending = await db.scalar(select(NotificationEmail).where(NotificationEmail.status == 'pending'))
        assert pending.attempts == 1 and pending.last_error == 'TimeoutError'
        await db.execute(update(NotificationEmail).where(NotificationEmail.id == pending.id)
                         .values(next_attempt_at=now() - timedelta(seconds=1)))
        await db.commit()
    while await process_one():
        pass
    async with async_session_factory() as db:
        deliveries = (await db.scalars(select(NotificationEmail))).all()
        assert len(deliveries) == await db.scalar(select(func.count()).select_from(Notification))
        assert all(row.status == 'delivered' and row.transport == 'sink' for row in deliveries)
        assert max(row.attempts for row in deliveries) == 2
        assert all((Path(settings.NOTIFICATION_MAIL_SINK) / f'{row.notification_id}.eml').is_file() for row in deliveries)
        print(f'PASS {len(deliveries)} captured emails, one failed attempt recovered, no duplicate queue entries')
    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
