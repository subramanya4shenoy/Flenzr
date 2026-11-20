import uuid
from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base, TimestampMixin


class BrandShortlist(Base, TimestampMixin):
    __tablename__ = 'brand_shortlists'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False)
    __table_args__ = (Index('ix_brand_shortlists_org_name', 'organization_id', 'normalized_name', unique=True),)


class BrandShortlistMember(Base, TimestampMixin):
    __tablename__ = 'brand_shortlist_members'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda:str(uuid.uuid4()))
    shortlist_id: Mapped[str] = mapped_column(String(36), ForeignKey('brand_shortlists.id', ondelete='CASCADE'), nullable=False, index=True)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey('creators.id', ondelete='CASCADE'), nullable=False, index=True)
    __table_args__ = (Index('ix_brand_shortlist_members_unique','shortlist_id','creator_id',unique=True),)
