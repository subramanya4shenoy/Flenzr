from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, TypeAdapter, field_validator


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    billing_email: str


class OrganizationUpdate(BaseModel):
    """Only owner-editable fields; identity, verification and billing state stay server-owned."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: Optional[str] = Field(None, min_length=2, max_length=255)
    billing_email: Optional[EmailStr] = Field(None, max_length=255)
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    industry: Optional[str] = Field(None, max_length=128)
    website: Optional[str] = Field(None, max_length=1024)
    description: Optional[str] = Field(None, max_length=5000)

    @field_validator("name", "company_name", "billing_email", mode="before")
    @classmethod
    def required_when_present(cls, value):
        if value is None:
            raise ValueError("This field cannot be empty")
        return value.strip() if isinstance(value, str) else value

    @field_validator("industry", "website", "description", mode="before")
    @classmethod
    def clear_optional_text(cls, value):
        return value.strip() or None if isinstance(value, str) else value

    @field_validator("website")
    @classmethod
    def http_website(cls, value):
        if value is None:
            return None
        url = TypeAdapter(HttpUrl).validate_python(value)
        if url.username or url.password:
            raise ValueError("Website must not contain credentials")
        return str(url)


class OrganizationCreate(OrganizationUpdate):
    name: str = Field(..., min_length=2, max_length=255)
    billing_email: EmailStr = Field(..., max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")


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
