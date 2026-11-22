import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import CollaborationMessage
from test_deliveries import agreed
from test_agreements import sent
from test_collaboration_feedback import completed


def message(text='Could you clarify the planned delivery format?', **changes):
    return dict(request_id=str(uuid.uuid4()), text=text) | changes


@pytest.mark.asyncio
async def test_participant_conversation_replay_and_stable_pagination(client,auth_headers,db_session):
    brand,creator,outsider,deliveries,agreement=await agreed(client,auth_headers,db_session)
    path=deliveries.removesuffix('/deliveries')+'/messages'
    assert (await client.get(path,headers=brand)).json()['items']==[]
    first=message('  Hello creator!\nPlease confirm the format.  ')
    r=await client.post(path,headers=brand,json=first);assert r.status_code==200,r.text
    saved=r.json();assert saved['text']==first['text'].strip() and saved['sequence']==1 and saved['is_mine']
    assert not {'author_id','request_id','request_hash'} & saved.keys()
    assert r.headers['cache-control']=='no-store'
    assert (await client.post(path,headers=brand,json=first)).json()==saved
    assert (await client.post(path,headers=brand,json=first|{'text':'Changed message'})).status_code==409
    for n in range(2,8):
        r=await client.post(path,headers=creator if n%2==0 else brand,json=message(f'Message {n}'));assert r.json()['sequence']==n
    latest=(await client.get(path+'?limit=3',headers=creator)).json()
    assert [m['sequence'] for m in latest['items']]==[5,6,7] and latest['next_before']==5
    # A new arrival cannot shift the stable cursor for older messages.
    await client.post(path,headers=brand,json=message('New arrival'))
    older=(await client.get(path+'?limit=3&before=5',headers=creator)).json()
    assert [m['sequence'] for m in older['items']]==[2,3,4] and older['latest_sequence']==8
    oldest=(await client.get(path+'?limit=3&before=2',headers=creator)).json()
    assert oldest['items'][0]==saved|{'is_mine':False} and oldest['next_before'] is None
    assert (await client.get(deliveries.removesuffix('/deliveries')+'/agreement',headers=brand)).json()==agreement
    assert (await client.get(deliveries,headers=brand)).json()['total']==0
    assert await db_session.scalar(select(func.count()).select_from(CollaborationMessage))==8


@pytest.mark.asyncio
async def test_private_scope_and_no_forged_actors_or_edits(client,auth_headers,db_session):
    brand,creator,outsider,deliveries,agreement=await agreed(client,auth_headers,db_session)
    path=deliveries.removesuffix('/deliveries')+'/messages'
    for actor,code in (({},401),(outsider,404)):
        assert (await client.get(path,headers=actor)).status_code==code
        assert (await client.post(path,headers=actor,json=message())).status_code==code
    for key in ('author_id','author_role','sequence','is_mine','collaboration_id'):
        assert (await client.post(path,headers=creator,json=message(**{key:'forged'}))).status_code==422
    assert (await client.put(path,headers=creator,json=message())).status_code==405
    assert (await client.delete(path,headers=creator)).status_code==405


@pytest.mark.parametrize('body',[{'text':' '},{'text':'x'*4001},{'text':'hello\0hidden'},{'text':3},{'request_id':'bad'}])
@pytest.mark.asyncio
async def test_message_validation(client,auth_headers,db_session,body):
    brand,creator,outsider,deliveries,agreement=await agreed(client,auth_headers,db_session)
    assert (await client.post(deliveries.removesuffix('/deliveries')+'/messages',headers=creator,json=message()|body)).status_code==422
    assert await db_session.scalar(select(func.count()).select_from(CollaborationMessage))==0


@pytest.mark.asyncio
async def test_messages_work_before_agreement_and_after_completion_without_changing_terms(client,auth_headers,db_session):
    brand,creator,outsider,proposals,proposal,_=await sent(client,auth_headers,db_session)
    path=proposals.removesuffix('/proposals')+'/messages'
    assert (await client.post(path,headers=creator,json=message('Can we discuss usage rights?'))).status_code==200
    assert (await client.get(proposals,headers=creator)).json()['latest_version']==1
    brand,creator,outsider,feedback,agreement,completion=await completed(client,auth_headers,db_session)
    base=feedback.removesuffix('/feedback')
    assert (await client.post(base+'/messages',headers=creator,json=message('Thanks for the collaboration!'))).status_code==200
    assert (await client.get(base+'/deliveries',headers=brand)).json()['completion']==completion


@pytest.mark.parametrize('query',['?limit=0','?limit=51','?before=0','?before=nope'])
@pytest.mark.asyncio
async def test_bounded_pagination(client,auth_headers,db_session,query):
    brand,creator,outsider,deliveries,agreement=await agreed(client,auth_headers,db_session)
    assert (await client.get(deliveries.removesuffix('/deliveries')+'/messages'+query,headers=creator)).status_code==422


@pytest.mark.asyncio
async def test_chat_read_receipts_reactions_call_events_and_signals(client,auth_headers,db_session):
    brand,creator,outsider,deliveries,agreement=await agreed(client,auth_headers,db_session)
    base=deliveries.removesuffix('/deliveries')
    msg=(await client.post(base+'/messages',headers=brand,json=message('Hey there 👋'))).json()
    assert msg['message_type']=='text' and msg['reactions']==[]
    # Creator marks message read -> brand sees peer_last_read_sequence == 1
    rd=await client.post(base+'/messages/read',headers=creator,json={'last_read_sequence':1})
    assert rd.status_code==200 and rd.json()['last_read_sequence']==1
    brand_view=(await client.get(base+'/messages',headers=brand)).json()
    assert brand_view['meta']['peer_last_read_sequence']==1
    # Emoji reaction toggle on and off
    r1=await client.post(f"{base}/messages/{msg['id']}/reactions",headers=creator,json={'emoji':'❤️'})
    assert r1.status_code==200 and r1.json()==[{'emoji':'❤️','count':1,'reacted_by_me':True}]
    r2=await client.post(f"{base}/messages/{msg['id']}/reactions",headers=creator,json={'emoji':'❤️'})
    assert r2.status_code==200 and r2.json()==[]
    # Call event message + ephemeral signal (outsider denied)
    call_msg=await client.post(base+'/messages',headers=brand,json=message('Video call · 2m 10s',message_type='call_event'))
    assert call_msg.status_code==200 and call_msg.json()['message_type']=='call_event'
    assert (await client.post(base+'/chat/signal',headers=brand,json={'kind':'typing','payload':{'active':True}})).status_code==200
    assert (await client.post(base+'/chat/signal',headers=outsider,json={'kind':'typing','payload':{'active':True}})).status_code==404
