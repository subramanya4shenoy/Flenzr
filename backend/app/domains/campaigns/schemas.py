from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import UUID
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domains.campaigns.models import ApplicationStatus, CampaignStatus, InvitationStatus


class CampaignBase(BaseModel):
    visibility: Literal["public", "invited"] = "public"
    title: str = Field(..., min_length=3, max_length=255)
    brief: str = Field(..., min_length=10)
    target_niche: Optional[str] = Field(None, max_length=128)
    deliverable_summary: Optional[str] = Field(None, max_length=512)
    budget_total_cents: int = Field(..., ge=1000)  # Min $10.00
    currency: str = Field("USD", min_length=3, max_length=3)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    brief: Optional[str] = Field(None, min_length=10)
    target_niche: Optional[str] = None
    deliverable_summary: Optional[str] = None
    budget_total_cents: Optional[int] = Field(None, ge=1000)
    status: Optional[CampaignStatus] = None


class CampaignDraftFields(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    visibility: Literal["public", "invited"] = "public"
    title: str = Field(min_length=3, max_length=255)
    brief: str = Field(default="", max_length=20000)
    target_niche: Optional[str] = Field(None, max_length=128)
    deliverable_summary: Optional[str] = Field(None, max_length=512)
    budget_total_cents: int = Field(default=0, strict=True, ge=0, le=2_000_000_000)
    currency: str = Field(default="INR", pattern=r"^[A-Z]{3}$")
    start_date: Optional[AwareDatetime] = None
    end_date: Optional[AwareDatetime] = None

    @field_validator("target_niche", "deliverable_summary", mode="before")
    @classmethod
    def blank_is_empty(cls, value):
        return value.strip() or None if isinstance(value, str) else value

    @field_validator("start_date", "end_date")
    @classmethod
    def utc_dates(cls, value):
        return value.astimezone(timezone.utc) if value else None

    @model_validator(mode="after")
    def dates_in_order(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date")
        return self


class CampaignPublishFields(CampaignDraftFields):
    brief: str = Field(min_length=10, max_length=20000)
    target_niche: str = Field(min_length=1, max_length=128)
    deliverable_summary: str = Field(min_length=1, max_length=512)
    budget_total_cents: int = Field(strict=True, ge=1000, le=2_000_000_000)

    @model_validator(mode="after")
    def publication_dates(self):
        if self.end_date and self.end_date.astimezone(timezone.utc).date() < datetime.now(timezone.utc).date():
            raise ValueError("End date must be today or later to publish or resume")
        return self


class CampaignCreate(CampaignPublishFields):
    """Legacy create-and-publish path uses the same readiness rules as publishing a draft."""
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")


CampaignAction = Literal["publish", "pause", "resume", "close", "cancel"]


class CampaignTransition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: CampaignAction
    expected_revision: int = Field(ge=1)
    expected_status: CampaignStatus


class CampaignDraftCreate(CampaignDraftFields):
    request_id: UUID


class CampaignDraftUpdate(CampaignDraftFields):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    brief: Optional[str] = Field(None, max_length=20000)
    budget_total_cents: Optional[int] = Field(None, strict=True, ge=0, le=2_000_000_000)
    currency: Optional[str] = Field(None, pattern=r"^[A-Z]{3}$")
    expected_revision: int = Field(ge=1)

    @field_validator("title", "brief", "budget_total_cents", "currency", mode="before")
    @classmethod
    def cannot_clear_required_fields(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value

    @model_validator(mode="after")
    def has_edits(self):
        if not self.model_fields_set - {"expected_revision"}:
            raise ValueError("Include at least one draft field")
        return self


class CampaignRead(BaseModel):
    visibility: Literal["public", "invited"] = "public"
    id: str
    organization_id: str
    title: str
    brief: str
    target_niche: Optional[str] = None
    deliverable_summary: Optional[str] = None
    budget_total_cents: int
    currency: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: CampaignStatus
    revision: int
    applicants_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    pitch_message: Optional[str] = Field(None, max_length=5000)
    proposed_rate_cents: int = Field(strict=True, ge=100, le=2_000_000_000)
    expected_campaign_revision: Optional[int] = Field(None, ge=1)

    @field_validator("pitch_message", mode="before")
    @classmethod
    def blank_pitch(cls, value):
        return value.strip() or None if isinstance(value, str) else value


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
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    creator_id: str = Field(min_length=1, max_length=36)
    offered_rate_cents: int = Field(strict=True, ge=100, le=2_000_000_000)
    message: Optional[str] = Field(None, max_length=5000)
    expected_campaign_revision: Optional[int] = Field(None, ge=1)

    @field_validator("message", mode="before")
    @classmethod
    def blank_message(cls, value):
        return value.strip() or None if isinstance(value, str) else value


class CampaignInvitationRead(BaseModel):
    id: str
    campaign_id: str
    creator_id: str
    offered_rate_cents: int
    message: Optional[str] = None
    status: InvitationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignActivityRead(BaseModel):
    id: str
    campaign_id: str
    campaign_title: str
    campaign_status: CampaignStatus
    campaign_revision: int
    campaign_end_date: Optional[datetime] = None
    organization_name: str
    creator_id: str
    creator_name: str
    creator_handle: str
    currency: str
    rate_cents: int
    message: Optional[str] = None
    status: Literal["pending", "accepted", "rejected", "withdrawn", "invited", "declined"]
    created_at: datetime
    updated_at: datetime


class CampaignActivityPage(BaseModel):
    items: list[CampaignActivityRead]
    total: int
    page: int
    page_size: int


class CampaignApplicationResponse(BaseModel):
    expected_application_revision: Optional[int] = Field(None, ge=0)
    model_config = ConfigDict(extra="forbid")
    action: Literal["accept", "reject"]
    expected_status: Literal["pending"]
    expected_campaign_revision: int = Field(ge=1)


class CampaignApplicationWithdrawal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["withdraw"]
    expected_status: Literal["pending"]
    expected_campaign_revision: int = Field(ge=1)


class CampaignInvitationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["accept", "decline"]
    expected_status: Literal["invited"]
    expected_campaign_revision: int = Field(ge=1)


class CampaignInvitationRecipient(BaseModel):
    id: str
    handle: str
    display_name: str


class CampaignOpportunityRead(BaseModel):
    id: str
    title: str
    brief: str
    organization_name: str
    target_niche: Optional[str] = None
    deliverable_summary: Optional[str] = None
    budget_total_cents: int
    currency: str
    status: CampaignStatus
    revision: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application: Optional[CampaignApplicationRead] = None


class CampaignOpportunityPage(BaseModel):
    items: list[CampaignOpportunityRead]
    total: int
    page: int
    page_size: int


class CampaignApplicationTotals(BaseModel):
    total: int = Field(ge=0)
    pending: int = Field(ge=0)
    accepted: int = Field(ge=0)
    rejected: int = Field(ge=0)
    withdrawn: int = Field(ge=0)


class CampaignInvitationTotals(BaseModel):
    total: int = Field(ge=0)
    invited: int = Field(ge=0)
    accepted: int = Field(ge=0)
    declined: int = Field(ge=0)


class CampaignBudgetTotal(BaseModel):
    currency: str
    cents: int = Field(ge=0)


class CampaignPipelineSummary(BaseModel):
    campaign_count: int = Field(ge=0)
    active_campaign_count: int = Field(ge=0)
    planned_budgets: list[CampaignBudgetTotal]
    applications: CampaignApplicationTotals
    invitations: CampaignInvitationTotals
    updated_at: datetime
