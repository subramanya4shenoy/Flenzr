"""Opt-in PostgreSQL race check in an isolated, automatically removed schema."""
import asyncio
import os
from uuid import uuid4
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.config import settings
from app.core.exceptions import FlenzrException
from app.domains.identity.models import User
from app.domains.brands.models import Organization
from app.domains.creators.models import Creator
from app.domains.campaigns.models import Campaign, CampaignApplication, CampaignStatus
from app.domains.campaigns.offers import negotiate, Negotiate

@pytest.mark.skipif(os.getenv('FLENZR_TEST_OFFERS_POSTGRES') != '1', reason='Opt-in PostgreSQL Offer race check')
@pytest.mark.asyncio
async def test_offer_counter_race_and_accept_retry():
    assert 'postgresql' in settings.DATABASE_URL
    engine = create_async_engine(settings.DATABASE_URL, pool_size=4, max_overflow=0)
    schema = 'flenzr_offer_test_' + uuid4().hex
    async def run(callback):
        async with engine.connect() as connection:
            await connection.execute(text(f'SET search_path TO {schema}, public'))
            await connection.commit()
            async with AsyncSession(bind=connection, expire_on_commit=False) as db:
                return await callback(db)
    try:
        async with engine.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA {schema}'))
            for table in ('users','organizations','creators','campaigns','campaign_applications','campaign_invitations','collaborations','collaboration_agreements'):
                await connection.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES)'))
        async def seed(db):
            brand = User(supabase_uid=str(uuid4()), email='offer-brand@example.com')
            creator_user = User(supabase_uid=str(uuid4()), email='offer-creator@example.com')
            db.add_all([brand, creator_user]); await db.flush()
            org = Organization(owner_id=brand.id, name='Offer test', slug='offer-test', billing_email=brand.email)
            creator = Creator(user_id=creator_user.id, handle='offer-test', display_name='Offer creator')
            db.add_all([org,creator]); await db.flush()
            campaign = Campaign(organization_id=org.id,title='Offer race',brief='Review',status=CampaignStatus.ACTIVE,budget_total_cents=100000,currency='INR',visibility='public')
            db.add(campaign); await db.flush()
            application = CampaignApplication(campaign_id=campaign.id,creator_id=creator.id,proposed_rate_cents=10000)
            db.add(application); await db.commit()
            return brand, creator_user, campaign.id, application.id
        brand, creator, campaign_id, application_id = await run(seed)
        async def respond(actor, body):
            try:
                return await run(lambda db: negotiate(campaign_id, application_id, body, actor, db))
            except FlenzrException as error:
                return error
        def counter(amount):
            return Negotiate(action='counter',request_id=uuid4(),expected_revision=0,expected_offer_revision=1,amount_cents=amount)
        outcomes = await asyncio.gather(respond(brand,counter(12000)),respond(brand,counter(13000)))
        winners = [o for o in outcomes if isinstance(o,dict)]
        losers = [o for o in outcomes if isinstance(o,FlenzrException)]
        assert len(winners) == len(losers) == 1
        assert losers[0].code == 'OFFER_CHANGED'
        acceptance = Negotiate(action='accept',request_id=uuid4(),expected_revision=1,expected_offer_revision=1)
        accepted = await asyncio.gather(respond(creator,acceptance),respond(creator,acceptance))
        assert all(isinstance(o,dict) and o['status']=='accepted' and o['revision']==2 and o['amount_cents']==winners[0]['amount_cents'] for o in accepted)
    finally:
        async with engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
