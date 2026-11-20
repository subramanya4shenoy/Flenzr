from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError
from app.domains.brands.schemas import OrganizationCreate, OrganizationRead, OrganizationUpdate
from app.domains.brands.services import BrandService
from app.domains.identity.models import SystemRole, User

router = APIRouter(prefix="/organizations", tags=["Organizations & Brands"])


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_or_join_organization(
    body: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Onboards or registers a brand organization for the current user.
    """
    return await BrandService.get_or_create_organization(db, current_user, body)


@router.get("/me", response_model=OrganizationRead)
async def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the organization details for the current brand owner.
    """
    org = await BrandService.get_organization_by_owner(db, current_user.id)
    if not org:
        raise EntityNotFoundError("Organization", current_user.id)
    return org


@router.patch("/me", response_model=OrganizationRead)
async def update_my_organization(
    body: OrganizationUpdate,
    current_user: User = Depends(require_role([SystemRole.BRAND_OWNER])),
    db: AsyncSession = Depends(get_db),
):
    """Update only the organization owned by the signed-in brand owner."""
    return await BrandService.update_organization(db, current_user, body)
