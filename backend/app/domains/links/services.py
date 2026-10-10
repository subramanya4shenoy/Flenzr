import hashlib
import random
import string
from typing import List, Optional
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainRuleViolation, EntityNotFoundError
from app.domains.links.models import LinkClick, TrackedLink
from app.domains.links.schemas import TrackedLinkCreate, TrackedLinkUpdate


def generate_short_code(length: int = 7) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=length))


def append_utm_parameters(
    url: str,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
) -> str:
    if not any([utm_source, utm_medium, utm_campaign]):
        return url

    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)

    if utm_source:
        query_params["utm_source"] = [utm_source]
    if utm_medium:
        query_params["utm_medium"] = [utm_medium]
    if utm_campaign:
        query_params["utm_campaign"] = [utm_campaign]

    flat_params = {k: v[0] if len(v) == 1 else v for k, v in query_params.items()}
    new_query = urlencode(flat_params, doseq=True)

    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment,
        )
    )


class LinkService:
    @staticmethod
    async def list_for_creator(
        db: AsyncSession, creator_id: str
    ) -> List[TrackedLink]:
        stmt = (
            select(TrackedLink)
            .where(TrackedLink.creator_id == creator_id)
            .order_by(desc(TrackedLink.created_at))
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, link_id: str) -> Optional[TrackedLink]:
        stmt = select(TrackedLink).where(TrackedLink.id == link_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_short_code(db: AsyncSession, short_code: str) -> Optional[TrackedLink]:
        stmt = select(TrackedLink).where(TrackedLink.short_code == short_code)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession, creator_id: str, payload: TrackedLinkCreate
    ) -> TrackedLink:
        short_code = payload.custom_short_code
        if short_code:
            existing = await LinkService.get_by_short_code(db, short_code)
            if existing:
                raise DomainRuleViolation(
                    "SHORT_CODE_EXISTS", f"Short code '{short_code}' is already taken."
                )
        else:
            # Generate random unique short code
            for _ in range(5):
                candidate = generate_short_code()
                if not await LinkService.get_by_short_code(db, candidate):
                    short_code = candidate
                    break
            if not short_code:
                raise DomainRuleViolation("CODE_GEN_FAILED", "Failed to generate unique short code")

        link = TrackedLink(
            creator_id=creator_id,
            title=payload.title,
            destination_url=payload.destination_url,
            short_code=short_code,
            utm_source=payload.utm_source,
            utm_medium=payload.utm_medium,
            utm_campaign=payload.utm_campaign,
            is_active=payload.is_active,
        )
        db.add(link)
        await db.commit()
        await db.refresh(link)
        return link

    @staticmethod
    async def update(
        db: AsyncSession, link: TrackedLink, updates: TrackedLinkUpdate
    ) -> TrackedLink:
        update_data = updates.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(link, key, value)
        await db.commit()
        await db.refresh(link)
        return link

    @staticmethod
    async def delete(db: AsyncSession, link: TrackedLink) -> None:
        await db.delete(link)
        await db.commit()

    @staticmethod
    async def record_click(
        db: AsyncSession,
        link_id: str,
        referrer: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        ip_hash = None
        if ip_address:
            ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:16]

        click = LinkClick(
            link_id=link_id,
            referrer=referrer,
            ip_hash=ip_hash,
            user_agent=user_agent[:512] if user_agent else None,
        )
        db.add(click)

        # Increment click count atomically
        await db.execute(
            update(TrackedLink)
            .where(TrackedLink.id == link_id)
            .values(click_count=TrackedLink.click_count + 1)
        )
        await db.commit()

    @staticmethod
    async def get_recent_clicks(
        db: AsyncSession, link_id: str, limit: int = 50
    ) -> List[LinkClick]:
        stmt = (
            select(LinkClick)
            .where(LinkClick.link_id == link_id)
            .order_by(desc(LinkClick.clicked_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
