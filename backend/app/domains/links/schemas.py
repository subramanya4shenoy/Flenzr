from datetime import datetime
from typing import List, Optional
from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class TrackedLinkBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    destination_url: str = Field(..., min_length=10, max_length=2048)
    utm_source: Optional[str] = Field(None, max_length=128)
    utm_medium: Optional[str] = Field(None, max_length=128)
    utm_campaign: Optional[str] = Field(None, max_length=128)
    is_active: bool = True


class TrackedLinkCreate(TrackedLinkBase):
    custom_short_code: Optional[str] = Field(
        None, min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_-]+$"
    )


class TrackedLinkUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    destination_url: Optional[str] = Field(None, min_length=10, max_length=2048)
    utm_source: Optional[str] = Field(None, max_length=128)
    utm_medium: Optional[str] = Field(None, max_length=128)
    utm_campaign: Optional[str] = Field(None, max_length=128)
    is_active: Optional[bool] = None


class TrackedLinkRead(TrackedLinkBase):
    id: str
    creator_id: str
    short_code: str
    click_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LinkClickSummary(BaseModel):
    clicked_at: datetime
    referrer: Optional[str] = None
    country: Optional[str] = None
    user_agent: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TrackedLinkStats(BaseModel):
    link: TrackedLinkRead
    total_clicks: int
    recent_clicks: List[LinkClickSummary]
