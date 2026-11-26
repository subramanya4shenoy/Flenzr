"""Opt-in native UNION/keyset check using isolated cloned event tables."""
import os
from datetime import datetime, timezone
from uuid import uuid4
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.config import settings
from app.core.exceptions import EntityNotFoundError
from app.domains.collaborations.activity import CollaborationActivity
from app.domains.collaborations.models import (
    Collaboration, ProposalRevision, ProposalAcceptance, CollaborationAgreement,
    DeliverySubmission, DeliveryReview, PublishingProof, PublishingProofConfirmation,
    CollaborationCompletion, ScopeChange, ScopeDecision,
)


@pytest.mark.skipif(os.getenv('FLENZR_TEST_ACTIVITY_POSTGRES')!='1',reason='Opt-in PostgreSQL activity check')
@pytest.mark.asyncio
async def test_native_activity_union_ties_pagination_and_scope():
    engine=create_async_engine(settings.DATABASE_URL)
    schema='flenzr_activity_'+uuid4().hex
    uid=lambda:str(uuid4())
    at=datetime(2026,11,1,12,tzinfo=timezone.utc)
    try:
        async with engine.connect() as connection:
            transaction=await connection.begin()
            try:
                await connection.execute(text(f'CREATE SCHEMA {schema}'))
                await connection.execute(text(f'SET LOCAL search_path TO {schema},public'))
                for model in [Collaboration,ProposalRevision,ProposalAcceptance,CollaborationAgreement,DeliverySubmission,DeliveryReview,PublishingProof,PublishingProofConfirmation,CollaborationCompletion,ScopeChange,ScopeDecision]:
                    await connection.execute(text(f'CREATE TABLE {schema}.{model.__tablename__} (LIKE public.{model.__tablename__} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))
                async with AsyncSession(bind=connection,expire_on_commit=False) as db:
                    brand,creator,outsider=uid(),uid(),uid()
                    collab=Collaboration(id=uid(),brand_user_id=brand,creator_user_id=creator,application_id=uid(),title='Native activity',brand_name='Native brand',creator_name='Native creator',brief='PRIVATE',deliverable='PRIVATE',currency='INR',status='completed',proposal_version=3,delivery_version=1,created_at=at)
                    db.add(collab)
                    proposals=[ProposalRevision(id=uid(),collaboration_id=collab.id,author_id=brand,version=n,terms={'note':'PRIVATE'},request_id=uid(),request_hash='x'*64,created_at=at) for n in range(1,4)]
                    db.add_all(proposals)
                    db.add_all([ProposalAcceptance(proposal_id=proposals[-1].id,user_id=user,created_at=at) for user in [brand,creator]])
                    agreement=CollaborationAgreement(id=uid(),collaboration_id=collab.id,proposal_id=proposals[-1].id,snapshot={'terms':'PRIVATE'},snapshot_hash='x'*64,created_at=at)
                    delivery=DeliverySubmission(id=uid(),collaboration_id=collab.id,agreement_id=agreement.id,creator_user_id=creator,version=1,title='PRIVATE',notes='PRIVATE',links=[],files=[],request_id=uid(),request_hash='x'*64,created_at=at)
                    review=DeliveryReview(id=uid(),collaboration_id=collab.id,delivery_id=delivery.id,reviewer_user_id=brand,decision='approved',feedback='PRIVATE',request_id=uid(),request_hash='x'*64,created_at=at)
                    proof=PublishingProof(id=uid(),collaboration_id=collab.id,agreement_id=agreement.id,delivery_id=delivery.id,review_id=review.id,creator_user_id=creator,version=1,notes='PRIVATE',links=[],request_id=uid(),request_hash='x'*64,created_at=at)
                    db.add_all([agreement,delivery,review,proof,
                        PublishingProofConfirmation(collaboration_id=collab.id,proof_id=proof.id,reviewer_user_id=brand,request_id=uid(),request_hash='x'*64,created_at=at),
                        CollaborationCompletion(collaboration_id=collab.id,agreement_id=agreement.id,delivery_id=delivery.id,review_id=review.id,completed_by=brand,request_id=uid(),request_hash='x'*64,created_at=at)])
                    await db.flush()
                    expected=await CollaborationActivity.read(db,brand,collab.id)
                    assert len(expected['items'])==12
                    assert expected['items'][0]['kind']=='collaboration_completed'
                    cursor=None;seen=[]
                    while True:
                        page=await CollaborationActivity.read(db,creator,collab.id,3,cursor)
                        seen.extend(row['id'] for row in page['items'])
                        cursor=page['next_cursor']
                        if not cursor:break
                    assert seen==[row['id'] for row in expected['items']]
                    assert len(set(seen))==12 and 'PRIVATE' not in str(expected)
                    with pytest.raises(EntityNotFoundError):
                        await CollaborationActivity.read(db,outsider,collab.id)
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()
