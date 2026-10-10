from typing import List, Optional
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.creators.models import Creator
from app.domains.creators.schemas import PublicCreatorProfile


class DiscoveryService:
    @staticmethod
    async def search_creators(
        db: AsyncSession,
        query: Optional[str] = None,
        niche: Optional[str] = None,
        location: Optional[str] = None,
        min_rating: Optional[float] = None,
        limit: int = 50,
    ) -> List[PublicCreatorProfile]:
        stmt = select(Creator)

        if query:
            search = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Creator.handle.ilike(search),
                    Creator.display_name.ilike(search),
                    Creator.bio.ilike(search),
                )
            )

        if niche:
            stmt = stmt.where(Creator.niche.ilike(f"%{niche}%"))

        if location:
            stmt = stmt.where(Creator.location.ilike(f"%{location}%"))

        if min_rating is not None:
            stmt = stmt.where(Creator.rating >= min_rating)

        stmt = stmt.order_by(desc(Creator.is_verified), desc(Creator.rating)).limit(limit)

        result = await db.execute(stmt)
        creators = result.scalars().all()

        return [
            PublicCreatorProfile(
                handle=c.handle,
                display_name=c.display_name,
                bio=c.bio,
                niche=c.niche,
                location=c.location,
                is_verified=c.is_verified,
                rating=c.rating,
                profile_theme=c.profile_theme or "default",
                avatar_url=c.user.avatar_url if c.user else None,
            )
            for c in creators
        ]
