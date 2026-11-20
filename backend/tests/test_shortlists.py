import uuid
import pytest
from sqlalchemy import select,func
from app.domains.shortlists.models import BrandShortlist,BrandShortlistMember
from app.domains.creators.models import Creator
from app.domains.identity.models import User
from test_campaign_lifecycle import setup_brand

async def setup(client,auth_headers):
    owner=await setup_brand(client,auth_headers,'shortlist-owner')
    other=await setup_brand(client,auth_headers,'shortlist-other')
    creator=auth_headers(sub='shortlist-creator',email='shortlist-creator@example.com')
    profile=(await client.get('/api/v1/creators/me',headers=creator)).json()
    return owner,other,creator,profile

async def create(client,headers,name='Launch creators',id=None):
    return await client.post('/api/v1/shortlists',headers=headers,json={'request_id':id or str(uuid.uuid4()),'name':name})

@pytest.mark.asyncio
async def test_shortlist_lifecycle_private_live_profiles_and_safe_membership_retry(client,auth_headers,db_session):
    owner,other,creator,profile=await setup(client,auth_headers)
    id=str(uuid.uuid4());response=await create(client,owner,'  Launch   creators  ',id)
    assert response.status_code==201,response.text
    group=response.json();assert group['name']=='Launch creators' and group['members_count']==0
    assert (await create(client,owner,'Launch creators',id)).json()['id']==id
    assert (await create(client,owner,'launch CREATORS')).status_code==409
    assert (await create(client,other,'Launch creators',id)).status_code==409
    assert (await create(client,other,'Launch creators')).status_code==201
    base='/api/v1/shortlists/'+id
    assert (await client.get(base,headers=other)).status_code==404
    assert (await client.get(base+'/members',headers=other)).status_code==404
    assert (await client.get(base+'/members',headers=creator)).status_code==403
    assert (await client.get('/api/v1/shortlists')).status_code==401
    assert (await client.post('/api/v1/shortlists',headers=creator,json={'request_id':str(uuid.uuid4()),'name':'Forbidden'})).status_code==403
    target=base+'/creators/'+profile['handle']
    assert (await client.get(target,headers=owner)).json() is None
    assert (await client.put(target,headers=other)).status_code==404
    saved=await client.put(target,headers=owner)
    assert saved.status_code==200,saved.text
    member=saved.json()
    assert (await client.put(target,headers=owner)).json()['id']==member['id']
    assert (await client.get(base,headers=owner)).json()['members_count']==1
    assert await db_session.scalar(select(func.count()).select_from(BrandShortlistMember))==1
    # Public fields are read live; private credentials and account email are never projected.
    row=await db_session.get(Creator,profile['id']);row.display_name='Updated public creator';row.bio='Current public bio';row.social_credentials={'secret':'must-not-leak'};await db_session.commit()
    page=(await client.get(base+'/members',headers=owner)).json()
    assert page['items'][0]['creator']['display_name']=='Updated public creator'
    assert set(page['items'][0])=={'id','saved_at','creator'}
    assert set(page['items'][0]['creator'])=={'handle','display_name','bio','niche','location','is_verified','rating'}
    assert 'must-not-leak' not in str(page)
    second=(await create(client,owner,'Second group')).json()
    assert (await client.put('/api/v1/shortlists/'+second['id']+'/creators/'+profile['handle'],headers=owner)).status_code==200
    # Removing an ID through a different group cannot remove the original membership.
    assert (await client.delete('/api/v1/shortlists/'+second['id']+'/members/'+member['id'],headers=owner)).status_code==204
    assert (await client.get(base,headers=owner)).json()['members_count']==1
    assert (await client.delete(base+'/members/'+member['id'],headers=other)).status_code==404
    for _ in range(2):assert (await client.delete(base+'/members/'+member['id'],headers=owner)).status_code==204
    assert (await client.get(base+'/members',headers=owner)).json()['total']==0
    assert (await client.delete('/api/v1/shortlists/'+second['id'],headers=owner)).status_code==204
    assert await db_session.scalar(select(func.count()).select_from(BrandShortlistMember))==0
    assert await db_session.get(Creator,profile['id']) is not None

@pytest.mark.asyncio
async def test_shortlist_pagination_literal_search_and_org_isolation(client,auth_headers):
    owner,other,creator,profile=await setup(client,auth_headers)
    groups=[]
    for name in ['Launch %_ group','Technology','Fashion']:
        response=await create(client,owner,name);assert response.status_code==201,response.text;groups.append(response.json())
    await create(client,other,'Other organization')
    page=(await client.get('/api/v1/shortlists?page_size=1',headers=owner)).json()
    assert page['total']==3 and len(page['items'])==1
    nextpage=(await client.get('/api/v1/shortlists?page_size=1&page=2',headers=owner)).json()
    assert nextpage['items'][0]['id']!=page['items'][0]['id']
    assert (await client.get('/api/v1/shortlists?q=%25_',headers=owner)).json()['total']==1
    assert (await client.get('/api/v1/shortlists?q=TECH',headers=owner)).json()['total']==1
    assert (await client.get('/api/v1/shortlists?page=99',headers=owner)).json()['items']==[]
    assert (await client.get('/api/v1/shortlists',headers=other)).json()['total']==1
    for query in ['page=0','page_size=51']:
        assert (await client.get('/api/v1/shortlists?'+query,headers=owner)).status_code==422
    base='/api/v1/shortlists/'+groups[0]['id']
    assert (await client.put(base+'/creators/'+profile['handle'],headers=owner)).status_code==200
    assert (await client.get(base+'/members?page_size=1',headers=owner)).json()['total']==1
    assert (await client.get(base+'/members?page=2&page_size=1',headers=owner)).json()['items']==[]
    assert (await client.delete(base,headers=other)).status_code==404

@pytest.mark.asyncio
async def test_unavailable_creator_is_redacted_and_removable(client,auth_headers,db_session):
    owner,other,creator,profile=await setup(client,auth_headers)
    one=(await create(client,owner)).json();two=(await create(client,owner,'Second group')).json()
    path='/api/v1/shortlists/'+one['id']
    member=(await client.put(path+'/creators/'+profile['handle'],headers=owner)).json()
    row=await db_session.get(Creator,profile['id']);user=await db_session.get(User,row.user_id);user.is_active=False;await db_session.commit()
    page=(await client.get(path+'/members',headers=owner)).json();assert page['total']==1 and page['items'][0]['creator'] is None
    assert (await client.put(path+'/creators/'+profile['handle'],headers=owner)).json()['creator'] is None
    assert (await client.put('/api/v1/shortlists/'+two['id']+'/creators/'+profile['handle'],headers=owner)).status_code==404
    assert (await client.delete(path+'/members/'+member['id'],headers=owner)).status_code==204
    assert (await client.put(path+'/creators/missing',headers=owner)).status_code==404

@pytest.mark.asyncio
@pytest.mark.parametrize('body',[{'name':' '},{'name':'x'*81},{'name':'a\0b'},{'name':'Valid','organization_id':'forged'},{'name':'Valid','request_id':'invalid'}])
async def test_shortlist_validation_rejects_empty_long_and_forged_fields(client,auth_headers,body):
    owner,other,creator,profile=await setup(client,auth_headers)
    assert (await client.post('/api/v1/shortlists',headers=owner,json={'request_id':str(uuid.uuid4()),**body})).status_code==422
