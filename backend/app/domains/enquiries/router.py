import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError, FlenzrException, PermissionDeniedError
from app.domains.creators.models import Creator
from app.domains.enquiries.models import Enquiry
from app.domains.enquiries.schemas import EnquiryCreate, EnquiryRead, EnquiryRespond
from app.domains.identity.models import SystemRole, User
from app.domains.ratecards.models import RateCard

router = APIRouter(prefix="/enquiries", tags=["Enquiries"])


def read(enquiry: Enquiry) -> EnquiryRead:
    return EnquiryRead(
        id=enquiry.id, creator_handle=enquiry.creator.handle,
        creator_name=enquiry.creator.display_name, brand_name=enquiry.brand_name,
        sender_email=enquiry.sender.email, brief=enquiry.brief, deliverable=enquiry.deliverable,
        rate_card_id=enquiry.rate_card_id, amount_cents=enquiry.amount_cents,
        currency=enquiry.currency, status=enquiry.status, revision=enquiry.revision,
        history=enquiry.history,
        created_at=enquiry.created_at.replace(tzinfo=timezone.utc) if enquiry.created_at.tzinfo is None else enquiry.created_at,
        updated_at=enquiry.updated_at.replace(tzinfo=timezone.utc) if enquiry.updated_at.tzinfo is None else enquiry.updated_at,
    )


def event(actor: str, action: str, note: str, amount: int | None) -> dict:
    return {"actor": actor, "action": action, "note": note, "amount_cents": amount,
            "at": datetime.now(timezone.utc).isoformat()}


@router.post("", response_model=EnquiryRead, status_code=201)
async def create_enquiry(
    body: EnquiryCreate, response: Response,
    user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    # Serialize creation per sender: retries and the daily limit work across API workers.
    await db.execute(select(User.id).where(User.id == user.id).with_for_update())
    digest = hashlib.sha256(body.model_dump_json().encode()).hexdigest()
    existing = await db.scalar(select(Enquiry).where(
        Enquiry.sender_id == user.id, Enquiry.request_id == str(body.request_id)))
    if existing:
        if existing.payload_hash != digest:
            raise FlenzrException("REQUEST_CONFLICT", "This request was already sent. Start a new enquiry.", 409)
        response.status_code = 200
        return read(existing)
    creator = await db.scalar(select(Creator).where(Creator.handle == body.creator_handle))
    if not creator or not creator.user.is_active:
        raise EntityNotFoundError("Creator", body.creator_handle)
    if creator.user_id == user.id:
        raise PermissionDeniedError("You cannot send an enquiry to yourself")
    count = await db.scalar(select(func.count()).select_from(Enquiry).where(
        Enquiry.sender_id == user.id,
        Enquiry.created_at >= datetime.now(timezone.utc) - timedelta(days=1)))
    if count >= 30:
        raise FlenzrException("ENQUIRY_LIMIT", "Daily enquiry limit reached. Please try tomorrow.", 429)
    package = None
    if body.rate_card_id:
        package = await db.scalar(select(RateCard).where(
            RateCard.id == str(body.rate_card_id), RateCard.creator_id == creator.id,
            RateCard.is_active.is_(True)))
        if not package:
            raise EntityNotFoundError("Active creator package", body.rate_card_id)
    enquiry = Enquiry(
        creator_id=creator.id, sender_id=user.id, request_id=str(body.request_id), payload_hash=digest,
        brand_name=body.brand_name, brief=body.brief,
        rate_card_id=package.id if package else None,
        deliverable=package.title if package else body.deliverable,
        amount_cents=package.base_price_cents if package else body.amount_cents,
        currency=package.currency if package else body.currency,
        status="pending", revision=1,
    )
    enquiry.history = [event("brand", "sent", "", enquiry.amount_cents)]
    db.add(enquiry)
    await db.commit()
    await db.refresh(enquiry)
    return read(enquiry)


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
    return [read(row) for row in rows]


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
    result = await db.execute(update(Enquiry).where(
        Enquiry.id == enquiry.id, Enquiry.revision == body.expected_revision,
        Enquiry.status == enquiry.status,
    ).values(status=new_status, amount_cents=amount, history=history,
             revision=Enquiry.revision + 1, updated_at=datetime.now(timezone.utc)),
        execution_options={"synchronize_session": False})
    if result.rowcount != 1:
        raise FlenzrException("STALE_ENQUIRY", "Someone updated this enquiry. Refresh before responding.", 409)
    await db.commit()
    await db.refresh(enquiry)
    return read(enquiry)
