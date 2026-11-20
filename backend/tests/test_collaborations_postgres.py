"""Opt-in native privacy, constraints and concurrent participant conversion."""
import asyncio,os,uuid
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession,create_async_engine
from app.core.config import settings
from app.domains.identity.models import User
from app.domains.brands.models import Organization
from app.domains.creators.models import Creator
from app.domains.campaigns.models import Campaign,CampaignApplication,ApplicationStatus
from app.domains.collaborations.schemas import CollaborationCreate
from app.domains.collaborations.service import CollaborationService

@pytest.mark.skipif(os.getenv('FLENZR_TEST_COLLABORATION_POSTGRES')!='1',reason='Opt-in native collaboration check')
@pytest.mark.asyncio
async def test_concurrent_participants_one_record_and_database_privacy():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_shared_test_'+uuid.uuid4().hex
    async def call(callback):
        async with engine.connect() as connection:
            await connection.execute(text(f'SET search_path TO {schema}, public'));await connection.commit()
            async with AsyncSession(bind=connection,expire_on_commit=False) as db:return await callback(db)
    try:
        async with engine.begin() as connection:
            assert await connection.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid='public.collaborations'::regclass"))
            policy=(await connection.execute(text("SELECT permissive,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='collaborations'"))).one()
            assert tuple(policy)==('RESTRICTIVE','false','false')
            await connection.execute(text('GRANT SELECT,INSERT ON public.collaborations TO anon,authenticated'))
            for role in ('anon','authenticated'):
                savepoint=await connection.begin_nested();await connection.execute(text(f'SET LOCAL ROLE {role}'))
                assert (await connection.execute(text('SELECT id FROM public.collaborations'))).all()==[]
                try:await connection.execute(text("INSERT INTO public.collaborations (id) VALUES ('forbidden')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser role wrote shared record')
                await savepoint.rollback()
            await connection.execute(text(f'CREATE SCHEMA {schema}'))
            for table in ('users','organizations','creators','campaigns','campaign_applications','campaign_invitations','enquiries','collaborations'):
                await connection.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))
        async def seed(db):
            owner=User(supabase_uid=str(uuid.uuid4()),email='native-shared-owner@example.com')
            person=User(supabase_uid=str(uuid.uuid4()),email='native-shared-creator@example.com')
            db.add_all([owner,person]);await db.flush()
            org=Organization(owner_id=owner.id,name='Native shared brand',slug='native-shared',billing_email=owner.email)
            creator=Creator(user_id=person.id,handle='native_shared_creator',display_name='Native shared creator')
            db.add_all([org,creator]);await db.flush()
            campaign=Campaign(organization_id=org.id,title='Native shared campaign',brief='Saved original source brief',budget_total_cents=1000,currency='INR')
            db.add(campaign);await db.flush()
            source=CampaignApplication(campaign_id=campaign.id,creator_id=creator.id,proposed_rate_cents=1000,status=ApplicationStatus.ACCEPTED)
            db.add(source);await db.commit();return owner.id,person.id,source.id
        owner,creator,source_id=await call(seed)
        body=CollaborationCreate(source_kind='application',source_id=source_id)
        results=await asyncio.wait_for(asyncio.gather(*(call(lambda db,user=user:CollaborationService.create(db,user,body)) for user in (owner,creator))),timeout=15)
        assert results[0].id==results[1].id
        assert (await call(lambda db:CollaborationService.list(db,owner)))['total']==1
        assert (await call(lambda db:CollaborationService.read(db,creator,results[0].id))).brief=='Saved original source brief'
        async with engine.begin() as connection:
            savepoint=await connection.begin_nested()
            try:await connection.execute(text(f"INSERT INTO {schema}.collaborations (id,brand_user_id,creator_user_id,title,brand_name,creator_name,brief,deliverable,currency) VALUES ('bad',:owner,:creator,'Bad','Brand','Creator','Bad','Bad','INR')"),{'owner':owner,'creator':creator})
            except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='23514'
            else:raise AssertionError('Source check did not reject missing source')
            await savepoint.rollback()
    finally:
        async with engine.begin() as connection:await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
