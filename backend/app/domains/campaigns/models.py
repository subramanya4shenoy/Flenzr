from datetime import datetime, timezone
import enum
from typing import List, Optional
import uuid
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class InvitationStatus(str, enum.Enum):
    INVITED = "invited"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Campaign(Base, TimestampMixin):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    brief: Mapped[str] = mapped_column(Text, nullable=False)
    target_niche: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    deliverable_summary: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    budget_total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus, native_enum=False),
        default=CampaignStatus.DRAFT,
        nullable=False,
        index=True,
    )
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="campaigns", lazy="selectin")
    applications = relationship("CampaignApplication", back_populates="campaign", cascade="all, delete-orphan")
    invitations = relationship("CampaignInvitation", back_populates="campaign", cascade="all, delete-orphan")


class CampaignApplication(Base, TimestampMixin):
    __tablename__ = "campaign_applications"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    campaign_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    creator_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("creators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pitch_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proposed_rate_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, native_enum=False),
        default=ApplicationStatus.PENDING,
        nullable=False,
    )

    campaign = relationship("Campaign", back_populates="applications", lazy="selectin")
    creator = relationship("Creator", lazy="selectin")

    __table_args__ = (
        Index("ix_campaign_applications_unique", "campaign_id", "creator_id", unique=True),
    )


class CampaignInvitation(Base, TimestampMixin):
    __tablename__ = "campaign_invitations"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    campaign_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    creator_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("creators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    offered_rate_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus, native_enum=False),
        default=InvitationStatus.INVITED,
        nullable=False,
    )

    campaign = relationship("Campaign", back_populates="invitations", lazy="selectin")
    creator = relationship("Creator", lazy="selectin")

    __table_args__ = (
        Index("ix_campaign_invitations_unique", "campaign_id", "creator_id", unique=True),
    )
