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
from app.domains.collaborations.schemas import DeliveryCreate, DeliveryReviewCreate, CompletionCreate
from app.core.exceptions import FlenzrException
from datetime import datetime, timezone, timedelta
from app.domains.collaborations.service import CollaborationService
from app.domains.collaborations.calendar import CollaborationCalendar

@pytest.mark.skipif(os.getenv('FLENZR_TEST_COMPLETION_POSTGRES')!='1',reason='Opt-in native collaboration check')
@pytest.mark.asyncio
async def test_completion_concurrency_submission_race_immutability_and_privacy():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_review_test_'+uuid.uuid4().hex
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
            for table in ('users','organizations','creators','campaigns','campaign_applications','campaign_invitations','enquiries','collaborations','collaboration_proposal_drafts','collaboration_proposal_revisions','collaboration_proposal_acceptances','collaboration_agreements','collaboration_deliveries','collaboration_delivery_reviews','collaboration_completions'):
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
        body=DeliveryCreate(request_id=uuid.uuid4(),agreement_id=agreement.id,expected_latest_version=0,title='Native product preview',notes='Original edit',links=[{'label':'Video','url':'https://example.com/video'}])

        month=before['terms']['delivery_date'][:7]
        unsubmitted=await call(lambda db:CollaborationCalendar.read(db,creator,month))
        assert unsubmitted['items'][0]['delivery_state']=='not_submitted'
        assert unsubmitted['outstanding_counts']==[dict(delivery_date=before['terms']['delivery_date'],total=1)]
        first=await call(lambda db:DeliveryService.submit(db,creator,record_id,body))
        request=DeliveryReviewCreate(request_id=uuid.uuid4(),expected_latest_version=1,action='request_revision',feedback='Please adjust the captions.')
        reviewed=await asyncio.wait_for(asyncio.gather(*(call(lambda db:DeliveryService.review(db,owner,record_id,first['id'],request)) for _ in range(2))),timeout=15)
        assert reviewed[0]==reviewed[1] and reviewed[0]['decision']=='revisions_requested'
        for actor in (owner,creator):
            workspace=await call(lambda db,actor=actor:DeliveryService.workspace(db,actor,record_id))
            assert workspace['items'][0]['review']==reviewed[0]
        revised=await call(lambda db:CollaborationCalendar.read(db,owner,month))
        assert revised['items'][0]['delivery_state']=='revisions_requested'
        assert revised['outstanding_counts']==[dict(delivery_date=before['terms']['delivery_date'],total=1)]
        second=await call(lambda db:DeliveryService.submit(db,creator,record_id,body.model_copy(update={'request_id':uuid.uuid4(),'expected_latest_version':1,'title':'Second cut'})))
        assert second['review'] is None
        async def race(callback):
            try:return await call(callback)
            except FlenzrException as error:return error
        decisions=[DeliveryReviewCreate(request_id=uuid.uuid4(),expected_latest_version=2,action=action,feedback='Review feedback') for action in ('approve','request_revision')]
        competing=await asyncio.gather(*(race(lambda db,decision=decision:DeliveryService.review(db,owner,record_id,second['id'],decision)) for decision in decisions))
        assert sum(isinstance(row,dict) for row in competing)==1
        assert sum(isinstance(row,FlenzrException) and row.status_code==409 for row in competing)==1
        third=await call(lambda db:DeliveryService.submit(db,creator,record_id,body.model_copy(update={'request_id':uuid.uuid4(),'expected_latest_version':2,'title':'Third cut'})))
        review3=DeliveryReviewCreate(request_id=uuid.uuid4(),expected_latest_version=3,action='approve')
        submit4=body.model_copy(update={'request_id':uuid.uuid4(),'expected_latest_version':3,'title':'Fourth cut'})
        raced=await asyncio.gather(race(lambda db:DeliveryService.review(db,owner,record_id,third['id'],review3)),race(lambda db:DeliveryService.submit(db,creator,record_id,submit4)))
        assert isinstance(raced[1],dict) and raced[1]['version']==4
        if isinstance(raced[0],FlenzrException):assert raced[0].status_code==409
        else:assert (await call(lambda db:DeliveryService.review(db,owner,record_id,third['id'],review3)))==raced[0]
        current=await call(lambda db:DeliveryService.workspace(db,creator,record_id))
        assert current['latest_version']==4 and current['items'][0]['review'] is None
        assert current['items'][-1]['review']==reviewed[0]
        assert (await call(lambda db:DeliveryService.review(db,owner,record_id,first['id'],request)))==reviewed[0]
        assert (await call(lambda db:AgreementService.read(db,creator,record_id))).snapshot==before

        fourth=current['items'][0]
        review4=await call(lambda db:DeliveryService.review(db,owner,record_id,fourth['id'],DeliveryReviewCreate(request_id=uuid.uuid4(),expected_latest_version=4,action='approve')))
        complete=CompletionCreate(request_id=uuid.uuid4(),delivery_id=fourth['id'],review_id=review4['id'],expected_latest_version=4,confirmed=True)
        # Submission and completion share a row lock; exactly one can win.
        submit5=body.model_copy(update={'request_id':uuid.uuid4(),'expected_latest_version':4,'title':'Fifth cut'})
        finished=await asyncio.gather(race(lambda db:DeliveryService.complete(db,owner,record_id,complete)),race(lambda db:DeliveryService.submit(db,creator,record_id,submit5)))
        assert sum(isinstance(row,dict) for row in finished)==1
        assert sum(isinstance(row,FlenzrException) and row.status_code==409 for row in finished)==1
        if isinstance(finished[0],FlenzrException):
            fifth=finished[1]
            review5=await call(lambda db:DeliveryService.review(db,owner,record_id,fifth['id'],DeliveryReviewCreate(request_id=uuid.uuid4(),expected_latest_version=5,action='approve')))
            complete=CompletionCreate(request_id=uuid.uuid4(),delivery_id=fifth['id'],review_id=review5['id'],expected_latest_version=5,confirmed=True)
        completions=await asyncio.gather(*(call(lambda db:DeliveryService.complete(db,owner,record_id,complete)) for _ in range(2)))
        assert completions[0]==completions[1]
        other=complete.model_copy(update={'request_id':uuid.uuid4()})
        assert isinstance(await race(lambda db:DeliveryService.complete(db,owner,record_id,other)),FlenzrException)
        for actor in (owner,creator):
            workspace=await call(lambda db,actor=actor:DeliveryService.workspace(db,actor,record_id))
            assert workspace['completion']==completions[0] and workspace['collaboration_status']=='completed'
            assert not workspace['can_submit'] and not workspace['can_review'] and not workspace['can_complete']
        assert (await call(lambda db:AgreementService.read(db,creator,record_id))).snapshot==before
        month=before['terms']['delivery_date'][:7]
        for actor in (owner,creator):
            calendar=await call(lambda db,actor=actor:CollaborationCalendar.read(db,actor,month))
            assert calendar['month_total']==calendar['total']==1
            assert calendar['items'][0]['status']=='completed'
            assert calendar['items'][0]['delivery_state']=='completed' and calendar['outstanding_counts']==[]
            assert calendar['items'][0]['delivery_date']==before['terms']['delivery_date']
            assert calendar['items'][0]['completed_at']==completions[0]['completed_at']
            day=int(before['terms']['delivery_date'][-2:])
            assert (await call(lambda db,actor=actor:CollaborationCalendar.read(db,actor,month,day)))['total']==1
        assert (await call(lambda db:CollaborationCalendar.read(db,str(uuid.uuid4()),month)))['items']==[]
        async with engine.begin() as connection:
            table='collaboration_completions'
            assert await connection.scalar(text(f"SELECT relrowsecurity FROM pg_class WHERE oid='public.{table}'::regclass"))
            await connection.execute(text(f'GRANT SELECT,INSERT ON public.{table} TO anon,authenticated'))
            for role in ('anon','authenticated'):
                point=await connection.begin_nested();await connection.execute(text(f'SET LOCAL ROLE {role}'))
                assert (await connection.execute(text(f'SELECT id FROM public.{table}'))).all()==[]
                try:await connection.execute(text(f"INSERT INTO public.{table} (id) VALUES ('denied')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser role wrote review data')
                await point.rollback()
            await connection.execute(text(f'CREATE TRIGGER flenzr_completion_immutable BEFORE UPDATE OR DELETE ON {schema}.{table} FOR EACH ROW EXECUTE FUNCTION public.flenzr_immutable_completion()'))
            for statement in (f"UPDATE {schema}.{table} SET request_id='Changed'",f'DELETE FROM {schema}.{table}'):
                point=await connection.begin_nested()
                try:await connection.execute(text(statement))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='55000'
                else:raise AssertionError('Saved review was mutable')
                await point.rollback()
    finally:
        async with engine.begin() as connection:await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
