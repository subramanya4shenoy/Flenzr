import asyncio
import os
os.environ["SUPABASE_JWT_SECRET"] = "test-only-signing-secret-not-a-real-credential"
os.environ["SUPABASE_JWKS_URL"] = ""
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import SecurityService
from app.domains.identity.models import SystemRole, User, UserRole
from app.main import app

# Test SQLite in-memory engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    # SQLite cannot ALTER/DROP constraints to break the legitimate cyclic
    # agreement <-> scope references. Disable FK enforcement only for teardown;
    # preserve the original setting for every test's actual business operations.
    async with test_engine.connect() as conn:
        foreign_keys = await conn.scalar(text('PRAGMA foreign_keys'))
        await conn.commit()
        await conn.exec_driver_sql('PRAGMA foreign_keys=OFF')
        await conn.commit()
        try:
            async with conn.begin():
                await conn.run_sync(Base.metadata.drop_all)
        finally:
            await conn.exec_driver_sql(f'PRAGMA foreign_keys={1 if foreign_keys else 0}')
            await conn.commit()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    def _create_headers(sub: str = "test-supabase-sub-123", email: str = "creator@flenzr.com"):
        token = SecurityService.create_mock_token(
            sub=sub,
            email=email,
            metadata={"full_name": "Sarah Miller"},
        )
        return {"Authorization": f"Bearer {token}"}

    return _create_headers


@pytest.fixture(autouse=True)
def enquiry_workflow_limits(monkeypatch):
    # Workflow tests can exercise multiple transitions without time travel.
    # Dedicated abuse tests restore and verify the production guards explicitly.
    monkeypatch.setattr(settings, "ENQUIRY_SEND_COOLDOWN_SECONDS", 0)
    monkeypatch.setattr(settings, "ENQUIRY_CREATOR_DAILY_LIMIT", 30)
    monkeypatch.setattr(settings, "ENQUIRY_BLOCK_DUPLICATES", False)
