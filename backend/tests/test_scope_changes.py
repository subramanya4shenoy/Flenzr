from datetime import datetime,timedelta,timezone
from uuid import uuid4
import pytest
from sqlalchemy import func,select
from app.domains.collaborations.models import CollaborationAgreement,ScopeChange,ScopeDecision
from test_deliveries import agreed,payload
from test_completions import approved,completion_body
from test_delivery_reviews import review_body
from test_publishing_proof import proof_body


async def scope_request(client,actor,base,**changes):
    state=(await client.get(base+'/scope-changes',headers=actor)).json()
    terms=dict(state['current_agreement']['snapshot']['terms'])
    terms.update(amount_cents=54321,deliverables='Two original review videos',revision_limit=2,
                 delivery_date=(datetime.now(timezone.utc).date()+timedelta(days=15)).isoformat())
    return dict(request_id=str(uuid4()),expected_agreement_id=state['current_agreement']['id'],
                expected_work_state=state['work_state'],terms=terms,reason='Additional video and revised delivery schedule.',confirmed=True,**changes)


def decision(action='accept',**changes):
    return dict(request_id=str(uuid4()),action=action,confirmed=True,**changes)


@pytest.mark.asyncio
async def test_mutual_scope_change_saves_new_immutable_revision_and_preserves_original(client,auth_headers,db_session):
    brand,creator,outsider,path,original=await agreed(client,auth_headers,db_session)
    base=path.removesuffix('/deliveries')
    body=await scope_request(client,brand,base)
    first=await client.post(base+'/scope-changes',headers=brand,json=body)
    assert first.status_code==200,first.text
    row=first.json();assert row['can_withdraw'] and not row['can_accept'] and row['is_mine']
    assert (await client.post(base+'/scope-changes',headers=brand,json=body)).json()['id']==row['id']
    assert (await client.get(base+'/agreement',headers=creator)).json()==original
    assert (await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=brand,json=decision())).status_code==403
    other=(await client.get(base+'/scope-changes',headers=creator)).json()
    assert other['pending']['can_accept'] and not other['pending']['is_mine'] and not other['can_propose']
    request=decision()
    accepted=await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=creator,json=request)
    assert accepted.status_code==200,accepted.text
    latest=accepted.json()['agreement']
    assert latest['id']!=original['id'] and latest['revision']==2
    assert latest['snapshot']['terms']==body['terms'] and latest['snapshot']['schema_version']==2
    assert latest['snapshot']['scope_change']['base_snapshot_hash']==original['snapshot_hash']
    assert latest['snapshot']['scope_change']['base_agreement_id']==original['id']
    assert (await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=creator,json=request)).json()['agreement']==latest
    assert (await client.get(base+'/agreement',headers=brand)).json()==latest
    assert (await client.get(base+'/agreements/'+original['id'],headers=creator)).json()==original
    history=(await client.get(base+'/agreements',headers=brand)).json()
    assert [a['revision'] for a in history]==[2,1]
    assert await db_session.scalar(select(func.count()).select_from(CollaborationAgreement))==2
    assert await db_session.scalar(select(func.count()).select_from(ScopeDecision))==1
    assert (await client.get(base+'/scope-changes',headers=outsider)).status_code==404
    assert (await client.get(base+'/agreements',headers=outsider)).status_code==404
    assert (await client.get(base+'/agreements/'+original['id'],headers=outsider)).status_code==404
    assert (await client.post(base+'/scope-changes',headers=outsider,json=body)).status_code==404
    assert (await client.get(base+'/scope-changes')).status_code==401
    events=(await client.get(base+'/activity',headers=brand)).json()['items']
    assert [e['kind'] for e in events[:2]]==['scope_accepted','scope_proposed']
    notices=(await client.get('/api/v1/notifications',headers=brand)).json()
    assert len([n for n in notices if n['kind']=='scope_accepted'])==1


