from typing import Optional
from pydantic import BaseModel, Field


class QRCodeRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)
    fill_color: str = Field("#c1121f", pattern=r"^#(?:[0-9a-fA-F]{3}){1,2}$")
    back_color: str = Field("#ffffff", pattern=r"^#(?:[0-9a-fA-F]{3}){1,2}$")
    box_size: int = Field(10, ge=4, le=40)
    border: int = Field(2, ge=0, le=10)


class QRCodeResponse(BaseModel):
    data_url: str
    target_url: str
