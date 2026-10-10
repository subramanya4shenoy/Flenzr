from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.domains.creators.models import Creator
from app.domains.creators.schemas import CreatorUpdate
from app.domains.identity.models import User


class CreatorService:
    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: str) -> Optional[Creator]:
        stmt = select(Creator).where(Creator.user_id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_handle(db: AsyncSession, handle: str) -> Optional[Creator]:
        stmt = select(Creator).where(Creator.handle == handle)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        creator: Creator,
        updates: CreatorUpdate,
    ) -> Creator:
        update_data = updates.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(creator, key, value)
        await db.commit()
        await db.refresh(creator)
        return creator