@pytest.mark.asyncio
@pytest.mark.parametrize('action,proposer_role',[('decline','brand'),('withdraw','creator')])
async def test_decline_withdraw_and_role_rules_leave_agreement_unchanged(client,auth_headers,db_session,action,proposer_role):
    brand,creator,_,path,agreement=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    proposer=brand if proposer_role=='brand' else creator
    reviewer=creator if proposer_role=='brand' else brand
    body=await scope_request(client,proposer,base)
    row=(await client.post(base+'/scope-changes',headers=proposer,json=body)).json()
    endpoint=base+'/scope-changes/'+row['id']+'/decide'
    actor=proposer if action=='withdraw' else reviewer
    wrong=reviewer if action=='withdraw' else proposer
    assert (await client.post(endpoint,headers=wrong,json=decision(action))).status_code==403
    request=decision(action,note='Please keep the existing scope.')
    assert (await client.post(endpoint,headers=actor,json=request)).status_code==200
    assert (await client.post(endpoint,headers=actor,json=request)).status_code==200
    assert (await client.post(endpoint,headers=reviewer,json=decision())).status_code==409
    assert (await client.get(base+'/agreement',headers=proposer)).json()==agreement
    assert (await client.get(base+'/scope-changes',headers=proposer)).json()['can_propose']


@pytest.mark.asyncio
async def test_work_changes_make_pending_request_stale_without_freezing_existing_work(client,auth_headers,db_session):
    brand,creator,_,path,agreement=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    body=await scope_request(client,brand,base)
    row=(await client.post(base+'/scope-changes',headers=brand,json=body)).json()
    # Publishing a request does not freeze work under the current agreement.
    delivery=await client.post(path,headers=creator,json=payload(agreement['id']))
    assert delivery.status_code==200,delivery.text
    state=(await client.get(base+'/scope-changes',headers=creator)).json()
    assert state['pending']['stale'] and not state['pending']['can_accept'] and state['pending']['can_decline']
    assert (await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=creator,json=decision())).status_code==409
    assert (await client.post(base+'/scope-changes',headers=brand,json=body|{'request_id':str(uuid4())})).status_code==409
    assert (await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=brand,json=decision('withdraw'))).status_code==200
    assert (await client.get(base+'/agreement',headers=brand)).json()==agreement


@pytest.mark.asyncio
async def test_accepted_change_requires_fresh_delivery_review_proof_and_calendar_date(client,auth_headers,db_session):
    brand,creator,_,path,original,old_delivery,old_review=await approved(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    body=await scope_request(client,creator,base)
    row=(await client.post(base+'/scope-changes',headers=creator,json=body)).json()
    agreed_change=await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=brand,json=decision())
    assert agreed_change.status_code==200,agreed_change.text
    agreement=agreed_change.json()['agreement']
    ws=(await client.get(path,headers=brand)).json()
    assert not ws['can_complete'] and not ws['can_review'] and ws['agreement_id']==agreement['id']
    assert ws['items'][0]['agreement_id']==original['id'] and ws['items'][0]['review']==old_review
    assert (await client.post(base+'/complete',headers=brand,json=completion_body(old_delivery,old_review))).status_code==409
    assert (await client.post(base+'/publishing-proof',headers=creator,json=proof_body(old_delivery,old_review))).status_code==409
    assert (await client.post(path,headers=creator,json=payload(original['id'],version=1))).status_code==409
    month=body['terms']['delivery_date'][:7]
    calendar=(await client.get('/api/v1/collaborations/calendar?month='+month,headers=creator)).json()
    assert calendar['total']==1 and calendar['items'][0]['agreement_id']==agreement['id']
    assert calendar['items'][0]['delivery_date']==body['terms']['delivery_date'] and calendar['items'][0]['delivery_state']=='not_submitted'
    assert sum(r['total'] for r in calendar['outstanding_counts'])==1
    new_delivery=(await client.post(path,headers=creator,json=payload(agreement['id'],version=1))).json()
    response=await client.post(path+'/'+new_delivery['id']+'/review',headers=brand,json=review_body(version=2))
    assert response.status_code==200,response.text
    review=response.json()
    done=await client.post(base+'/complete',headers=brand,json=completion_body(new_delivery,review))
    assert done.status_code==200,done.text
    assert (await client.get(path,headers=brand)).json()['revision_allowance']['limit']==2
    assert (await client.post(base+'/scope-changes',headers=creator,json=await scope_request(client,creator,base))).status_code==409


