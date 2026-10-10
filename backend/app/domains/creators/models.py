from typing import Optional
import uuid
from sqlalchemy import Boolean, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class Creator(Base, TimestampMixin):
    __tablename__ = "creators"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    handle: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    niche: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    profile_theme: Mapped[Optional[str]] = mapped_column(String(64), default="default", nullable=True)

    # Relationship to user
    user = relationship("User", lazy="selectin")
