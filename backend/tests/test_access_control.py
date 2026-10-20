"""Authorization regression tests use separate identities and an isolated database."""
import time
import jwt
import pytest
import httpx
from sqlalchemy import select
from app.core.config import settings
from app.core.security import SecurityService
from app.domains.identity.models import User
from app.domains.campaigns.models import Campaign, CampaignStatus


PRIVATE_ROUTES = [
    ("GET", "/identity/me"), ("POST", "/identity/sync"),
    ("POST", "/creators/onboard"), ("POST", "/creators/verify-bio"),
    ("GET", "/creators/me/social-accounts"), ("PATCH", "/creators/me/social-accounts/instagram"), ("DELETE", "/creators/me/social-accounts/instagram"),
    ("GET", "/creators/me"), ("PATCH", "/creators/me"), ("GET", "/creators/by-email/owner@example.com"),
    ("GET", "/ratecards/me"), ("POST", "/ratecards"), ("PATCH", "/ratecards/other"), ("DELETE", "/ratecards/other"),
    ("GET", "/links"), ("POST", "/links"), ("GET", "/links/other/stats"), ("PATCH", "/links/other"), ("DELETE", "/links/other"),
    ("POST", "/qrcodes/generate"), ("POST", "/organizations"), ("GET", "/organizations/me"),
    ("GET", "/campaigns/me"), ("POST", "/campaigns"), ("GET", "/campaigns/other"),
    ("POST", "/campaigns/other/apply"), ("POST", "/campaigns/other/invite"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", PRIVATE_ROUTES)
async def test_every_private_route_requires_auth(client, method, path):
    res = await client.request(method, "/api/v1" + path, json={} if method in ("POST", "PATCH") else None)
    assert res.status_code == 401, (method, path, res.text)


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["admin", "brand_member"])
async def test_no_self_assigned_privileged_roles(client, auth_headers, role):
    res = await client.post('/api/v1/identity/sync', headers=auth_headers(), json={"role": role})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_suspended_accounts_cannot_sync_or_read(client, auth_headers, db_session):
    headers = auth_headers()
    await client.get('/api/v1/identity/me', headers=headers)
    user = (await db_session.execute(select(User))).scalar_one()
    user.is_active = False
    await db_session.commit()
    for method, path in [('GET', '/identity/me'), ('POST', '/identity/sync')]:
        res = await client.request(method, '/api/v1' + path, headers=headers, json={} if method == 'POST' else None)
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_onboarding_cannot_impersonate_email_or_claim_verification(client, auth_headers):
    headers = auth_headers(email='owner@example.com')
    body = {"full_name": "Owner", "email": "victim@example.com", "handle": "victim"}
    res = await client.post('/api/v1/creators/onboard', headers=headers, json=body)
    assert res.status_code == 403
    body.update(email='owner@example.com', instagram_handle='social', instagram_verified=True, youtube_verified=True)
    res = await client.post('/api/v1/creators/onboard', headers=headers, json=body)
    assert res.status_code == 201
    assert res.json()['access_token'] == headers['Authorization'].split()[1]
    assert res.json()['creator']['is_verified'] is False
    assert res.json()['creator']['instagram_verified'] is False
    assert res.json()['creator']['youtube_verified'] is False
    email_lookup = await client.get('/api/v1/creators/by-email/victim@example.com', headers=headers)
    assert email_lookup.status_code == 403


@pytest.mark.asyncio
async def test_creator_cannot_change_another_creators_rates_links_or_verification(client, auth_headers):
    owner = auth_headers(sub='owner', email='owner@example.com')
    other = auth_headers(sub='other', email='other@example.com')
    profile = (await client.get('/api/v1/creators/me', headers=owner)).json()
    card = await client.post('/api/v1/ratecards', headers=owner, json={
        'platform': 'youtube', 'deliverable_type': 'dedicated_video', 'title': 'Review',
        'base_price_cents': 10000, 'turnaround_days': 7,
    })
    assert card.status_code == 201
    card_id = card.json()['id']
    link = await client.post('/api/v1/links', headers=owner, json={'title': 'Website', 'destination_url': 'https://example.com'})
    assert link.status_code == 201
    link_id = link.json()['id']
    for method, path, body in [
        ('PATCH', f'/ratecards/{card_id}', {'title': 'Hijacked'}), ('DELETE', f'/ratecards/{card_id}', None),
        ('GET', f'/links/{link_id}/stats', None), ('PATCH', f'/links/{link_id}', {'title': 'Hijacked'}), ('DELETE', f'/links/{link_id}', None),
        ('POST', '/creators/verify-bio', {'platform': 'instagram', 'handle': 'social', 'creator_handle': profile['handle'], 'verification_code': profile['verification_code']}),
    ]:
        res = await client.request(method, '/api/v1' + path, headers=other, json=body)
        assert res.status_code == 403, (path, res.text)


@pytest.mark.asyncio
async def test_brands_cannot_read_private_campaigns_or_invite_for_other_brands(client, auth_headers, db_session):
    owner = auth_headers(sub='brand-1', email='first@example.com')
    other = auth_headers(sub='brand-2', email='second@example.com')
    creator = auth_headers(sub='creator', email='creator@example.com')
    for headers, name in [(owner, 'First'), (other, 'Second')]:
        assert (await client.post('/api/v1/identity/sync', headers=headers, json={'role': 'brand_owner'})).status_code == 200
        res = await client.post('/api/v1/organizations', headers=headers, json={'name': name, 'billing_email': 'billing@example.com'})
        assert res.status_code == 201
    created = await client.post('/api/v1/campaigns', headers=owner, json={'title': 'Private brief', 'brief': 'Confidential campaign brief', 'budget_total_cents': 10000})
    assert created.status_code == 201
    campaign_id = created.json()['id']
    c = (await client.get('/api/v1/creators/me', headers=creator)).json()
    campaign = await db_session.get(Campaign, campaign_id)
    campaign.status = CampaignStatus.DRAFT
    await db_session.commit()
    assert (await client.get(f'/api/v1/campaigns/{campaign_id}', headers=owner)).status_code == 200
    for headers in [other, creator]:
        assert (await client.get(f'/api/v1/campaigns/{campaign_id}', headers=headers)).status_code == 403
    res = await client.post(f'/api/v1/campaigns/{campaign_id}/invite', headers=other, json={'creator_id': c['id'], 'offered_rate_cents': 1000})
    assert res.status_code == 403
    assert (await client.get('/api/v1/campaigns/explore')).json() == []
    assert (await client.post('/api/v1/campaigns', headers=creator, json={'title': 'No role', 'brief': 'Not a brand', 'budget_total_cents': 10000})).status_code == 403
    assert (await client.post('/api/v1/campaigns/other/apply', headers=owner, json={'pitch_message': 'Not a creator', 'proposed_rate_cents': 100})).status_code == 403


@pytest.mark.parametrize('change', [{'aud': 'other'}, {'iss': 'https://attacker.example/auth/v1'}, {'exp': 1}, {'role': 'service_role'}, {'sub': ''}])
def test_invalid_claims_rejected(change):
    now = int(time.time())
    payload = {'sub': 'user', 'email': 'user@example.com', 'aud': settings.SUPABASE_JWT_AUDIENCE,
               'iss': settings.SUPABASE_URL.rstrip('/') + '/auth/v1', 'role': 'authenticated', 'exp': now + 3600, 'iat': now}
    payload.update(change)
    token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm='HS256')
    with pytest.raises(ValueError):
        SecurityService.decode_and_verify_token(token)


