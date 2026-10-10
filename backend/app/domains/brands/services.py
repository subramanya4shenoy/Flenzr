import re
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.domains.brands.models import BrandProfile, Organization
from app.domains.brands.schemas import OrganizationCreate
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
        org = await BrandService.get_organization_by_owner(db, user.id)
        if org:
            return org

        # Ensure user has BRAND_OWNER role
        has_brand_role = any(r.role in [SystemRole.BRAND_OWNER, SystemRole.BRAND_MEMBER] for r in user.roles)
        if not has_brand_role:
            brand_role = UserRole(user_id=user.id, role=SystemRole.BRAND_OWNER)
            db.add(brand_role)
            await db.flush()

        slug = payload.slug or re.sub(r"[^a-z0-9-]", "", payload.name.lower().replace(" ", "-"))
        if not slug:
            slug = f"org-{user.id[:8]}"

        org = Organization(
            name=payload.name,
            slug=slug,
            billing_email=payload.billing_email,
            owner_id=user.id,
        )
        db.add(org)
        await db.flush()

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
