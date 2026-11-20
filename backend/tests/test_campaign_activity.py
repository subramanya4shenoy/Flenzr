import pytest
from sqlalchemy import select
from app.domains.campaigns.models import CampaignApplication, CampaignInvitation, ApplicationStatus, InvitationStatus
from test_campaign_lifecycle import setup_brand, complete_brief, transition


@pytest.mark.asyncio
async def test_activity_scope_pagination_history_and_fields(client, auth_headers, db_session):
    owner=await setup_brand(client,auth_headers,'activity-owner')
    other=await setup_brand(client,auth_headers,'activity-other')
    alice=auth_headers(sub='activity-alice',email='alice@example.com');bob=auth_headers(sub='activity-bob',email='bob@example.com')
    ids=[]
    for actor in (alice,bob):
        ids.append((await client.get('/api/v1/creators/me',headers=actor)).json()['id'])
    campaign=(await client.post('/api/v1/campaigns',headers=owner,json=complete_brief())).json()
    foreign=(await client.post('/api/v1/campaigns',headers=other,json=complete_brief())).json()
    for actor,cid in zip((alice,bob),ids):
        assert (await client.post(f"/api/v1/campaigns/{campaign['id']}/apply",headers=actor,json={'proposed_rate_cents':12345,'pitch_message':'Private pitch'})).status_code==201
        assert (await client.post(f"/api/v1/campaigns/{campaign['id']}/invite",headers=owner,json={'creator_id':cid,'offered_rate_cents':23456,'message':'Private invitation'})).status_code==201
    await client.post(f"/api/v1/campaigns/{foreign['id']}/apply",headers=alice,json={'proposed_rate_cents':1000})
    await client.post(f"/api/v1/campaigns/{foreign['id']}/invite",headers=other,json={'creator_id':ids[0],'offered_rate_cents':1000})
    app=await db_session.scalar(select(CampaignApplication).where(CampaignApplication.campaign_id==campaign['id'],CampaignApplication.creator_id==ids[0]))
    invite=await db_session.scalar(select(CampaignInvitation).where(CampaignInvitation.campaign_id==campaign['id'],CampaignInvitation.creator_id==ids[0]))
    app.status=ApplicationStatus.REJECTED;invite.status=InvitationStatus.DECLINED
    await db_session.commit()
    assert (await transition(client,owner,campaign,'close')).status_code==200
    for kind,amount,message,expected in [('applications',12345,'Private pitch','rejected'),('invitations',23456,'Private invitation','declined')]:
        prefix=f'/api/v1/campaigns/me/{kind}';cp=f'/api/v1/campaigns/creator/{kind}'
        response=await client.get(prefix,headers=owner,params={'page_size':1,'campaign_id':campaign['id']})
        assert response.status_code==200,response.text
        first=response.json();assert first['total']==2 and len(first['items'])==1
        second=(await client.get(prefix,headers=owner,params={'page_size':1,'page':2})).json()
        assert first['items'][0]['id']!=second['items'][0]['id']
        assert (await client.get(prefix,headers=owner,params={'page_size':1,'page':3})).json()['items']==[]
        own=(await client.get(cp,headers=alice,params={'campaign_id':campaign['id']})).json()
        assert own['total']==1
        item=own['items'][0]
        assert item['creator_id']==ids[0] and item['status']==expected and item['campaign_status']=='completed'
        assert item['rate_cents']==amount and item['message']==message and item['currency']=='INR'
        assert set(item)=={'id','campaign_id','campaign_title','campaign_status','campaign_revision','campaign_end_date','organization_name','creator_id','creator_name','creator_handle','currency','rate_cents','message','status','created_at','updated_at'}
        assert (await client.get(cp,headers=alice)).json()['total']==2
        assert (await client.get(cp,headers=bob)).json()['total']==1
        assert (await client.get(prefix,headers=other)).json()['total']==1
        assert (await client.get(prefix,headers=other,params={'campaign_id':campaign['id']})).status_code==403
        assert (await client.get(prefix,headers=alice)).status_code==403
        assert (await client.get(cp,headers=owner)).json()['items']==[]
        assert (await client.get(prefix)).status_code==401
        assert (await client.get(cp)).status_code==401
        assert (await client.get(prefix,headers=owner,params={'page_size':51})).status_code==422
        assert (await client.get(prefix,headers=owner,params={'page':0})).status_code==422
        assert (await client.get(cp,headers=bob,params={'campaign_id':foreign['id']})).json()['items']==[]


@pytest.mark.asyncio
async def test_activity_empty_and_unknown_campaign(client,auth_headers):
    owner=await setup_brand(client,auth_headers,'activity-empty')
    creator=auth_headers(sub='activity-empty-creator')
    await client.get('/api/v1/creators/me',headers=creator)
    for kind in ('applications','invitations'):
        for prefix,actor in [('me',owner),('creator',creator)]:
            response=await client.get(f'/api/v1/campaigns/{prefix}/{kind}',headers=actor)
            assert response.status_code==200,response.text
            assert response.json()=={'items':[],'total':0,'page':1,'page_size':20}
        assert (await client.get(f'/api/v1/campaigns/me/{kind}?campaign_id=missing',headers=owner)).status_code==404
