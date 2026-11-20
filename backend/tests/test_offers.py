import uuid
import pytest
from test_campaign_lifecycle import setup_brand, complete_brief, transition
from test_proposals import save, send_body, terms

async def actors(client, auth_headers):
    owner = await setup_brand(client, auth_headers, 'offer-owner')
    creators = [auth_headers(sub='offer-'+str(i), email=f'offer-{i}@example.com') for i in range(3)]
    profiles = [(await client.get('/api/v1/creators/me', headers=h)).json() for h in creators]
    return owner, creators, profiles

async def offer(client, owner, visibility='public'):
    r = await client.post('/api/v1/campaigns', headers=owner, json={**complete_brief(), 'visibility':visibility})
    assert r.status_code == 201, r.text
    return r.json()

async def apply(client, h, o, quote=10000):
    return await client.post(f"/api/v1/campaigns/{o['id']}/apply", headers=h, json={'proposed_rate_cents':quote, 'pitch_message':'A private creator pitch', 'expected_campaign_revision':o['revision']})

@pytest.mark.asyncio
async def test_public_offer_is_a_whitelist_and_private_offer_cannot_leak_or_be_applied_to(client, auth_headers):
    owner, creators, profiles = await actors(client, auth_headers)
    public = await offer(client, owner)
    r = await client.get(f"/api/v1/offers/{public['id']}/public")
    assert r.status_code == 200
    assert set(r.json()) == {'id','title','brief','brand_name','deliverables','niche','budget_cents','currency','starts_at','ends_at','status','visibility','revision','accepting'}
    private = await offer(client, owner, 'invited')
    for path in [f"/api/v1/offers/{private['id']}/public", f"/api/v1/offers/{private['id']}", f"/api/v1/campaigns/opportunities/{private['id']}"]:
        assert (await client.get(path, headers=creators[0])).status_code == 404
    assert (await apply(client, creators[0], private)).status_code == 404
    explore = (await client.get('/api/v1/campaigns/explore')).json()
    assert private['id'] not in [o['id'] for o in explore]
    opportunities = (await client.get('/api/v1/campaigns/opportunities', headers=creators[0])).json()['items']
    assert private['id'] not in [o['id'] for o in opportunities]
    invitation = await client.post(f"/api/v1/campaigns/{private['id']}/invite", headers=owner, json={'creator_id':profiles[0]['id'],'offered_rate_cents':10000,'expected_campaign_revision':private['revision']})
    assert invitation.status_code == 201, invitation.text
    assert (await client.get(f"/api/v1/offers/{private['id']}", headers=creators[0])).json()['invited'] is True
    assert (await apply(client, creators[0], private)).status_code == 201
    assert (await apply(client, creators[1], private)).status_code == 404
    draft = (await client.post('/api/v1/campaigns/drafts', headers=owner, json={'request_id':str(uuid.uuid4()),'title':'Private draft','visibility':'public'})).json()
    assert (await client.get(f"/api/v1/offers/{draft['id']}/public")).status_code == 404
    assert (await client.get(f"/api/v1/offers/{draft['id']}", headers=owner)).status_code == 200

