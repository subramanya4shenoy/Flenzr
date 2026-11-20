"""Opt-in integration check; disposable rows and signals are always rolled back.

Run after alembic upgrade head with FLENZR_TEST_REALTIME_POSTGRES=1.
A Realtime WebSocket connection must have created today's message partition.
"""
import json
import os
import uuid
import pytest
from sqlalchemy import text
from app.core.database import engine

def uid():
    return str(uuid.uuid4())
@pytest.mark.skipif(os.environ.get("FLENZR_TEST_REALTIME_POSTGRES") != "1",
                    reason="Opt-in: requires migrated Supabase PostgreSQL and a Realtime connection today")
@pytest.mark.asyncio
async def test_private_enquiry_broadcast_and_transaction_rollback():
    async with engine.connect() as c:
        tx=await c.begin()
        try:
            creator,sender,stranger=[uid() for _ in range(3)]
            supa=[uid() for _ in range(3)]
            cid,eid=uid(),uid()
            for internal,external in zip([creator,sender,stranger],supa):
                await c.execute(text("INSERT INTO public.users (id,supabase_uid,email,is_active,is_superadmin,created_at,updated_at) VALUES (:id,:sub,:email,true,false,now(),now())"),{'id':internal,'sub':external,'email':external+'@example.invalid'})
            # Real authenticated database role + JWT claims: authorization cannot be
            # inferred from privileged backend reads or a service-key subscription.
            for i,internal in enumerate([creator,sender,stranger]):
                await c.execute(text("SELECT set_config('request.jwt.claims', :claims, true)"),{'claims':json.dumps({'sub':supa[i],'role':'authenticated'})})
                await c.execute(text('SET LOCAL ROLE authenticated'))
                own=await c.scalar(text('SELECT public.flenzr_can_receive_enquiries(:topic)'),{'topic':'enquiries:'+internal})
                other=await c.scalar(text('SELECT public.flenzr_can_receive_enquiries(:topic)'),{'topic':'enquiries:'+([sender,creator,creator][i])})
                assert own is True and other is False
                await c.execute(text('RESET ROLE'))
            print('PASS real PostgreSQL role/JWT authorizes only own private topic')
            await c.execute(text("INSERT INTO public.creators (id,user_id,handle,display_name,is_verified,rating,instagram_verified,youtube_verified,social_links,social_credentials,created_at,updated_at) VALUES (:id,:user,:handle,'Disposable realtime test',false,0,false,false,'{}','{}',now(),now())"),{'id':cid,'user':creator,'handle':'realtime-test-'+cid})
            await c.execute(text("INSERT INTO public.enquiries (id,creator_id,sender_id,request_id,payload_hash,brand_name,brief,deliverable,currency,status,revision,creator_read_revision,sender_read_revision,history,created_at,updated_at) VALUES (:id,:creator,:sender,:request,'test','Disposable realtime test','Test only','Test','INR','pending',1,0,1,'[]',now(),now())"),{'id':eid,'creator':cid,'sender':sender,'request':uid()})
            result=(await c.execute(text("SELECT topic,event,payload FROM realtime.messages WHERE topic=ANY(:topics)"),{'topics':['enquiries:'+u for u in [creator,sender,stranger]]})).all()
            
            assert len(result)==2 and {r.topic for r in result}=={'enquiries:'+creator,'enquiries:'+sender}
            assert all(set(r.payload) <= {'id'} and r.event=='enquiries_changed' for r in result)
            print('PASS trigger emits only change signals to both participants')
            await c.execute(text('UPDATE public.enquiries SET creator_read_revision=1 WHERE id=:id'),{'id':eid})
            after=(await c.execute(text('SELECT topic FROM realtime.messages WHERE topic=ANY(:topics)'),{'topics':['enquiries:'+creator,'enquiries:'+sender]})).scalars().all()
            assert len(after)==3 and after.count('enquiries:'+creator)==2 and after.count('enquiries:'+sender)==1
            print('PASS read acknowledgement notifies only the reader')
            await c.execute(text('UPDATE public.enquiries SET revision=2,creator_read_revision=2 WHERE id=:id'),{'id':eid})
            assert await c.scalar(text('SELECT count(*) FROM realtime.messages WHERE topic=ANY(:topics)'),{'topics':['enquiries:'+creator,'enquiries:'+sender]})==5
            # Verify actual SELECT policies against the emitted rows under each JWT.
            for i,internal in enumerate([creator,sender,stranger]):
                await c.execute(text("SELECT set_config('request.jwt.claims', :claims, true), set_config('realtime.topic', :topic, true)"),{'claims':json.dumps({'sub':supa[i],'role':'authenticated'}),'topic':'enquiries:'+creator})
                await c.execute(text('SET LOCAL ROLE authenticated'))
                visible=await c.scalar(text('SELECT count(*) FROM realtime.messages WHERE topic=:topic'),{'topic':'enquiries:'+creator})
                assert visible==(3 if i==0 else 0),(i,visible)
                await c.execute(text('RESET ROLE'))
            print('PASS actual message RLS hides other accounts; reply broadcasts reach both')
        finally:
            await tx.rollback()
            assert await c.scalar(text('SELECT count(*) FROM realtime.messages WHERE topic=ANY(:topics)'),{'topics':['enquiries:'+creator,'enquiries:'+sender]})==0
            print('PASS rollback removes test records and unpublished signals')
    await engine.dispose()



