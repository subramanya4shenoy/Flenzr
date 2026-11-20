"""Opt-in PostgreSQL message concurrency, constraints, privacy and immutability."""
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
from app.domains.collaborations.messages import MessageService
from app.domains.collaborations.schemas import MessageCreate
from app.domains.collaborations.schemas import (CollaborationCreate, ProposalTerms, ProposalDraftSave, ProposalSend,
    ProposalAccept, DeliveryCreate, DeliveryReviewCreate, CompletionCreate, FeedbackCreate)


@pytest.mark.skipif(os.getenv('FLENZR_TEST_MESSAGES_POSTGRES') != '1', reason='Opt-in native messages check')
@pytest.mark.asyncio
async def test_messages_order_replay_rls_and_immutability():
    assert 'postgresql' in settings.DATABASE_URL
    engine=create_async_engine(settings.DATABASE_URL,pool_size=4,max_overflow=0)
    schema='flenzr_messages_test_'+uuid.uuid4().hex
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
                'collaboration_deliveries','collaboration_delivery_reviews','collaboration_completions','collaboration_messages'):
                await conn.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))
            await conn.execute(text(f'CREATE TRIGGER flenzr_message_immutable BEFORE UPDATE OR DELETE ON {schema}.collaboration_messages FOR EACH ROW EXECUTE FUNCTION public.flenzr_immutable_message()'))
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
        body=MessageCreate(request_id=uuid.uuid4(),text='Please confirm the delivery format.')
        repeated=await asyncio.wait_for(asyncio.gather(*(call(lambda db:MessageService.send(db,brand,record_id,body)) for _ in range(2))),15)
        assert repeated[0]==repeated[1] and repeated[0]['sequence']==1
        competing=await asyncio.wait_for(asyncio.gather(*(call(lambda db,actor=actor:MessageService.send(db,actor,record_id,MessageCreate(request_id=uuid.uuid4(),text='Concurrent message'))) for actor in (brand,creator))),15)
        assert sorted(row['sequence'] for row in competing)==[2,3]
        assert (await call(lambda db:MessageService.send(db,brand,record_id,body)))==repeated[0]
        assert (await conflict(lambda db:MessageService.send(db,brand,record_id,body.model_copy(update={'text':'Changed request'})))).status_code==409
        for actor in (brand,creator):
            state=await call(lambda db,actor=actor:MessageService.list(db,actor,record_id,limit=2))
            assert [row['sequence'] for row in state['items']]==[2,3] and state['next_before']==2
            older=await call(lambda db,actor=actor:MessageService.list(db,actor,record_id,before=2,limit=2))
            assert older['items'][0]['is_mine']==(actor==brand) and older['next_before'] is None
        assert (await conflict(lambda db:MessageService.list(db,str(uuid.uuid4()),record_id))).status_code==404
        async with engine.begin() as conn:
            assert await conn.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid='public.collaboration_messages'::regclass"))
            await conn.execute(text('GRANT SELECT,INSERT ON public.collaboration_messages TO anon,authenticated'))
            for role in ('anon','authenticated'):
                point=await conn.begin_nested();await conn.execute(text(f'SET LOCAL ROLE {role}'))
                assert (await conn.execute(text('SELECT id FROM public.collaboration_messages'))).all()==[]
                try:await conn.execute(text("INSERT INTO public.collaboration_messages (id) VALUES ('denied')"))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='42501'
                else:raise AssertionError('Browser role wrote messages')
                await point.rollback()
            table=f'{schema}.collaboration_messages'
            for statement in (f"UPDATE {table} SET text='Edited'",f'DELETE FROM {table}'):
                point=await conn.begin_nested()
                try:await conn.execute(text(statement))
                except DBAPIError as error:assert getattr(error.orig,'sqlstate',None)=='55000'
                else:raise AssertionError('Sent messages were mutable')
                await point.rollback()
    finally:
        async with engine.begin() as conn:await conn.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
