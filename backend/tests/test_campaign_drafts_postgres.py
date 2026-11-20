"""Opt-in native concurrency check; all rows live in a temporary test schema."""
import asyncio
import os
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.core.exceptions import FlenzrException
from app.domains.brands.models import Organization
from app.domains.campaigns.schemas import CampaignDraftCreate, CampaignDraftUpdate, CampaignTransition
from app.domains.campaigns.services import CampaignService
from app.domains.identity.models import User
from app.domains.creators.models import Creator


@pytest.mark.skipif(os.getenv('FLENZR_TEST_CAMPAIGN_POSTGRES') != '1', reason='Opt-in native PostgreSQL concurrency check')
@pytest.mark.asyncio
async def test_campaign_draft_concurrent_creation_and_edit(monkeypatch):
    assert 'postgresql' in settings.DATABASE_URL
    engine = create_async_engine(settings.DATABASE_URL, pool_size=4, max_overflow=0)
    schema = 'flenzr_draft_test_' + uuid.uuid4().hex
    async def session_call(callback):
        async with engine.connect() as connection:
            await connection.execute(text(f'SET search_path TO {schema}, public'))
            await connection.commit()
            async with AsyncSession(bind=connection, expire_on_commit=False) as db:
                return await callback(db)
    try:
        async with engine.begin() as connection:
            protected = (await connection.execute(text("SELECT relrowsecurity FROM pg_class WHERE oid IN ('public.campaigns'::regclass,'public.campaign_applications'::regclass,'public.campaign_invitations'::regclass)"))).scalars().all()
            assert len(protected) == 3 and all(protected)
            for role in ('anon', 'authenticated'):
                savepoint = await connection.begin_nested()
                await connection.execute(text(f'SET LOCAL ROLE {role}'))
                for table in ('campaigns', 'campaign_applications', 'campaign_invitations'):
                    assert (await connection.execute(text(f'SELECT id FROM public.{table} LIMIT 1'))).all() == []
                try:
                    await connection.execute(text("INSERT INTO public.campaigns (id,organization_id,title,brief,budget_total_cents,currency,status,revision,created_at,updated_at) VALUES (:id,:org,'Forbidden draft','',0,'INR','DRAFT',1,now(),now())"), {'id': str(uuid.uuid4()), 'org': str(uuid.uuid4())})
                except DBAPIError as error:
                    assert getattr(error.orig, 'sqlstate', None) == '42501'
                    await savepoint.rollback()
                else:
                    raise AssertionError('Browser roles must not write campaign rows directly')
        async with engine.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA {schema}'))
            for table in ('users', 'organizations', 'creators', 'campaigns', 'campaign_applications', 'campaign_invitations'):
                await connection.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES)'))
        async def seed(db):
            user = User(supabase_uid=str(uuid.uuid4()), email='draft-concurrency@example.com')
            db.add(user); await db.flush()
            org = Organization(name='Temporary brand', slug='draft-test', billing_email=user.email, owner_id=user.id)
            db.add(org); await db.commit()
            return org.id, user.id
        organization_id, user_id = await session_call(seed)
        payload = CampaignDraftCreate(request_id=uuid.uuid4(), title='Concurrent draft')
        created = await asyncio.gather(*(session_call(lambda db: CampaignService.create_draft(db, organization_id, payload)) for _ in range(2)))
        assert created[0].id == created[1].id and created[0].revision == created[1].revision == 1
        original = CampaignService.get_by_id
        ready = asyncio.Event()
        reads = 0
        async def synchronized_read(db, campaign_id, **kwargs):
            nonlocal reads
            row = await original(db, campaign_id, **kwargs)
            reads += 1
            if reads == 2:
                ready.set()
            if reads <= 2:
                await asyncio.wait_for(ready.wait(), timeout=20)
            return row
        monkeypatch.setattr(CampaignService, 'get_by_id', synchronized_read)
        async def edit(title):
            try:
                return await session_call(lambda db: CampaignService.update_draft(db, organization_id, created[0].id,
                                          CampaignDraftUpdate(title=title, expected_revision=1)))
            except FlenzrException as error:
                return error
        outcomes = await asyncio.gather(edit('First editor title'), edit('Second editor title'))
        successes = [item for item in outcomes if not isinstance(item, FlenzrException)]
        conflicts = [item for item in outcomes if isinstance(item, FlenzrException)]
        assert len(successes) == len(conflicts) == 1
        assert successes[0].revision == 2 and conflicts[0].code == 'DRAFT_CHANGED'
        # Publishing and editing the same observed draft must not both win.
        monkeypatch.setattr(CampaignService, 'get_by_id', original)
        ready_draft = await session_call(lambda db: CampaignService.update_draft(db, organization_id, created[0].id,
            CampaignDraftUpdate(expected_revision=2, brief='A complete native PostgreSQL launch brief.', target_niche='Technology', deliverable_summary='One review video', budget_total_cents=10000)))
        reads = 0
        ready = asyncio.Event()
        monkeypatch.setattr(CampaignService, 'get_by_id', synchronized_read)
        async def publish_or_edit(publish):
            try:
                if publish:
                    return await session_call(lambda db: CampaignService.transition(db, organization_id, ready_draft.id,
                        CampaignTransition(action='publish', expected_revision=3, expected_status='draft')))
                return await session_call(lambda db: CampaignService.update_draft(db, organization_id, ready_draft.id,
                    CampaignDraftUpdate(title='Concurrent final title', expected_revision=3)))
            except FlenzrException as error:
                return error
        outcomes = await asyncio.gather(publish_or_edit(True), publish_or_edit(False))
        successes = [item for item in outcomes if not isinstance(item, FlenzrException)]
        conflicts = [item for item in outcomes if isinstance(item, FlenzrException)]
        assert len(successes) == len(conflicts) == 1
        assert successes[0].revision == 4 and conflicts[0].status_code == 409
        monkeypatch.setattr(CampaignService, 'get_by_id', original)
        current = successes[0]
        if current.status.value == 'draft':
            current = await session_call(lambda db: CampaignService.transition(db, organization_id, current.id,
                CampaignTransition(action='publish', expected_revision=current.revision, expected_status='draft')))
        async def seed_creator(db):
            creator = Creator(user_id=user_id, handle='native-lifecycle-creator', display_name='Temporary creator')
            db.add(creator); await db.commit()
            return creator.id
        creator_id = await session_call(seed_creator)
        from app.domains.campaigns.schemas import CampaignApplicationCreate
        submitted = await asyncio.gather(*(session_call(lambda db: CampaignService.apply_to_campaign(db,
            current.id, creator_id, CampaignApplicationCreate(proposed_rate_cents=1000, expected_campaign_revision=current.revision))) for _ in range(2)))
        assert submitted[0].id == submitted[1].id
        application = submitted[0]
        own_board = await session_call(lambda db: CampaignService.list_opportunities(db, creator_id, niche='TECH'))
        assert own_board['total'] == 1 and own_board['items'][0]['application']['id'] == application.id
        another_board = await session_call(lambda db: CampaignService.list_opportunities(db, str(uuid.uuid4()), niche='TECH'))
        assert another_board['items'][0]['application'] is None
        wildcard_board = await session_call(lambda db: CampaignService.list_opportunities(db, creator_id, q='%_'))
        assert wildcard_board['total'] == 0
        try:
            await session_call(lambda db: CampaignService.apply_to_campaign(db, current.id, creator_id,
                CampaignApplicationCreate(proposed_rate_cents=2000)))
        except FlenzrException as error:
            assert error.code == 'APPLICATION_EXISTS'
        else:
            raise AssertionError('A changed proposal cannot overwrite an application')
        from app.domains.campaigns.schemas import (CampaignApplicationResponse, CampaignApplicationWithdrawal,
            CampaignInvitationCreate, CampaignInvitationResponse, CampaignCreate)
        async def respond(kind, record_id, payload, scope):
            try:
                return await session_call(lambda db: CampaignService.respond_activity(db, kind=kind,
                    record_id=record_id, body=payload, **scope))
            except FlenzrException as error:
                return error
        # Opposing responses from the same observed pending row cannot both commit.
        outcomes = await asyncio.gather(
            respond('applications', application.id, CampaignApplicationResponse(action='accept', expected_status='pending', expected_campaign_revision=current.revision), {'organization_id':organization_id}),
            respond('applications', application.id, CampaignApplicationWithdrawal(action='withdraw', expected_status='pending', expected_campaign_revision=current.revision), {'creator_id':creator_id}),
        )
        assert sum(isinstance(value, dict) for value in outcomes) == 1
        assert sum(isinstance(value, FlenzrException) and value.status_code == 409 for value in outcomes) == 1
        # Identical concurrent sends return one saved invitation, never duplicate rows.
        sent = await asyncio.gather(*(session_call(lambda db: CampaignService.invite_creator(db, current.id,
            CampaignInvitationCreate(creator_id=creator_id, offered_rate_cents=1000, expected_campaign_revision=current.revision),
            organization_id=organization_id)) for _ in range(2)))
        assert sent[0].id == sent[1].id
        invitation = sent[0]
        try:
            await session_call(lambda db: CampaignService.invite_creator(db, current.id,
                CampaignInvitationCreate(creator_id=creator_id, offered_rate_cents=2000), organization_id=organization_id))
        except FlenzrException as error:
            assert error.code == 'INVITATION_EXISTS'
        else:
            raise AssertionError('A second different offer cannot overwrite an invitation')
        outcomes = await asyncio.gather(*(respond('invitations', invitation.id,
            CampaignInvitationResponse(action=action, expected_status='invited', expected_campaign_revision=current.revision),
            {'creator_id':creator_id}) for action in ('accept','decline')))
        assert sum(isinstance(value, dict) for value in outcomes) == 1
        assert sum(isinstance(value, FlenzrException) and value.status_code == 409 for value in outcomes) == 1
        # Acceptance concurrent with pause either precedes the pause or fails closed.
        race_campaign = await session_call(lambda db: CampaignService.create(db, organization_id,
            CampaignCreate(title='Acceptance lifecycle race', brief='A complete native campaign for lifecycle races.',
                target_niche='Technology', deliverable_summary='One video', budget_total_cents=10000)))
        race_application = await session_call(lambda db: CampaignService.apply_to_campaign(db, race_campaign.id,
            creator_id, CampaignApplicationCreate(proposed_rate_cents=1000)))
        acceptance, race_paused = await asyncio.gather(
            respond('applications', race_application.id, CampaignApplicationResponse(action='accept', expected_status='pending', expected_campaign_revision=1), {'organization_id':organization_id}),
            session_call(lambda db: CampaignService.transition(db, organization_id, race_campaign.id,
                CampaignTransition(action='pause', expected_revision=1, expected_status='active'))),
        )
        assert race_paused.status.value == 'paused'
        saved = await session_call(lambda db: CampaignService.get_activity(db, kind='applications', record_id=race_application.id, organization_id=organization_id))
        if isinstance(acceptance, FlenzrException):
            assert acceptance.status_code == 409 and saved['status'].value == 'pending'
        else:
            assert saved['status'].value == 'accepted'
        paused = await session_call(lambda db: CampaignService.transition(db, organization_id, current.id,
            CampaignTransition(action='pause', expected_revision=current.revision, expected_status='active')))
        assert paused.status.value == 'paused' and paused.applicants_count == 1
        async def seed_unapplied(db):
            user = User(supabase_uid=str(uuid.uuid4()), email='unapplied-native@example.com')
            db.add(user); await db.flush()
            profile = Creator(user_id=user.id, handle='unapplied-native', display_name='Unapplied creator')
            db.add(profile); await db.commit()
            return profile.id
        unapplied_id = await session_call(seed_unapplied)
        try:
            await session_call(lambda db: CampaignService.apply_to_campaign(db, current.id, unapplied_id, CampaignApplicationCreate(proposed_rate_cents=1000)))
        except FlenzrException as error:
            assert error.code == 'CAMPAIGN_NOT_ACTIVE'
        else:
            raise AssertionError('Paused campaigns cannot accept new applications')

    finally:
        async with engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
