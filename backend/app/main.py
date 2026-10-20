from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import FlenzrException
from app.domains.brands.router import router as brands_router
from app.domains.campaigns.router import router as campaigns_router
from app.domains.creators.router import router as creators_router
from app.domains.creators.socials import router as social_accounts_router
from app.domains.discovery.router import router as discovery_router
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
    yield
    # Shutdown: dispose DB connection pool
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
        }

    # Mount Domain Routers
    app.include_router(identity_router, prefix=settings.API_V1_PREFIX)
    app.include_router(social_accounts_router, prefix=settings.API_V1_PREFIX)
    app.include_router(creators_router, prefix=settings.API_V1_PREFIX)
    app.include_router(ratecards_router, prefix=settings.API_V1_PREFIX)
    app.include_router(links_router, prefix=settings.API_V1_PREFIX)
    app.include_router(qrcodes_router, prefix=settings.API_V1_PREFIX)
    app.include_router(brands_router, prefix=settings.API_V1_PREFIX)
    app.include_router(campaigns_router, prefix=settings.API_V1_PREFIX)
    app.include_router(discovery_router, prefix=settings.API_V1_PREFIX)

    # Mount Root Redirect Router
    app.include_router(redirect_router)

    return app


app = create_application()
