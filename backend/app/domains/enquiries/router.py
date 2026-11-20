import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from app.domains.creators.models import Creator
from app.domains.enquiries.models import Enquiry
from app.domains.enquiries.abuse import enforce_submission_limits, signature
from app.domains.enquiries.schemas import EnquiryCreate, EnquiryMarkRead, EnquiryRead, EnquiryRespond, EnquiryUnreadCounts, EnquiryWithdraw
from app.domains.identity.models import SystemRole, User
from app.domains.ratecards.models import RateCard
from app.domains.notifications.service import record_notifications
from app.domains.notifications.models import Notification

router = APIRouter(prefix="/enquiries", tags=["Enquiries"])


def read(enquiry: Enquiry, user_id: str) -> EnquiryRead:
    read_revision = enquiry.sender_read_revision if user_id == enquiry.sender_id else enquiry.creator_read_revision
    return EnquiryRead(
        id=enquiry.id, viewer_role="brand" if user_id == enquiry.sender_id else "creator", creator_handle=enquiry.creator.handle,
        creator_name=enquiry.creator.display_name, brand_name=enquiry.brand_name,
        sender_email=enquiry.sender.email, brief=enquiry.brief, deliverable=enquiry.deliverable,
        rate_card_id=enquiry.rate_card_id, amount_cents=enquiry.amount_cents,
        currency=enquiry.currency, status=enquiry.status, revision=enquiry.revision,
        read_revision=read_revision, is_unread=read_revision < enquiry.revision,
        preferred_delivery_date=enquiry.preferred_delivery_date,
        history=enquiry.history,
        created_at=enquiry.created_at.replace(tzinfo=timezone.utc) if enquiry.created_at.tzinfo is None else enquiry.created_at,
        updated_at=enquiry.updated_at.replace(tzinfo=timezone.utc) if enquiry.updated_at.tzinfo is None else enquiry.updated_at,
    )


def event(actor: str, action: str, note: str, amount: int | None) -> dict:
    return {"actor": actor, "action": action, "note": note, "amount_cents": amount,
            "at": datetime.now(timezone.utc).isoformat()}


