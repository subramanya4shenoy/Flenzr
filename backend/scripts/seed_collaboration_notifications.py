"""Seed only the disposable notification regression database; never deployed records."""
import sys,asyncio,json,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root))
sys.path.insert(0,str(root/'tests'))
qa_database=Path('/tmp/flenzr-notifications-20261126.sqlite')
if qa_database.exists(): raise SystemExit('Use a fresh disposable QA database; the existing file was left untouched.')
os.environ['DATABASE_URL']='sqlite+aiosqlite:///'+str(qa_database)
os.environ['SUPABASE_JWT_SECRET']='notifications-regression-signing-secret-not-real'
os.environ['SUPABASE_JWKS_URL']=''
os.environ['DEBUG']='false'
from httpx import AsyncClient,ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from app.main import app
from app.core.database import Base,get_db
from app.core.security import SecurityService
from test_agreements import sent

async def main():
 url='sqlite+aiosqlite:////tmp/flenzr-notifications-20261126.sqlite'
 engine=create_async_engine(url)
 async with engine.begin() as c:await c.run_sync(Base.metadata.create_all)
 async with async_sessionmaker(engine,expire_on_commit=False)() as db:
  async def override():yield db
  app.dependency_overrides[get_db]=override
  def headers(sub='test-user',email='test@example.com'):
   return {'Authorization':'Bearer '+SecurityService.create_mock_token(sub,email,metadata={'full_name':'Notification '+sub})}
  async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
   brand,creator,outsider,path,proposal,_=await sent(client,headers,db)
  fixture={'brand':{'token':brand['Authorization'][7:]},'creator':{'token':creator['Authorization'][7:]},'outsider':{'token':outsider['Authorization'][7:]},'collaboration_id':path.split('/')[-2],'proposal':proposal}
  p=Path('/tmp/flenzr-notifications-fixture.json');p.write_text(json.dumps(fixture));p.chmod(0o600)
 app.dependency_overrides.clear()
 await engine.dispose()
 print('Seeded isolated notifications fixture; tokens stored privately')
asyncio.run(main())
