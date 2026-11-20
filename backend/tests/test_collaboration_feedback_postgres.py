"""Opt-in PostgreSQL review concurrency, constraints, privacy and immutability."""
import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.config import settings
from app.core.exceptions import FlenzrException
from app.domains.identity.models import User
from app.domains.brands.models import Organization
from app.domains.creators.models import Creator
from app.domains.campaigns.models import Campaign, CampaignApplication, ApplicationStatus
from app.domains.collaborations.service import CollaborationService
from app.domains.collaborations.proposals import ProposalService
from app.domains.collaborations.agreements import AgreementService
from app.domains.collaborations.deliveries import DeliveryService
from app.domains.collaborations.feedback import FeedbackService
from app.domains.collaborations.schemas import (CollaborationCreate, ProposalTerms, ProposalDraftSave, ProposalSend,
    ProposalAccept, DeliveryCreate, DeliveryReviewCreate, CompletionCreate, FeedbackCreate)


@pytest.mark.skipif(os.getenv('FLENZR_TEST_FEEDBACK_POSTGRES') != '1', reason='Opt-in native feedback check')
@pytest.mark.asyncio
async def test_feedback_concurrent_reviews_constraints_rls_and_immutability():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_feedback_test_'+uuid.uuid4().hex
    async def call(callback):
        async with engine.connect() as conn:
            await conn.execute(text(f'SET search_path TO {schema}, public'));await conn.commit()
            async with AsyncSession(bind=conn,expire_on_commit=False) as db:return await callback(db)
    async def conflict(callback):
        try:return await call(callback)
        except FlenzrException as error:return error
    try:
        async with engine.begin() as conn:
            await conn.execute(text(f'CREATE SCHEMA {schema}'))
            for table in ('users','organizations','creators','campaigns','campaign_applications','campaign_invitations','enquiries','collaborations',
                'collaboration_proposal_drafts','collaboration_proposal_revisions','collaboration_proposal_acceptances','collaboration_agreements',
                'collaboration_deliveries','collaboration_delivery_reviews','collaboration_completions','collaboration_feedback'):
                await conn.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))
            await conn.execute(text(f'CREATE TRIGGER flenzr_feedback_immutable BEFORE UPDATE OR DELETE ON {schema}.collaboration_feedback FOR EACH ROW EXECUTE FUNCTION public.flenzr_immutable_feedback()'))
        async def seed(db):
            brand=User(supabase_uid=str(uuid.uuid4()),email=uuid.uuid4().hex+'@example.com');person=User(supabase_uid=str(uuid.uuid4()),email=uuid.uuid4().hex+'@example.com')
            db.add_all([brand,person]);await db.flush()
            org=Organization(owner_id=brand.id,name='Feedback brand',slug=uuid.uuid4().hex,billing_email=brand.email)
            creator=Creator(user_id=person.id,handle='feedback_'+uuid.uuid4().hex[:8],display_name='Feedback creator')
            db.add_all([org,creator]);await db.flush()
            campaign=Campaign(organization_id=org.id,title='Feedback campaign',brief='Feedback scope',budget_total_cents=1000,currency='INR')
            db.add(campaign);await db.flush()
            source=CampaignApplication(campaign_id=campaign.id,creator_id=creator.id,proposed_rate_cents=1000,status=ApplicationStatus.ACCEPTED)
            db.add(source);await db.commit();return brand.id,person.id,source.id
        brand,creator,source=await call(seed)
        collab=await call(lambda db:CollaborationService.create(db,brand,CollaborationCreate(source_kind='application',source_id=source)));record_id=collab.id
        terms=ProposalTerms(amount_cents=1000,currency='INR',deliverables='One video',delivery_date=(datetime.now(timezone.utc).date()+timedelta(days=10)).isoformat(),usage_rights='Organic use')
        await call(lambda db:ProposalService.save(db,brand,record_id,ProposalDraftSave(expected_revision=0,expected_latest_version=0,terms=terms)))
        proposal=await call(lambda db:ProposalService.send(db,brand,record_id,ProposalSend(request_id=uuid.uuid4(),expected_draft_revision=1,expected_latest_version=0)))
        for actor in (brand,creator):await call(lambda db,actor=actor:AgreementService.accept(db,actor,record_id,ProposalAccept(proposal_id=proposal['id'],expected_version=1,confirmed=True)))
        agreement=await call(lambda db:AgreementService.read(db,brand,record_id));snapshot=dict(agreement.snapshot)
        delivery=await call(lambda db:DeliveryService.submit(db,creator,record_id,DeliveryCreate(request_id=uuid.uuid4(),agreement_id=agreement.id,expected_latest_version=0,title='Preview video',links=[dict(label='Video',url='https://example.com/video')])))
        approval=await call(lambda db:DeliveryService.review(db,brand,record_id,delivery['id'],DeliveryReviewCreate(request_id=uuid.uuid4(),expected_latest_version=1,action='approve')))
        completion=await call(lambda db:DeliveryService.complete(db,brand,record_id,CompletionCreate(request_id=uuid.uuid4(),delivery_id=delivery['id'],review_id=approval['id'],expected_latest_version=1,confirmed=True)))
        body=FeedbackCreate(request_id=uuid.uuid4(),completion_id=completion['id'],rating=4,comment='Clear scope and prompt communication.',confirmed=True)
        reviews=await asyncio.wait_for(asyncio.gather(*(call(lambda db:FeedbackService.submit(db,brand,record_id,body)) for _ in range(2))),15)
        assert reviews[0]==reviews[1]
        bodies=[body.model_copy(update={'request_id':uuid.uuid4(),'rating':rating}) for rating in (3,5)]
        competing=await asyncio.wait_for(asyncio.gather(*(conflict(lambda db,body=body:FeedbackService.submit(db,creator,record_id,body)) for body in bodies)),15)
        assert sum(isinstance(row,dict) for row in competing)==1
        assert sum(isinstance(row,FlenzrException) and row.status_code==409 for row in competing)==1
        for actor in (brand,creator):
            state=await call(lambda db,actor=actor:FeedbackService.workspace(db,actor,record_id))
            assert len(state['items'])==2 and not state['can_submit'] and sum(row['is_mine'] for row in state['items'])==1
        assert (await call(lambda db:AgreementService.read(db,brand,record_id))).snapshot==snapshot
        assert (await call(lambda db:DeliveryService.workspace(db,brand,record_id)))['completion']==completion
        assert (await conflict(lambda db:FeedbackService.workspace(db,str(uuid.uuid4()),record_id))).status_code==404
        async with engine.begin() as conn:
            assert await conn.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid='public.collaboration_feedback'::regclass"))
            await conn.execute(text('GRANT SELECT,INSERT ON public.collaboration_feedback TO anon,authenticated'))
            for role in ('anon','authenticated'):
                point=await conn.begin_nested();await conn.execute(text(f'SET LOCAL ROLE {role}'))
                assert (await conn.execute(text('SELECT id FROM public.collaboration_feedback'))).all()==[]
                try:await conn.execute(text("INSERT INTO public.collaboration_feedback (id) VALUES ('denied')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser role wrote feedback')
                await point.rollback()
            table=f'{schema}.collaboration_feedback'
            tests=[(f"UPDATE {table} SET rating=1",'55000'),(f'DELETE FROM {table}','55000'),
                (f"INSERT INTO {table} SELECT 'duplicate',collaboration_id,completion_id,author_id,recipient_id,author_role,rating,comment,request_id,request_hash,created_at,updated_at FROM {table} LIMIT 1",'23505'),
                (f"INSERT INTO {table} SELECT 'invalid-rating',collaboration_id,completion_id,'other-author',recipient_id,author_role,0,comment,request_id,request_hash,created_at,updated_at FROM {table} LIMIT 1",'23514'),
                (f"INSERT INTO {table} SELECT 'self-review',collaboration_id,completion_id,'same-person','same-person',author_role,4,comment,request_id,request_hash,created_at,updated_at FROM {table} LIMIT 1",'23514')]
            for statement,code in tests:
                point=await conn.begin_nested()
                try:await conn.execute(text(statement))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)==code
                else:raise AssertionError('Feedback persistence guard failed')
                await point.rollback()
    finally:
        async with engine.begin() as conn:await conn.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
