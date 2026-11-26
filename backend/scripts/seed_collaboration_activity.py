"""Create only disposable activity-history regression data on a fixed SQLite file."""
import asyncio
import json
import os
import sys
from pathlib import Path
from uuid import uuid4

root=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(root),str(root/'tests')]
DATABASE=Path('/tmp/flenzr-activity-20261126.sqlite')
if DATABASE.exists():raise SystemExit('Use a fresh disposable activity database; the existing file was left untouched.')
os.environ.update(DATABASE_URL='sqlite+aiosqlite:///'+str(DATABASE),DEBUG='false',SUPABASE_JWT_SECRET='activity-regression-signing-secret-not-real',SUPABASE_JWKS_URL='')
from httpx import ASGITransport,AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from app.main import app
from app.core.database import Base,get_db
from app.core.security import SecurityService
from app.domains.collaborations.models import Collaboration
from app.domains.campaigns.models import CampaignApplication,ApplicationStatus
from test_proposals import collaboration,save,send_body
from test_agreements import acceptance
from test_deliveries import payload
from test_delivery_reviews import review_body
from test_completions import completion_body
from test_publishing_proof import proof_body
from test_proof_confirmations import confirm_body
from test_collaboration_feedback import payload as feedback_body


async def main():
    engine=create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as connection:await connection.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine,expire_on_commit=False)() as db:
        async def override():yield db
        app.dependency_overrides[get_db]=override
        def headers(sub='activity-user',email='activity-user@example.com'):
            return {'Authorization':'Bearer '+SecurityService.create_mock_token(sub,email,metadata={'full_name':'Activity '+sub})}
        async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
            async def post(actor,path,body):
                response=await client.post(path,headers=actor,json=body)
                response.raise_for_status()
                return response.json()
            brand,creator,outsider,path=await collaboration(client,headers,db)
            record_id=path.split('/')[-2]
            for n in range(24):
                actor=brand if n%2==0 else creator
                assert (await save(client,actor,path,version=n)).status_code==200
                proposal=await post(actor,path+'/send',send_body(version=n))
            for actor in [brand,creator]:state=await post(actor,path+'/accept',acceptance(proposal))
            agreement=state['agreement'];base=path.removesuffix('/proposals')
            for version,action in [(1,'request_revision'),(2,'approve')]:
                delivery=await post(creator,base+'/deliveries',payload(agreement['id'],version=version-1))
                review=await post(brand,base+'/deliveries/'+delivery['id']+'/review',review_body(action=action,version=version))
            proof=await post(creator,base+'/publishing-proof',proof_body(delivery,review))
            await post(brand,base+'/publishing-proof/'+proof['id']+'/confirm',confirm_body())
            done=await post(brand,base+'/complete',completion_body(delivery,review))
            await post(creator,base+'/feedback',feedback_body(done,comment='PRIVATE ACTIVITY FEEDBACK'))
            await post(creator,base+'/messages',{'request_id':str(uuid4()),'text':'PRIVATE ACTIVITY CHAT'})
            row=await db.get(Collaboration,record_id)
            source=await db.get(CampaignApplication,row.application_id)
            creator2=headers(sub='activity-second-creator',email='activity-second@example.com')
            person=(await client.get('/api/v1/creators/me',headers=creator2)).json()
            await client.patch('/api/v1/creators/me',headers=creator2,json={'display_name':'Activity second creator','bio':'Isolated QA profile.','niche':'Technology'})
            application=CampaignApplication(campaign_id=source.campaign_id,creator_id=person['id'],status=ApplicationStatus.ACCEPTED,proposed_rate_cents=9999)
            db.add(application);await db.commit()
            other=await post(brand,'/api/v1/collaborations',{'source_kind':'application','source_id':application.id})
            saved=(await client.get(base+'/activity?limit=50',headers=creator)).json()
            fixture={'brand':{'token':brand['Authorization'][7:]},'creator':{'token':creator['Authorization'][7:]},'creator2':{'token':creator2['Authorization'][7:]},'outsider':{'token':outsider['Authorization'][7:]},'collaboration_id':record_id,'other_collaboration_id':other['id'],'offer_id':source.campaign_id,'creator_name':row.creator_name,'expected_events':len(saved['items'])}
            target=Path('/tmp/flenzr-activity-fixture.json');target.write_text(json.dumps(fixture));target.chmod(0o600)
    app.dependency_overrides.clear();await engine.dispose()
    print('Seeded isolated activity history and second creator; tokens stored privately')

asyncio.run(main())
