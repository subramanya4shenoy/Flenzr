import pytest
from datetime import date
from sqlalchemy import select
from app.domains.collaborations.models import Collaboration, CollaborationAgreement, ProposalRevision
from app.domains.creators.models import Creator
from test_completions import approved, completion_body
from test_proposals import collaboration, save


@pytest.mark.asyncio
async def test_calendar_from_agreed_date_for_both_participants_and_completion(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db_session)
    due=agreement['snapshot']['terms']['delivery_date']; month=due[:7]; day=int(due[-2:]);url='/api/v1/collaborations/calendar?month='+month
    before=None
    # Source-requested date must not replace the mutually agreed deadline.
    collab=await db_session.scalar(select(Collaboration).where(Collaboration.id==path.split('/')[-2]))
    collab.requested_delivery_date=date(1999,1,1);await db_session.commit()
    for actor in (owner,creator):
        response=await client.get(url,headers=actor);assert response.status_code==200,response.text
        data=response.json(); assert data['total']==data['month_total']==1 and data['day_counts']==[{'delivery_date':due,'total':1}]
        item=data['items'][0];assert item['delivery_date']==due and item['deliverables']==agreement['snapshot']['terms']['deliverables']
        assert item['status']=='agreed' and item['completed_at'] is None
        assert not {'brand_user_id','creator_user_id','snapshot','request_id'} & item.keys()
        assert (await client.get(url+'&day='+str(day),headers=actor)).json()['items']==data['items']
        other=day-1 if day>1 else day+1
        filtered=(await client.get(url+'&day='+str(other),headers=actor)).json()
        assert filtered['items']==[] and filtered['total']==0 and filtered['month_total']==1 and filtered['day_counts']==data['day_counts']
        if before is None:before=data
        else:assert before==data
    assert (await client.get(url,headers=outsider)).json()['items']==[]
    assert (await client.get(url)).status_code==401
    receipt=(await client.post(path.removesuffix('/deliveries')+'/complete',headers=owner,json=completion_body(row,review))).json()
    for actor in (owner,creator):
        data=(await client.get(url,headers=actor)).json()
        assert data['items'][0]['status']=='completed' and data['items'][0]['completed_at']==receipt['completed_at']
        assert data['day_counts']==before['day_counts']
    assert (await client.get('/api/v1/collaborations/calendar?month=1999-01',headers=owner)).json()['items']==[]


@pytest.mark.asyncio
async def test_discussion_and_proposal_dates_are_not_calendar_commitments(client,auth_headers,db_session):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    saved=await save(client,owner,path)
    month=saved.json()['terms']['delivery_date'][:7]
    for actor in (owner,creator):
        data=(await client.get('/api/v1/collaborations/calendar?month='+month,headers=actor)).json()
        assert data['items']==data['day_counts']==[] and data['month_total']==0


@pytest.mark.parametrize('query',['month=2026-2','month=2026-13','month=1899-12','month=9999-01','month=2026-02&day=29','month=2026-04&day=31','month=2026-01&day=0','month=2026-01&page=0','month=2026-01&page_size=51','month=2026-01&day=abc'])
@pytest.mark.asyncio
async def test_calendar_validation(client,auth_headers,db_session,query):
    owner,creator,outsider,path=await collaboration(client,auth_headers,db_session)
    assert (await client.get('/api/v1/collaborations/calendar?'+query,headers=owner)).status_code==422


