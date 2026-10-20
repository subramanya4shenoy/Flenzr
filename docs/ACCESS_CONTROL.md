# Route access policy

All authorization decisions use a cryptographically verified Supabase user token and current database account/role records. Browser storage and client-supplied role/verification flags do not authorize requests. Inactive accounts are rejected, including on identity sync. JWT validation requires the configured issuer, audience, subject, issued-at, expiry, and authenticated user role. When JWKS is configured, HMAC tokens cannot fall back to the development secret.

## Backend

| Routes | Policy |
| --- | --- |
| `GET /health` | Public health metadata |
| `GET /api/v1/creators/public/{handle}` | Public media kit; excludes private account details and verification challenges |
| `GET /api/v1/ratecards/creator/{handle}` | Public active packages only |
| `GET /api/v1/discovery/creators` | Public creator discovery |
| `GET /api/v1/campaigns/explore` | Public active opportunities only |
| `GET /r/{short_code}` | Public active tracked-link redirect |
| `GET /api/v1/identity/me`, `POST /api/v1/identity/sync` | Active authenticated user; self-service signup roles limited to creator or brand owner; no admin/member self-assignment |
| `POST /api/v1/organizations`, `GET /api/v1/organizations/me` | Active authenticated user; self-service organization registration, and reads scoped to the actual owner |
| `POST /api/v1/creators/onboard` | Creator role; subject and email bound to caller; verification flags cannot be self-granted; no mock-token issuance |
| `GET/PATCH /api/v1/creators/me` | Creator/admin role; caller's own profile |
| `GET /api/v1/creators/by-email/{email}` | Authenticated caller's own email only |
| `GET /api/v1/creators/me/social-accounts`, `PATCH/DELETE /api/v1/creators/me/social-accounts/{platform}` | Creator/admin role, caller-owned profile only; editing clears verification; removal never requires verification; stale handles rejected |
| `POST /api/v1/creators/verify-bio` | Creator role, own profile, own server-issued random challenge, live platform evidence; no arbitrary target profile or bio-link bypass |
| `GET /api/v1/ratecards/me`, `POST /api/v1/ratecards` | Creator/admin role; caller's creator ID supplied by server |
| `PATCH/DELETE /api/v1/ratecards/{id}` | Creator/admin role plus ownership; explicit superadmin override |
| `GET/POST /api/v1/links` | Creator/admin role; caller's own links |
| `GET /api/v1/links/{id}/stats`, `PATCH/DELETE /api/v1/links/{id}` | Creator/admin role plus ownership; explicit superadmin override |
| `POST /api/v1/qrcodes/generate` | Active authenticated user |
| `GET /api/v1/campaigns/me`, `POST /api/v1/campaigns` | Brand-owner role; organization resolved from authenticated owner |
| `GET /api/v1/campaigns/{id}` | Active authenticated organization owner; private campaign detail never leaks through public lookup |
| `POST /api/v1/campaigns/{id}/apply` | Creator/admin role; application identity comes from caller |
| `POST /api/v1/campaigns/{id}/invite` | Brand-owner role plus ownership of the specific campaign |

FastAPI's development documentation and OpenAPI schema expose API structure, not business records. OpenAPI is regenerated in `contracts/openapi.json`. The route-policy test fails if a new documented business route lacks authentication outside the explicit public allowlist.

## Web

| Routes | Policy |
| --- | --- |
| `/`, `/[username]`, `/login`, `/signup/creator`, `/access-denied`, static assets | Public; signup/signin do not themselves grant access |
| `/dashboard/creator` | Server-rendered session validation plus creator role (or superadmin) |
| `/dashboard/brand` | Server-rendered session validation plus brand-owner role (or superadmin) |
| `POST /api/auth/google` | Same-origin only; provider must be enabled; server-issued PKCE verifier and callback state stored in a short-lived HttpOnly cookie |
| `GET /api/auth/google/callback` | Browser-bound state and PKCE code exchange, verified backend identity/role, server-only session cookie; no client-selected external redirect |
| `/auth/complete` | Requires verified session before clearing account caches and navigating to a fixed internal destination |
| `POST /api/auth/login`, `POST /api/auth/signup` | Same-origin only; Supabase verifies credentials; backend verifies token and current account/roles before setting session |
| `GET /api/auth/session` | Returns current verified identity or 401; never exposes token |
| `POST /api/auth/logout` | Same-origin only; clears HttpOnly session cookie |
| `/api/account/[...path]` | Cookie required; restricted path vocabulary, server token forwarding, same-origin check for mutations; backend remains responsible for roles and ownership |
| `POST /api/social/enrich` | Same-origin and backend-validated active session; fixed supported social platforms and validated handles |
| `POST /api/social/verify-bio` | Same-origin and cookie required; forwards to the authenticated backend; no local verification fallback |
| `GET /api/proxy-image` | Public avatars only; HTTPS social-image host allowlist, no redirects, raster image content only, timeout and size limits; arbitrary/internal URLs and active SVG/HTML responses rejected |

Session tokens use HttpOnly, SameSite=Lax cookies, with Secure in production. Mutations reject missing/mismatched Origin headers. `APP_ORIGIN` can set the canonical origin behind a reverse proxy. Sessions expire within an hour and currently require a fresh sign-in rather than background refresh. Browser-local editing remains prototype UI state, never a backend permission boundary. Sign-out clears local account data; local-only prototype edits are not retained across sign-out.

Supabase email confirmation is honored: if signup returns no session, the user must confirm email and sign in before accessing creator APIs. Google sign-in is implemented through Supabase PKCE OAuth. The provider must be enabled in the Supabase project before it can be used; see [GOOGLE_LOGIN.md](GOOGLE_LOGIN.md). Account creation and signin were tested with provider/backend mocks; no live accounts were created during this audit, preserving the fresh database.

## Checks

- `cd backend && DEBUG=false .venv/bin/python -m pytest -q`
- `cd web && npm run test:access && npm run test:zero-state`
- `cd web && ./node_modules/.bin/next build --webpack`

Tests cover anonymous/forged tokens for every private backend operation, privilege escalation, suspended accounts, cross-creator writes, cross-organization campaign access/invitations, challenge ownership, JWT claims and algorithm downgrade, dashboard role gates, CSRF, gateway traversal/token leakage, credential failures, and image-proxy restrictions.

Validation completed: 83 backend tests and 13 web tests passed, along with TypeScript and the Webpack production build. Local HTTP checks confirmed anonymous API denial (401), cross-origin mutation denial (403), credential validation (400 for missing credentials), blocked internal image URLs (400), and server redirects without protected dashboard content. The temporary smoke-test server was stopped.
