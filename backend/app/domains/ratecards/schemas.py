from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.domains.ratecards.models import DeliverableType, PlatformType


class RateCardBase(BaseModel):
    platform: PlatformType
    deliverable_type: DeliverableType
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1024)
    base_price_cents: int = Field(..., ge=100)  # Minimum $1.00
    currency: str = Field("USD", min_length=3, max_length=3)
    turnaround_days: int = Field(7, ge=1, le=90)
    is_active: bool = True


class RateCardCreate(RateCardBase):
    pass


class RateCardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1024)
    base_price_cents: Optional[int] = Field(None, ge=100)
    turnaround_days: Optional[int] = Field(None, ge=1, le=90)
    is_active: Optional[bool] = None


class RateCardRead(RateCardBase):
    id: str
    creator_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
