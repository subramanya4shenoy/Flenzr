"""Disposable migration, concurrent consent, immutable history and RLS checks."""
import asyncio
import importlib.util
import json
import os
from datetime import datetime,timedelta,timezone
from pathlib import Path
from uuid import uuid4
import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import select,text,func
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession,create_async_engine
from app.core.config import settings
from app.core.database import Base
from app.core.exceptions import FlenzrException
from app.domains.collaborations.models import Collaboration,CollaborationAgreement,ProposalRevision,ScopeChange,ScopeDecision
from app.domains.collaborations.scope_changes import ScopeChanges
from app.domains.collaborations.schemas import ScopeChangeCreate,ScopeDecisionCreate
from app.domains.collaborations.agreements import snapshot_hash


def migration(name):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).parents[1]/'alembic/versions'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


@pytest.mark.skipif(os.getenv('FLENZR_TEST_SCOPE_POSTGRES')!='1',reason='Opt-in native scope-change check')
@pytest.mark.asyncio
async def test_scope_migration_races_immutability_and_database_privacy():
    assert 'postgresql' in settings.DATABASE_URL
    schema='flenzr_scope_'+uuid4().hex;browser='scope_browser_'+uuid4().hex
    engine=create_async_engine(settings.DATABASE_URL,pool_size=5,max_overflow=0)
    old=migration('0019_agreements.py');new=migration('0035_scope_changes.py')
    brand,creator=str(uuid4()),str(uuid4());record,proposal,agreement_id=[str(uuid4()) for _ in range(3)]
    terms=dict(amount_cents=10000,currency='INR',deliverables='One original video',delivery_date=(datetime.now(timezone.utc).date()+timedelta(days=20)).isoformat(),usage_rights='Organic reposting for thirty days',note='',revision_limit=1)
    now=datetime.now(timezone.utc).isoformat()
    snapshot=dict(schema_version=1,collaboration_id=record,proposal_id=proposal,proposal_version=1,title='Native scope',brand_name='Native brand',creator_name='Native creator',source_kind='application',source_id=str(uuid4()),terms=terms,proposal_sent_at=now,brand_accepted_at=now,creator_accepted_at=now,agreed_at=now)
    checksum=snapshot_hash(snapshot)
    async def call(callback):
        async with engine.connect() as connection:
            await connection.execute(text(f'SET search_path TO {schema},public'));await connection.commit()
            async with AsyncSession(bind=connection,expire_on_commit=False) as db:return await callback(db)
    def apply(connection,module,method):
        with Operations.context(MigrationContext.configure(connection,opts={'target_metadata':Base.metadata})):getattr(module,method)()
    try:
        async with engine.begin() as c:
            await c.execute(text(f'CREATE SCHEMA {schema}'))
            await c.execute(text(f'SET LOCAL search_path TO {schema},public'))
            for table in ['users','collaborations','collaboration_proposal_revisions','collaboration_deliveries','collaboration_delivery_reviews','collaboration_publishing_proofs','collaboration_proof_confirmations','notifications']:
                await c.execute(text(f'CREATE TABLE {schema}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))
            await c.run_sync(lambda sync:apply(sync,old,'upgrade'))
            await c.execute(text('INSERT INTO users (id,supabase_uid,email,full_name,is_active,is_superadmin,created_at,updated_at) VALUES (:brand,:brand,\'scope-brand@example.com\',\'Brand\',true,false,now(),now()),(:creator,:creator,\'scope-creator@example.com\',\'Creator\',true,false,now(),now())'),dict(brand=brand,creator=creator))
            async with AsyncSession(bind=c,expire_on_commit=False) as db:
                db.add(Collaboration(id=record,brand_user_id=brand,creator_user_id=creator,application_id=snapshot['source_id'],title='Native scope',brand_name='Native brand',creator_name='Native creator',brief='Private',deliverable='One video',currency='INR',status='agreed',proposal_version=1))
                db.add(ProposalRevision(id=proposal,collaboration_id=record,author_id=brand,version=1,terms=terms,request_id=str(uuid4()),request_hash='x'*64));await db.flush()
            await c.execute(text('INSERT INTO collaboration_agreements (id,collaboration_id,proposal_id,snapshot,snapshot_hash) VALUES (:id,:record,:proposal,CAST(:snapshot AS json),:checksum)'),dict(id=agreement_id,record=record,proposal=proposal,snapshot=json.dumps(snapshot),checksum=checksum))
            await c.run_sync(lambda sync:apply(sync,new,'upgrade'))
            assert (await c.execute(text('SELECT revision,snapshot_hash FROM collaboration_agreements'))).one()==(1,checksum)
            # A no-amendment rollback/upgrade preserves the old immutable agreement.
            await c.run_sync(lambda sync:apply(sync,new,'downgrade'))
            await c.run_sync(lambda sync:apply(sync,new,'upgrade'))
        state=await call(lambda db:ScopeChanges.workspace(db,brand,record))
        bodies={actor:ScopeChangeCreate(request_id=uuid4(),expected_agreement_id=agreement_id,expected_work_state=state['work_state'],terms=terms|{'amount_cents':20000},reason='Additional scope for two videos.',confirmed=True) for actor in [brand,creator]}
        async def propose(actor):
            try:return await call(lambda db:ScopeChanges.create(db,actor,record,bodies[actor]))
            except FlenzrException as error:return error
        outcomes=await asyncio.gather(propose(brand),propose(creator))
        assert sum(isinstance(row,dict) for row in outcomes)==1
        author=brand if isinstance(outcomes[0],dict) else creator;reviewer=creator if author==brand else brand
        request=outcomes[0] if author==brand else outcomes[1]
        assert (await propose(author))['id']==request['id']
        consent=ScopeDecisionCreate(request_id=uuid4(),action='accept',confirmed=True)
        decline=ScopeDecisionCreate(request_id=uuid4(),action='decline',confirmed=True)
        async def decide(body):
            try:return await call(lambda db:ScopeChanges.decide(db,reviewer,record,request['id'],body))
            except FlenzrException as error:return error
        outcomes=await asyncio.gather(decide(consent),decide(decline))
        assert sum(isinstance(row,dict) for row in outcomes)==1
        winner=consent if isinstance(outcomes[0],dict) else decline
        assert (await decide(winner))['decision']['action']==winner.action
        if winner.action!='accept':
            state=await call(lambda db:ScopeChanges.workspace(db,author,record))
            body=bodies[author].model_copy(update={'request_id':uuid4(),'expected_work_state':state['work_state']})
            request=await call(lambda db:ScopeChanges.create(db,author,record,body))
            consent=ScopeDecisionCreate(request_id=uuid4(),action='accept',confirmed=True)
            await call(lambda db:ScopeChanges.decide(db,reviewer,record,request['id'],consent))
        async def verify(db):
            agreements=(await db.scalars(select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id==record).order_by(CollaborationAgreement.revision))).all()
            assert len(agreements)==2 and agreements[0].snapshot==snapshot and agreements[0].snapshot_hash==checksum
            assert agreements[1].snapshot_hash==snapshot_hash(agreements[1].snapshot)
        await call(verify)
        async with engine.connect() as c:
            transaction=await c.begin()
            try:
                await c.execute(text(f'SET LOCAL search_path TO {schema},public'))
                # Downgrade must refuse to remove accepted immutable history.
                with pytest.raises(RuntimeError,match='Accepted scope changes exist'):
                    await c.run_sync(lambda sync:apply(sync,new,'downgrade'))
                for table in ['collaboration_scope_changes','collaboration_scope_decisions','collaboration_agreements']:
                    for command in [f'UPDATE {table} SET id=id',f'DELETE FROM {table}']:
                        point=await c.begin_nested()
                        with pytest.raises(DBAPIError) as error:await c.execute(text(command))
                        assert error.value.orig.sqlstate=='55000';await point.rollback()
                await c.execute(text(f'CREATE ROLE {browser} NOLOGIN'))
                await c.execute(text(f'GRANT USAGE ON SCHEMA {schema} TO {browser}'))
                await c.execute(text(f'GRANT SELECT,INSERT,UPDATE,DELETE ON collaboration_scope_changes,collaboration_scope_decisions,collaboration_agreements TO {browser}'))
                await c.execute(text(f'SET LOCAL ROLE {browser}'))
                for table in ['collaboration_scope_changes','collaboration_scope_decisions','collaboration_agreements']:
                    assert await c.scalar(text(f'SELECT count(*) FROM {table}'))==0
                    assert (await c.execute(text(f'UPDATE {table} SET id=id'))).rowcount==0
                    assert (await c.execute(text(f'DELETE FROM {table}'))).rowcount==0
                point=await c.begin_nested()
                with pytest.raises(DBAPIError) as error:
                    await c.execute(text("INSERT INTO collaboration_scope_changes (id,collaboration_id,base_agreement_id,author_id,version,terms,reason,work_state_hash,delivery_version,request_id,request_hash) VALUES (:id,:record,:agreement,:author,99,CAST(:terms AS json),'Forbidden browser request',:hash,0,:request,:hash)"),dict(id=str(uuid4()),record=record,agreement=agreement_id,author=brand,terms=json.dumps(terms),hash='x'*64,request=str(uuid4())))
                assert error.value.orig.sqlstate=='42501';await point.rollback()
            finally:await transaction.rollback()
    finally:
        async with engine.begin() as c:await c.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
