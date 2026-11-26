from datetime import timezone
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import EntityNotFoundError
from app.domains.identity.models import User
from app.domains.notifications.models import Notification, now
from app.domains.notifications.service import notification_href

router = APIRouter(prefix='/notifications', tags=['Notifications'])


class NotificationRead(BaseModel):
    id: str
    enquiry_id: str | None
    collaboration_id: str | None
    kind: str
    title: str
    message: str
    href: str
    is_unread: bool
    created_at: str


def read(row):
    created = row.created_at.replace(tzinfo=timezone.utc) if row.created_at.tzinfo is None else row.created_at
    return NotificationRead(id=row.id, enquiry_id=row.enquiry_id, collaboration_id=row.collaboration_id, kind=row.kind,
                            title=row.title, message=row.message,
                            href=notification_href(row),
                            is_unread=row.read_at is None, created_at=created.isoformat())


@router.get('/unread-count', response_model=int)
async def count(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    return await db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.read_at.is_(None)))


@router.get('', response_model=list[NotificationRead])
async def listing(response: Response, offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=50),
                  user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    rows = (await db.scalars(select(Notification).where(Notification.user_id == user.id)
                            .order_by(Notification.created_at.desc(), Notification.id.desc())
                            .offset(offset).limit(limit))).all()
    return [read(row) for row in rows]


@router.post('/{notification_id}/read', response_model=NotificationRead)
async def mark_read(notification_id: str, response: Response,
                    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    row = await db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if not row:
        raise EntityNotFoundError('Notification', notification_id)
    await db.execute(update(Notification).where(Notification.id == row.id, Notification.read_at.is_(None))
                     .values(read_at=now()), execution_options={'synchronize_session': False})
    await db.commit()
    await db.refresh(row)
    return read(row)