@pytest.mark.asyncio
async def test_independent_negotiations_multiple_selections_retries_and_participant_isolation(client, auth_headers, db_session):
    owner, creators, profiles = await actors(client, auth_headers)
    o = await offer(client, owner)
    apps = [(await apply(client, h, o)).json() for h in creators[:2]]
    path = f"/api/v1/offers/{o['id']}/applications/{apps[0]['id']}/negotiate"
    counter = {'action':'counter','request_id':str(uuid.uuid4()),'expected_revision':0,'expected_offer_revision':o['revision'],'amount_cents':12500,'message':'Brand proposes more usage.'}
    first = await client.post(path, headers=owner, json=counter)
    assert first.status_code == 200, first.text
    assert first.json()['revision'] == 1 and len(first.json()['history']) == 2
    assert (await client.post(path, headers=owner, json=counter)).json() == first.json()
    assert (await client.post(path, headers=owner, json={**counter,'message':'Changed retry'})).status_code == 409
    assert (await client.post(path, headers=creators[1], json={**counter,'request_id':str(uuid.uuid4())})).status_code == 404
    private = (await client.get(f"/api/v1/offers/{o['id']}", headers=creators[1])).json()
    assert len(private['applications']) == 1 and private['applications'][0]['id'] == apps[1]['id']
    assert 'Brand proposes more usage' not in str(private)
    stale = await client.post(f"/api/v1/campaigns/me/applications/{apps[0]['id']}/respond", headers=owner, json={'action':'accept','expected_status':'pending','expected_campaign_revision':o['revision']})
    assert stale.status_code == 409
    accept = {'action':'accept','request_id':str(uuid.uuid4()),'expected_revision':1,'expected_offer_revision':o['revision']}
    assert (await client.post(path, headers=owner, json=accept)).status_code == 409
    assert (await client.post(path, headers=creators[0], json={**accept,'expected_revision':0})).status_code == 409
    selected = await client.post(path, headers=creators[0], json=accept)
    assert selected.status_code == 200 and selected.json()['status'] == 'accepted' and not selected.json()['claimed']
    second = await client.post(f"/api/v1/offers/{o['id']}/applications/{apps[1]['id']}/negotiate", headers=owner, json={**accept,'request_id':str(uuid.uuid4()),'expected_revision':0})
    assert second.status_code == 200 and second.json()['status'] == 'accepted'
    workspace = (await client.get(f"/api/v1/offers/{o['id']}", headers=owner)).json()
    assert workspace['total_applications'] == 2 and all(a['status']=='accepted' for a in workspace['applications'])
    collab = await client.post('/api/v1/collaborations', headers=owner, json={'source_kind':'application','source_id':apps[0]['id']})
    assert collab.status_code == 200 and collab.json()['quoted_amount_cents'] == 12500
    proposal_path = f"/api/v1/collaborations/{collab.json()['id']}/proposals"
    assert (await save(client, owner, proposal_path, terms(amount_cents=12500))).status_code == 200
    sent = (await client.post(proposal_path+'/send', headers=owner, json=send_body())).json()
    acceptance = {'proposal_id':sent['id'], 'expected_version':sent['version'], 'confirmed':True}
    assert (await client.post(proposal_path+'/accept', headers=owner, json=acceptance)).status_code == 200
    current = (await client.get(f"/api/v1/offers/{o['id']}", headers=creators[0])).json()['applications'][0]
    assert current['collaboration_id'] == collab.json()['id'] and not current['claimed']
    assert (await client.post(proposal_path+'/accept', headers=creators[0], json=acceptance)).status_code == 200
    assert (await client.get(f"/api/v1/offers/{o['id']}", headers=creators[0])).json()['applications'][0]['claimed']
    assert (await client.post(path, headers=creators[0], json=accept)).status_code == 200
    assert (await client.get(f"/api/v1/offers/{o['id']}", headers=creators[2])).json()['applications'] == []

@pytest.mark.asyncio
async def test_pause_stops_negotiation_but_allows_withdrawal_and_public_page_stays_read_only(client, auth_headers):
    owner, creators, profiles = await actors(client, auth_headers)
    o = await offer(client, owner)
    application = (await apply(client, creators[0], o)).json()
    paused = (await transition(client, owner, o, 'pause')).json()
    body = {'action':'counter','request_id':str(uuid.uuid4()),'expected_revision':0,'expected_offer_revision':paused['revision'],'amount_cents':20000}
    path=f"/api/v1/offers/{o['id']}/applications/{application['id']}/negotiate"
    assert (await client.post(path, headers=owner, json=body)).status_code == 409
    assert (await client.post(path, headers=creators[0], json={**body,'action':'withdraw'})).status_code == 200
    assert (await client.get(f"/api/v1/offers/{o['id']}/public")).json()['accepting'] is False
    assert (await client.post(path, json=body)).status_code == 401
