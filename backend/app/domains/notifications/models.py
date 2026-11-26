import uuid
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now():
    return datetime.now(timezone.utc)


class Notification(Base):
    __tablename__ = 'notifications'
    __table_args__ = (
        UniqueConstraint('user_id', 'enquiry_id', 'enquiry_revision'),
        UniqueConstraint('user_id', 'collaboration_id', 'event_key', name='uq_notification_collaboration_event'),
        CheckConstraint(
            '(enquiry_id IS NOT NULL AND enquiry_revision IS NOT NULL AND collaboration_id IS NULL AND event_key IS NULL) OR '
            '(enquiry_id IS NULL AND enquiry_revision IS NULL AND collaboration_id IS NOT NULL AND event_key IS NOT NULL)',
            name='notification_target'),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    enquiry_id: Mapped[str | None] = mapped_column(ForeignKey('enquiries.id', ondelete='CASCADE'), index=True, nullable=True)
    enquiry_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    collaboration_id: Mapped[str | None] = mapped_column(ForeignKey('collaborations.id', ondelete='CASCADE'), index=True, nullable=True)
    event_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    kind: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(String(300))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class NotificationEmail(Base):
    __tablename__ = 'notification_emails'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notification_id: Mapped[str] = mapped_column(ForeignKey('notifications.id', ondelete='CASCADE'), unique=True)
    status: Mapped[str] = mapped_column(String(20), default='pending', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lock_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    transport: Mapped[str | None] = mapped_column(String(12), nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(80), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
