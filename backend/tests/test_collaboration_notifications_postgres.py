"""Disposable PostgreSQL migration/privacy check; all DDL is rolled back."""
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
from app.core.database import Base


@pytest.mark.skipif(os.getenv('FLENZR_TEST_NOTIFICATION_POSTGRES') != '1', reason='Opt-in notification migration check')
@pytest.mark.asyncio
async def test_notification_target_migration_preserves_enquiries_constraints_and_private_access():
    schema, role = 'notification_test_'+uuid4().hex, 'notification_browser_'+uuid4().hex
    spec = importlib.util.spec_from_file_location('notification_migration', Path(__file__).parents[1]/'alembic/versions/0034_collaboration_notifications.py')
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                await connection.execute(text(f'CREATE SCHEMA {schema}'))
                await connection.execute(text(f'CREATE ROLE {role} NOLOGIN'))
                await connection.execute(text(f'SET LOCAL search_path TO {schema}, public'))
                for name in ('users', 'enquiries', 'collaborations'):
                    await connection.execute(text(f'CREATE TABLE {name} (id varchar(36) PRIMARY KEY)'))
                    await connection.execute(text(f"INSERT INTO {name} VALUES ('saved')"))
                await connection.execute(text('''CREATE TABLE notifications (
                    id varchar(36) PRIMARY KEY,user_id varchar(36) NOT NULL REFERENCES users,
                    enquiry_id varchar(36) NOT NULL REFERENCES enquiries,enquiry_revision integer NOT NULL,
                    kind varchar(32) NOT NULL,title varchar(160) NOT NULL,message varchar(300) NOT NULL,
                    read_at timestamptz,created_at timestamptz NOT NULL,
                    UNIQUE(user_id,enquiry_id,enquiry_revision))'''))
                await connection.execute(text("INSERT INTO notifications VALUES ('enquiry','saved','saved',1,'sent','Old title','Old message',NULL,now())"))
                await connection.execute(text('ALTER TABLE notifications ENABLE ROW LEVEL SECURITY'))
                def apply(sync, method):
                    with Operations.context(MigrationContext.configure(sync, opts={'target_metadata':Base.metadata})):
                        getattr(migration, method)()
                await connection.run_sync(lambda sync:apply(sync,'upgrade'))
                assert (await connection.execute(text('SELECT title,enquiry_revision FROM notifications'))).one() == ('Old title',1)
                assert await connection.scalar(text('SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(:target)'),{'target':schema+'.notifications'})
                await connection.execute(text("INSERT INTO notifications (id,user_id,collaboration_id,event_key,kind,title,message,created_at) VALUES ('collab','saved','saved','event','proposal_sent','New title','New message',now())"))
                for sql, state in [
                    ("INSERT INTO notifications SELECT 'duplicate',user_id,enquiry_id,enquiry_revision,kind,title,message,read_at,created_at,collaboration_id,event_key FROM notifications WHERE id='collab'",'23505'),
                    ("UPDATE notifications SET enquiry_id='saved',enquiry_revision=2 WHERE id='collab'",'23514'),
                    ("UPDATE notifications SET collaboration_id='missing' WHERE id='collab'",'23503')]:
                    savepoint=await connection.begin_nested()
                    with pytest.raises(DBAPIError) as error:
                        await connection.execute(text(sql))
                    assert error.value.orig.sqlstate == state
                    await savepoint.rollback()
                await connection.execute(text(f'GRANT USAGE ON SCHEMA {schema} TO {role}'))
                await connection.execute(text(f'GRANT SELECT,INSERT,UPDATE,DELETE ON notifications TO {role}'))
                await connection.execute(text(f'SET LOCAL ROLE {role}'))
                assert await connection.scalar(text('SELECT count(*) FROM notifications')) == 0
                assert (await connection.execute(text("UPDATE notifications SET read_at=now()"))).rowcount == 0
                savepoint=await connection.begin_nested()
                with pytest.raises(DBAPIError) as error:
                    await connection.execute(text("INSERT INTO notifications (id,user_id,collaboration_id,event_key,kind,title,message,created_at) VALUES ('forged','saved','saved','other','proposal_sent','Forged','Forged',now())"))
                assert error.value.orig.sqlstate == '42501'
                await savepoint.rollback()
                await connection.execute(text('RESET ROLE'))
                await connection.run_sync(lambda sync:apply(sync,'downgrade'))
                assert (await connection.execute(text('SELECT id,title FROM notifications'))).all() == [('enquiry','Old title')]
                await connection.run_sync(lambda sync:apply(sync,'upgrade'))
                assert await connection.scalar(text('SELECT count(*) FROM notifications')) == 1
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()
