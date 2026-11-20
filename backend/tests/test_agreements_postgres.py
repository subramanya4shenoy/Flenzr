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
from app.core.exceptions import FlenzrException
from datetime import datetime, timezone, timedelta
from app.domains.collaborations.service import CollaborationService

@pytest.mark.skipif(os.getenv('FLENZR_TEST_AGREEMENT_POSTGRES')!='1',reason='Opt-in native collaboration check')
@pytest.mark.asyncio
async def test_mutual_acceptance_races_immutability_and_database_privacy():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_agreement_test_'+uuid.uuid4().hex
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
            for table in ('users','organizations','creators','campaigns','campaign_applications','campaign_invitations','enquiries','collaborations','collaboration_proposal_drafts','collaboration_proposal_revisions','collaboration_proposal_acceptances','collaboration_agreements'):
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
        async def propose(user,record,version=0):
            await call(lambda db:ProposalService.save(db,user,record,ProposalDraftSave(expected_revision=0,expected_latest_version=version,terms=terms)))
            return await call(lambda db:ProposalService.send(db,user,record,ProposalSend(request_id=uuid.uuid4(),expected_draft_revision=1,expected_latest_version=version)))
        proposal=await propose(owner,record_id)
        accept=ProposalAccept(proposal_id=proposal['id'],expected_version=1,confirmed=True)
        accepted=await asyncio.wait_for(asyncio.gather(*(call(lambda db,user=user:AgreementService.accept(db,user,record_id,accept)) for user in (owner,creator))),timeout=15)
        shared=await call(lambda db:AgreementService.read(db,owner,record_id))
        other=await call(lambda db:AgreementService.read(db,creator,record_id))
        assert shared.id==other.id and shared.snapshot_hash==other.snapshot_hash and shared.snapshot==other.snapshot
        assert (await call(lambda db:AgreementService.accept(db,owner,record_id,accept)))['agreement'].id==shared.id
        # Apply the migrated trigger to the isolated cloned table; LIKE does not clone triggers.
        async with engine.begin() as connection:
            await connection.execute(text(f'CREATE TRIGGER flenzr_agreement_immutable BEFORE UPDATE OR DELETE ON {schema}.collaboration_agreements FOR EACH ROW EXECUTE FUNCTION public.flenzr_immutable_agreement()'))
            for statement in (f"UPDATE {schema}.collaboration_agreements SET snapshot='{{}}'::json",f'DELETE FROM {schema}.collaboration_agreements'):
                point=await connection.begin_nested()
                try:await connection.execute(text(statement))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='55000'
                else:raise AssertionError('Saved agreement was mutable')
                await point.rollback()
            for table in ('collaboration_proposal_acceptances','collaboration_agreements'):
                assert await connection.scalar(text(f"SELECT relrowsecurity FROM pg_class WHERE oid='public.{table}'::regclass"))
                await connection.execute(text(f'GRANT SELECT,INSERT ON public.{table} TO anon,authenticated'))
                for role in ('anon','authenticated'):
                    point=await connection.begin_nested();await connection.execute(text(f'SET LOCAL ROLE {role}'))
                    assert (await connection.execute(text(f'SELECT id FROM public.{table}'))).all()==[]
                    try:await connection.execute(text(f"INSERT INTO public.{table} (id) VALUES ('denied')"))
                    except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                    else:raise AssertionError('Browser role wrote agreement data')
                    await point.rollback()
        # Final acceptance and a competing new version must never agree stale terms.
        owner2,creator2,source2=await call(seed)
        record2=(await call(lambda db:CollaborationService.create(db,owner2,CollaborationCreate(source_kind='application',source_id=source2)))).id
        proposal2=await propose(owner2,record2)
        accept2=ProposalAccept(proposal_id=proposal2['id'],expected_version=1,confirmed=True)
        await call(lambda db:AgreementService.accept(db,owner2,record2,accept2))
        await call(lambda db:ProposalService.save(db,creator2,record2,ProposalDraftSave(expected_revision=0,expected_latest_version=1,terms=terms)))
        send2=ProposalSend(request_id=uuid.uuid4(),expected_draft_revision=1,expected_latest_version=1)
        async def race(callback):
            try:return await call(callback)
            except FlenzrException as error:return error
        raced=await asyncio.gather(race(lambda db:AgreementService.accept(db,creator2,record2,accept2)),race(lambda db:ProposalService.send(db,creator2,record2,send2)))
        assert sum(isinstance(row,FlenzrException) for row in raced)==1
        current=await call(lambda db:ProposalService.workspace(db,owner2,record2))
        assert (current['latest_version'],current['collaboration_status']) in ((1,'agreed'),(2,'discussion'))
        assert bool(current['agreement'])==(current['latest_version']==1)
        async with engine.begin() as connection:
            savepoint=await connection.begin_nested()
            try:await connection.execute(text(f"INSERT INTO {schema}.collaborations (id,brand_user_id,creator_user_id,title,brand_name,creator_name,brief,deliverable,currency) VALUES ('bad',:owner,:creator,'Bad','Brand','Creator','Bad','Bad','INR')"),{'owner':owner,'creator':creator})
            except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='23514'
            else:raise AssertionError('Source check did not reject missing source')
            await savepoint.rollback()
    finally:
        async with engine.begin() as connection:await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
