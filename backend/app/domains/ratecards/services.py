from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.domains.creators.models import Creator
from app.domains.ratecards.models import RateCard
from app.domains.ratecards.schemas import RateCardCreate, RateCardUpdate


class RateCardService:
    @staticmethod
    async def list_for_creator(
        db: AsyncSession, creator_id: str, only_active: bool = False
    ) -> List[RateCard]:
        stmt = select(RateCard).where(RateCard.creator_id == creator_id)
        if only_active:
            stmt = stmt.where(RateCard.is_active == True)
        stmt = stmt.order_by(RateCard.platform, RateCard.base_price_cents)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, ratecard_id: str) -> Optional[RateCard]:
        stmt = select(RateCard).where(RateCard.id == ratecard_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession, creator_id: str, payload: RateCardCreate
    ) -> RateCard:
        rate_card = RateCard(
            creator_id=creator_id,
            **payload.model_dump(),
        )
        db.add(rate_card)
        await db.commit()
        await db.refresh(rate_card)
        return rate_card

    @staticmethod
    async def update(
        db: AsyncSession, ratecard: RateCard, updates: RateCardUpdate
    ) -> RateCard:
        update_data = updates.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(ratecard, key, value)
        await db.commit()
        await db.refresh(ratecard)
        return ratecard

    @staticmethod
    async def delete(db: AsyncSession, ratecard: RateCard) -> None:
        await db.delete(ratecard)
        await db.commit()
