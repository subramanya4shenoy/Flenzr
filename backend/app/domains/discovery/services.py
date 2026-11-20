from typing import List, Optional
import time
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.creators.models import Creator
from app.domains.creators.schemas import PublicCreatorProfile
from app.domains.discovery.schemas import CreatorDiscoveryPage, DiscoveryCreator
from app.domains.discovery.networks import DiscoveryNetwork, connected_networks, network_predicate
from app.domains.identity.models import User
from app.domains.discovery.audience import audience_summaries, saved_audience_queries


def _contains(value: str) -> str:
    # Treat user-entered SQL wildcard characters as literal search text.
    return "%" + value.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


class DiscoveryService:
    @staticmethod
    def _query(query=None, niche=None, location=None, min_rating=None, network=None, now=None, min_audience=None, max_audience=None, updated_within_days=None):
        stmt = select(Creator).join(User, Creator.user_id == User.id).where(User.is_active.is_(True))
        if query and query.strip():
            text = _contains(query)
            stmt = stmt.where(or_(Creator.handle.ilike(text, escape="\\"),
                                  Creator.display_name.ilike(text, escape="\\"),
                                  Creator.bio.ilike(text, escape="\\")))
        if niche and niche.strip():
            stmt = stmt.where(Creator.niche.ilike(_contains(niche), escape="\\"))
        if location and location.strip():
            stmt = stmt.where(Creator.location.ilike(_contains(location), escape="\\"))
        if min_rating is not None:
            stmt = stmt.where(Creator.rating >= min_rating)
        if network:
            stmt = stmt.where(network_predicate(network, now if now is not None else time.time()))
        if network and any(value is not None for value in (min_audience, max_audience, updated_within_days)):
            stamp = now if now is not None else time.time()
            count, updated = saved_audience_queries(network, stamp)
            stmt = stmt.where(count.is_not(None))
            if min_audience is not None:
                stmt = stmt.where(count >= min_audience)
            if max_audience is not None:
                stmt = stmt.where(count <= max_audience)
            if updated_within_days is not None:
                stmt = stmt.where(updated >= stamp - updated_within_days * 86400)
        return stmt

    @staticmethod
    def _public(creator: Creator, now: float | None = None) -> DiscoveryCreator:
        return DiscoveryCreator(
            audiences=audience_summaries(creator, now if now is not None else time.time()),
            connected_networks=connected_networks(creator, now if now is not None else time.time()),
            handle=creator.handle, display_name=creator.display_name, bio=creator.bio,
            niche=creator.niche, location=creator.location, is_verified=creator.is_verified,
            rating=creator.rating, profile_theme=creator.profile_theme or "default",
            avatar_url=creator.user.avatar_url if creator.user else None,
        )

    @staticmethod
    async def search_creators(
        db: AsyncSession, query: Optional[str] = None, niche: Optional[str] = None,
        location: Optional[str] = None, min_rating: Optional[float] = None, limit: int = 50,
    ) -> List[PublicCreatorProfile]:
        stmt = DiscoveryService._query(query, niche, location, min_rating)
        result = await db.execute(stmt.order_by(desc(Creator.is_verified), desc(Creator.rating), Creator.id).limit(limit))
        return [DiscoveryService._public(c) for c in result.scalars().all()]

    @staticmethod
    async def search_page(
        db: AsyncSession, query: Optional[str] = None, niche: Optional[str] = None,
        location: Optional[str] = None, min_rating: Optional[float] = None,
        limit: int = 12, offset: int = 0, network: Optional[DiscoveryNetwork] = None,
        min_audience: int | None = None, max_audience: int | None = None, updated_within_days: int | None = None,
    ) -> CreatorDiscoveryPage:
        now = time.time()
        stmt = DiscoveryService._query(query, niche, location, min_rating, network, now, min_audience, max_audience, updated_within_days)
        total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
        result = await db.execute(stmt.order_by(desc(Creator.is_verified), desc(Creator.rating), Creator.id).offset(offset).limit(limit))
        return CreatorDiscoveryPage(items=[DiscoveryService._public(c, now) for c in result.scalars().all()],
                                    total=total or 0, limit=limit, offset=offset)
