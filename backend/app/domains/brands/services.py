import re
from typing import Optional
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEntityError, EntityNotFoundError, FlenzrException
from app.domains.brands.models import BrandProfile, Organization
from app.domains.brands.schemas import OrganizationCreate, OrganizationUpdate
from app.domains.identity.models import SystemRole, User, UserRole


class BrandService:
    @staticmethod
    async def get_organization_by_owner(
        db: AsyncSession, owner_id: str
    ) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.owner_id == owner_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_or_create_organization(
        db: AsyncSession, user: User, payload: OrganizationCreate
    ) -> Organization:
        # Serialize retries for one owner without serializing different brands.
        await db.execute(select(User.id).where(User.id == user.id).with_for_update())
        org = await BrandService.get_organization_by_owner(db, user.id)
        if org:
            return org

        base_slug = re.sub(r"[^a-z0-9-]", "", payload.name.lower().replace(" ", "-"))[:64]
        base_slug = base_slug or f"org-{user.id[:8]}"
        for attempt in range(5):
            if payload.slug is not None:
                slug = payload.slug
            elif attempt:
                slug = f"{base_slug[:51].rstrip('-')}-{uuid4().hex[:12]}"
            else:
                slug = base_slug
            org = Organization(name=payload.name, slug=slug,
                               billing_email=payload.billing_email, owner_id=user.id)
            try:
                # Let the unique constraint arbitrate simultaneous allocations;
                # a savepoint keeps a collision from poisoning this transaction.
                async with db.begin_nested():
                    db.add(org)
                    await db.flush()
            except IntegrityError:
                collision = await db.scalar(select(Organization.id).where(Organization.slug == slug))
                if collision is None:
                    raise
                if payload.slug is not None:
                    raise DuplicateEntityError("Organization", "slug", payload.slug) from None
            else:
                break
        else:
            raise FlenzrException(
                "ORGANIZATION_SLUG_UNAVAILABLE",
                "Could not reserve an organization slug. Please retry.", 409)

        # Only successful onboarding grants the role and creates the profile.
        has_brand_role = await db.scalar(select(UserRole.id).where(
            UserRole.user_id == user.id,
            UserRole.role.in_([SystemRole.BRAND_OWNER, SystemRole.BRAND_MEMBER])))
        if not has_brand_role:
            db.add(UserRole(user_id=user.id, role=SystemRole.BRAND_OWNER))

        brand_profile = BrandProfile(
            organization_id=org.id,
            company_name=payload.company_name or payload.name,
            industry=payload.industry,
            website=payload.website,
            description=payload.description,
        )
        db.add(brand_profile)
        await db.commit()
        await db.refresh(org)
        return org


    @staticmethod
    async def update_organization(
        db: AsyncSession, user: User, payload: OrganizationUpdate
    ) -> Organization:
        org = await BrandService.get_organization_by_owner(db, user.id)
        if org is None:
            raise EntityNotFoundError("Organization", user.id)
        values = payload.model_dump(exclude_unset=True)
        profile_values = {key: value for key, value in values.items()
                          if key not in {"name", "billing_email"}}
        for key in ("name", "billing_email"):
            if key in values:
                setattr(org, key, values[key])
        if profile_values:
            if org.brand_profile is None:
                org.brand_profile = BrandProfile(company_name=org.name)
            for key, value in profile_values.items():
                setattr(org.brand_profile, key, value)
        await db.commit()
        await db.refresh(org)
        return org