@pytest.mark.asyncio
async def test_calendar_pagination_keeps_month_counts_and_orders_dates(client,auth_headers,db_session):
    owner,creator,outsider,path,agreement,row,review=await approved(client,auth_headers,db_session)
    # Add more agreed records for the same participants without changing the saved agreement.
    original=await db_session.scalar(select(Collaboration).where(Collaboration.id==path.split('/')[-2]))
    for index,day in enumerate((2,15,15)):
        from app.domains.enquiries.models import Enquiry
        import uuid
        source=Enquiry(creator_id=await db_session.scalar(select(Creator.id).where(Creator.user_id==original.creator_user_id)),sender_id=original.brand_user_id,request_id=str(uuid.uuid4()),payload_hash='a'*64,brand_name='Brand',brief='brief',deliverable='reel',currency='INR',status='accepted')
        db_session.add(source);await db_session.flush()
        collab=Collaboration(brand_user_id=original.brand_user_id,creator_user_id=original.creator_user_id,enquiry_id=source.id,title='Calendar '+str(index),brand_name='Brand',creator_name='Creator',brief='brief',deliverable='reel',currency='INR',status='agreed')
        db_session.add(collab);await db_session.flush()
        snap={**agreement['snapshot'],'title':collab.title,'terms':{**agreement['snapshot']['terms'],'delivery_date':f'2028-02-{day:02}'}}
        proposal=ProposalRevision(collaboration_id=collab.id,author_id=original.brand_user_id,version=1,request_id=str(uuid.uuid4()),request_hash='a'*64,terms=snap['terms'])
        db_session.add(proposal);await db_session.flush()
        db_session.add(CollaborationAgreement(collaboration_id=collab.id,proposal_id=proposal.id,snapshot=snap,snapshot_hash='test'))
    await db_session.commit()
    url='/api/v1/collaborations/calendar?month=2028-02&page_size=1'
    one=(await client.get(url,headers=owner)).json();two=(await client.get(url+'&page=2',headers=owner)).json()
    assert one['month_total']==one['total']==3 and len(one['items'])==len(two['items'])==1
    assert one['items'][0]['delivery_date']=='2028-02-02' and two['items'][0]['delivery_date']=='2028-02-15'
    assert one['day_counts']==two['day_counts']==[{'delivery_date':'2028-02-02','total':1},{'delivery_date':'2028-02-15','total':2}]
    filtered=(await client.get(url+'&day=15&page=2',headers=creator)).json()
    assert filtered['total']==2 and filtered['month_total']==3 and len(filtered['items'])==1
    assert (await client.get(url+'&page=8',headers=owner)).json()['items']==[]


@pytest.mark.asyncio
async def test_calendar_tracks_only_current_delivery_and_outstanding_work(client,auth_headers,db_session):
    from test_deliveries import agreed, payload
    from test_delivery_reviews import review_body
    owner,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    due=agreement['snapshot']['terms']['delivery_date'];url='/api/v1/collaborations/calendar?month='+due[:7]
    async def check(state,version,outstanding):
        for actor in (owner,creator):
            data=(await client.get(url,headers=actor)).json()
            assert data['items'][0]['delivery_state']==state and data['items'][0]['latest_delivery_version']==version
            assert data['outstanding_counts']==([{'delivery_date':due,'total':1}] if outstanding else [])
            assert data['day_counts']==[{'delivery_date':due,'total':1}]
    await check('not_submitted',0,True)
    first=(await client.post(path,headers=creator,json=payload(agreement['id']))).json()
    await check('awaiting_review',1,False)
    await client.post(path+'/'+first['id']+'/review',headers=owner,json=review_body('request_revision'))
    await check('revisions_requested',1,True)
    second=(await client.post(path,headers=creator,json=payload(agreement['id'],version=1))).json()
    await check('awaiting_review',2,False)
    approval=(await client.post(path+'/'+second['id']+'/review',headers=owner,json=review_body(version=2))).json()
    await check('approved',2,False)
    # An earlier approval must not hide outstanding review on a newer submission.
    third=(await client.post(path,headers=creator,json=payload(agreement['id'],version=2))).json()
    await check('awaiting_review',3,False)
    latest=(await client.post(path+'/'+third['id']+'/review',headers=owner,json=review_body(version=3))).json()
    await client.post(path.removesuffix('/deliveries')+'/complete',headers=owner,json=completion_body(third,latest))
    await check('completed',3,False)
    assert (await client.get(url,headers=outsider)).json()['outstanding_counts']==[]
