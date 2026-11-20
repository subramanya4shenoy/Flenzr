from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import DomainRuleViolation
from app.domains.discovery.audience import MAX_AUDIENCE, AudienceWindow
from app.domains.creators.schemas import PublicCreatorProfile
from app.domains.discovery.services import DiscoveryService
from app.domains.discovery.schemas import CreatorDiscoveryPage
from app.domains.discovery.networks import DiscoveryNetwork

router = APIRouter(prefix="/discovery", tags=["Creator Discovery & Search"])


@router.get("/creators", response_model=List[PublicCreatorProfile])
async def search_creators(
    q: Optional[str] = Query(None, max_length=255, description="Search term for handle, name, or bio"),
    niche: Optional[str] = Query(None, max_length=128, description="Filter by niche/category"),
    location: Optional[str] = Query(None, max_length=128, description="Filter by location"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum creator rating"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and filter active creators for brand partnerships and sponsorships.
    """
    return await DiscoveryService.search_creators(
        db=db,
        query=q,
        niche=niche,
        location=location,
        min_rating=min_rating,
        limit=limit,
    )


@router.get("/creators/page", response_model=CreatorDiscoveryPage)
async def search_creator_page(
    q: Optional[str] = Query(None, max_length=255),
    niche: Optional[str] = Query(None, max_length=128),
    location: Optional[str] = Query(None, max_length=128),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    limit: int = Query(12, ge=1, le=100),
    offset: int = Query(0, ge=0, le=100000),
    network: Optional[DiscoveryNetwork] = Query(None, description="Filter by saved authorized network connection"),
    min_audience: Optional[int] = Query(None, ge=0, le=MAX_AUDIENCE),
    max_audience: Optional[int] = Query(None, ge=0, le=MAX_AUDIENCE),
    updated_within_days: Optional[AudienceWindow] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Paginated public creator directory with filtered totals and stable ordering."""
    if not network and any(value is not None for value in (min_audience, max_audience, updated_within_days)):
        raise DomainRuleViolation("NETWORK_REQUIRED", "Choose a network before filtering its saved audience.")
    if min_audience is not None and max_audience is not None and min_audience > max_audience:
        raise DomainRuleViolation("INVALID_AUDIENCE_RANGE", "Minimum audience must not exceed maximum audience.")
    return await DiscoveryService.search_page(db, q, niche, location, min_rating, limit, offset, network,
                                               min_audience, max_audience, updated_within_days)
