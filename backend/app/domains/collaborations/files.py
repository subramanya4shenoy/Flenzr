"""Participant-scoped upload reservations, verification and expiring downloads."""
from .current_agreement import current_agreement_stmt
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import PurePath
from sqlalchemy import select, func
from app.core.config import settings
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from .deliveries import DeliveryService
from .models import CollaborationFile, CollaborationAgreement
from .storage import PrivateStorage, MIME_EXTENSIONS, matches_signature


def fresh(row, hours=24):
    return row.created_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc) - timedelta(hours=hours)


def file_project(row):
    return dict(id=row.id, filename=row.filename, content_type=row.content_type, size_bytes=row.size_bytes)


def conflict(message):
    return FlenzrException('FILE_NOT_AVAILABLE', message, 409)


class CollaborationFiles:
    @staticmethod
    async def creator(db, user_id, record_id):
        collab = await DeliveryService.collaboration(db, user_id, record_id, lock=True)
        if collab.creator_user_id != user_id:
            raise PermissionDeniedError('Only the saved creator can upload or remove draft files.')
        if collab.status != 'agreed':
            raise conflict('Files can be uploaded only while an agreed collaboration is open.')
        return collab

    @staticmethod
    async def find(db, record_id, file_id):
        row = await db.scalar(select(CollaborationFile).where(CollaborationFile.id == file_id,
            CollaborationFile.collaboration_id == record_id))
        if not row:
            raise EntityNotFoundError('File', file_id)
        return row

    @staticmethod
    async def draft_list(db, user_id, record_id):
        await CollaborationFiles.creator(db, user_id, record_id)
        agreement = await db.scalar(current_agreement_stmt(record_id))
        rows = (await db.scalars(select(CollaborationFile).where(CollaborationFile.collaboration_id == record_id,
            CollaborationFile.delivery_id.is_(None), CollaborationFile.state == 'ready').order_by(CollaborationFile.created_at))).all()
        return [file_project(row) for row in rows if fresh(row) and agreement and row.agreement_id == agreement.id]

    @staticmethod
    async def reserve(db, user_id, record_id, body):
        await CollaborationFiles.creator(db, user_id, record_id)
        agreement = await db.scalar(current_agreement_stmt(record_id))
        if not agreement or str(body.agreement_id) != agreement.id:
            raise conflict('Refresh the collaboration agreement before uploading.')
        if (body.content_type not in MIME_EXTENSIONS or PurePath(body.filename).suffix.lower() not in MIME_EXTENSIONS[body.content_type]
            or re.search(r'[\\/\x00-\x1f\x7f]', body.filename) or body.filename.startswith('.')):
            raise FlenzrException('FILE_TYPE_UNSUPPORTED', 'Choose a JPEG, PNG, WebP, MP4, MOV, WebM, MP3, WAV, M4A or PDF with its matching file extension.', 422)
        if body.size_bytes > settings.COLLABORATION_FILE_MAX_BYTES:
            raise FlenzrException('FILE_TOO_LARGE', f'Each file must be within {settings.COLLABORATION_FILE_MAX_BYTES // 1024 // 1024} MB.', 422)
        row = await db.scalar(select(CollaborationFile).where(CollaborationFile.collaboration_id == record_id,
            CollaborationFile.request_id == str(body.request_id)))
        if row:
            if (row.filename, row.content_type, row.size_bytes, row.agreement_id) != (body.filename, body.content_type, body.size_bytes, str(body.agreement_id)):
                raise conflict('This upload request was already used for another file.')
            if row.state != 'pending' or row.delivery_id or not fresh(row, 2):
                raise conflict('This upload is already verified, removed or expired. Refresh draft files or choose the file again.')
        else:
            recent = datetime.now(timezone.utc) - timedelta(hours=48)
            count = await db.scalar(select(func.count()).select_from(CollaborationFile).where(
                CollaborationFile.collaboration_id == record_id, CollaborationFile.created_at > recent))
            if count >= 20:
                raise FlenzrException('UPLOAD_LIMIT_REACHED', 'The upload limit for this collaboration has been reached. Try again after older drafts expire.', 429)
            file_id = str(uuid.uuid4())
            row = CollaborationFile(id=file_id, collaboration_id=record_id, agreement_id=agreement.id,
                creator_user_id=user_id, object_key=f'{record_id}/{file_id}{PurePath(body.filename).suffix.lower()}',
                filename=body.filename, content_type=body.content_type, size_bytes=body.size_bytes,
                state='pending', request_id=str(body.request_id))
            db.add(row)
        ticket = await PrivateStorage().upload_ticket(row.object_key)
        await db.commit()
        return dict(file=file_project(row), **ticket)

    @staticmethod
    async def finish(db, user_id, record_id, file_id):
        await CollaborationFiles.creator(db, user_id, record_id)
        row = await CollaborationFiles.find(db, record_id, file_id)
        if row.state == 'ready' and not row.delivery_id and fresh(row):
            return file_project(row)
        if row.state != 'pending' or row.delivery_id or not fresh(row):
            raise conflict('This draft file was removed, attached or expired. Choose the file again.')
        storage = PrivateStorage()
        size, mime = await storage.inspect(row.object_key)
        if size != row.size_bytes or mime != row.content_type or not matches_signature(mime, await storage.prefix(row.object_key)):
            raise FlenzrException('FILE_VERIFICATION_FAILED', 'The uploaded file does not match its declared type or size. Remove it and choose a supported file.', 422)
        row.state = 'ready'
        await db.commit()
        return file_project(row)

    @staticmethod
    async def remove(db, user_id, record_id, file_id):
        await CollaborationFiles.creator(db, user_id, record_id)
        row = await CollaborationFiles.find(db, record_id, file_id)
        if row.delivery_id:
            raise conflict('Submitted files stay in version history. Submit a new delivery version for changes.')
        row.state = 'removed'
        # Keep the key tombstone until all upload capabilities expire, then purge via cleanup.
        await db.commit()
        return {'removed': True}

    @staticmethod
    async def download(db, user_id, record_id, file_id, *, inline=False):
        await DeliveryService.collaboration(db, user_id, record_id)
        row = await CollaborationFiles.find(db, record_id, file_id)
        if row.state != 'ready' or not row.delivery_id:
            raise EntityNotFoundError('Submitted file', file_id)
        return dict(url=await PrivateStorage().download(row.object_key, row.filename, inline=inline), expires_in=600 if inline else 120)

    @staticmethod
    async def attach(db, collab, agreement, file_ids):
        rows = []
        for file_id in file_ids:
            row = await CollaborationFiles.find(db, collab.id, str(file_id))
            if (row.creator_user_id != collab.creator_user_id or row.agreement_id != agreement.id or
                row.state != 'ready' or row.delivery_id or not fresh(row)):
                raise conflict('A selected file was removed, used in another version or expired. Refresh draft files.')
            rows.append(row)
        # Validate the entire set before mutating anything.
        return rows
