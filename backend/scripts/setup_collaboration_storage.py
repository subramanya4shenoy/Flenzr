"""Provision the dedicated private bucket. Run from backend; never prints credentials."""
import asyncio
from sqlalchemy import text
from app.core.database import engine
from app.core.config import settings
from app.domains.collaborations.storage import PrivateStorage, MIME_EXTENSIONS


async def main():
    storage = PrivateStorage()
    buckets = await storage.request('GET', '/bucket')
    info = next((bucket for bucket in buckets if bucket['id'] == storage.bucket), None)
    if info is None:
        await storage.request('POST', '/bucket', json=dict(id=storage.bucket, name=storage.bucket, public=False,
            file_size_limit=settings.COLLABORATION_FILE_MAX_BYTES, allowed_mime_types=list(MIME_EXTENSIONS)))
    else:
        # Only manage this dedicated bucket, never silently convert a public bucket.
        if info.get('public'):
            raise RuntimeError('The collaboration bucket must be private. Use a new private bucket name.')
        await storage.request('PUT', '/bucket/' + storage.bucket, json=dict(public=False,
            file_size_limit=settings.COLLABORATION_FILE_MAX_BYTES, allowed_mime_types=list(MIME_EXTENSIONS)))
    async with engine.begin() as conn:
        # Restrictive policy blocks permissive legacy policies for this bucket.
        # Signed uploads/downloads are authorized by the Storage service itself.
        bucket = await conn.scalar(text('SELECT quote_literal(:bucket)'), {'bucket': storage.bucket})
        await conn.execute(text('DROP POLICY IF EXISTS flenzr_collaboration_objects_api_only ON storage.objects'))
        await conn.execute(text(f'''CREATE POLICY flenzr_collaboration_objects_api_only ON storage.objects
            AS RESTRICTIVE FOR ALL TO PUBLIC USING (bucket_id <> {bucket}) WITH CHECK (bucket_id <> {bucket})'''))
    await storage.check_bucket()
    print('Private collaboration bucket, MIME/size limits and restrictive access policy configured.')
    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
