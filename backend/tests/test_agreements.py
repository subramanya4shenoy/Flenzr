import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import Collaboration, CollaborationAgreement, ProposalRevision, ProposalAcceptance
from test_proposals import collaboration, save, send_body, terms


async def sent(client,auth_headers,db):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db)
    assert (await save(client,owner,path)).status_code==200
    body=send_body()
    row=(await client.post(path+'/send',headers=owner,json=body)).json()
    return owner,creator,outsider,path,row,body


def acceptance(row):
    return {'proposal_id':row['id'],'expected_version':row['version'],'confirmed':True}


@pytest.mark.parametrize('creator_first',[True,False])
@pytest.mark.asyncio
async def test_both_explicit_acceptances_create_same_immutable_downloadable_snapshot(client,auth_headers,db_session,creator_first):
    owner,creator,outsider,path,row,send_request=await sent(client,auth_headers,db_session)
    one,two=(creator,owner) if creator_first else (owner,creator)
    workspace=(await client.get(path,headers=owner)).json()
    assert not workspace['acceptance']['you_accepted'] and workspace['agreement'] is None
    first=await client.post(path+'/accept',headers=one,json=acceptance(row))
    assert first.status_code==200,first.text
    assert first.json()['acceptance']['you_accepted'] and first.json()['agreement'] is None
    assert (await client.post(path+'/accept',headers=one,json=acceptance(row))).json()==first.json()
    result=await client.post(path+'/accept',headers=two,json=acceptance(row))
    assert result.status_code==200,result.text
    agreement=result.json()['agreement'];assert agreement is not None
    assert result.json()['collaboration_status']=='agreed'
    assert agreement['snapshot']['terms']==row['terms']
    assert agreement['snapshot']['proposal_version']==1
    assert agreement['snapshot']['brand_accepted_at'] and agreement['snapshot']['creator_accepted_at']
    canonical=json.dumps(agreement['snapshot'],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
    assert hashlib.sha256(canonical).hexdigest()==agreement['snapshot_hash']
    for actor in (owner,creator):
        replay=(await client.post(path+'/accept',headers=actor,json=acceptance(row))).json()
        assert replay['agreement']==agreement
        assert (await client.get(path.removesuffix('/proposals')+'/agreement',headers=actor)).json()==agreement
        assert (await client.get(path,headers=actor)).json()['agreement']==agreement
        assert (await client.get(path.removesuffix('/proposals'),headers=actor)).json()['status']=='agreed'
        assert (await save(client,actor,path,version=1)).status_code==409
        assert (await client.post(path+'/send',headers=actor,json=send_body(version=1))).status_code==409
    # A replay of the original send remains safe after agreement and cannot change it.
    assert (await client.post(path+'/send',headers=owner,json=send_request)).json()==row
    record=await db_session.scalar(select(Collaboration))
    record.title='Later source context change';await db_session.commit()
    assert (await client.get(path.removesuffix('/proposals')+'/agreement',headers=creator)).json()==agreement
    assert await db_session.scalar(select(func.count()).select_from(CollaborationAgreement))==1
    assert await db_session.scalar(select(func.count()).select_from(ProposalAcceptance))==2


@pytest.mark.asyncio
async def test_new_version_requires_fresh_acceptances_and_stale_acceptance_cannot_agree(client,auth_headers,db_session):
    owner,creator,outsider,path,row,_=await sent(client,auth_headers,db_session)
    assert (await client.post(path+'/accept',headers=owner,json=acceptance(row))).status_code==200
    assert (await save(client,creator,path,terms(amount_cents=54321),version=1)).status_code==200
    second=(await client.post(path+'/send',headers=creator,json=send_body(version=1))).json()
    state=(await client.get(path,headers=owner)).json()
    assert state['acceptance']['brand_accepted_at'] is None and state['acceptance']['creator_accepted_at'] is None
    for actor in (owner,creator):
        assert (await client.post(path+'/accept',headers=actor,json=acceptance(row))).status_code==409
    assert (await client.post(path+'/accept',headers=creator,json=acceptance(second))).json()['agreement'] is None
    assert (await client.post(path+'/accept',headers=owner,json=acceptance(second))).json()['agreement']['snapshot']['terms']['amount_cents']==54321
    assert await db_session.scalar(select(func.count()).select_from(ProposalAcceptance))==3


@pytest.mark.asyncio
async def test_acceptance_authorization_exact_version_and_explicit_confirmation(client,auth_headers,db_session):
    owner,creator,outsider,path,row,_=await sent(client,auth_headers,db_session)
    for headers,code in [({},401),(outsider,404)]:
        assert (await client.post(path+'/accept',headers=headers,json=acceptance(row))).status_code==code
        assert (await client.get(path.removesuffix('/proposals')+'/agreement',headers=headers)).status_code==code
    assert (await client.get(path.removesuffix('/proposals')+'/agreement',headers=owner)).status_code==404
    for override in ({'confirmed':False},{'confirmed':1},{'user_id':'forged'},{'terms':terms()},{'expected_version':True}):
        assert (await client.post(path+'/accept',headers=owner,json={**acceptance(row),**override})).status_code==422
    for override in ({'proposal_id':str(uuid.uuid4())},{'expected_version':2}):
        assert (await client.post(path+'/accept',headers=owner,json={**acceptance(row),**override})).status_code==409
    assert await db_session.scalar(select(func.count()).select_from(ProposalAcceptance))==0


@pytest.mark.asyncio
async def test_expired_proposal_cannot_be_newly_accepted_but_completed_agreement_remains(client,auth_headers,db_session):
    owner,creator,outsider,path,row,_=await sent(client,auth_headers,db_session)
    source=await db_session.get(ProposalRevision,row['id'])
    old=source.terms;source.terms={**old,'delivery_date':(datetime.now(timezone.utc).date()-timedelta(days=1)).isoformat()}
    await db_session.commit()
    assert not (await client.get(path,headers=owner)).json()['acceptance']['can_accept']
    assert (await client.post(path+'/accept',headers=owner,json=acceptance(row))).status_code==409
    source.terms={**old,'delivery_date':datetime.now(timezone.utc).date().isoformat()};await db_session.commit()
    for actor in (owner,creator):
        assert (await client.post(path+'/accept',headers=actor,json=acceptance(row))).status_code==200
    assert (await client.get(path.removesuffix('/proposals')+'/agreement',headers=owner)).status_code==200
