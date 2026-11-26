import base64
import json
from datetime import datetime, timezone
from uuid import uuid4
import pytest
from sqlalchemy import select, update
from app.domains.collaborations.models import Collaboration, ProposalRevision, ProposalAcceptance, CollaborationAgreement, DeliverySubmission, DeliveryReview, PublishingProof
from test_proof_confirmations import recorded, confirm_body
from test_completions import completion_body
from test_proposals import collaboration, save, send_body, terms
from test_collaboration_feedback import payload as feedback_body


async def history(client, actor, base, **params):
    response = await client.get(base+'/activity', headers=actor, params=params)
    assert response.status_code == 200, response.text
    assert response.headers['cache-control'] == 'no-store'
    return response.json()


@pytest.mark.asyncio
async def test_saved_milestones_show_the_same_history_to_both_participants_without_private_payloads(client, auth_headers, db_session):
    brand, creator, outsider, path, agreement, delivery, review, proof_path, proof = await recorded(client, auth_headers, db_session)
    base=path.removesuffix('/deliveries')
    body=confirm_body()
    assert (await client.post(proof_path+'/'+proof['id']+'/confirm',headers=brand,json=body)).status_code==200
    assert (await client.post(proof_path+'/'+proof['id']+'/confirm',headers=brand,json=body)).status_code==200
    complete=completion_body(delivery,review)
    done=(await client.post(base+'/complete',headers=brand,json=complete)).json()
    assert (await client.post(base+'/complete',headers=brand,json=complete)).status_code==200
    before=(await client.get('/api/v1/notifications/unread-count',headers=creator)).json()
    first=await history(client,brand,base)
    second=await history(client,creator,base)
    assert [r['id'] for r in first['items']]==[r['id'] for r in second['items']]
    assert len(first['items'])==10 and first['next_cursor'] is None
    assert [r['kind'] for r in first['items']].count('proposal_accepted')==2
    for kind in ['collaboration_started','proposal_sent','agreement_confirmed','delivery_submitted','delivery_approved','proof_submitted','proof_confirmed','collaboration_completed']:
        assert len([r for r in first['items'] if r['kind']==kind])==1
    proposal=next(r for r in first['items'] if r['kind']=='proposal_sent')
    assert proposal['actor_role']=='brand' and proposal['is_mine'] and proposal['version']==1
    assert not next(r for r in second['items'] if r['id']==proposal['id'])['is_mine']
    started=next(r for r in first['items'] if r['kind']=='collaboration_started')
    assert started['actor_role'] is None and started['actor_name']=='Actor not recorded'
    agreed=next(r for r in first['items'] if r['kind']=='agreement_confirmed')
    assert agreed['actor_role']=='both' and agreed['actor_name']=='Both participants'
    assert all(set(r)=={'id','kind','title','description','actor_role','actor_name','is_mine','version','occurred_at','section'} for r in first['items'])
    dates=[datetime.fromisoformat(r['occurred_at']) for r in first['items']]
    assert dates==sorted(dates,reverse=True)
    # Chat, call summaries, private reviews and read receipts stay out of history.
    await client.post(base+'/messages',headers=creator,json={'request_id':str(uuid4()),'text':'PRIVATE MESSAGE'})
    await client.post(base+'/feedback',headers=creator,json=feedback_body(done,comment='PRIVATE REVIEW'))
    assert (await history(client,creator,base))==second
    assert (await client.get('/api/v1/notifications/unread-count',headers=creator)).json()==before
    assert (await client.get(base+'/agreement',headers=brand)).json()['id']==agreement['id']
    assert (await client.get(base,headers=brand)).json()['status']=='completed'
    assert (await client.get(base+'/activity',headers=outsider)).status_code==404
    assert (await client.get(base+'/activity')).status_code==401
    for method in ['POST','PUT','DELETE']:
        assert (await client.request(method,base+'/activity',headers=brand,json={})).status_code==405


@pytest.mark.asyncio
async def test_cursor_pages_are_stable_for_equal_timestamps_and_new_events(client, auth_headers, db_session):
    brand, creator, outsider, path, agreement, delivery, review, _, _ = await recorded(client, auth_headers, db_session)
    base=path.removesuffix('/deliveries')
    tied=datetime(2026,11,1,12,tzinfo=timezone.utc)
    # Fixture-only timestamps: cover deterministic rank/id ties on SQLite too.
    for model in [Collaboration,ProposalRevision,ProposalAcceptance,CollaborationAgreement,DeliverySubmission,DeliveryReview,PublishingProof]:
        await db_session.execute(update(model).values(created_at=tied))
    await db_session.commit()
    expected=(await history(client,brand,base))['items']
    gathered=[];cursor=None
    while True:
        page=await history(client,brand,base,limit=2,**({'before':cursor} if cursor else {}))
        assert len(page['items'])<=2
        gathered.extend(page['items'])
        cursor=page['next_cursor']
        if not cursor:break
    assert [r['id'] for r in gathered]==[r['id'] for r in expected]
    assert len({r['id'] for r in gathered})==len(expected)
    # A new latest event does not shift older pages or repeat an existing one.
    first=await history(client,creator,base,limit=2)
    complete=completion_body(delivery,review)
    assert (await client.post(base+'/complete',headers=brand,json=complete)).status_code==200
    older=await history(client,creator,base,limit=50,before=first['next_cursor'])
    assert [r['id'] for r in older['items']]==[r['id'] for r in expected[2:]]
    assert (await history(client,creator,base))['items'][0]['kind']=='collaboration_completed'


@pytest.mark.asyncio
async def test_private_and_failed_proposals_do_not_appear_in_history(client, auth_headers, db_session):
    brand,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    base=path.removesuffix('/proposals')
    initial=await history(client,brand,base)
    assert len(initial['items'])==1
    assert (await save(client,brand,path,terms(note='PRIVATE DRAFT'))).status_code==200
    assert await history(client,creator,base)==initial
    body=send_body()
    assert (await client.post(path+'/send',headers=outsider,json=body)).status_code==404
    assert await history(client,brand,base)==initial
    assert (await client.post(path+'/send',headers=brand,json=body)).status_code==200
    assert (await client.post(path+'/send',headers=brand,json=body)).status_code==200
    saved=await history(client,creator,base)
    assert len(saved['items'])==2 and 'PRIVATE DRAFT' not in json.dumps(saved)
    # Invalid cursor cannot bypass participant checks or reveal another record.
    assert (await client.get(base+'/activity?before=bad',headers=outsider)).status_code==404


@pytest.mark.asyncio
@pytest.mark.parametrize('query',['?limit=0','?limit=51','?limit=no','?before=','?before=not-base64',
    '?before='+base64.urlsafe_b64encode(b'{}').decode(),
    '?before='+base64.urlsafe_b64encode(json.dumps(['2026-11-01T12:00:00',0,'x']).encode()).decode(),
    '?before='+base64.urlsafe_b64encode(json.dumps(['2026-11-01T12:00:00+00:00',True,'x']).encode()).decode(),
    '?before='+'x'*501])
async def test_activity_rejects_invalid_limits_and_cursors(client,auth_headers,db_session,query):
    brand,_,_,path=await collaboration(client,auth_headers,db_session)
    response=await client.get(path.removesuffix('/proposals')+'/activity'+query,headers=brand)
    assert response.status_code in (400,422),response.text
