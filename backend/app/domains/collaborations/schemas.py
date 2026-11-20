from datetime import date, datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator, model_serializer


class CollaborationCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    source_kind: Literal['application', 'invitation', 'enquiry']
    source_id: UUID


class CollaborationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_kind: Literal['application', 'invitation', 'enquiry']
    source_id: str
    title: str
    brand_name: str
    creator_name: str
    brief: str
    deliverable: str
    quoted_amount_cents: int | None
    currency: str
    requested_delivery_date: date | None
    status: Literal['discussion', 'agreed', 'completed']
    created_at: datetime
    updated_at: datetime


class CollaborationPage(BaseModel):
    items: list[CollaborationRead]
    total: int = Field(ge=0)
    page: int
    page_size: int


class ProposalTerms(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    amount_cents: int | None = Field(None, ge=100, le=1_000_000_000, strict=True)
    currency: Literal['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD'] = 'INR'
    deliverables: str = Field('', max_length=5000)
    delivery_date: date | None = None
    usage_rights: str = Field('', max_length=5000)
    note: str = Field('', max_length=2000)
    revision_limit: int | None = Field(None, ge=0, le=20, strict=True)

    @model_serializer(mode='wrap')
    def preserve_unspecified_revision_terms(self, handler):
        # Do not add a term to historical agreement JSON or change its snapshot hash.
        result = handler(self)
        if self.revision_limit is None:
            result.pop('revision_limit', None)
        return result


    @field_validator('delivery_date', mode='before')
    @classmethod
    def calendar_date(cls, value):
        import re
        if value is not None and (not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', value)):
            raise ValueError('Use a calendar date in YYYY-MM-DD format')
        return value


class ProposalDraftSave(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_revision: int = Field(ge=0, strict=True)
    expected_latest_version: int = Field(ge=0, strict=True)
    terms: ProposalTerms


class ProposalDraftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    revision: int
    base_version: int
    terms: ProposalTerms
    updated_at: datetime


class ProposalSend(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: UUID
    expected_draft_revision: int = Field(ge=1, strict=True)
    expected_latest_version: int = Field(ge=0, strict=True)


class ProposalRevisionRead(BaseModel):
    id: str
    version: int
    author_role: Literal['brand', 'creator']
    is_mine: bool
    terms: ProposalTerms
    created_at: datetime


class ProposalAccept(BaseModel):
    model_config = ConfigDict(extra='forbid')
    proposal_id: UUID
    expected_version: int = Field(ge=1, strict=True)
    confirmed: bool = Field(strict=True)

    @field_validator('confirmed')
    @classmethod
    def explicit_confirmation(cls, value):
        if not value:
            raise ValueError('Explicit acceptance confirmation is required')
        return value


class AgreementSnapshot(BaseModel):
    schema_version: Literal[1]
    collaboration_id: str
    proposal_id: str
    proposal_version: int
    title: str
    brand_name: str
    creator_name: str
    source_kind: str
    source_id: str
    terms: ProposalTerms
    proposal_sent_at: str
    brand_accepted_at: str
    creator_accepted_at: str
    agreed_at: str


class AgreementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    snapshot: AgreementSnapshot
    snapshot_hash: str
    created_at: datetime


class ProposalAcceptanceState(BaseModel):
    proposal_id: str
    version: int
    brand_accepted_at: str | None
    creator_accepted_at: str | None
    you_accepted: bool
    can_accept: bool


class AgreementStatus(BaseModel):
    acceptance: ProposalAcceptanceState | None
    agreement: AgreementRead | None
    collaboration_status: Literal['discussion', 'agreed', 'completed']


class ProposalWorkspace(AgreementStatus):
    latest_version: int
    draft: ProposalDraftRead | None
    items: list[ProposalRevisionRead]
    total: int
    page: int
    page_size: int


class DeliveryLink(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    label: str = Field(min_length=1, max_length=80)
    url: HttpUrl = Field(max_length=2048)

    @field_validator('url', mode='before')
    @classmethod
    def plain_url(cls, value):
        import re
        if not isinstance(value, str):
            raise ValueError('Use a full HTTPS link')
        value = value.strip()
        if not re.match(r'^https://', value, re.I):
            raise ValueError('Use a full HTTPS link')
        if re.search(r'[\s\\\x00-\x1f\x7f]', value):
            raise ValueError('Links cannot contain spaces, backslashes or control characters')
        return value

    @field_validator('url')
    @classmethod
    def https_without_credentials(cls, value):
        if value.scheme != 'https' or value.username is not None or value.password is not None:
            raise ValueError('Use an HTTPS link without embedded login details')
        return value


class DeliveryCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    agreement_id: UUID
    expected_latest_version: int = Field(ge=0, strict=True)
    title: str = Field(min_length=3, max_length=160)
    notes: str = Field('', max_length=5000)
    links: list[DeliveryLink] = Field(default_factory=list, max_length=10)
    file_ids: list[UUID] = Field(default_factory=list, max_length=10)

    @model_serializer(mode='wrap')
    def legacy_link_payload(self, handler):
        result = handler(self)
        if not self.file_ids:
            result.pop('file_ids', None)
        return result

    @model_validator(mode='after')
    def distinct_links(self):
        if not self.links and not self.file_ids:
            raise ValueError('Add at least one file or HTTPS link')
        if len(self.file_ids) != len(set(self.file_ids)):
            raise ValueError('Remove duplicate files before submitting')
        urls = [str(link.url) for link in self.links]
        if len(urls) != len(set(urls)):
            raise ValueError('Remove duplicate links before submitting')
        return self


class DeliveryReviewCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    expected_latest_version: int = Field(ge=1, strict=True)
    action: Literal['approve', 'request_revision']
    feedback: str = Field('', max_length=5000)

    @model_validator(mode='after')
    def revision_feedback(self):
        if self.action == 'request_revision' and len(self.feedback) < 5:
            raise ValueError('Explain the requested changes in at least five characters')
        return self


class DeliveryReviewRead(BaseModel):
    id: str
    delivery_id: str
    version: int
    decision: Literal['approved', 'revisions_requested']
    feedback: str
    reviewed_at: str


class CollaborationFileRead(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int


class FileUploadCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    agreement_id: UUID
    filename: str = Field(min_length=1, max_length=160)
    content_type: str = Field(min_length=1, max_length=80)
    size_bytes: int = Field(gt=0, le=500 * 1024 * 1024, strict=True)


class FileUploadTicket(BaseModel):
    file: CollaborationFileRead
    endpoint: str
    token: str
    bucket: str
    object_name: str
    expires_in: int = 7200


class FileDownload(BaseModel):
    url: str
    expires_in: int = 120


class FileUploadLimits(BaseModel):
    max_bytes: int
    max_files: int = 10
    content_types: list[str]


class DeliveryRead(BaseModel):
    files: list[CollaborationFileRead] = Field(default_factory=list)
    review: DeliveryReviewRead | None = None
    id: str
    agreement_id: str
    version: int
    title: str
    notes: str
    links: list[DeliveryLink]
    submitted_at: str


class CompletionCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: UUID
    delivery_id: UUID
    review_id: UUID
    expected_latest_version: int = Field(ge=1, strict=True)
    confirmed: bool = Field(strict=True)

    @field_validator('confirmed')
    @classmethod
    def explicit_confirmation(cls, value):
        if not value:
            raise ValueError('Explicit completion confirmation is required')
        return value


class CompletionRead(BaseModel):
    id: str
    agreement_id: str
    delivery_id: str
    review_id: str
    version: int
    completed_at: str


class RevisionAllowance(BaseModel):
    limit: int | None
    used: int
    remaining: int | None


class DeliveryWorkspace(BaseModel):
    revision_allowance: RevisionAllowance | None
    can_request_revision: bool
    collaboration_status: Literal['discussion', 'agreed', 'completed']
    completion: CompletionRead | None
    can_complete: bool
    can_review: bool
    latest_version: int
    agreement_id: str | None
    can_submit: bool
    items: list[DeliveryRead]
    total: int
    page: int
    page_size: int


class CalendarItem(BaseModel):
    delivery_state: Literal['not_submitted', 'awaiting_review', 'revisions_requested', 'approved', 'completed']
    latest_delivery_version: int
    collaboration_id: str
    agreement_id: str
    title: str
    brand_name: str
    creator_name: str
    delivery_date: date
    deliverables: str
    status: Literal['agreed', 'completed']
    completed_at: str | None


class CalendarDayCount(BaseModel):
    delivery_date: date
    total: int


class CalendarPage(BaseModel):
    outstanding_counts: list[CalendarDayCount]
    month: str
    day: int | None
    items: list[CalendarItem]
    day_counts: list[CalendarDayCount]
    month_total: int
    total: int
    page: int
    page_size: int


class PublishingProofCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    delivery_id: UUID
    review_id: UUID
    expected_delivery_version: int = Field(ge=1, strict=True)
    expected_latest_proof_version: int = Field(ge=0, strict=True)
    notes: str = Field('', max_length=5000)
    links: list[DeliveryLink] = Field(min_length=1, max_length=10)

    @model_validator(mode='after')
    def distinct_links(self):
        urls = [str(link.url) for link in self.links]
        if len(urls) != len(set(urls)):
            raise ValueError('Remove duplicate links before saving proof')
        return self


class ProofConfirmationCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: UUID
    expected_proof_version: int = Field(ge=1, strict=True)
    confirmed: bool = Field(strict=True)

    @field_validator('confirmed')
    @classmethod
    def explicit_confirmation(cls, value):
        if not value:
            raise ValueError('Explicit proof confirmation is required')
        return value


class ProofConfirmationRead(BaseModel):
    id: str
    proof_id: str
    proof_version: int
    delivery_id: str
    delivery_version: int
    confirmed_at: str


class PublishingProofRead(BaseModel):
    confirmation: ProofConfirmationRead | None = None
    id: str
    version: int
    agreement_id: str
    delivery_id: str
    delivery_version: int
    review_id: str
    notes: str
    links: list[DeliveryLink]
    saved_at: str


class PublishingProofWorkspace(BaseModel):
    can_confirm: bool
    can_publish: bool
    eligible_delivery: DeliveryRead | None
    latest_proof_version: int
    items: list[PublishingProofRead]
    total: int
    page: int
    page_size: int


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    completion_id: UUID
    rating: int = Field(ge=1, le=5, strict=True)
    comment: str = Field(min_length=10, max_length=2000)
    confirmed: bool = Field(strict=True)

    @field_validator('confirmed')
    @classmethod
    def explicit_confirmation(cls, value):
        if not value:
            raise ValueError('Explicit feedback confirmation is required')
        return value

    @field_validator('comment')
    @classmethod
    def plain_comment(cls, value):
        # Allow ordinary paragraphs; reject invisible control-only padding.
        if any(ord(char) < 32 and char not in '\n\t' or ord(char) == 127 for char in value):
            raise ValueError('Remove control characters from your feedback')
        if len(value.strip()) < 10:
            raise ValueError('Describe your experience in at least ten characters')
        return value


class FeedbackRead(BaseModel):
    id: str
    completion_id: str
    author_role: Literal['brand', 'creator']
    is_mine: bool
    rating: int
    comment: str
    submitted_at: str


class FeedbackWorkspace(BaseModel):
    collaboration_status: Literal['discussion', 'agreed', 'completed']
    completion_id: str | None
    completed_at: str | None
    can_submit: bool
    your_role: Literal['brand', 'creator']
    recipient_role: Literal['brand', 'creator']
    recipient_name: str
    visibility: Literal['participants_only'] = 'participants_only'
    items: list[FeedbackRead]


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    text: str = Field(min_length=1, max_length=4000)

    @field_validator('text')
    @classmethod
    def plain_message(cls, value):
        if any(ord(char) < 32 and char not in '\n\t' or ord(char) == 127 for char in value):
            raise ValueError('Remove control characters from your message')
        return value


class MessageRead(BaseModel):
    id: str
    sequence: int
    author_role: Literal['brand', 'creator']
    is_mine: bool
    text: str
    sent_at: str


class MessagePage(BaseModel):
    items: list[MessageRead]
    latest_sequence: int
    next_before: int | None
    limit: int