@pytest.mark.skipif(os.environ.get("FLENZR_TEST_REALTIME_POSTGRES") != "1",
                    reason="Opt-in: requires migrated PostgreSQL")
@pytest.mark.asyncio
async def test_concurrent_withdrawal_and_accept_have_exactly_one_winner():
    import asyncio
    from fastapi import Depends, Header
    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import delete
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    from app.core.database import get_db
    from app.core.dependencies import get_current_user
    from app.domains.creators.models import Creator
    from app.domains.enquiries.models import Enquiry
    from app.domains.identity.models import User
    from app.main import app

    creator_id, sender_id, profile_id, enquiry_id = [uid() for _ in range(4)]
    both_loaded = asyncio.Event()
    arrivals = 0

    class RacingSession(AsyncSession):
        async def scalar(self, statement, *args, **kwargs):
            nonlocal arrivals
            result = await super().scalar(statement, *args, **kwargs)
            # Hold both real API handlers after they read the same pending row,
            # before either executes its update. Each has a separate transaction.
            if isinstance(result, Enquiry):
                arrivals += 1
                if arrivals == 2:
                    both_loaded.set()
                await asyncio.wait_for(both_loaded.wait(), timeout=15)
            return result

    normal = async_sessionmaker(engine, expire_on_commit=False)
    racing = async_sessionmaker(engine, class_=RacingSession, expire_on_commit=False)

    async def database():
        async with racing() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def participant(x_test_user: str = Header(), db=Depends(get_db)):
        return await db.get(User, x_test_user)

    try:
        async with normal() as db:
            db.add_all([User(id=user_id, supabase_uid=uid(), email=uid() + '@example.invalid')
                        for user_id in (creator_id, sender_id)])
            await db.flush()
            db.add(Creator(id=profile_id, user_id=creator_id, handle='race-' + uid(), display_name='Disposable race test'))
            await db.flush()
            db.add(Enquiry(id=enquiry_id, creator_id=profile_id, sender_id=sender_id,
                           request_id=uid(), payload_hash='0' * 64, brand_name='Disposable race test',
                           brief='Only a disposable concurrency test.', deliverable='1 video', amount_cents=100,
                           currency='INR', status='pending', revision=1, sender_read_revision=1,
                           creator_read_revision=0, history=[{'actor': 'brand', 'action': 'sent'}]))
            await db.commit()
        app.dependency_overrides[get_db] = database
        app.dependency_overrides[get_current_user] = participant
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            withdrawal, acceptance = await asyncio.gather(
                client.post(f'/api/v1/enquiries/{enquiry_id}/withdraw', headers={'x-test-user': sender_id},
                            json={'expected_revision': 1}),
                client.post(f'/api/v1/enquiries/{enquiry_id}/respond', headers={'x-test-user': creator_id},
                            json={'expected_revision': 1, 'action': 'accept'}),
            )
        assert sorted([withdrawal.status_code, acceptance.status_code]) == [200, 409]
        async with normal() as db:
            saved = await db.get(Enquiry, enquiry_id)
            assert saved.revision == 2 and len(saved.history) == 2
            assert saved.status == ('withdrawn' if withdrawal.status_code == 200 else 'accepted')
            from app.domains.notifications.models import Notification, NotificationEmail
            from sqlalchemy import select, func, text
            notification = await db.scalar(select(Notification).where(Notification.enquiry_id == enquiry_id))
            assert notification.enquiry_revision == 2
            assert notification.user_id == (creator_id if withdrawal.status_code == 200 else sender_id)
            assert await db.scalar(select(func.count()).select_from(NotificationEmail).where(
                NotificationEmail.notification_id == notification.id)) == 1
            # Even the recipient cannot bypass the API to read the private tables.
            recipient = await db.get(User, notification.user_id)
            await db.execute(text("SELECT set_config('request.jwt.claims', :claims, true)"),
                             {'claims': json.dumps({'sub': recipient.supabase_uid, 'role': 'authenticated'})})
            await db.execute(text('SET LOCAL ROLE authenticated'))
            assert await db.scalar(text('SELECT count(*) FROM public.notifications')) == 0
            assert await db.scalar(text('SELECT count(*) FROM public.notification_emails')) == 0
            await db.execute(text('RESET ROLE'))
    finally:
        app.dependency_overrides.clear()
        async with normal() as db:
            await db.execute(delete(User).where(User.id.in_([creator_id, sender_id])))
            await db.commit()
        await engine.dispose()


