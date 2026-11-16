import uuid

from sqlalchemy import ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class Enquiry(Base, TimestampMixin):
    __tablename__ = "enquiries"
    __table_args__ = (UniqueConstraint("sender_id", "request_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id: Mapped[str] = mapped_column(ForeignKey("creators.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    request_id: Mapped[str] = mapped_column(String(36))
    payload_hash: Mapped[str] = mapped_column(String(64))
    brand_name: Mapped[str] = mapped_column(String(160))
    brief: Mapped[str] = mapped_column(Text)
    # Snapshot package terms: later edits/deletion cannot rewrite an enquiry.
    rate_card_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    deliverable: Mapped[str] = mapped_column(String(255))
    amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    history: Mapped[list] = mapped_column(JSON, default=list)
    creator = relationship("Creator", lazy="selectin")
    sender = relationship("User", lazy="selectin")
