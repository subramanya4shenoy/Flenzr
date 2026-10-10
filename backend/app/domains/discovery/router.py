from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.creators.schemas import PublicCreatorProfile
from app.domains.discovery.services import DiscoveryService

router = APIRouter(prefix="/discovery", tags=["Creator Discovery & Search"])


@router.get("/creators", response_model=List[PublicCreatorProfile])
async def search_creators(
    q: Optional[str] = Query(None, description="Search term for handle, name, or bio"),
    niche: Optional[str] = Query(None, description="Filter by niche/category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    min_rating: Optional[float] = Query(None, description="Minimum creator rating"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and filter verified creators for brand partnerships and sponsorships.
    """
    return await DiscoveryService.search_creators(
        db=db,
        query=q,
        niche=niche,
        location=location,
        min_rating=min_rating,
        limit=limit,
    )
