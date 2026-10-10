from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.domains.campaigns.models import ApplicationStatus, CampaignStatus, InvitationStatus


class CampaignBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    brief: str = Field(..., min_length=10)
    target_niche: Optional[str] = Field(None, max_length=128)
    deliverable_summary: Optional[str] = Field(None, max_length=512)
    budget_total_cents: int = Field(..., ge=1000)  # Min $10.00
    currency: str = Field("USD", min_length=3, max_length=3)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    brief: Optional[str] = Field(None, min_length=10)
    target_niche: Optional[str] = None
    deliverable_summary: Optional[str] = None
    budget_total_cents: Optional[int] = Field(None, ge=1000)
    status: Optional[CampaignStatus] = None


class CampaignRead(CampaignBase):
    id: str
    organization_id: str
    status: CampaignStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignApplicationCreate(BaseModel):
    pitch_message: Optional[str] = None
    proposed_rate_cents: int = Field(..., ge=100)


class CampaignApplicationRead(BaseModel):
    id: str
    campaign_id: str
    creator_id: str
    pitch_message: Optional[str] = None
    proposed_rate_cents: int
    status: ApplicationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignInvitationCreate(BaseModel):
    creator_id: str
    offered_rate_cents: int = Field(..., ge=100)
    message: Optional[str] = None


class CampaignInvitationRead(BaseModel):
    id: str
    campaign_id: str
    creator_id: str
    offered_rate_cents: int
    message: Optional[str] = None
    status: InvitationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
