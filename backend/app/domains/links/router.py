from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.domains.identity.models import SystemRole, User
from app.domains.identity.services import IdentityService
from app.domains.links.schemas import (
    LinkClickSummary,
    TrackedLinkCreate,
    TrackedLinkRead,
    TrackedLinkStats,
    TrackedLinkUpdate,
)
from app.domains.links.services import LinkService, append_utm_parameters

router = APIRouter(prefix="/links", tags=["Tracked Links"])
redirect_router = APIRouter(tags=["Redirects"])


async def async_record_click_task(
    link_id: str,
    referrer: str = None,
    ip_address: str = None,
    user_agent: str = None,
):
    """Background task to avoid slowing down redirect response."""
    async with async_session_factory() as db:
        await LinkService.record_click(
            db=db,
            link_id=link_id,
            referrer=referrer,
            ip_address=ip_address,
            user_agent=user_agent,
        )


@router.get("", response_model=List[TrackedLinkRead])
async def list_my_links(
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await LinkService.list_for_creator(db, creator_id)


@router.post("", response_model=TrackedLinkRead, status_code=status.HTTP_201_CREATED)
async def create_tracked_link(
    body: TrackedLinkCreate,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if not creator_id:
        raise EntityNotFoundError("CreatorProfile", current_user.id)
    return await LinkService.create(db, creator_id, body)


@router.get("/{link_id}/stats", response_model=TrackedLinkStats)
async def get_link_stats(
    link_id: str,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    link = await LinkService.get_by_id(db, link_id)
    if not link:
        raise EntityNotFoundError("TrackedLink", link_id)

    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if link.creator_id != creator_id and not current_user.is_superadmin:
        raise PermissionDeniedError("Cannot view stats for another creator's link")

    clicks = await LinkService.get_recent_clicks(db, link_id)
    return TrackedLinkStats(
        link=TrackedLinkRead.model_validate(link),
        total_clicks=link.click_count,
        recent_clicks=[LinkClickSummary.model_validate(c) for c in clicks],
    )


@router.patch("/{link_id}", response_model=TrackedLinkRead)
async def update_tracked_link(
    link_id: str,
    body: TrackedLinkUpdate,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    link = await LinkService.get_by_id(db, link_id)
    if not link:
        raise EntityNotFoundError("TrackedLink", link_id)

    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if link.creator_id != creator_id and not current_user.is_superadmin:
        raise PermissionDeniedError("Cannot modify another creator's link")

    return await LinkService.update(db, link, body)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracked_link(
    link_id: str,
    current_user: User = Depends(require_role([SystemRole.CREATOR, SystemRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    link = await LinkService.get_by_id(db, link_id)
    if not link:
        raise EntityNotFoundError("TrackedLink", link_id)

    creator_id = await IdentityService.get_creator_id_for_user(db, current_user.id)
    if link.creator_id != creator_id and not current_user.is_superadmin:
        raise PermissionDeniedError("Cannot delete another creator's link")

    await LinkService.delete(db, link)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Fast Short Link Redirection Endpoint
@redirect_router.get("/r/{short_code}", response_class=RedirectResponse, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def redirect_short_link(
    short_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    link = await LinkService.get_by_short_code(db, short_code)
    if not link or not link.is_active:
        raise EntityNotFoundError("ShortLink", short_code)

    # Attach UTM query params if configured
    destination = append_utm_parameters(
        link.destination_url,
        utm_source=link.utm_source,
        utm_medium=link.utm_medium,
        utm_campaign=link.utm_campaign,
    )

    # Extract metadata and record click
    referrer = request.headers.get("referer")
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    await LinkService.record_click(
        db=db,
        link_id=link.id,
        referrer=referrer,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return RedirectResponse(url=destination, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