@pytest.mark.skipif(os.environ.get("FLENZR_TEST_REALTIME_POSTGRES") != "1",
                    reason="Opt-in: requires migrated PostgreSQL")
@pytest.mark.asyncio
async def test_concurrent_new_requests_obey_shared_sender_cooldown(monkeypatch):
    import asyncio
    from fastapi import Depends, Header
    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import delete, func, select
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.core.config import settings
    from app.core.database import get_db
    from app.core.dependencies import get_current_user
    from app.domains.creators.models import Creator
    from app.domains.enquiries.models import Enquiry
    from app.domains.identity.models import User, UserRole, SystemRole
    from app.domains.notifications.models import Notification, NotificationEmail
    from app.main import app

    monkeypatch.setattr(settings, 'ENQUIRY_SEND_COOLDOWN_SECONDS', 30)
    monkeypatch.setattr(settings, 'ENQUIRY_CREATOR_DAILY_LIMIT', 3)
    monkeypatch.setattr(settings, 'ENQUIRY_BLOCK_DUPLICATES', True)
    creator_id, sender_id, profile_id = [uid() for _ in range(3)]
    handle = 'cooldown-' + uid()
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def database():
        async with factory() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    async def participant(x_test_user: str = Header(), db=Depends(get_db)):
        return await db.get(User, x_test_user)

    try:
        async with factory() as db:
            db.add(User(id=creator_id, supabase_uid=uid(), email=uid() + '@example.invalid'))
            db.add(User(id=sender_id, supabase_uid=uid(), email=uid() + '@example.invalid',
                        roles=[UserRole(role=SystemRole.BRAND_OWNER)]))
            await db.flush()
            db.add(Creator(id=profile_id, user_id=creator_id, handle=handle, display_name='Disposable cooldown test'))
            await db.commit()
        app.dependency_overrides[get_db] = database
        app.dependency_overrides[get_current_user] = participant
        body = {'creator_handle': handle, 'brand_name': 'Cooldown test', 'brief': 'A disposable cross-worker enquiry test.',
                'deliverable': '1 video', 'currency': 'INR'}
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            responses = await asyncio.gather(*[
                client.post('/api/v1/enquiries', headers={'x-test-user': sender_id},
                            json={**body, 'request_id': uid(), 'amount_cents': 100 + i * 100}) for i in range(2)])
            assert sorted(response.status_code for response in responses) == [201, 429]
            blocked = next(response for response in responses if response.status_code == 429)
            assert blocked.json()['error']['code'] == 'ENQUIRY_COOLDOWN'
            assert 1 <= int(blocked.headers['retry-after']) <= 30
        async with factory() as db:
            assert await db.scalar(select(func.count()).select_from(Enquiry).where(Enquiry.sender_id == sender_id)) == 1
            assert await db.scalar(select(func.count()).select_from(Notification).where(Notification.enquiry_id.in_(
                select(Enquiry.id).where(Enquiry.sender_id == sender_id)))) == 2
            assert await db.scalar(select(func.count()).select_from(NotificationEmail).join(Notification).where(
                Notification.enquiry_id.in_(select(Enquiry.id).where(Enquiry.sender_id == sender_id)))) == 2
    finally:
        app.dependency_overrides.clear()
        async with factory() as db:
            await db.execute(delete(User).where(User.id.in_([creator_id, sender_id])))
            await db.commit()
        await engine.dispose()
