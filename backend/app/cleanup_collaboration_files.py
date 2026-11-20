"""Run periodically: purge unattached drafts after all upload capabilities expire."""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from .core.database import async_session_factory, engine
from .domains.collaborations.models import Collaboration, CollaborationFile
from .domains.collaborations.storage import PrivateStorage


async def cleanup():
    removed = 0
    # Tokens can be reissued for 2h, live 2h; TUS sessions live up to 24h.
    # 48h is beyond both. Removal never deletes submitted version history.
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    async with async_session_factory() as db:
        ids = (await db.scalars(select(CollaborationFile.collaboration_id).where(
            CollaborationFile.delivery_id.is_(None), CollaborationFile.created_at < cutoff).distinct().limit(100))).all()
        for record_id in ids:
            await db.scalar(select(Collaboration).where(Collaboration.id == record_id).with_for_update())
            rows = (await db.scalars(select(CollaborationFile).where(CollaborationFile.collaboration_id == record_id,
                CollaborationFile.delivery_id.is_(None), CollaborationFile.created_at < cutoff).limit(100))).all()
            await PrivateStorage().remove([row.object_key for row in rows])
            for row in rows:
                await db.delete(row)
            await db.commit()
            removed += len(rows)
    return removed


async def main():
    print(f'Expired unattached files purged: {await cleanup()}')
    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
