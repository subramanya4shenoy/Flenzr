"""Read-only participant calendar derived from the immutable agreement date."""
import re
from datetime import date
from calendar import monthrange
from sqlalchemy import select, func, and_, or_, case
from app.core.exceptions import DomainRuleViolation
from .models import Collaboration, CollaborationAgreement, CollaborationCompletion, DeliverySubmission, DeliveryReview
from .service import CollaborationService
from .agreements import stamp
from .current_agreement import current_agreement_filter


class CollaborationCalendar:
    @staticmethod
    async def read(db, user_id, month, day=None, page=1, page_size=20):
        if not re.fullmatch(r'[0-9]{4}-[0-9]{2}', month):
            raise DomainRuleViolation('INVALID_CALENDAR_MONTH', 'Choose a month in YYYY-MM format.')
        year, number = map(int, month.split('-'))
        if not 1900 <= year <= 9998 or not 1 <= number <= 12:
            raise DomainRuleViolation('INVALID_CALENDAR_MONTH', 'Choose a valid month between 1900 and 9998.')
        days = monthrange(year, number)[1]
        if day is not None and not 1 <= day <= days:
            raise DomainRuleViolation('INVALID_CALENDAR_DAY', 'Choose a day in the selected month.')
        start, end = date(year, number, 1).isoformat(), date(year, number, days).isoformat()
        due = CollaborationAgreement.snapshot['terms']['delivery_date'].as_string()
        # ISO date strings preserve calendar-date ordering on PostgreSQL and SQLite.
        scope = (CollaborationService.scope(user_id), current_agreement_filter(), Collaboration.status.in_(('agreed', 'completed')),
                 due >= start, due <= end)
        base = select(Collaboration, CollaborationAgreement, CollaborationCompletion, DeliverySubmission, DeliveryReview).select_from(Collaboration).join(CollaborationAgreement,
            CollaborationAgreement.collaboration_id == Collaboration.id).outerjoin(CollaborationCompletion,
            CollaborationCompletion.collaboration_id == Collaboration.id).outerjoin(DeliverySubmission,
            and_(DeliverySubmission.collaboration_id == Collaboration.id, DeliverySubmission.version == Collaboration.delivery_version)).outerjoin(DeliveryReview,
            DeliveryReview.delivery_id == DeliverySubmission.id).where(*scope)
        # Only work still owed by the creator counts as outstanding delivery work.
        outstanding = and_(Collaboration.status == 'agreed', or_(DeliverySubmission.id.is_(None), DeliverySubmission.agreement_id != CollaborationAgreement.id, DeliveryReview.decision == 'revisions_requested'))
        counts = (await db.execute(base.with_only_columns(due.label('delivery_date'), func.count(Collaboration.id).label('total'),
            func.sum(case((outstanding, 1), else_=0)).label('outstanding'), maintain_column_froms=True)
            .group_by(due).order_by(due))).all()
        if day is not None:
            base = base.where(due == date(year, number, day).isoformat())
        total = await db.scalar(select(func.count()).select_from(base.subquery()))
        rows = (await db.execute(base.order_by(due, Collaboration.id).offset((page-1)*page_size).limit(page_size))).all()
        items = []
        for collab, agreement, completion, delivery, review in rows:
            snapshot = agreement.snapshot
            state = 'completed' if collab.status == 'completed' else 'not_submitted' if not delivery or delivery.agreement_id != agreement.id else review.decision if review else 'awaiting_review'
            items.append(dict(collaboration_id=collab.id, agreement_id=agreement.id, title=snapshot['title'],
                brand_name=snapshot['brand_name'], creator_name=snapshot['creator_name'],
                delivery_date=snapshot['terms']['delivery_date'], deliverables=snapshot['terms']['deliverables'],
                delivery_state=state, latest_delivery_version=collab.delivery_version,
                status=collab.status, completed_at=stamp(completion.created_at) if completion else None))
        return dict(month=month, day=day, items=items, total=total, page=page, page_size=page_size,
                    month_total=sum(row.total for row in counts),
                    outstanding_counts=[dict(delivery_date=row.delivery_date, total=row.outstanding) for row in counts if row.outstanding], day_counts=[dict(delivery_date=row.delivery_date, total=row.total) for row in counts])
