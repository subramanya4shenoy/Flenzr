import uuid
from datetime import date, datetime, timezone
from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base, TimestampMixin


class Collaboration(Base, TimestampMixin):
    __tablename__ = 'collaborations'
    __table_args__ = (CheckConstraint(
        '(CASE WHEN application_id IS NOT NULL THEN 1 ELSE 0 END + '
        'CASE WHEN invitation_id IS NOT NULL THEN 1 ELSE 0 END + '
        'CASE WHEN enquiry_id IS NOT NULL THEN 1 ELSE 0 END) = 1', name='ck_collaboration_one_source'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    creator_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    application_id: Mapped[str | None] = mapped_column(String(36), ForeignKey('campaign_applications.id', ondelete='RESTRICT'), unique=True)
    invitation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey('campaign_invitations.id', ondelete='RESTRICT'), unique=True)
    enquiry_id: Mapped[str | None] = mapped_column(String(36), ForeignKey('enquiries.id', ondelete='RESTRICT'), unique=True)
    title: Mapped[str] = mapped_column(String(255))
    brand_name: Mapped[str] = mapped_column(String(255))
    creator_name: Mapped[str] = mapped_column(String(255))
    brief: Mapped[str] = mapped_column(Text)
    deliverable: Mapped[str] = mapped_column(Text)
    quoted_amount_cents: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    requested_delivery_date: Mapped[date | None] = mapped_column(Date)
    message_version: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    delivery_version: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    proposal_version: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    # Agreement acceptance and explicit completion are implemented transitions.
    status: Mapped[str] = mapped_column(String(24), default='discussion', server_default='discussion')

    @property
    def source_kind(self):
        return 'application' if self.application_id else 'invitation' if self.invitation_id else 'enquiry'

    @property
    def source_id(self):
        return self.application_id or self.invitation_id or self.enquiry_id


class ProposalDraft(Base, TimestampMixin):
    __tablename__ = 'collaboration_proposal_drafts'
    __table_args__ = (UniqueConstraint('collaboration_id', 'author_id'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    base_version: Mapped[int] = mapped_column(Integer)
    terms: Mapped[dict] = mapped_column(JSON)


class ProposalRevision(Base, TimestampMixin):
    __tablename__ = 'collaboration_proposal_revisions'
    __table_args__ = (UniqueConstraint('collaboration_id', 'version', name='uq_proposal_revision_version'),
                     UniqueConstraint('collaboration_id', 'author_id', 'request_id', name='uq_proposal_revision_request'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    version: Mapped[int] = mapped_column(Integer)
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))
    terms: Mapped[dict] = mapped_column(JSON)


class ProposalAcceptance(Base, TimestampMixin):
    __tablename__ = 'collaboration_proposal_acceptances'
    __table_args__ = (UniqueConstraint('proposal_id', 'user_id', name='uq_proposal_acceptance_participant'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_proposal_revisions.id', ondelete='RESTRICT'), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))


class CollaborationAgreement(Base, TimestampMixin):
    __tablename__ = 'collaboration_agreements'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), unique=True)
    proposal_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_proposal_revisions.id', ondelete='RESTRICT'), unique=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    snapshot_hash: Mapped[str] = mapped_column(String(64))


class DeliverySubmission(Base, TimestampMixin):
    __tablename__ = 'collaboration_deliveries'
    __table_args__ = (UniqueConstraint('collaboration_id', 'version', name='uq_delivery_version'),
                     UniqueConstraint('collaboration_id', 'request_id', name='uq_delivery_request'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'))
    creator_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    version: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(160))
    notes: Mapped[str] = mapped_column(Text)
    links: Mapped[list] = mapped_column(JSON)
    files: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class DeliveryReview(Base, TimestampMixin):
    __tablename__ = 'collaboration_delivery_reviews'
    __table_args__ = (UniqueConstraint('collaboration_id', 'request_id', name='uq_delivery_review_request'),
                     CheckConstraint("decision IN ('approved', 'revisions_requested')", name='delivery_review_decision'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    delivery_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'), unique=True)
    reviewer_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    decision: Mapped[str] = mapped_column(String(24))
    feedback: Mapped[str] = mapped_column(Text)
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class CollaborationCompletion(Base, TimestampMixin):
    __tablename__ = 'collaboration_completions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), unique=True)
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'))
    delivery_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'))
    review_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_delivery_reviews.id', ondelete='RESTRICT'))
    completed_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class PublishingProof(Base, TimestampMixin):
    __tablename__ = 'collaboration_publishing_proofs'
    __table_args__ = (UniqueConstraint('collaboration_id', 'version', name='uq_publishing_proof_version'),
                     UniqueConstraint('collaboration_id', 'request_id', name='uq_publishing_proof_request'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'))
    delivery_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'))
    review_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_delivery_reviews.id', ondelete='RESTRICT'))
    creator_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    version: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(Text)
    links: Mapped[list] = mapped_column(JSON)
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class PublishingProofConfirmation(Base, TimestampMixin):
    __tablename__ = 'collaboration_proof_confirmations'
    __table_args__ = (UniqueConstraint('collaboration_id', 'request_id', name='uq_proof_confirmation_request'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    proof_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_publishing_proofs.id', ondelete='RESTRICT'), unique=True)
    reviewer_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class CollaborationFile(Base, TimestampMixin):
    __tablename__ = 'collaboration_files'
    __table_args__ = (
        UniqueConstraint('collaboration_id', 'request_id', name='uq_collaboration_file_request'),
        CheckConstraint("state IN ('pending', 'ready', 'removed')", name='collaboration_file_state'),
        CheckConstraint('size_bytes > 0', name='collaboration_file_positive_size'),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    agreement_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_agreements.id', ondelete='RESTRICT'))
    creator_user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    delivery_id: Mapped[str | None] = mapped_column(String(36), ForeignKey('collaboration_deliveries.id', ondelete='RESTRICT'))
    object_key: Mapped[str] = mapped_column(String(255), unique=True)
    filename: Mapped[str] = mapped_column(String(160))
    content_type: Mapped[str] = mapped_column(String(80))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    state: Mapped[str] = mapped_column(String(16), default='pending')
    request_id: Mapped[str] = mapped_column(String(36))


class CollaborationFeedback(Base, TimestampMixin):
    __tablename__ = 'collaboration_feedback'
    __table_args__ = (
        UniqueConstraint('collaboration_id', 'author_id', name='uq_collaboration_feedback_author'),
        CheckConstraint('rating >= 1 AND rating <= 5', name='collaboration_feedback_rating'),
        CheckConstraint('author_id <> recipient_id', name='collaboration_feedback_not_self'),
        CheckConstraint("author_role IN ('brand', 'creator')", name='collaboration_feedback_role'),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    completion_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_completions.id', ondelete='RESTRICT'))
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    recipient_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    author_role: Mapped[str] = mapped_column(String(16))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class CollaborationMessage(Base, TimestampMixin):
    __tablename__ = 'collaboration_messages'
    __table_args__ = (
        UniqueConstraint('collaboration_id', 'sequence', name='uq_collaboration_message_sequence'),
        UniqueConstraint('collaboration_id', 'author_id', 'request_id', name='uq_collaboration_message_request'),
        CheckConstraint('sequence > 0', name='collaboration_message_sequence'),
        CheckConstraint("author_role IN ('brand', 'creator')", name='collaboration_message_role'),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    author_role: Mapped[str] = mapped_column(String(16))
    sequence: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(String(16), default='text', server_default='text')
    request_id: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))


class CollaborationMessageRead(Base, TimestampMixin):
    __tablename__ = 'collaboration_message_reads'
    __table_args__ = (UniqueConstraint('collaboration_id', 'user_id', name='uq_collaboration_message_read_user'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    last_read_sequence: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CollaborationMessageReaction(Base, TimestampMixin):
    __tablename__ = 'collaboration_message_reactions'
    __table_args__ = (UniqueConstraint('message_id', 'user_id', 'emoji', name='uq_collaboration_message_reaction'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaboration_messages.id', ondelete='CASCADE'), index=True)
    collaboration_id: Mapped[str] = mapped_column(String(36), ForeignKey('collaborations.id', ondelete='RESTRICT'), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'))
    emoji: Mapped[str] = mapped_column(String(16))
