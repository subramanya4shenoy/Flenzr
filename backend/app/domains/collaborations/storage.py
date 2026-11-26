"""Supabase Storage adapter. Service credentials never leave the backend."""
from urllib.parse import quote, urlparse, parse_qs
import httpx
from app.core.config import settings
from app.core.exceptions import FlenzrException

MIME_EXTENSIONS = {
    'image/jpeg': {'.jpg', '.jpeg'}, 'image/png': {'.png'}, 'image/webp': {'.webp'},
    'video/mp4': {'.mp4'}, 'video/quicktime': {'.mov'}, 'video/webm': {'.webm'},
    'audio/mpeg': {'.mp3'}, 'audio/wav': {'.wav'}, 'audio/mp4': {'.m4a'},
    'application/pdf': {'.pdf'},
}


def unavailable():
    return FlenzrException('FILE_STORAGE_UNAVAILABLE', 'Private file storage is temporarily unavailable. Please retry.', 503)


class PrivateStorage:
    def __init__(self):
        self.origin = settings.SUPABASE_URL.rstrip('/')
        self.base = self.origin + '/storage/v1'
        self.bucket = settings.COLLABORATION_STORAGE_BUCKET
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY

    async def request(self, method, path, **kwargs):
        if not self.key or self.key.startswith(('mock-', 'your-')):
            raise unavailable()
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                response = await client.request(method, self.base + path,
                    headers={'Authorization': 'Bearer ' + self.key, 'apikey': self.key}, **kwargs)
        except httpx.HTTPError:
            raise unavailable() from None
        if not response.is_success:
            # Never surface provider payloads, signed URLs or credentials in errors.
            raise unavailable()
        return response.json() if response.content else {}

    def object_path(self, key):
        return quote(self.bucket, safe='') + '/' + quote(key, safe='/')

    async def check_bucket(self):
        info = await self.request('GET', '/bucket/' + quote(self.bucket, safe=''))
        if info.get('public') is not False or not info.get('file_size_limit') or int(info['file_size_limit']) > settings.COLLABORATION_FILE_MAX_BYTES:
            raise unavailable()
        if set(info.get('allowed_mime_types') or []) != set(MIME_EXTENSIONS):
            raise unavailable()

    async def upload_ticket(self, key):
        await self.check_bucket()
        data = await self.request('POST', '/object/upload/sign/' + self.object_path(key), json={})
        token = parse_qs(urlparse(data.get('url', '')).query).get('token', [''])[0]
        if not token:
            raise unavailable()
        # x-signature scopes TUS to this exact path, with no overwrite permission.
        endpoint = self.base.replace('.supabase.co/', '.storage.supabase.co/') + '/upload/resumable/sign'
        return dict(endpoint=endpoint, token=token,
                    bucket=self.bucket, object_name=key)

    async def inspect(self, key):
        info = await self.request('GET', '/object/info/' + self.object_path(key))
        meta = info.get('metadata') or {}
        return info.get('size', meta.get('size')), info.get('content_type', meta.get('mimetype'))

    async def prefix(self, key):
        # Bounded read even if a server ignores Range; never load an entire video.
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                async with client.stream('GET', self.base + '/object/authenticated/' + self.object_path(key),
                    headers={'Authorization': 'Bearer ' + self.key, 'apikey': self.key, 'Range': 'bytes=0-511'}) as response:
                    if response.status_code not in (200, 206):
                        raise unavailable()
                    data = bytearray()
                    async for part in response.aiter_bytes(chunk_size=512):
                        data.extend(part[:512-len(data)])
                        if len(data) >= 512:
                            break
                    return bytes(data)
        except httpx.HTTPError:
            raise unavailable() from None

    async def download(self, key, filename, *, inline=False):
        await self.check_bucket()
        expires = 600 if inline else 120
        data = await self.request('POST', '/object/sign/' + self.object_path(key), json={'expiresIn': expires})
        path = data.get('signedURL', '')
        if not path.startswith('/object/sign/'):
            raise unavailable()
        if inline:
            return self.base + path
        return self.base + path + '&download=' + quote(filename, safe='')

    async def remove(self, keys):
        if keys:
            await self.request('DELETE', '/object/' + quote(self.bucket, safe=''), json={'prefixes': keys})


def matches_signature(mime, data):
    if mime == 'image/jpeg': return data.startswith(b'\xff\xd8\xff')
    if mime == 'image/png': return data.startswith(b'\x89PNG\r\n\x1a\n')
    if mime == 'image/webp': return data.startswith(b'RIFF') and data[8:12] == b'WEBP'
    if mime == 'application/pdf': return data.startswith(b'%PDF-')
    if mime == 'audio/wav': return data.startswith(b'RIFF') and data[8:12] == b'WAVE'
    if mime == 'audio/mpeg': return data.startswith(b'ID3') or (len(data) > 1 and data[0] == 255 and data[1] & 0xe0 == 0xe0)
    if mime == 'video/webm': return data.startswith(b'\x1aE\xdf\xa3') and b'webm' in data
    if mime in ('video/mp4', 'video/quicktime', 'audio/mp4'):
        return len(data) >= 12 and data[4:8] == b'ftyp'
    return False
