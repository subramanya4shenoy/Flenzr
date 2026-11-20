import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock
import pytest
from app.domains.collaborations.models import CollaborationFile
from app.domains.collaborations.storage import PrivateStorage
from test_deliveries import agreed, payload

PDF = b'%PDF-1.4\nprivate test\n%%EOF'


@pytest.fixture
def storage(monkeypatch):
    mocks = {}
    for name, value in {
        'upload_ticket': dict(endpoint='https://example.supabase.co/storage/v1/upload/resumable', token='temporary', bucket='collaboration-files', object_name='server-key'),
        'inspect': (len(PDF), 'application/pdf'), 'prefix': PDF,
        'download': 'https://example.supabase.co/storage/v1/object/sign/private?token=temporary', 'remove': None,
    }.items():
        mocks[name] = AsyncMock(return_value=value)
        monkeypatch.setattr(PrivateStorage, name, mocks[name])
    return mocks


def body(agreement, **changes):
    return dict(request_id=str(uuid.uuid4()), agreement_id=agreement['id'], filename='creative.pdf',
                content_type='application/pdf', size_bytes=len(PDF)) | changes


async def upload(client, creator, files, agreement):
    r=await client.post(files, headers=creator, json=body(agreement));assert r.status_code==200,r.text
    file=r.json()['file'];r=await client.post(files+'/'+file['id']+'/finish',headers=creator)
    assert r.status_code==200,r.text
    return file


@pytest.mark.asyncio
async def test_private_upload_submission_download_and_immutable_history(client,auth_headers,db_session,storage):
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    files=path.removesuffix('/deliveries')+'/files';file=await upload(client,creator,files,agreement)
    assert set(file)=={'id','filename','content_type','size_bytes'}
    assert (await client.get(files,headers=creator)).json()==[file]
    assert (await client.post(files+'/'+file['id']+'/finish',headers=creator)).json()==file
    assert (await client.post(files+'/'+file['id']+'/download',headers=brand)).status_code==404
    submission=payload(agreement['id'],links=[],file_ids=[file['id']])
    response=await client.post(path,headers=creator,json=submission);assert response.status_code==200,response.text
    delivery=response.json();assert delivery['links']==[] and delivery['files']==[file]
    assert (await client.post(path,headers=creator,json=submission)).json()==delivery
    for actor in (brand,creator):
        assert (await client.get(path,headers=actor)).json()['items'][0]['files']==[file]
        r=await client.post(files+'/'+file['id']+'/download',headers=actor)
        assert r.status_code==200 and r.json()['expires_in']==120
    assert (await client.get(files,headers=creator)).json()==[]
    assert (await client.delete(files+'/'+file['id'],headers=creator)).status_code==409
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],version=1,file_ids=[file['id']]))).status_code==409
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],version=1))).status_code==200
    assert (await client.get(path,headers=brand)).json()['items'][1]['files']==[file]
    assert (await client.get(path.removesuffix('/deliveries')+'/agreement',headers=creator)).json()==agreement


@pytest.mark.asyncio
async def test_authorization_and_forged_metadata(client,auth_headers,db_session,storage):
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    files=path.removesuffix('/deliveries')+'/files';file=await upload(client,creator,files,agreement)
    for actor,code in (({},401),(outsider,404),(brand,403)):
        assert (await client.post(files,headers=actor,json=body(agreement))).status_code==code
        assert (await client.delete(files+'/'+file['id'],headers=actor)).status_code==code
        assert (await client.post(files+'/'+file['id']+'/finish',headers=actor)).status_code==code
    assert (await client.post(files+'/'+file['id']+'/download',headers=outsider)).status_code==404
    assert (await client.post(files,headers=creator,json=body(agreement,object_key='other/secret'))).status_code==422
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],files=[file]))).status_code==422
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],file_ids=[str(uuid.uuid4())]))).status_code==404
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],file_ids=[file['id']]*2))).status_code==422


@pytest.mark.asyncio
async def test_retry_pending_removed_and_expired_files(client,auth_headers,db_session,storage):
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    files=path.removesuffix('/deliveries')+'/files';request=body(agreement)
    ticket=(await client.post(files,headers=creator,json=request)).json();file_id=ticket['file']['id']
    assert (await client.post(files,headers=creator,json=request)).json()==ticket
    assert (await client.post(files,headers=creator,json=request|{'filename':'other.pdf'})).status_code==409
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],file_ids=[file_id]))).status_code==409
    for _ in range(2):assert (await client.delete(files+'/'+file_id,headers=creator)).status_code==200
    assert (await client.post(files+'/'+file_id+'/finish',headers=creator)).status_code==409
    assert (await client.post(files,headers=creator,json=request)).status_code==409
    ready=await upload(client,creator,files,agreement)
    row=await db_session.get(CollaborationFile,ready['id']);row.created_at=datetime.now(timezone.utc)-timedelta(hours=25);await db_session.commit()
    assert (await client.get(files,headers=creator)).json()==[]
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],file_ids=[ready['id']]))).status_code==409
    assert (await client.get(path,headers=creator)).json()['total']==0


