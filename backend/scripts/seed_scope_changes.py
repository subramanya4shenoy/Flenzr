"""Seed only a disposable scope-change database; no main/deployed records."""
import asyncio,json,os,sys
from pathlib import Path
from uuid import uuid4
root=Path(__file__).resolve().parents[1];sys.path[:0]=[str(root),str(root/'tests')]
DATABASE=Path('/tmp/flenzr-scope-20261127.sqlite')
if DATABASE.exists():raise SystemExit('The disposable scope database already exists; it was left untouched.')
os.environ.update(DATABASE_URL='sqlite+aiosqlite:///'+str(DATABASE),DEBUG='false',SUPABASE_JWT_SECRET='scope-regression-signing-secret-not-real',SUPABASE_JWKS_URL='')
from httpx import ASGITransport,AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from app.main import app
from app.core.database import Base,get_db
from app.core.security import SecurityService
from app.domains.collaborations.models import Collaboration
from app.domains.campaigns.models import CampaignApplication,ApplicationStatus
from test_proof_confirmations import recorded,confirm_body

async def main():
 engine=create_async_engine(os.environ['DATABASE_URL'])
 async with engine.begin() as c:await c.run_sync(Base.metadata.create_all)
 async with async_sessionmaker(engine,expire_on_commit=False)() as db:
  async def override():yield db
  app.dependency_overrides[get_db]=override
  def headers(sub='scope-user',email='scope-user@example.com'):
   return {'Authorization':'Bearer '+SecurityService.create_mock_token(sub,email,metadata={'full_name':'Scope '+sub})}
  async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
   brand,creator,outsider,path,agreement,delivery,review,proof_path,proof=await recorded(client,headers,db)
   response=await client.post(proof_path+'/'+proof['id']+'/confirm',headers=brand,json=confirm_body());response.raise_for_status()
   record_id=path.split('/')[-2];row=await db.get(Collaboration,record_id);source=await db.get(CampaignApplication,row.application_id)
   second=headers('scope-second-creator','scope-second@example.com')
   person=(await client.get('/api/v1/creators/me',headers=second)).json()
   await client.patch('/api/v1/creators/me',headers=second,json={'display_name':'Scope second creator','bio':'Isolated test profile.','niche':'Technology'})
   app2=CampaignApplication(campaign_id=source.campaign_id,creator_id=person['id'],status=ApplicationStatus.ACCEPTED,proposed_rate_cents=9000)
   db.add(app2);await db.commit()
   created=await client.post('/api/v1/collaborations',headers=brand,json={'source_kind':'application','source_id':app2.id});created.raise_for_status()
   fixture={role:{'token':value['Authorization'][7:]} for role,value in [('brand',brand),('creator',creator),('outsider',outsider),('creator2',second)]}
   fixture.update(collaboration_id=record_id,offer_id=source.campaign_id,creator_name=row.creator_name,other_collaboration_id=created.json()['id'],original_agreement=agreement,delivery=delivery,review=review,proof=proof)
   output=Path('/tmp/flenzr-scope-fixture.json');output.write_text(json.dumps(fixture));output.chmod(0o600)
 app.dependency_overrides.clear();await engine.dispose()
 print('Seeded isolated agreed/approved/proof-confirmed collaboration plus another creator; tokens stored privately')
asyncio.run(main())
