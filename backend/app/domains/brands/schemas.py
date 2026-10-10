from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    billing_email: str


class OrganizationCreate(OrganizationBase):
    slug: Optional[str] = Field(None, min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None


class BrandProfileRead(BaseModel):
    id: str
    organization_id: str
    company_name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationRead(OrganizationBase):
    id: str
    slug: str
    logo_url: Optional[str] = None
    billing_status: str
    owner_id: str
    brand_profile: Optional[BrandProfileRead] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