def test_jwks_does_not_fall_back_to_hmac(monkeypatch):
    token = SecurityService.create_mock_token('attacker')
    monkeypatch.setattr(settings, 'SUPABASE_JWKS_URL', 'https://auth.example/jwks')
    with pytest.raises(ValueError):
        SecurityService.decode_and_verify_token(token)


@pytest.mark.asyncio
@pytest.mark.parametrize('method,path', PRIVATE_ROUTES)
async def test_forged_tokens_cannot_reach_private_routes(client, method, path):
    res = await client.request(method, '/api/v1' + path, headers={'Authorization': 'Bearer forged-token'}, json={} if method in ('POST', 'PATCH') else None)
    assert res.status_code == 401


def test_all_documented_routes_have_an_explicit_access_policy():
    from app.main import app
    public = {
        ('get', '/health'), ('get', '/api/v1/creators/public/{handle}'),
        ('get', '/api/v1/ratecards/creator/{handle}'), ('get', '/api/v1/discovery/creators'),
        ('get', '/api/v1/campaigns/explore'), ('get', '/r/{short_code}'),
    }
    for path, operations in app.openapi()['paths'].items():
        for method, operation in operations.items():
            if method not in {'get', 'post', 'patch', 'delete', 'put'}:
                continue
            if (method, path) in public:
                assert not operation.get('security'), (method, path)
            else:
                assert operation.get('security'), f'Missing policy: {method} {path}'


@pytest.mark.parametrize('claim', ['sub', 'exp', 'iat', 'iss', 'aud'])
def test_missing_required_claim_is_rejected(claim):
    now = int(time.time())
    payload = {'sub': 'user', 'aud': settings.SUPABASE_JWT_AUDIENCE,
               'iss': settings.SUPABASE_URL.rstrip('/') + '/auth/v1',
               'role': 'authenticated', 'exp': now + 3600, 'iat': now}
    del payload[claim]
    token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm='HS256')
    with pytest.raises(ValueError):
        SecurityService.decode_and_verify_token(token)


def test_wrong_signature_and_unconfigured_secret_are_rejected(monkeypatch):
    token = SecurityService.create_mock_token('user')
    monkeypatch.setattr(settings, 'SUPABASE_JWT_SECRET', 'a-different-signing-secret-that-is-long-enough')
    with pytest.raises(ValueError):
        SecurityService.decode_and_verify_token(token)
    monkeypatch.setattr(settings, 'SUPABASE_JWT_SECRET', '')
    with pytest.raises(ValueError):
        SecurityService.decode_and_verify_token(token)
