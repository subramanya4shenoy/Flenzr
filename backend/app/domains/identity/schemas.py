from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, EmailStr

from app.domains.identity.models import SystemRole


class UserRoleRead(BaseModel):
    id: str
    role: SystemRole

    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    id: str
    supabase_uid: str
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_superadmin: bool
    roles: List[UserRoleRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSyncRequest(BaseModel):
    role: Optional[Literal["creator", "brand_owner"]] = "creator"
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserProfileResponse(BaseModel):
    user: UserRead
    active_roles: List[str]
    creator_id: Optional[str] = None
    brand_id: Optional[str] = None