@router.post("", response_model=EnquiryRead, status_code=201, responses={
    429: {"description": "Submission limit reached; successful idempotent retries remain allowed.",
          "headers": {"Retry-After": {"description": "Seconds before a new submission can be retried.",
                                      "schema": {"type": "integer", "minimum": 1}}}},
})
async def create_enquiry(
    body: EnquiryCreate, response: Response,
    user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    # Serialize creation per sender: retries and the daily limit work across API workers.
    await db.execute(select(User.id).where(User.id == user.id).with_for_update())
    # Preserve request hashes for clients retrying enquiries created before dates existed.
    excluded = {"preferred_delivery_date"} if body.preferred_delivery_date is None else set()
    digest = hashlib.sha256(body.model_dump_json(exclude=excluded).encode()).hexdigest()
    existing = await db.scalar(select(Enquiry).where(
        Enquiry.sender_id == user.id, Enquiry.request_id == str(body.request_id)))
    if existing:
        if existing.payload_hash != digest:
            raise FlenzrException("REQUEST_CONFLICT", "This request was already sent. Start a new enquiry.", 409)
        response.status_code = 200
        return read(existing, user.id)
    # Check after deduplication: a successful retry must still work after the date passes.
    if body.preferred_delivery_date and body.preferred_delivery_date < datetime.now(timezone.utc).date():
        raise FlenzrException("INVALID_DELIVERY_DATE", "Choose today or a later preferred delivery date.", 422)
    creator = await db.scalar(select(Creator).where(Creator.handle == body.creator_handle))
    if not creator or not creator.user.is_active:
        raise EntityNotFoundError("Creator", body.creator_handle)
    if creator.user_id == user.id:
        raise PermissionDeniedError("You cannot send an enquiry to yourself")
    package = None
    if body.rate_card_id:
        package = await db.scalar(select(RateCard).where(
            RateCard.id == str(body.rate_card_id), RateCard.creator_id == creator.id,
            RateCard.is_active.is_(True)))
        if not package:
            raise EntityNotFoundError("Active creator package", body.rate_card_id)
    timestamp = datetime.now(timezone.utc)
    await enforce_submission_limits(db, sender_id=user.id, creator_id=creator.id, at=timestamp,
        proposed=signature(body.brief, package.title if package else body.deliverable,
                           package.base_price_cents if package else body.amount_cents,
                           package.currency if package else body.currency,
                           body.preferred_delivery_date, package.id if package else None))
    enquiry = Enquiry(
        created_at=timestamp, updated_at=timestamp,
        creator_id=creator.id, sender_id=user.id, request_id=str(body.request_id), payload_hash=digest,
        brand_name=body.brand_name, brief=body.brief,
        rate_card_id=package.id if package else None,
        deliverable=package.title if package else body.deliverable,
        amount_cents=package.base_price_cents if package else body.amount_cents,
        currency=package.currency if package else body.currency,
        preferred_delivery_date=body.preferred_delivery_date,
        status="pending", revision=1, sender_read_revision=1, creator_read_revision=0,
    )
    enquiry.history = [event("brand", "sent", "", enquiry.amount_cents)]
    if body.preferred_delivery_date:
        enquiry.history[0]["preferred_delivery_date"] = body.preferred_delivery_date.isoformat()
    db.add(enquiry)
    await db.flush()
    await record_notifications(db, enquiry_id=enquiry.id, revision=1, action="sent",
                               creator_user_id=creator.user_id, sender_id=user.id, actor_id=user.id)
    await db.commit()
    await db.refresh(enquiry)
    return read(enquiry, user.id)


@router.get("/me", response_model=list[EnquiryRead])
async def my_enquiries(
    response: Response, view: str = Query("received", pattern="^(received|sent)$"),
    offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=50),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    query = select(Enquiry)
    if view == "received":
        query = query.join(Creator).where(Creator.user_id == user.id)
    else:
        query = query.where(Enquiry.sender_id == user.id)
    rows = (await db.scalars(query.order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
                             .offset(offset).limit(limit))).all()
    return [read(row, user.id) for row in rows]


@router.get("/unread-counts", response_model=EnquiryUnreadCounts)
async def unread_counts(
    response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    received = and_(Creator.user_id == user.id, Enquiry.creator_read_revision < Enquiry.revision)
    sent = and_(Enquiry.sender_id == user.id, Enquiry.sender_read_revision < Enquiry.revision)
    counts = (await db.execute(select(
        func.coalesce(func.sum(case((received, 1), else_=0)), 0),
        func.coalesce(func.sum(case((sent, 1), else_=0)), 0),
    ).select_from(Enquiry).join(Creator).where(
        or_(Creator.user_id == user.id, Enquiry.sender_id == user.id)
    ))).one()
    return EnquiryUnreadCounts(received=counts[0], sent=counts[1])


@router.post("/{enquiry_id}/read", response_model=EnquiryRead)
async def mark_enquiry_read(
    enquiry_id: str, body: EnquiryMarkRead, response: Response,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    enquiry = await db.scalar(select(Enquiry).where(Enquiry.id == enquiry_id))
    if not enquiry or user.id not in (enquiry.sender_id, enquiry.creator.user_id):
        raise EntityNotFoundError("Enquiry", enquiry_id)
    if body.seen_revision > enquiry.revision:
        raise FlenzrException("INVALID_READ_REVISION", "Refresh the enquiry before marking that update as read.", 409)
    column = Enquiry.sender_read_revision if user.id == enquiry.sender_id else Enquiry.creator_read_revision
    # Never advance beyond what was actually displayed, or move the cursor backwards.
    # A new response racing this request remains unread; read receipts are not activity.
    await db.execute(update(Enquiry).where(Enquiry.id == enquiry_id).values({
        column: case((column < body.seen_revision, body.seen_revision), else_=column),
        Enquiry.updated_at: Enquiry.updated_at,
    }), execution_options={"synchronize_session": False})
    # Viewing this revision also reads its saved alerts, but never a newer alert.
    await db.execute(update(Notification).where(Notification.user_id == user.id,
        Notification.enquiry_id == enquiry_id, Notification.enquiry_revision <= body.seen_revision,
        Notification.read_at.is_(None)).values(read_at=datetime.now(timezone.utc)))
    await db.commit()
    await db.refresh(enquiry)
    return read(enquiry, user.id)


@router.post("/{enquiry_id}/respond", response_model=EnquiryRead)
async def respond_to_enquiry(
    enquiry_id: str, body: EnquiryRespond, response: Response,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    enquiry = await db.scalar(select(Enquiry).where(Enquiry.id == enquiry_id))
    if not enquiry or user.id not in (enquiry.sender_id, enquiry.creator.user_id):
        raise EntityNotFoundError("Enquiry", enquiry_id)
    creator_responding = user.id == enquiry.creator.user_id
    if (creator_responding and enquiry.status != "pending") or (
        not creator_responding and (enquiry.status != "countered" or body.action == "counter")
    ):
        raise FlenzrException("INVALID_TRANSITION", "This enquiry is not awaiting that response. Refresh to see its current status.", 409)
    new_status = {"accept": "accepted", "decline": "declined", "counter": "countered"}[body.action]
    amount = body.amount_cents if body.action == "counter" else enquiry.amount_cents
    history = [*enquiry.history, event("creator" if creator_responding else "brand", body.action, body.note, amount)]
    values = dict(status=new_status, amount_cents=amount, history=history,
                  revision=Enquiry.revision + 1, updated_at=datetime.now(timezone.utc))
    # Authors have seen their own response. The other participant's cursor is untouched.
    values["creator_read_revision" if creator_responding else "sender_read_revision"] = Enquiry.revision + 1
    result = await db.execute(update(Enquiry).where(
        Enquiry.id == enquiry.id, Enquiry.revision == body.expected_revision,
        Enquiry.status == enquiry.status,
    ).values(**values),
        execution_options={"synchronize_session": False})
    if result.rowcount != 1:
        raise FlenzrException("STALE_ENQUIRY", "Someone updated this enquiry. Refresh before responding.", 409)
    await record_notifications(db, enquiry_id=enquiry.id, revision=body.expected_revision + 1,
                               action=body.action, creator_user_id=enquiry.creator.user_id,
                               sender_id=enquiry.sender_id, actor_id=user.id)
    await db.commit()
    await db.refresh(enquiry)
    return read(enquiry, user.id)


@router.post("/{enquiry_id}/withdraw", response_model=EnquiryRead)
async def withdraw_enquiry(
    enquiry_id: str, body: EnquiryWithdraw, response: Response,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    enquiry = await db.scalar(select(Enquiry).where(
        Enquiry.id == enquiry_id, Enquiry.sender_id == user.id))
    if not enquiry:
        raise EntityNotFoundError("Enquiry", enquiry_id)
    # A retry after a lost success response must not append another event.
    if (enquiry.status == "withdrawn" and enquiry.revision == body.expected_revision + 1
        and enquiry.history and enquiry.history[-1].get("action") == "withdraw"
        and enquiry.history[-1].get("note") == body.note):
        return read(enquiry, user.id)
    if enquiry.status not in ("pending", "countered"):
        raise FlenzrException("INVALID_TRANSITION", "Only an open enquiry can be withdrawn. Refresh to see its current status.", 409)
    history = [*enquiry.history, event("brand", "withdraw", body.note, enquiry.amount_cents)]
    # The same revision/status compare-and-swap as responses: only one decision
    # wins, even when separate API workers act on the pending enquiry together.
    result = await db.execute(update(Enquiry).where(
        Enquiry.id == enquiry.id, Enquiry.sender_id == user.id,
        Enquiry.revision == body.expected_revision, Enquiry.status == enquiry.status,
    ).values(status="withdrawn", history=history, revision=Enquiry.revision + 1,
             sender_read_revision=Enquiry.revision + 1, updated_at=datetime.now(timezone.utc)),
        execution_options={"synchronize_session": False})
    if result.rowcount != 1:
        raise FlenzrException("STALE_ENQUIRY", "Someone updated this enquiry. Refresh before withdrawing it.", 409)
    await record_notifications(db, enquiry_id=enquiry.id, revision=body.expected_revision + 1,
                               action="withdraw", creator_user_id=enquiry.creator.user_id,
                               sender_id=enquiry.sender_id, actor_id=user.id)
    await db.commit()
    await db.refresh(enquiry)
    return read(enquiry, user.id)


@router.get("/{enquiry_id}", response_model=EnquiryRead)
async def enquiry_detail(enquiry_id: str, response: Response,
                         user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    row = await db.scalar(select(Enquiry).where(Enquiry.id == enquiry_id))
    if not row or user.id not in (row.sender_id, row.creator.user_id):
        raise EntityNotFoundError("Enquiry", enquiry_id)
    return read(row, user.id)
