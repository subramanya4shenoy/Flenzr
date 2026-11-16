from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Currency = Literal["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD"]


class EnquiryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    request_id: UUID
    creator_handle: str = Field(min_length=1, max_length=64)
    brand_name: str = Field(min_length=2, max_length=160)
    brief: str = Field(min_length=20, max_length=5000)
    rate_card_id: UUID | None = None
    deliverable: str = Field(default="Custom collaboration", min_length=2, max_length=255)
    amount_cents: int | None = Field(default=None, ge=100, le=1_000_000_000, strict=True)
    currency: Currency = "INR"


class EnquiryRespond(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    action: Literal["accept", "decline", "counter"]
    expected_revision: int = Field(ge=1, strict=True)
    note: str = Field(default="", max_length=2000)
    amount_cents: int | None = Field(default=None, ge=100, le=1_000_000_000, strict=True)

    @model_validator(mode="after")
    def counter_requires_amount(self):
        if self.action == "counter" and (self.amount_cents is None or len(self.note) < 5):
            raise ValueError("A counter needs a proposed budget and a short explanation")
        if self.action != "counter" and self.amount_cents is not None:
            raise ValueError("Only a counter can change the budget")
        return self


class EnquiryRead(BaseModel):
    id: str
    creator_handle: str
    creator_name: str
    brand_name: str
    sender_email: str
    brief: str
    deliverable: str
    rate_card_id: str | None
    amount_cents: int | None
    currency: str
    status: Literal["pending", "accepted", "declined", "countered"]
    revision: int
    history: list[dict]
    created_at: datetime
    updated_at: datetime
