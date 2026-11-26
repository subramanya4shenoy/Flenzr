"""Opt-in onboarding races in an isolated, automatically removed PostgreSQL schema."""
import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.config import settings
from app.core.exceptions import FlenzrException
from app.domains.brands.models import BrandProfile, Organization
from app.domains.brands.schemas import OrganizationCreate, OrganizationRead
from app.domains.brands.services import BrandService
from app.domains.identity.models import SystemRole, User, UserRole


@pytest.mark.skipif(os.getenv('FLENZR_TEST_ORGANIZATION_POSTGRES') != '1', reason='Opt-in PostgreSQL onboarding races')
@pytest.mark.asyncio
async def test_generated_slug_explicit_slug_and_same_owner_onboarding_races():
    assert 'postgresql' in settings.DATABASE_URL
    engine = create_async_engine(settings.DATABASE_URL, pool_size=5, max_overflow=0)
    schema = 'organization_test_' + uuid4().hex

    async def run(callback):
        async with engine.connect() as connection:
            await connection.execute(text(f'SET search_path TO {schema}, public'))
            await connection.commit()
            async with AsyncSession(bind=connection, expire_on_commit=False) as db:
                return await callback(db)

    async def create(user_id, **values):
        async def action(db):
            user = await db.get(User, user_id)
            payload = OrganizationCreate(name='Shared Name', billing_email='billing@example.com', **values)
            org = await BrandService.get_or_create_organization(db, user, payload)
            return OrganizationRead.model_validate(org).model_dump(mode='json')
        try:
            return await run(action)
        except FlenzrException as error:
            return error

    try:
        async with engine.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA {schema}'))
            for table in ('users', 'user_roles', 'organizations', 'brand_profiles'):
                await connection.execute(text(f'CREATE TABLE {schema}.{table} '
                    f'(LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)'))

        async def seed(db):
            users = [User(supabase_uid=str(uuid4()), email=uuid4().hex+'@example.com') for _ in range(5)]
            db.add_all(users)
            await db.commit()
            return [u.id for u in users]
        ids = await run(seed)
        first, second = await asyncio.gather(create(ids[0]), create(ids[1]))
        assert isinstance(first, dict) and isinstance(second, dict)
        assert first['id'] != second['id'] and first['slug'] != second['slug']
        assert all(len(row['slug']) <= 64 for row in (first, second))

        retries = await asyncio.gather(create(ids[2]), create(ids[2]))
        assert retries[0] == retries[1]
        explicit = await asyncio.gather(create(ids[3], slug='explicit-shared'), create(ids[4], slug='explicit-shared'))
        winners = [row for row in explicit if isinstance(row, dict)]
        losers = [row for row in explicit if isinstance(row, FlenzrException)]
        assert len(winners) == len(losers) == 1
        assert winners[0]['slug'] == 'explicit-shared'
        assert losers[0].status_code == 409 and losers[0].code == 'DUPLICATE_ENTITY'

        async def verify(db):
            assert await db.scalar(select(func.count()).select_from(Organization)) == 4
            assert await db.scalar(select(func.count()).select_from(BrandProfile)) == 4
            assert await db.scalar(select(func.count()).select_from(Organization).where(Organization.owner_id == ids[2])) == 1
            assert await db.scalar(select(func.count()).select_from(UserRole).where(UserRole.role == SystemRole.BRAND_OWNER)) == 4
        await run(verify)
    finally:
        async with engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
        await engine.dispose()
