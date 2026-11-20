"""Opt-in native shortlist concurrency and direct database privacy checks."""
import asyncio,os,uuid
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession,create_async_engine
from app.core.config import settings
from app.core.exceptions import FlenzrException
from app.domains.identity.models import User
from app.domains.brands.models import Organization
from app.domains.creators.models import Creator
from app.domains.shortlists.schemas import ShortlistCreate
from app.domains.shortlists.service import ShortlistService

@pytest.mark.skipif(os.getenv('FLENZR_TEST_SHORTLIST_POSTGRES')!='1',reason='Opt-in native PostgreSQL shortlist check')
@pytest.mark.asyncio
async def test_shortlist_database_privacy_concurrent_create_save_and_delete():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_shortlist_test_'+uuid.uuid4().hex
    async def call(callback):
        async with engine.connect() as connection:
            await connection.execute(text(f'SET search_path TO {schema}, public'));await connection.commit()
            async with AsyncSession(bind=connection,expire_on_commit=False) as db:return await callback(db)
    try:
        async with engine.begin() as connection:
            flags=(await connection.execute(text("SELECT relrowsecurity FROM pg_class WHERE oid IN ('public.brand_shortlists'::regclass,'public.brand_shortlist_members'::regclass)"))).scalars().all()
            assert len(flags)==2 and all(flags)
            policies=(await connection.execute(text("SELECT permissive,qual,with_check FROM pg_policies WHERE schemaname='public' AND policyname='flenzr_shortlists_api_only'"))).all()
            assert len(policies)==2 and all(row.permissive=='RESTRICTIVE' and row.qual=='false' and row.with_check=='false' for row in policies)
            for role in ('anon','authenticated'):
                savepoint=await connection.begin_nested();await connection.execute(text(f'SET LOCAL ROLE {role}'))
                for table in ('brand_shortlists','brand_shortlist_members'):
                    assert (await connection.execute(text(f'SELECT id FROM public.{table} LIMIT 1'))).all()==[]
                try:
                    await connection.execute(text("INSERT INTO public.brand_shortlists (id,organization_id,name,normalized_name) VALUES ('denied','denied','Denied','denied')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser database roles must not write private shortlists')
                await savepoint.rollback()
            await connection.execute(text(f'CREATE SCHEMA {schema}'))
            for table in ('users','organizations','creators','brand_shortlists','brand_shortlist_members'):
                await connection.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES)'))
        async def seed(db):
            user=User(supabase_uid=str(uuid.uuid4()),email='shortlist-native@example.com');db.add(user);await db.flush()
            org=Organization(name='Private native brand',slug='shortlist-native',billing_email=user.email,owner_id=user.id)
            creator=Creator(user_id=user.id,handle='native_saved_creator',display_name='Native creator')
            db.add_all([org,creator]);await db.commit();return org.id,creator.handle
        org_id,handle=await call(seed)
        body=ShortlistCreate(request_id=uuid.uuid4(),name='Private launch')
        groups=await asyncio.gather(*(call(lambda db:ShortlistService.create(db,org_id,body)) for _ in range(2)))
        assert groups[0]['id']==groups[1]['id'];id=groups[0]['id']
        saved=await asyncio.gather(*(call(lambda db:ShortlistService.save(db,org_id,id,handle)) for _ in range(2)))
        assert saved[0]['id']==saved[1]['id']
        assert (await call(lambda db:ShortlistService.read(db,org_id,id)))['members_count']==1
        members=await call(lambda db:ShortlistService.members(db,org_id,id));assert members['items'][0]['creator']['handle']==handle
        await asyncio.gather(*(call(lambda db:ShortlistService.remove(db,org_id,id,saved[0]['id'])) for _ in range(2)))
        assert (await call(lambda db:ShortlistService.read(db,org_id,id)))['members_count']==0
        async def race(callback):
            try:return await call(callback)
            except FlenzrException as error:return error
        await asyncio.gather(race(lambda db:ShortlistService.save(db,org_id,id,handle)),race(lambda db:ShortlistService.delete_group(db,org_id,id)))
        async def remaining(db):
            return (await db.execute(text('SELECT count(*) FROM brand_shortlist_members'))).scalar_one()
        assert await call(remaining)==0
    finally:
        async with engine.begin() as connection:await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