@pytest.mark.asyncio
@pytest.mark.parametrize('change',[{'confirmed':False},{'confirmed':1},{'confirmed':'true'},{'reason':'x'},{'actor_id':'forged'}])
async def test_scope_input_cannot_forge_consent_or_actor(client,auth_headers,db_session,change):
    brand,creator,_,path,_=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    body=await scope_request(client,brand,base)
    assert (await client.post(base+'/scope-changes',headers=brand,json=body|change)).status_code==422
    assert await db_session.scalar(select(func.count()).select_from(ScopeChange))==0


@pytest.mark.asyncio
async def test_notification_failure_rolls_back_new_agreement_and_decision(client,auth_headers,db_session,monkeypatch):
    from app.domains.collaborations import scope_changes
    brand,creator,_,path,agreement=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    row=(await client.post(base+'/scope-changes',headers=brand,json=await scope_request(client,brand,base))).json()
    async def fail(*args,**kwargs):raise RuntimeError('notification failed')
    monkeypatch.setattr(scope_changes,'record_collaboration_notification',fail)
    with pytest.raises(RuntimeError):await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=creator,json=decision())
    await db_session.rollback()
    assert await db_session.scalar(select(func.count()).select_from(CollaborationAgreement))==1
    assert await db_session.scalar(select(func.count()).select_from(ScopeDecision))==0
    assert (await client.get(base+'/agreement',headers=brand)).json()==agreement


@pytest.mark.asyncio
@pytest.mark.parametrize('invalid',['currency','past_date','no_allowance','unchanged'])
async def test_invalid_or_unchanged_terms_do_not_publish(client,auth_headers,db_session,invalid):
    brand,creator,_,path,agreement=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    body=await scope_request(client,brand,base)
    if invalid=='currency':body['terms']['currency']='USD'
    if invalid=='past_date':body['terms']['delivery_date']='2020-01-01'
    if invalid=='no_allowance':body['terms'].pop('revision_limit')
    if invalid=='unchanged':
        # First establish terms with an explicit allowance, then compare them exactly.
        first=(await client.post(base+'/scope-changes',headers=brand,json=body)).json()
        await client.post(base+'/scope-changes/'+first['id']+'/decide',headers=creator,json=decision())
        body=await scope_request(client,brand,base)
    assert (await client.post(base+'/scope-changes',headers=brand,json=body)).status_code==422


@pytest.mark.asyncio
async def test_two_accepted_changes_have_a_hash_chain_and_mismatched_retries_conflict(client,auth_headers,db_session):
    brand,creator,_,path,original=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    agreements=[original]
    for n in [1,2]:
        body=await scope_request(client,brand,base);body['terms']['amount_cents']+=n*1000
        row=(await client.post(base+'/scope-changes',headers=brand,json=body)).json()
        assert (await client.post(base+'/scope-changes',headers=brand,json=body|{'reason':'Different scope request reason'})).status_code==409
        consent=decision();endpoint=base+'/scope-changes/'+row['id']+'/decide'
        accepted=await client.post(endpoint,headers=creator,json=consent)
        assert accepted.status_code==200,accepted.text
        current=accepted.json()['agreement'];assert current['revision']==n+1
        assert current['snapshot']['scope_change']['base_snapshot_hash']==agreements[-1]['snapshot_hash']
        agreements.append(current)
        assert (await client.post(endpoint,headers=creator,json=consent|{'action':'decline'})).status_code==409
    assert [r['id'] for r in (await client.get(base+'/agreements',headers=creator)).json()]==[r['id'] for r in reversed(agreements)]
    for agreement in agreements:assert (await client.get(base+'/agreements/'+agreement['id'],headers=brand)).json()==agreement


@pytest.mark.asyncio
async def test_review_change_stales_a_request_and_pending_can_close_after_completion(client,auth_headers,db_session):
    from test_delivery_reviews import submitted
    brand,creator,_,path,agreement,delivery=await submitted(client,auth_headers,db_session);base=path.removesuffix('/deliveries')
    row=(await client.post(base+'/scope-changes',headers=creator,json=await scope_request(client,creator,base))).json()
    reviewed=(await client.post(path+'/'+delivery['id']+'/review',headers=brand,json=review_body())).json()
    assert (await client.get(base+'/scope-changes',headers=brand)).json()['pending']['stale']
    assert (await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=brand,json=decision())).status_code==409
    assert (await client.post(base+'/complete',headers=brand,json=completion_body(delivery,reviewed))).status_code==200
    assert (await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=creator,json=decision('withdraw'))).status_code==200
    assert (await client.get(base,headers=creator)).json()['status']=='completed'