@pytest.mark.parametrize('change',[dict(filename='../escape.pdf'),dict(filename='evil.svg',content_type='image/svg+xml'),dict(filename='evil.html'),dict(size_bytes=0),dict(size_bytes=True),dict(size_bytes=52428801),dict(content_type='application/octet-stream')])
@pytest.mark.asyncio
async def test_limits_and_types(client,auth_headers,db_session,storage,change):
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    assert (await client.post(path.removesuffix('/deliveries')+'/files',headers=creator,json=body(agreement,**change))).status_code==422
    assert storage['upload_ticket'].await_count==0


@pytest.mark.parametrize('metadata,prefix',[((1,'application/pdf'),PDF),((len(PDF),'text/html'),PDF),((len(PDF),'application/pdf'),b'<html>unsafe</html>')])
@pytest.mark.asyncio
async def test_server_verification(client,auth_headers,db_session,storage,metadata,prefix):
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    files=path.removesuffix('/deliveries')+'/files'
    ticket=(await client.post(files,headers=creator,json=body(agreement))).json()
    storage['inspect'].return_value=metadata;storage['prefix'].return_value=prefix
    assert (await client.post(files+'/'+ticket['file']['id']+'/finish',headers=creator)).status_code==422
    assert (await client.get(files,headers=creator)).json()==[]


@pytest.mark.asyncio
async def test_cleanup_preserves_submitted_and_live_files(client,auth_headers,db_session,storage,monkeypatch):
    from app import cleanup_collaboration_files as cleanup
    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def factory():yield db_session
    monkeypatch.setattr(cleanup,'async_session_factory',factory)
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    files=path.removesuffix('/deliveries')+'/files'
    old=await upload(client,creator,files,agreement);sent=await upload(client,creator,files,agreement)
    assert (await client.post(path,headers=creator,json=payload(agreement['id'],file_ids=[sent['id']]))).status_code==200
    for file in (old,sent):
        row=await db_session.get(CollaborationFile,file['id']);row.created_at=datetime.now(timezone.utc)-timedelta(hours=49)
    await db_session.commit();live=await upload(client,creator,files,agreement)
    assert await cleanup.cleanup()==1
    assert await db_session.get(CollaborationFile,old['id']) is None
    assert await db_session.get(CollaborationFile,sent['id']) is not None
    assert await db_session.get(CollaborationFile,live['id']) is not None

@pytest.mark.asyncio
async def test_upload_budget_counts_removed_reservations(client,auth_headers,db_session,storage):
    brand,creator,outsider,path,agreement=await agreed(client,auth_headers,db_session)
    files=path.removesuffix('/deliveries')+'/files'
    for _ in range(20):
        ticket=(await client.post(files,headers=creator,json=body(agreement))).json()
        await client.delete(files+'/'+ticket['file']['id'],headers=creator)
    assert (await client.post(files,headers=creator,json=body(agreement))).status_code==429


@pytest.mark.asyncio
async def test_storage_adapter_uses_private_bucket_scoped_tokens_and_short_downloads(monkeypatch):
    import httpx
    from app.core.config import settings
    from app.domains.collaborations.storage import MIME_EXTENSIONS
    monkeypatch.setattr(settings,'SUPABASE_URL','https://example.supabase.co')
    monkeypatch.setattr(settings,'SUPABASE_SERVICE_ROLE_KEY','server-only-test-key')
    captured=[]
    def handler(request):
        captured.append(request)
        path=request.url.path
        if '/bucket/' in path:return httpx.Response(200,json={'public':False,'file_size_limit':52428800,'allowed_mime_types':list(MIME_EXTENSIONS)})
        if '/upload/sign/' in path:return httpx.Response(200,json={'url':'/object/upload/sign/private?token=path-scoped-token'})
        if '/object/sign/' in path:
            import json
            assert json.loads(request.content)=={'expiresIn':120}
            return httpx.Response(200,json={'signedURL':'/object/sign/private?token=download-token'})
        return httpx.Response(500)
    client_type=httpx.AsyncClient
    monkeypatch.setattr(httpx,'AsyncClient',lambda **kw:client_type(transport=httpx.MockTransport(handler),**kw))
    storage=PrivateStorage();ticket=await storage.upload_ticket('collaboration/id.pdf')
    assert ticket['endpoint']=='https://example.storage.supabase.co/storage/v1/upload/resumable/sign'
    assert ticket['token']=='path-scoped-token'
    assert all('x-upsert' not in request.headers for request in captured)
    assert captured[-1].url.path.endswith('/collaboration-files/collaboration/id.pdf')
    url=await storage.download('collaboration/id.pdf','some file.pdf')
    assert url.endswith('&download=some%20file.pdf')
    assert all(request.headers['authorization']=='Bearer server-only-test-key' for request in captured)


@pytest.mark.asyncio
async def test_public_bucket_and_provider_errors_fail_closed(monkeypatch):
    from app.core.exceptions import FlenzrException
    storage=PrivateStorage()
    monkeypatch.setattr(storage,'request',AsyncMock(return_value={'public':True,'file_size_limit':52428800}))
    with pytest.raises(FlenzrException) as error:await storage.upload_ticket('anything.pdf')
    assert error.value.status_code==503
