import re
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import SupabaseTokenPayload
from app.domains.creators.models import Creator
from app.domains.identity.models import SystemRole, User, UserRole
from app.domains.identity.schemas import UserSyncRequest


class IdentityService:
    @staticmethod
    async def get_or_create_user_from_token(
        db: AsyncSession,
        token_payload: SupabaseTokenPayload,
        sync_req: Optional[UserSyncRequest] = None,
    ) -> User:
        """
        Just-In-Time (JIT) provisions or fetches a user upon authenticated token presentation.
        """
        stmt = select(User).where(User.supabase_uid == token_payload.sub)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        full_name = (
            sync_req.full_name
            if (sync_req and sync_req.full_name)
            else token_payload.user_metadata.get("full_name")
            or token_payload.user_metadata.get("name")
        )
        avatar_url = (
            sync_req.avatar_url
            if (sync_req and sync_req.avatar_url)
            else token_payload.user_metadata.get("avatar_url")
        )

        initial_role = (
            sync_req.role
            if (sync_req and sync_req.role)
            else SystemRole.CREATOR
        )

        if not user:
            # Create user
            user = User(
                supabase_uid=token_payload.sub,
                email=token_payload.email or f"{token_payload.sub}@supabase.user",
                full_name=full_name,
                avatar_url=avatar_url,
            )
            db.add(user)
            await db.flush()

            # Attach initial role
            user_role = UserRole(user_id=user.id, role=initial_role)
            db.add(user_role)
            await db.flush()

            # If the user is a creator, create default Creator profile placeholder
            if initial_role == SystemRole.CREATOR:
                base_handle = re.sub(r"[^a-zA-Z0-9_]", "", (full_name or "creator").lower())
                if not base_handle:
                    base_handle = f"creator_{user.id[:8]}"
                
                # Check handle uniqueness
                handle = base_handle
                existing_creator = await db.execute(select(Creator).where(Creator.handle == handle))
                if existing_creator.scalar_one_or_none():
                    handle = f"{base_handle}_{user.id[:4]}"

                creator = Creator(
                    user_id=user.id,
                    handle=handle,
                    display_name=full_name or "Creator",
                    bio="",
                )
                db.add(creator)
                await db.flush()

            await db.commit()
            await db.refresh(user)
        else:
            # Update updated fields if passed
            updated = False
            if full_name and user.full_name != full_name:
                user.full_name = full_name
                updated = True
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                updated = True
            if updated:
                await db.commit()
                await db.refresh(user)

        return user

    @staticmethod
    async def get_creator_id_for_user(db: AsyncSession, user_id: str) -> Optional[str]:
        stmt = select(Creator.id).where(Creator.user_id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