@pytest.mark.asyncio
async def test_old_draft_uploads_cannot_be_reused_under_revised_scope(client,auth_headers,db_session):
    from app.domains.collaborations.models import CollaborationFile,Collaboration
    brand,creator,_,path,original=await agreed(client,auth_headers,db_session);base=path.removesuffix('/deliveries');record=base.split('/')[-1]
    collab=await db_session.get(Collaboration,record)
    file=CollaborationFile(collaboration_id=record,agreement_id=original['id'],creator_user_id=collab.creator_user_id,object_key='isolated/'+str(uuid4()),filename='scope.png',content_type='image/png',size_bytes=100,state='ready',request_id=str(uuid4()))
    db_session.add(file);await db_session.commit();await db_session.refresh(file)
    assert len((await client.get(base+'/files',headers=creator)).json())==1
    row=(await client.post(base+'/scope-changes',headers=brand,json=await scope_request(client,brand,base))).json()
    accepted=(await client.post(base+'/scope-changes/'+row['id']+'/decide',headers=creator,json=decision())).json()
    assert (await client.get(base+'/files',headers=creator)).json()==[]
    assert (await client.post(path,headers=creator,json=payload(accepted['agreement']['id'],file_ids=[file.id]))).status_code==409
    assert (await client.post(base+'/files',headers=creator,json=dict(request_id=str(uuid4()),agreement_id=original['id'],filename='scope.png',content_type='image/png',size_bytes=100))).status_code==409


@pytest.mark.asyncio
async def test_grouped_status_and_old_confirmed_proof_follow_current_agreement(client,auth_headers,db_session):
    from test_proof_confirmations import recorded,confirm_body
    from app.domains.collaborations.models import Collaboration
    from app.domains.campaigns.models import CampaignApplication
    brand,creator,_,path,original,old_delivery,old_review,proof_path,old_proof=await recorded(client,auth_headers,db_session)
    assert (await client.post(proof_path+'/'+old_proof['id']+'/confirm',headers=brand,json=confirm_body())).status_code==200
    base=path.removesuffix('/deliveries');record=base.split('/')[-1]
    collab=await db_session.get(Collaboration,record);application=await db_session.get(CampaignApplication,collab.application_id)
    group_path='/api/v1/collaborations/offers/'+application.campaign_id
    async def participant():
        response=await client.get(group_path,headers=brand);assert response.status_code==200,response.text
        return next(p for p in response.json()['participants'] if p['collaboration_id']==record)
    assert (await participant())['proof_status']=='confirmed'
    request=(await client.post(base+'/scope-changes',headers=brand,json=await scope_request(client,brand,base))).json()
    updated=(await client.post(base+'/scope-changes/'+request['id']+'/decide',headers=creator,json=decision())).json()['agreement']
    current=await participant();assert current['delivery_status']=='awaiting_submission' and current['proof_status']=='locked'
    proof_state=(await client.get(proof_path,headers=creator)).json()
    assert proof_state['current_agreement_id']==updated['id'] and proof_state['eligible_delivery'] is None
    assert proof_state['items'][0]['confirmation'] is not None and proof_state['items'][0]['agreement_id']==original['id']
    delivery=(await client.post(path,headers=creator,json=payload(updated['id'],version=1))).json()
    review=(await client.post(path+'/'+delivery['id']+'/review',headers=brand,json=review_body(version=2))).json()
    current=await participant();assert current['delivery_status']=='approved' and current['proof_status']=='awaiting_proof'
    proof=(await client.post(proof_path,headers=creator,json=proof_body(delivery,review,version=1))).json()
    assert proof['version']==2 and proof['agreement_id']==updated['id']
    assert (await participant())['proof_status']=='awaiting_confirmation'
    assert (await client.post(proof_path+'/'+proof['id']+'/confirm',headers=brand,json=confirm_body(version=2))).status_code==200
    assert (await participant())['proof_status']=='confirmed'
