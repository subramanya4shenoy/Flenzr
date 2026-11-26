from uuid import UUID

import pytest
from sqlalchemy import func, select
from app.domains.brands.models import BrandProfile, Organization
from app.domains.identity.models import SystemRole, User, UserRole


def organization(name='Shared Brand', **values):
    return {'name': name, 'billing_email': 'billing@example.com', **values}


@pytest.mark.asyncio
async def test_same_name_brands_get_distinct_slugs_and_owner_retries_preserve_identity(client, auth_headers, db_session):
    actors = [auth_headers(sub=f'same-name-{n}', email=f'owner-{n}@example.com') for n in range(3)]
    saved = []
    for headers in actors:
        response = await client.post('/api/v1/organizations', headers=headers, json=organization())
        assert response.status_code == 201, response.text
        saved.append(response.json())
    assert saved[0]['slug'] == 'shared-brand'
    assert len({row['slug'] for row in saved}) == len({row['id'] for row in saved}) == 3
    for headers, row in zip(actors, saved):
        retry = await client.post('/api/v1/organizations', headers=headers,
                                  json=organization('Changed retry', slug='different-retry'))
        assert retry.status_code == 201
        retried = retry.json()
        for key in ('id', 'slug', 'owner_id', 'name', 'billing_email'):
            assert retried[key] == row[key]
        assert retried['brand_profile']['id'] == row['brand_profile']['id']
        assert retried['brand_profile']['company_name'] == 'Shared Brand'
        assert (await client.get('/api/v1/organizations/me', headers=headers)).json() == retried
    assert await db_session.scalar(select(func.count()).select_from(Organization)) == 3
    assert await db_session.scalar(select(func.count()).select_from(BrandProfile)) == 3


@pytest.mark.asyncio
async def test_explicit_slug_conflict_is_recoverable_and_does_not_grant_a_role_or_copy_private_profile(client, auth_headers, db_session):
    owner = auth_headers(sub='slug-owner', email='slug-owner@example.com')
    other = auth_headers(sub='slug-other', email='slug-other@example.com')
    first = await client.post('/api/v1/organizations', headers=owner,
        json=organization(slug='reserved', description='Owner-only company details'))
    assert first.status_code == 201
    conflict = await client.post('/api/v1/organizations', headers=other, json=organization(slug='reserved'))
    assert conflict.status_code == 409
    assert conflict.json()['error']['code'] == 'DUPLICATE_ENTITY'
    assert 'Owner-only company details' not in conflict.text
    assert (await client.get('/api/v1/organizations/me', headers=other)).status_code == 404
    user_id = await db_session.scalar(select(User.id).where(User.supabase_uid == 'slug-other'))
    assert await db_session.scalar(select(UserRole.id).where(
        UserRole.user_id == user_id, UserRole.role == SystemRole.BRAND_OWNER)) is None
    assert await db_session.scalar(select(func.count()).select_from(BrandProfile)) == 1
    recovered = await client.post('/api/v1/organizations', headers=other, json=organization(slug='available'))
    assert recovered.status_code == 201 and recovered.json()['slug'] == 'available'
    assert recovered.json()['id'] != first.json()['id']


@pytest.mark.asyncio
@pytest.mark.parametrize('name', ['A' * 255, '😀😀'])
async def test_generated_slugs_fit_storage_and_support_non_ascii_names(client, auth_headers, name):
    rows = []
    for n in range(2):
        result = await client.post('/api/v1/organizations',
            headers=auth_headers(sub=f'bounded-{n}', email=f'bounded-{n}@example.com'), json=organization(name))
        assert result.status_code == 201, result.text
        rows.append(result.json())
        assert rows[-1]['name'] == name
        assert 2 <= len(rows[-1]['slug']) <= 64
    assert rows[0]['slug'] != rows[1]['slug']


@pytest.mark.asyncio
async def test_generated_slug_retry_budget_returns_a_conflict_without_partial_onboarding(client, auth_headers, db_session, monkeypatch):
    for n, slug in enumerate(['shared-brand', 'shared-brand-aaaaaaaaaaaa']):
        response = await client.post('/api/v1/organizations',
            headers=auth_headers(sub=f'reserve-{n}', email=f'reserve-{n}@example.com'),
            json=organization(slug=slug))
        assert response.status_code == 201
    monkeypatch.setattr('app.domains.brands.services.uuid4', lambda: UUID('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'))
    target = auth_headers(sub='allocation-exhausted', email='exhausted@example.com')
    result = await client.post('/api/v1/organizations', headers=target, json=organization())
    assert result.status_code == 409 and result.json()['error']['code'] == 'ORGANIZATION_SLUG_UNAVAILABLE'
    assert (await client.get('/api/v1/organizations/me', headers=target)).status_code == 404
    assert await db_session.scalar(select(func.count()).select_from(Organization)) == 2
    assert await db_session.scalar(select(func.count()).select_from(BrandProfile)) == 2
