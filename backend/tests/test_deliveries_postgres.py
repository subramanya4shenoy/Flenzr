"""Opt-in native privacy, constraints and concurrent participant conversion."""
import asyncio,os,uuid
import pytest
from sqlalchemy import text, select, func
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession,create_async_engine
from app.core.config import settings
from app.domains.identity.models import User
from app.domains.brands.models import Organization
from app.domains.creators.models import Creator
from app.domains.campaigns.models import Campaign,CampaignApplication,ApplicationStatus
from app.domains.collaborations.schemas import CollaborationCreate, ProposalTerms, ProposalDraftSave, ProposalSend, ProposalAccept
from app.domains.collaborations.proposals import ProposalService
from app.domains.collaborations.agreements import AgreementService
from app.domains.collaborations.models import Collaboration, CollaborationAgreement
from app.domains.collaborations.deliveries import DeliveryService
from app.domains.collaborations.schemas import DeliveryCreate
from app.core.exceptions import FlenzrException
from datetime import datetime, timezone, timedelta
from app.domains.collaborations.service import CollaborationService

@pytest.mark.skipif(os.getenv('FLENZR_TEST_DELIVERY_POSTGRES')!='1',reason='Opt-in native collaboration check')
@pytest.mark.asyncio
async def test_delivery_concurrency_immutability_and_database_privacy():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_delivery_test_'+uuid.uuid4().hex
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
            for table in ('users','organizations','creators','campaigns','campaign_applications','campaign_invitations','enquiries','collaborations','collaboration_proposal_drafts','collaboration_proposal_revisions','collaboration_proposal_acceptances','collaboration_agreements','collaboration_deliveries','collaboration_delivery_reviews','collaboration_completions','collaboration_files'):
                await connection.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))
        async def seed(db):
            owner=User(supabase_uid=str(uuid.uuid4()),email=uuid.uuid4().hex+'@example.com')
            person=User(supabase_uid=str(uuid.uuid4()),email=uuid.uuid4().hex+'@example.com')
            db.add_all([owner,person]);await db.flush()
            org=Organization(owner_id=owner.id,name='Native shared brand',slug=uuid.uuid4().hex,billing_email=owner.email)
            creator=Creator(user_id=person.id,handle='native_'+uuid.uuid4().hex[:8],display_name='Native shared creator')
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
        record_id=results[0].id
        terms=ProposalTerms(amount_cents=12345,currency='INR',deliverables='One original product review',delivery_date=(datetime.now(timezone.utc).date()+timedelta(days=10)).isoformat(),usage_rights='Organic reposting for 30 days')
        await call(lambda db:ProposalService.save(db,owner,record_id,ProposalDraftSave(expected_revision=0,expected_latest_version=0,terms=terms)))
        proposal=await call(lambda db:ProposalService.send(db,owner,record_id,ProposalSend(request_id=uuid.uuid4(),expected_draft_revision=1,expected_latest_version=0)))
        accept=ProposalAccept(proposal_id=proposal['id'],expected_version=1,confirmed=True)
        for actor in (owner,creator):await call(lambda db,actor=actor:AgreementService.accept(db,actor,record_id,accept))
        agreement=await call(lambda db:AgreementService.read(db,owner,record_id))
        before=dict(agreement.snapshot)
        from app.domains.collaborations.models import CollaborationFile
        file_id=str(uuid.uuid4())
        async def seed_file(db):
            db.add(CollaborationFile(id=file_id, collaboration_id=record_id, agreement_id=agreement.id,
                creator_user_id=creator, object_key=record_id+'/'+file_id+'.pdf',filename='preview.pdf',
                content_type='application/pdf',size_bytes=100,state='ready',request_id=str(uuid.uuid4())))
            await db.commit()
        await call(seed_file)
        async with engine.begin() as connection:
            assert await connection.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid='public.collaboration_files'::regclass"))
            await connection.execute(text('GRANT SELECT,INSERT ON public.collaboration_files TO anon,authenticated'))
            for role in ('anon','authenticated'):
                point=await connection.begin_nested();await connection.execute(text(f'SET LOCAL ROLE {role}'))
                assert (await connection.execute(text('SELECT id FROM public.collaboration_files'))).all()==[]
                try:await connection.execute(text("INSERT INTO public.collaboration_files (id) VALUES ('forbidden')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser role wrote file metadata')
                await point.rollback()
            await connection.execute(text(f'CREATE TRIGGER flenzr_file_immutable BEFORE UPDATE OR DELETE ON {schema}.collaboration_files FOR EACH ROW EXECUTE FUNCTION public.flenzr_protect_submitted_file()'))
        body=DeliveryCreate(request_id=uuid.uuid4(),agreement_id=agreement.id,expected_latest_version=0,title='Native product preview',notes='Original edit',file_ids=[file_id],links=[{'label':'Video','url':'https://example.com/video'}])
        submitted=await asyncio.wait_for(asyncio.gather(*(call(lambda db:DeliveryService.submit(db,creator,record_id,body)) for _ in range(2))),timeout=15)
        assert submitted[0]==submitted[1] and submitted[0]['version']==1
        assert submitted[0]['files'][0]['id']==file_id
        async def race(body):
            try:return await call(lambda db:DeliveryService.submit(db,creator,record_id,body))
            except FlenzrException as error:return error
        bodies=[body.model_copy(update={'request_id':uuid.uuid4(),'expected_latest_version':1,'title':'New cut '+str(i),'file_ids':[]}) for i in range(2)]
        raced=await asyncio.gather(*(race(body) for body in bodies))
        assert sum(isinstance(row,dict) for row in raced)==1
        assert sum(isinstance(row,FlenzrException) and row.status_code==409 for row in raced)==1
        owner_view=await call(lambda db:DeliveryService.workspace(db,owner,record_id))
        creator_view=await call(lambda db:DeliveryService.workspace(db,creator,record_id))
        assert owner_view['items']==creator_view['items'] and owner_view['total']==2
        assert not owner_view['can_submit'] and creator_view['can_submit']
        assert owner_view['items'][1]==submitted[0]
        assert (await call(lambda db:DeliveryService.submit(db,creator,record_id,body)))==submitted[0]
        assert (await call(lambda db:AgreementService.read(db,creator,record_id))).snapshot==before
        async with engine.begin() as connection:
            for statement in (f"UPDATE {schema}.collaboration_files SET filename='Changed'",f'DELETE FROM {schema}.collaboration_files'):
                point=await connection.begin_nested()
                try:await connection.execute(text(statement))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='55000'
                else:raise AssertionError('Submitted file was mutable')
                await point.rollback()
            assert await connection.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid='public.collaboration_deliveries'::regclass"))
            await connection.execute(text('GRANT SELECT,INSERT ON public.collaboration_deliveries TO anon,authenticated'))
            for role in ('anon','authenticated'):
                point=await connection.begin_nested();await connection.execute(text(f'SET LOCAL ROLE {role}'))
                assert (await connection.execute(text('SELECT id FROM public.collaboration_deliveries'))).all()==[]
                try:await connection.execute(text("INSERT INTO public.collaboration_deliveries (id) VALUES ('denied')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser role wrote delivery data')
                await point.rollback()
            await connection.execute(text(f'CREATE TRIGGER flenzr_delivery_immutable BEFORE UPDATE OR DELETE ON {schema}.collaboration_deliveries FOR EACH ROW EXECUTE FUNCTION public.flenzr_immutable_delivery()'))
            for statement in (f"UPDATE {schema}.collaboration_deliveries SET notes='Changed'",f'DELETE FROM {schema}.collaboration_deliveries'):
                point=await connection.begin_nested()
                try:await connection.execute(text(statement))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='55000'
                else:raise AssertionError('Submitted version was mutable')
                await point.rollback()
    finally:
        async with engine.begin() as connection:await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
