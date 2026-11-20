import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class Enquiry(Base, TimestampMixin):
    __tablename__ = "enquiries"
    __table_args__ = (UniqueConstraint("sender_id", "request_id"),
                      Index("ix_enquiries_sender_created", "sender_id", "created_at"))

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
    preferred_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    creator_read_revision: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    sender_read_revision: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    history: Mapped[list] = mapped_column(JSON, default=list)
    creator = relationship("Creator", lazy="selectin")
    sender = relationship("User", lazy="selectin")
