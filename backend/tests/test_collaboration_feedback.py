import uuid
import pytest
from sqlalchemy import select, func
from app.domains.collaborations.models import CollaborationFeedback, Collaboration
from app.domains.creators.models import Creator
from test_completions import approved, completion_body
from test_deliveries import agreed


async def completed(client, auth_headers, db):
    brand, creator, outsider, delivery_path, agreement, row, review = await approved(client, auth_headers, db)
    base = delivery_path.removesuffix('/deliveries')
    response = await client.post(base+'/complete', headers=brand, json=completion_body(row, review))
    assert response.status_code == 200, response.text
    return brand, creator, outsider, base+'/feedback', agreement, response.json()


def payload(completion, **changes):
    return dict(request_id=str(uuid.uuid4()), completion_id=completion['id'], rating=4,
                comment='Clear communication and a thoughtful collaboration.', confirmed=True) | changes


@pytest.mark.asyncio
async def test_both_participants_can_leave_one_private_review_with_safe_retries(client, auth_headers, db_session):
    brand, creator, outsider, path, agreement, completion = await completed(client, auth_headers, db_session)
    public_ratings_before = (await db_session.execute(select(Creator.id, Creator.rating))).all()
    for actor, role, target in ((brand,'brand','creator'),(creator,'creator','brand')):
        state = (await client.get(path, headers=actor)).json()
        assert state['can_submit'] and state['items'] == []
        assert state['your_role'] == role and state['recipient_role'] == target
        assert state['completion_id'] == completion['id'] and state['visibility'] == 'participants_only'
    body = payload(completion, comment='  Clear scope and <script>plain text only</script>.  ')
    response = await client.post(path, headers=brand, json=body)
    assert response.status_code == 200, response.text
    brand_review = response.json()
    assert brand_review['is_mine'] and brand_review['rating'] == 4
    assert brand_review['comment'] == body['comment'].strip() and brand_review['author_role'] == 'brand'
    assert not {'author_id','recipient_id','request_id','request_hash'} & brand_review.keys()
    assert brand_review['submitted_at'].endswith('+00:00')
    assert response.headers['cache-control'] == 'no-store'
    assert (await client.post(path, headers=brand, json=body)).json() == brand_review
    assert (await client.post(path, headers=brand, json=payload(completion))).status_code == 409
    assert (await client.post(path, headers=brand, json=body | {'rating':1})).status_code == 409
    own = (await client.get(path, headers=brand)).json()
    other = (await client.get(path, headers=creator)).json()
    assert not own['can_submit'] and other['can_submit']
    assert own['items'][0] == brand_review
    assert other['items'][0] == brand_review | {'is_mine':False}
    creator_body=payload(completion,rating=5,comment='Fast and specific review feedback. Thank you!')
    creator_review=(await client.post(path,headers=creator,json=creator_body)).json()
    assert creator_review['is_mine'] and creator_review['author_role']=='creator'
    assert (await client.post(path,headers=brand,json=body)).json()==brand_review
    for actor in (brand,creator):
        state=(await client.get(path,headers=actor)).json()
        assert len(state['items'])==2 and not state['can_submit']
        assert sum(row['is_mine'] for row in state['items'])==1
        assert (await client.get(path.removesuffix('/feedback')+'/agreement',headers=actor)).json()==agreement
        deliveries=(await client.get(path.removesuffix('/feedback')+'/deliveries',headers=actor)).json()
        assert deliveries['completion']==completion and deliveries['collaboration_status']=='completed'
    assert await db_session.scalar(select(func.count()).select_from(CollaborationFeedback))==2
    assert (await db_session.execute(select(Creator.id, Creator.rating))).all() == public_ratings_before


@pytest.mark.asyncio
async def test_feedback_requires_saved_completion_and_rejects_other_receipt(client,auth_headers,db_session):
    brand,creator,outsider,deliveries,agreement=await agreed(client,auth_headers,db_session)
    path=deliveries.removesuffix('/deliveries')+'/feedback'
    for actor in (brand,creator):
        state=(await client.get(path,headers=actor)).json()
        assert not state['can_submit'] and state['items']==[] and state['completion_id'] is None
        assert (await client.post(path,headers=actor,json=payload({'id':str(uuid.uuid4())}))).status_code==409
    # A status label alone cannot manufacture a completion receipt.
    corrupt = await db_session.get(Collaboration, path.split('/')[-2])
    corrupt.status = 'completed'; await db_session.commit()
    assert not (await client.get(path, headers=creator)).json()['can_submit']
    assert (await client.post(path, headers=creator, json=payload({'id':str(uuid.uuid4())}))).status_code == 409
    brand,creator,outsider,path,agreement,completion=await completed(client,auth_headers,db_session)
    assert (await client.post(path,headers=creator,json=payload(completion,completion_id=str(uuid.uuid4())))).status_code==409
    assert await db_session.scalar(select(func.count()).select_from(CollaborationFeedback))==0


@pytest.mark.asyncio
async def test_feedback_auth_scope_spoofing_and_no_edit_endpoints(client,auth_headers,db_session):
    brand,creator,outsider,path,agreement,completion=await completed(client,auth_headers,db_session)
    body=payload(completion)
    for actor,code in (({},401),(outsider,404)):
        assert (await client.get(path,headers=actor)).status_code==code
        assert (await client.post(path,headers=actor,json=body)).status_code==code
    for field in ('author_id','recipient_id','author_role','visibility','moderation_status','is_mine'):
        assert (await client.post(path,headers=creator,json=body|{field:'forged'})).status_code==422
    assert (await client.put(path,headers=creator,json=body)).status_code==405
    assert (await client.delete(path,headers=creator)).status_code==405
    assert (await client.post(path,headers=creator,json=body)).status_code==200


@pytest.mark.parametrize('changes',[{'rating':0},{'rating':6},{'rating':True},{'rating':'5'},{'rating':3.5},
    {'comment':'  too short  '},{'comment':' ' * 50},{'comment':'x'*2001},{'comment':1234},
    {'comment':'Normal text\x00unsafe'},{'confirmed':False},{'confirmed':'true'},{'completion_id':'bad'},{'request_id':'bad'}])
@pytest.mark.asyncio
async def test_feedback_validation(client,auth_headers,db_session,changes):
    brand,creator,outsider,path,agreement,completion=await completed(client,auth_headers,db_session)
    response=await client.post(path,headers=creator,json=payload(completion,**changes))
    assert response.status_code==422,response.text
    assert await db_session.scalar(select(func.count()).select_from(CollaborationFeedback))==0


@pytest.mark.asyncio
async def test_self_review_is_not_eligible_even_with_corrupt_participant_pair(client,auth_headers,db_session):
    brand,creator,outsider,path,agreement,completion=await completed(client,auth_headers,db_session)
    collab=await db_session.get(Collaboration,path.split('/')[-2])
    collab.creator_user_id=collab.brand_user_id;await db_session.commit()
    assert not (await client.get(path,headers=brand)).json()['can_submit']
    response=await client.post(path,headers=brand,json=payload(completion))
    assert response.status_code==409 and response.json()['error']['code']=='FEEDBACK_SELF_REVIEW'
