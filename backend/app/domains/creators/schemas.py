from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CreatorBase(BaseModel):
    handle: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_]+$")
    display_name: str = Field(..., min_length=1, max_length=255)
    bio: Optional[str] = None
    niche: Optional[str] = None
    location: Optional[str] = None
    profile_theme: Optional[str] = "default"


class CreatorUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    niche: Optional[str] = None
    location: Optional[str] = None
    profile_theme: Optional[str] = None


class CreatorRead(CreatorBase):
    id: str
    user_id: str
    is_verified: bool
    rating: float
    custom_domain: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicCreatorProfile(BaseModel):
    handle: str
    display_name: str
    bio: Optional[str] = None
    niche: Optional[str] = None
    location: Optional[str] = None
    is_verified: bool
    rating: float
    profile_theme: Optional[str] = "default"
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
