"""Inspect, back up, and clear development application records.

Run from backend: DEBUG=false .venv/bin/python reset_test_data.py [--execute]
Supabase auth/storage and Alembic migration history are not modified.
"""
import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, func, select
from app.core.config import settings
from app.core.database import Base, engine
from app.main import app  # Register all application models.


async def main(execute: bool):
    if settings.ENVIRONMENT != "development":
        raise SystemExit("Reset is limited to the development environment.")
    tables = list(Base.metadata.sorted_tables)
    async with engine.begin() as conn:
        counts = {t.name: await conn.scalar(select(func.count()).select_from(t)) for t in tables}
        print(json.dumps({"before": counts}))
        if execute:
            backup = {}
            for table in tables:
                backup[table.name] = [dict(row) for row in (await conn.execute(select(table))).mappings()]
            path = Path('/private/tmp') / f"flenzr-test-data-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.json"
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as out:
                json.dump(backup, out, default=str)
            for table in reversed(tables):
                await conn.execute(delete(table))
            after = {t.name: await conn.scalar(select(func.count()).select_from(t)) for t in tables}
            assert not any(after.values()), after
            print(json.dumps({"backup": str(path), "after": after}))
    await engine.dispose()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    asyncio.run(main(parser.parse_args().execute))
