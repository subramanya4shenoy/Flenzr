import uuid
import secrets
from typing import Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntityError, EntityNotFoundError, PermissionDeniedError
from app.core.security import SecurityService
from app.domains.creators.models import Creator
from app.domains.creators.schemas import CreatorOnboardRequest, CreatorUpdate
from app.domains.identity.models import SystemRole, User, UserRole
from app.domains.links.models import TrackedLink
from app.domains.ratecards.models import DeliverableType, PlatformType, RateCard


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
    async def get_by_email(db: AsyncSession, email: str) -> Optional[Creator]:
        stmt = (
            select(Creator)
            .join(User, Creator.user_id == User.id)
            .where(User.email.ilike(email.strip()))
        )
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

    @staticmethod
    async def onboard_creator(
        db: AsyncSession,
        payload: CreatorOnboardRequest,
        user: User,
    ) -> Creator:
        """Complete only the verified caller's creator profile; never mint a session."""
        if payload.email.strip().lower() != user.email.lower():
            raise PermissionDeniedError("Onboarding email must match your authenticated account")
        existing_creator = await CreatorService.get_by_handle(db, payload.handle)
        if existing_creator and existing_creator.user_id != user.id:
            raise DuplicateEntityError("Creator", "handle", payload.handle)
        creator = await CreatorService.get_by_user_id(db, user.id)
        if creator is None:
            creator = Creator(user_id=user.id, handle=payload.handle, display_name=payload.full_name)
            db.add(creator)
        elif creator.bio:
            raise DuplicateEntityError("Creator", "user_id", user.id)
        creator.handle = payload.handle
        creator.display_name = payload.full_name
        creator.niche = payload.niche
        # Keep only previously server-verified accounts when handles still match.
        creator.instagram_verified = bool(creator.instagram_verified and creator.instagram_handle == payload.instagram_handle)
        creator.youtube_verified = bool(creator.youtube_verified and creator.youtube_channel == payload.youtube_channel)
        creator.instagram_handle = payload.instagram_handle
        creator.youtube_channel = payload.youtube_channel
        creator.is_verified = creator.instagram_verified or creator.youtube_verified
        creator.verification_code = creator.verification_code or "FLENZR-" + secrets.token_hex(12).upper()
        creator.bio = f"Media kit for {payload.full_name}."
        user.full_name = payload.full_name
        await db.flush()

        # 4. Create Initial Rate Cards in bulk
        for rc_item in payload.rate_cards:
            plat_str = rc_item.platform.lower()
            if "youtube" in plat_str:
                plat = PlatformType.YOUTUBE
                deliv = (
                    DeliverableType.DEDICATED_VIDEO
                    if "dedicated" in rc_item.deliverable.lower()
                    else DeliverableType.REEL_SHORTS
                )
            elif "instagram" in plat_str:
                plat = PlatformType.INSTAGRAM
                deliv = (
                    DeliverableType.REEL_SHORTS
                    if "reel" in rc_item.deliverable.lower()
                    else DeliverableType.STORY_SET
                )
            elif "podcast" in plat_str:
                plat = PlatformType.PODCAST
                deliv = DeliverableType.PODCAST_AD_READ
            else:
                plat = PlatformType.INSTAGRAM
                deliv = DeliverableType.REEL_SHORTS

            rate_card = RateCard(
                creator_id=creator.id,
                platform=plat,
                deliverable_type=deliv,
                title=rc_item.deliverable,
                description=f"Standard upfront sponsored package for {creator.display_name}.",
                base_price_cents=int(rc_item.price * 100),
                turnaround_days=rc_item.days,
                is_active=True,
            )
            db.add(rate_card)

        # 5. Create default universal tracked bio link
        short_code = payload.handle.lower()
        # Ensure unique short_code
        link_stmt = select(TrackedLink).where(TrackedLink.short_code == short_code)
        link_res = await db.execute(link_stmt)
        if not link_res.scalar_one_or_none():
            tracked_link = TrackedLink(
                creator_id=creator.id,
                title=f"{creator.display_name} Official Media Kit",
                destination_url=f"https://flenzr.com/@{creator.handle}",
                short_code=short_code,
                is_active=True,
            )
            db.add(tracked_link)

        await db.commit()
        await db.refresh(creator)

        return creator

    @staticmethod
    async def verify_bio(
        db: AsyncSession,
        platform: str,
        handle: str,
        code: str,
        creator: Creator,
    ) -> tuple[bool, str]:
        clean_handle = handle.replace("@", "").strip().lower()
        clean_code = code.strip().upper()
        platform_lower = platform.lower()
        if not creator.verification_code or not secrets.compare_digest(clean_code, creator.verification_code):
            raise PermissionDeniedError("Use the verification code issued to your account")

        from app.domains.creators.socials import social_accounts, store_accounts
        if not any(a.platform == platform_lower and a.handle.lstrip("@").lower() == clean_handle for a in social_accounts(creator)):
            raise PermissionDeniedError("Add this account to your profile before verifying it")

        is_live_verified = False
        scan_message = ""

        # 1. LIVE CHECK ON INSTAGRAM
        if not is_live_verified and platform_lower == "instagram":
            from app.domains.creators.instagram import read_instagram_bio
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                bio = await read_instagram_bio(client, clean_handle)
            if bio is None:
                scan_message = "Instagram did not provide a readable bio. We could not check your code; your account remains unverified."
            elif clean_code in bio.upper():
                is_live_verified = True
            else:
                scan_message = (
                    f"Code '{clean_code}' was not found in @{clean_handle}'s live Instagram bio. "
                    "Save it in Instagram and retry."
                )

        # 2. LIVE CHECK ON YOUTUBE
        elif not is_live_verified and platform_lower == "youtube":
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                }
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    resp = await client.get(
                        f"https://www.youtube.com/@{clean_handle}/about",
                        headers=headers,
                    )
                    if resp.status_code == 200:
                        import html
                        page_text = html.unescape(resp.text).upper()
                        # YouTube embeds descriptions in JSON with escaped line breaks.
                        page_text = page_text.replace("\\u002d", "-").replace("\\u002D", "-")
                        if clean_code in page_text:
                            is_live_verified = True
                            scan_message = f"Live verified! Found '{clean_code}' in @{clean_handle}'s YouTube channel."
                        else:
                            is_live_verified = False
                            scan_message = (
                                f"Code '{clean_code}' was not detected in @{clean_handle}'s YouTube description. "
                                f"Please paste '{clean_code}' into your channel About description and retry."
                            )
                    else:
                        scan_message = f"YouTube returned status {resp.status_code}."
            except Exception as e:
                scan_message = "The platform could not be reached. Please try verification again later."

        if creator and is_live_verified:
            # A removal/edit during the network scan must not resurrect the old account.
            creator = (await db.execute(select(Creator).where(Creator.id == creator.id)
                                       .with_for_update().execution_options(populate_existing=True))).scalar_one()
            accounts = social_accounts(creator)
            account = next((a for a in accounts if a.platform == platform_lower and a.handle.lstrip('@').lower() == clean_handle), None)
            if account is None:
                raise PermissionDeniedError("This account was removed or changed. Start verification again.")
            account.is_verified = True
            store_accounts(creator, accounts)
            await db.commit()


        if is_live_verified:
            return (
                True,
                f"Ownership confirmed for @{clean_handle}! You can now remove {clean_code} from your bio, "
                f"or keep your link flenzr.com/@{clean_handle}.",
            )

        return False, scan_message or f"Verification code {clean_code} not found on @{clean_handle}."
