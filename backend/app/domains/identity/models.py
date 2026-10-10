import enum
import uuid
from typing import List, Optional
from sqlalchemy import Boolean, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class SystemRole(str, enum.Enum):
    CREATOR = "creator"
    BRAND_OWNER = "brand_owner"
    BRAND_MEMBER = "brand_member"
    ADMIN = "admin"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    # Supabase Auth user ID (UUID as string for maximum DB portability)
    supabase_uid: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    roles: Mapped[List["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class UserRole(Base, TimestampMixin):
    __tablename__ = "user_roles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[SystemRole] = mapped_column(
        Enum(SystemRole, native_enum=False),
        nullable=False,
        default=SystemRole.CREATOR,
    )

    user: Mapped["User"] = relationship("User", back_populates="roles")

    __table_args__ = (
        Index("ix_user_roles_user_id_role", "user_id", "role", unique=True),
    )
