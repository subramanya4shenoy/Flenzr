from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.domains.collaborations.realtime import chat_hub
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import FlenzrException
from app.domains.collaborations.router import router as collaborations_router
from app.domains.shortlists.router import router as shortlists_router
from app.domains.brands.router import router as brands_router
from app.domains.campaigns.router import router as campaigns_router
from app.domains.creators.router import router as creators_router
from app.domains.creators.socials import router as social_accounts_router
from app.domains.creators.instagram_connection import router as instagram_connection_router
from app.domains.creators.youtube_connection import router as youtube_connection_router
from app.domains.creators.linkedin_connection import router as linkedin_connection_router
from app.domains.creators.x_connection import router as x_connection_router
from app.domains.creators.facebook_connection import router as facebook_connection_router
from app.domains.creators.recent_engagement import router as recent_engagement_router
from app.domains.discovery.router import router as discovery_router
from app.domains.enquiries.router import router as enquiries_router
from app.domains.notifications.router import router as notifications_router
from app.domains.identity.router import router as identity_router
from app.domains.links.router import redirect_router
from app.domains.links.router import router as links_router
from app.domains.qrcodes.router import router as qrcodes_router
from app.domains.ratecards.router import router as ratecards_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist in dev/test SQLite environments
    if "sqlite" in settings.DATABASE_URL:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await chat_hub.start(settings.CHAT_REDIS_URL, settings.CHAT_REDIS_NAMESPACE)
    try:
        yield
    finally:
        await chat_hub.stop()
        await engine.dispose()


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Standard Domain Exception Handler
    @app.exception_handler(FlenzrException)
    async def flenzr_exception_handler(request: Request, exc: FlenzrException):
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "success": False,
                "data": None,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    # Health Check
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": settings.VERSION,
            "chat_transport": chat_hub.transport,
            "chat_ready": chat_hub.ready,
        }

    # Mount Domain Routers
    from app.domains.campaigns.offers import router as offers_router
    app.include_router(offers_router, prefix=settings.API_V1_PREFIX)
    app.include_router(collaborations_router, prefix=settings.API_V1_PREFIX)
    app.include_router(identity_router, prefix=settings.API_V1_PREFIX)
    app.include_router(youtube_connection_router, prefix=settings.API_V1_PREFIX)
    app.include_router(linkedin_connection_router, prefix=settings.API_V1_PREFIX)
    app.include_router(x_connection_router, prefix=settings.API_V1_PREFIX)
    app.include_router(facebook_connection_router, prefix=settings.API_V1_PREFIX)
    app.include_router(recent_engagement_router, prefix=settings.API_V1_PREFIX)
    app.include_router(instagram_connection_router, prefix=settings.API_V1_PREFIX)
    app.include_router(social_accounts_router, prefix=settings.API_V1_PREFIX)
    app.include_router(creators_router, prefix=settings.API_V1_PREFIX)
    app.include_router(ratecards_router, prefix=settings.API_V1_PREFIX)
    app.include_router(links_router, prefix=settings.API_V1_PREFIX)
    app.include_router(qrcodes_router, prefix=settings.API_V1_PREFIX)
    app.include_router(brands_router, prefix=settings.API_V1_PREFIX)
    app.include_router(shortlists_router, prefix=settings.API_V1_PREFIX)
    app.include_router(campaigns_router, prefix=settings.API_V1_PREFIX)
    app.include_router(discovery_router, prefix=settings.API_V1_PREFIX)
    app.include_router(enquiries_router, prefix=settings.API_V1_PREFIX)
    app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)

    # Mount Root Redirect Router
    app.include_router(redirect_router)

    return app


app = create_application()
