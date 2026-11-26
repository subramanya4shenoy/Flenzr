"""Select the current immutable agreement revision without changing older rows."""
from sqlalchemy import exists, select
from sqlalchemy.orm import aliased
from .models import CollaborationAgreement


def current_agreement_filter():
    newer = aliased(CollaborationAgreement)
    return ~exists(select(newer.id).where(newer.collaboration_id == CollaborationAgreement.collaboration_id,
                                        newer.revision > CollaborationAgreement.revision))


def current_agreement_stmt(record_id):
    return select(CollaborationAgreement).where(CollaborationAgreement.collaboration_id == record_id,
                                               current_agreement_filter())
