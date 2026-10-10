import enum
from typing import Optional
import uuid
from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class PlatformType(str, enum.Enum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    TWITTER_X = "twitter_x"
    LINKEDIN = "linkedin"
    PODCAST = "podcast"
    NEWSLETTER = "newsletter"


class DeliverableType(str, enum.Enum):
    REEL_SHORTS = "reel_shorts"
    DEDICATED_VIDEO = "dedicated_video"
    INTEGRATED_SPONSORSHIP = "integrated_sponsorship"
    STORY_SET = "story_set"
    FEED_POST = "feed_post"
    NEWSLETTER_BLURB = "newsletter_blurb"
    PODCAST_AD_READ = "podcast_ad_read"


class RateCard(Base, TimestampMixin):
    __tablename__ = "rate_cards"

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
    platform: Mapped[PlatformType] = mapped_column(
        Enum(PlatformType, native_enum=False),
        nullable=False,
    )
    deliverable_type: Mapped[DeliverableType] = mapped_column(
        Enum(DeliverableType, native_enum=False),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    base_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    turnaround_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    creator = relationship("Creator", lazy="selectin")

    __table_args__ = (
        Index("ix_rate_cards_creator_platform", "creator_id", "platform"),
    )
