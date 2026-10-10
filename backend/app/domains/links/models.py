from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class TrackedLink(Base, TimestampMixin):
    __tablename__ = "tracked_links"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    creator_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("creators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    short_code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=False,
    )
    utm_source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    utm_medium: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    utm_campaign: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    click_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    creator = relationship("Creator", lazy="selectin")
    clicks = relationship("LinkClick", back_populates="link", cascade="all, delete-orphan")


class LinkClick(Base):
    __tablename__ = "link_clicks"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    link_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tracked_links.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clicked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    referrer: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    link = relationship("TrackedLink", back_populates="clicks")
