from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel,ConfigDict,Field,field_validator


class ShortlistCreate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    request_id: UUID
    name: str=Field(min_length=1,max_length=80)

    @field_validator('name',mode='before')
    @classmethod
    def clean_name(cls,value):
        if isinstance(value,str):
            value=' '.join(value.split())
            if any(ord(char)<32 or ord(char)==127 for char in value):
                raise ValueError('Use a printable shortlist name')
        return value


class ShortlistRead(BaseModel):
    id: str
    name: str
    members_count: int
    created_at: datetime
    updated_at: datetime


class ShortlistPage(BaseModel):
    items: list[ShortlistRead]
    total: int
    page: int
    page_size: int


class ShortlistCreator(BaseModel):
    handle: str
    display_name: str
    bio: Optional[str]=None
    niche: Optional[str]=None
    location: Optional[str]=None
    is_verified: bool
    rating: float


class ShortlistMemberRead(BaseModel):
    id: str
    saved_at: datetime
    creator: Optional[ShortlistCreator]=None


class ShortlistMemberPage(BaseModel):
    shortlist: ShortlistRead
    items: list[ShortlistMemberRead]
    total: int
    page: int
    page_size: int
