"""Run only against a disposable PostgreSQL cluster; all test DDL is rolled back."""
import importlib.util
import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


@pytest.mark.skipif(os.getenv('FLENZR_TEST_CHAT_PRIVACY_POSTGRES') != '1', reason='Opt-in PostgreSQL privacy check')
@pytest.mark.asyncio
async def test_chat_and_comment_migration_denies_browser_reads_and_writes():
    assert 'postgresql' in settings.DATABASE_URL
    path = Path(__file__).parents[1] / 'alembic/versions/0033_private_chat_and_comments.py'
    spec = importlib.util.spec_from_file_location('private_chat_migration', path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    schema = 'chat_privacy_' + uuid4().hex
    role = 'chat_browser_' + uuid4().hex
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                await connection.execute(text(f'CREATE SCHEMA {schema}'))
                await connection.execute(text(f'CREATE ROLE {role} NOLOGIN'))
                await connection.execute(text(f'SET LOCAL search_path TO {schema}, public'))
                for table in migration.TABLES:
                    await connection.execute(text(f'CREATE TABLE {table} (id integer PRIMARY KEY, body text)'))
                    await connection.execute(text(f"INSERT INTO {table} VALUES (1, 'private')"))
                await connection.execute(text(f'GRANT USAGE ON SCHEMA {schema} TO {role}'))
                await connection.execute(text(f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA {schema} TO {role}'))

                def upgrade(sync_connection):
                    with Operations.context(MigrationContext.configure(sync_connection)):
                        migration.upgrade()
                await connection.run_sync(upgrade)
                await connection.execute(text(f'SET LOCAL ROLE {role}'))
                for table in migration.TABLES:
                    assert (await connection.execute(text(f'SELECT count(*) FROM {table}'))).scalar_one() == 0
                    assert (await connection.execute(text(f"UPDATE {table} SET body = 'forged'"))).rowcount == 0
                    assert (await connection.execute(text(f'DELETE FROM {table}'))).rowcount == 0
                    savepoint = await connection.begin_nested()
                    with pytest.raises(DBAPIError, match='row-level security'):
                        await connection.execute(text(f"INSERT INTO {table} VALUES (2, 'forged')"))
                    await savepoint.rollback()
                await connection.execute(text('RESET ROLE'))
                for table in migration.TABLES:
                    assert (await connection.execute(text(f'SELECT body FROM {table}'))).scalar_one() == 'private'
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()
