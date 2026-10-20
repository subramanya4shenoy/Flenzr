from datetime import datetime
from typing import Optional, Literal
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
    instagram_handle: Optional[str] = None
    instagram_verified: bool = False
    youtube_channel: Optional[str] = None
    youtube_verified: bool = False
    verification_code: Optional[str] = None
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
    instagram_handle: Optional[str] = None
    instagram_verified: bool = False
    youtube_channel: Optional[str] = None
    youtube_verified: bool = False

    model_config = ConfigDict(from_attributes=True)


class InitialRateCardItem(BaseModel):
    platform: str
    deliverable: str
    price: float
    days: int


class CreatorOnboardRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    handle: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_]+$")
    niche: Optional[str] = None
    instagram_handle: Optional[str] = None
    instagram_verified: bool = False
    youtube_channel: Optional[str] = None
    youtube_verified: bool = False
    rate_cards: list[InitialRateCardItem] = []


class CreatorOnboardResponse(BaseModel):
    creator: CreatorRead
    access_token: str
    token_type: str = "bearer"
    universal_bio_link: str
    message: str


class BioVerifyRequest(BaseModel):
    platform: Literal["instagram", "youtube"]
    handle: str = Field(min_length=1, max_length=128, pattern=r"^@?[a-zA-Z0-9_.-]+$")
    verification_code: str = Field(min_length=1, max_length=64)
    creator_handle: Optional[str] = None



class BioVerifyResponse(BaseModel):
    verified: bool
    platform: str
    handle: str
    message: str
