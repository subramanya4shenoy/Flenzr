# FLENZR — TECHNICAL ARCHITECTURE DIRECTIVE SPECIFICATION

## 1. Executive Summary & Repository Audit

### 1.1 Existing Repository Audit
- **Repository History**: The commit history reveals an earlier Nx monorepo codebase (circa 2022) composed of NestJS, GraphQL (Apollo), Prisma ORM, and Webpack Module Federation for React.
- **Current State**: Working tree was reset cleanly (`ffb0814` "fresh") with no active legacy files blocking modernization.
- **Reusable Domain Insights**:
  - **Social Platform Linking**: Historic models (`youtube`, `youtube_stats`, `google_yt_auth`, `instagram`, `facebook`, `linked_in`) identify key metrics (subscriber count, view counts, video counts, engagement trends, token refreshes).
  - **Creator Profiles**: Domain attributes such as style classifications, category taxonomy, creator bio/about, and social channels.
- **Architectural Shift**: Legacy Prisma/NestJS/GraphQL and React Native approaches are completely replaced with:
  - **Backend**: Python 3.12+ / FastAPI / SQLAlchemy 2.x async / Alembic / Pydantic v2.
  - **Web**: Next.js 15+ (App Router) / React 19 / TypeScript / Tailwind CSS / shadcn/ui / TanStack Query.
  - **iOS**: 100% Native Swift / SwiftUI / Swift Concurrency / SPM / Separate Creator and Brand targets.
  - **Android**: 100% Native Kotlin / Jetpack Compose / Coroutines & Flow / Hilt / Room / Separate Creator and Brand modules.
  - **Data Layer**: Supabase PostgreSQL (managed infrastructure), Supabase Auth (identity token provider), Supabase Storage (private S3-compatible buckets).

---

## 2. Updated Technical Architecture

### 2.1 System Topology
```
                          +------------------------------------------+
                          |              Clients                     |
                          |                                          |
  [Public Users / Web]    | [iOS Creator / Brand]  [Android Creator / Brand]
   (Next.js App Router)   |   (Native SwiftUI)         (Native Compose)
           |              +------------------------------------------+
           |                                   |
           | 1. Authenticate                   | 1. Authenticate
           v                                   v
  +------------------------------------------------------------------+
  |                   Supabase Auth Service                          |
  |             (Issues JWT Access Token & Refresh Token)            |
  +------------------------------------------------------------------+
           |                                   |
           | 2. API Requests + Bearer JWT      | 2. API Requests + Bearer JWT
           v                                   v
  +------------------------------------------------------------------+
  |              Flenzr FastAPI Python Backend (Port 8000)           |
  |------------------------------------------------------------------|
  |  - JWT Verification (JWKS / Supabase JWT Secret)                 |
  |  - Organization & Role-Based Access Control (RBAC / ABAC)        |
  |  - Domain Business Logic Engine (Modular Monolith)               |
  |  - Rate Card Computation & Dynamic Pricing Engine                |
  |  - Campaign State Transition Machine & Content Approvals         |
  |  - Tracked Link Redirects & Click Attribution Pipeline           |
  |  - Webhook Handlers (Payment Gateways, Social Platforms)         |
  +------------------------------------------------------------------+
           |                                   |
           | Async Engine (asyncpg)            | Signed URLs / Admin SDK
           v                                   v
  +-----------------------------+     +------------------------------+
  |   Supabase PostgreSQL DB    |     |   Supabase Storage Buckets   |
  |  (Managed Tables + RLS)     |     |   (Signed Creator Assets)    |
  +-----------------------------+     +------------------------------+
           |
           +--------------------+
                                | (Celery / ARQ / Async Background Workers)
                                v
                      +------------------------------+
                      |   Background Task Workers    |
                      | - Social Stats Refresh       |
                      | - Analytics Aggregation      |
                      | - Notifications & Webhooks   |
                      +------------------------------+
```

### 2.2 Core Architectural Principles
1. **No Cross-Platform Mobile UI Frameworks**: Zero React Native, Expo, Flutter, or webview wrappers. Mobile apps are fully native Swift and Kotlin.
2. **Unified Backend Core**: FastAPI is the single source of business truth for Web, iOS, and Android.
3. **Database Ownership**: Clients never directly query or mutate business tables via Supabase PostgREST. All operations pass through validated FastAPI endpoints.
4. **Portability by Design**: Database schema is authored in SQLAlchemy 2.x and managed via Alembic. The database can run on any managed PostgreSQL (Supabase, AWS RDS, GCP Cloud SQL) without vendor lock-in.
5. **Contract-Driven Development**: FastAPI generates OpenAPI 3.1 specifications on build/startup; automated tooling generates and type-checks clients for TypeScript, Swift, and Kotlin.

---

## 3. Repository Structure

A clean, modular monorepo layout:

```
Flenzr/
├── backend/                        # Python FastAPI Modular Monolith
│   ├── app/
│   │   ├── core/                   # Shared infrastructure & framework utils
│   │   │   ├── config.py           # Pydantic Settings (env validation)
│   │   │   ├── database.py         # SQLAlchemy async engine & sessionmaker
│   │   │   ├── security.py         # Supabase JWT decoding, token verification
│   │   │   ├── dependencies.py     # FastAPI Depends: auth, permissions, db
│   │   │   ├── exceptions.py       # Custom domain exceptions & handlers
│   │   │   ├── middleware.py       # Request ID, Logging, CORS, Rate limiting
│   │   │   └── pagination.py       # Cursor & offset pagination primitives
│   │   ├── domains/                # Domain-Driven Modules
│   │   │   ├── identity/           # User accounts, auth mapping, roles
│   │   │   ├── organizations/      # Multi-tenant brand/agency organizations
│   │   │   ├── creators/           # Creator profiles, categories, bio
│   │   │   ├── brands/             # Brand profiles, company details
│   │   │   ├── social/             # Social connections (YouTube, IG, etc.)
│   │   │   ├── profiles/           # Public page layout, bio links, theme
│   │   │   ├── qrcodes/            # Dynamic QR code generation & routing
│   │   │   ├── links/              # Short links, click tracking, UTM tags
│   │   │   ├── analytics/          # Clicks, impressions, engagement events
│   │   │   ├── ratecards/          # Deliverable pricing packages, tiers
│   │   │   ├── mediakits/          # Exportable metrics & verified kit data
│   │   │   ├── discovery/          # Creator search, filters, audience match
│   │   │   ├── campaigns/          # Campaign lifecycle, briefs, budgets
│   │   │   ├── applications/       # Creator applications & brand invites
│   │   │   ├── collaborations/     # Active collaboration contracts
│   │   │   ├── deliverables/       # Milestones, drafts, review states
│   │   │   ├── messaging/          # Direct messaging & collaboration chat
│   │   │   ├── notifications/      # Push, email, in-app notifications
│   │   │   ├── payments/           # Escrow, payouts, invoicing, webhooks
│   │   │   └── admin/              # Platform moderation & audit trail
│   │   ├── main.py                 # FastAPI application factory
│   │   └── worker.py               # Background task worker entrypoint
│   ├── alembic/                    # Database migrations
│   │   ├── env.py                  # Async Alembic migration runner
│   │   └── versions/               # Versioned migration scripts
│   ├── tests/                      # pytest test suite
│   │   ├── unit/                   # Unit tests (models, services, utils)
│   │   ├── integration/            # API integration tests with test DB
│   │   └── conftest.py             # Fixtures, test client, mock auth
│   ├── pyproject.toml              # Dependencies & tool configurations
│   ├── alembic.ini                 # Alembic configuration
│   └── Dockerfile                  # Container definition
│
├── web/                            # Next.js 15+ Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, signup, invite callbacks
│   │   │   ├── (public)/           # SSR/SSG public creator pages & links
│   │   │   │   └── [username]/     # Dynamic public profile & link-in-bio
│   │   │   ├── (dashboard)/
│   │   │   │   ├── creator/        # Creator dashboard (analytics, links, deals)
│   │   │   │   └── brand/          # Brand dashboard (discovery, campaigns)
│   │   │   └── api/                # Edge redirect routes for short links
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives (Radix UI)
│   │   │   ├── creator/            # Creator-specific UI blocks
│   │   │   └── brand/              # Brand-specific UI blocks
│   │   ├── lib/
│   │   │   ├── api-client.ts       # Generated/typed OpenAPI fetch client
│   │   │   ├── supabase.ts         # Supabase client (Auth session only)
│   │   │   └── query-client.ts     # TanStack Query client configuration
│   │   └── types/
│   ├── tailwind.config.ts
│   └── package.json
│
├── mobile-ios/                     # Native iOS (Swift & SwiftUI)
│   ├── FlenzrCreator/              # Creator Application Target
│   ├── FlenzrBrand/                # Brand Application Target
│   ├── Packages/                   # Swift Package Manager Local Packages
│   │   ├── FlenzrCore/             # Network client, Auth, Keychain, Models
│   │   ├── FlenzrUI/               # Shared SwiftUI component library
│   │   ├── FlenzrCreatorFeature/   # Creator screens & ViewModels
│   │   └── FlenzrBrandFeature/     # Brand screens & ViewModels
│   └── Flenzr.xcodeproj (or Package.swift workspace)
│
├── mobile-android/                 # Native Android (Kotlin & Jetpack Compose)
│   ├── app-creator/                # Creator Application Module
│   ├── app-brand/                  # Brand Application Module
│   ├── core/
│   │   ├── network/                # Retrofit, OkHttp, AuthInterceptor
│   │   ├── security/               # EncryptedSharedPreferences, Keystore
│   │   ├── database/               # Room DB for offline cache
│   │   ├── model/                  # Data classes & domain entities
│   │   └── ui/                     # Compose theme, components, design tokens
│   ├── feature-creator/            # Creator feature modules
│   ├── feature-brand/              # Brand feature modules
│   └── build.gradle.kts
│
├── contracts/                      # Shared Contracts & Code Generation
│   ├── openapi.json                # Exported OpenAPI 3.1 specification
│   └── scripts/                    # Generation scripts (TS, Swift, Kotlin)
│
└── docs/                           # Architecture specifications & guides
```

---

## 4. Backend API Design & Domain Architecture

### 4.1 FastAPI Modular Monolith Structure
Each domain in `backend/app/domains/<domain>/` is isolated and encapsulates:
1. `models.py`: SQLAlchemy 2.0 mapped database tables.
2. `schemas.py`: Pydantic v2 validation models (`Create`, `Update`, `Read`).
3. `services.py`: Pure business logic, campaign state rules, payment orchestration.
4. `router.py`: FastAPI APIRouter exposing versioned REST endpoints (`/api/v1/<resource>`).
5. `dependencies.py` (optional): Domain-specific permission guards.

### 4.2 Standard API Response Envelope & Conventions
All JSON endpoints follow a consistent envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

Error response envelope:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CAMPAIGN_INVALID_STATE_TRANSITION",
    "message": "Cannot submit deliverable while campaign is in DRAFT state.",
    "details": []
  }
}
```

### 4.3 Versioned REST API Resource Mapping
- `POST /api/v1/identity/sync`: Sync/provision user from Supabase Auth token.
- `GET /api/v1/identity/me`: Current authenticated user and active roles.
- `GET /api/v1/creators/me`: Creator profile for current user.
- `PATCH /api/v1/creators/me`: Update creator profile, niche, bio.
- `GET /api/v1/creators/public/{handle}`: Public creator profile (public, high caching).
- `POST /api/v1/social/connect/{platform}`: Initiate OAuth link (YouTube, Instagram).
- `POST /api/v1/social/callback/{platform}`: Complete OAuth link & sync initial metrics.
- `GET /api/v1/ratecards/me`: Creator's deliverable packages and rates.
- `POST /api/v1/ratecards`: Create/update rate card entries.
- `GET /api/v1/links`: Creator's tracked links list.
- `POST /api/v1/links`: Create new tracked link with UTM & cloaking.
- `GET /r/{short_code}`: Fast redirect endpoint with asynchronous click analytics.
- `GET /api/v1/qrcodes`: Creator's dynamic QR codes.
- `POST /api/v1/qrcodes`: Generate custom styled QR code.
- `GET /api/v1/campaigns`: Brand campaigns list (or creator open opportunities).
- `POST /api/v1/campaigns`: Brand creates new campaign brief.
- `POST /api/v1/campaigns/{id}/apply`: Creator submits application.
- `POST /api/v1/campaigns/{id}/invite`: Brand invites creator.
- `GET /api/v1/collaborations/{id}`: Collaboration detail, milestones, chat.
- `POST /api/v1/collaborations/{id}/deliverables`: Creator submits content draft.
- `POST /api/v1/collaborations/{id}/deliverables/{d_id}/approve`: Brand approves content.
- `POST /api/v1/payments/escrow`: Escrow deposit for accepted collaboration.
- `POST /api/v1/payments/webhook`: Payment provider webhook handler (HMAC verified).

---

## 5. PostgreSQL Schema & Migration Strategy

### 5.1 Technology Choice
- **ORM**: SQLAlchemy 2.x using `DeclarativeBase` and `Mapped[T]` type annotations.
- **Async Driver**: `asyncpg` via `postgresql+asyncpg://...` connection string.
- **Migrations**: `alembic` with async execution in `env.py`.
- **Portability**: All tables define explicit foreign keys, indices, and constraints standard to ANSI PostgreSQL. No custom Supabase extensions required in core application logic.

### 5.2 Core Schema Domains & ERD Overview
1. **users**: `id (UUID)`, `supabase_uid (UUID, indexed)`, `email`, `full_name`, `avatar_url`, `is_active`, `created_at`, `updated_at`.
2. **roles & user_roles**: `user_id`, `role (enum: creator, brand_owner, brand_member, admin)`.
3. **organizations**: Multi-tenant brand accounts (`id`, `name`, `slug`, `logo_url`, `billing_status`).
4. **creators**: `id`, `user_id`, `handle (unique)`, `display_name`, `bio`, `category`, `subcategories (ARRAY/JSONB)`, `location`, `verified`, `rating`.
5. **creator_social_accounts**: `id`, `creator_id`, `platform (enum)`, `external_channel_id`, `channel_title`, `metrics (JSONB: followers, views, engagement)`, `last_synced_at`, `is_active`.
6. **rate_cards**: `id`, `creator_id`, `platform`, `deliverable_type (enum: reel, video_integration, dedicated_video, story, post)`, `base_price_cents`, `currency`, `turnaround_days`.
7. **tracked_links**: `id`, `creator_id`, `title`, `destination_url`, `short_code (unique, indexed)`, `utm_source`, `utm_medium`, `utm_campaign`, `click_count`, `is_active`.
8. **link_clicks**: `id`, `link_id`, `timestamp`, `ip_hash`, `country`, `referrer`, `device_type`.
9. **qr_codes**: `id`, `creator_id`, `name`, `target_url`, `style_options (JSONB)`, `scan_count`.
10. **campaigns**: `id`, `organization_id`, `title`, `brief`, `budget_total_cents`, `currency`, `status (enum: draft, active, in_progress, completed, cancelled)`, `start_date`, `end_date`.
11. **collaborations**: `id`, `campaign_id`, `creator_id`, `agreed_amount_cents`, `status (enum: invited, applied, accepted, in_progress, under_review, revision_requested, approved, paid, completed)`, `terms`.
12. **deliverables**: `id`, `collaboration_id`, `title`, `deliverable_type`, `submission_url`, `status (enum: pending, submitted, revision_requested, approved)`, `review_notes`.
13. **payments**: `id`, `collaboration_id`, `amount_cents`, `escrow_status`, `payout_status`, `stripe_payment_intent_id`, `stripe_transfer_id`.
14. **audit_logs**: `id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `payload (JSONB)`, `created_at`.

---

## 6. Shared Authentication & Authorization

### 6.1 Token Lifecycle
1. **Client Auth**: iOS, Android, and Web use Supabase Auth SDK (or Supabase Auth REST) strictly for:
   - Email/password, Magic link, Google/Apple OAuth sign-in.
   - Secure token storage:
     - iOS: Native Keychain (`kSecClassGenericPassword`).
     - Android: Android Keystore / `EncryptedSharedPreferences`.
     - Web: HTTP-only Secure Cookies (Next.js middleware / Supabase SSR helper).
2. **FastAPI Verification**:
   - Clients send `Authorization: Bearer <supabase_jwt>` in every request.
   - FastAPI intercepts via `app/core/security.py`.
   - Token is cryptographically validated using Supabase JWT Secret (HMAC SHA256) or JWKS public keys.
   - User identity (`sub` claim = Supabase Auth UID) is mapped to internal database `users` record.
   - Fast JIT (Just-In-Time) user provisioning automatically creates internal user on first API call.
3. **Authorization Engine**:
   - Explicit RBAC: Fast dependency guards `@Depends(require_role(["creator"]))` or `@Depends(require_role(["brand_member"]))`.
   - Resource-level ABAC: Organization membership and ownership verified inside service layer.

---

## 7. Native Mobile Architecture

### 7.1 Native iOS (Swift & SwiftUI)
- **App Separation**: Two distinct targets sharing a local Swift Package:
  - `FlenzrCreator.app`: Focused on media kit, social sync, tracked links, rate cards, earnings, incoming brand offers.
  - `FlenzrBrand.app`: Focused on creator search/filter, campaign creation, deliverable review, payments.
- **Architecture**: MVVM with Swift Concurrency (`@Observable` macro in iOS 17+, `async/await`, `actor`).
- **Networking**: URLSession-based typed client generated from OpenAPI, wrapping automatic Bearer token injection and refresh handling.
- **Keychain Wrapper**: Secure storage for Supabase session tokens using Security framework.

### 7.2 Native Android (Kotlin & Jetpack Compose)
- **Module Separation**: Multi-module Gradle setup:
  - `:app-creator`: Creator UI & flows.
  - `:app-brand`: Brand UI & flows.
  - `:core:network`: OkHttp, Retrofit, Auth interceptor.
  - `:core:security`: Android Keystore backed token manager.
  - `:core:model`: Shared data classes.
  - `:core:ui`: Shared Material 3 design system, typography, components.
- **Architecture**: Clean Architecture + MVVM (Android `ViewModel`, `StateFlow`, `SharedFlow`).
- **Dependency Injection**: Hilt (`@HiltAndroidApp`, `@AndroidEntryPoint`, `@HiltViewModel`).
- **Offline Persistence**: Room Database for offline caching of rate cards, links, and campaign states.

---

## 8. React Web Architecture

- **Framework**: Next.js 15+ with App Router.
- **Public Creator Profiles (`/[username]`)**:
  - Server-Side Rendered (SSR) / Incremental Static Regeneration (ISR) for fast SEO performance, OpenGraph social preview cards, and minimal client JS bundle.
- **Authenticated Dashboards**:
  - Client-Side interactive applications (`/dashboard/creator`, `/dashboard/brand`).
  - Styled with Tailwind CSS and accessible `shadcn/ui` components (Radix UI).
  - Server state managed via `@tanstack/react-query` with optimistic updates.
  - Forms validated with `react-hook-form` + `zod`.

---

## 9. Cross-Platform API Contract Strategy

1. **Single Source of Truth**: The Python FastAPI app defines all schemas via Pydantic v2.
2. **Automated Export**: CLI command `python -m app.cli export-openapi` writes `contracts/openapi.json`.
3. **Client Generation**:
   - TypeScript: `openapi-typescript` generates immutable, strongly typed TS definitions for the Next.js app.
   - Swift: `swift-openapi-generator` (Apple official) or OpenAPI generator generates native Swift models and API protocols.
   - Kotlin: OpenAPI generator generates Kotlin data classes and Retrofit interfaces.
4. **Contract Drift Prevention**: CI workflow validates that `contracts/openapi.json` is always in sync with code before merging.

---

## 10. Milestone-by-Milestone Implementation Plan

- **Phase 0: Architecture & Foundation (Current)**
  - Audit repository, establish monorepo directory layout, create technical specifications.
- **Phase 1: Python Backend Foundation & Supabase Integration**
  - FastAPI modular skeleton, Pydantic settings, async SQLAlchemy 2.x, Alembic migrations.
  - Supabase Auth JWT verification dependency, User provisioning, core health checks and pytest test suite.
- **Phase 2: Core Domain Entities & Public Creator Web Platform**
  - Creator profile models, rate cards, tracked links, QR code generator API.
  - Next.js 15 web app, shadcn/ui design system, public SSR creator pages, link-in-bio, and link redirect engine.
- **Phase 3: Native iOS Creator Application**
  - Native Swift package setup, SwiftUI design tokens, Keychain auth, creator profile & rate card management.
- **Phase 4: Native Android Creator Application**
  - Android multi-module project, Jetpack Compose theme, Hilt DI, Retrofit client, creator dashboard.
- **Phase 5: Brand Marketplace, Discovery & Campaigns Web Dashboard**
  - Brand profile and campaign creation APIs, search & filtering, brand web dashboard.
- **Phase 6: Native iOS & Android Brand Applications**
  - iOS and Android brand apps for creator search, proposal review, and mobile campaign tracking.
- **Phase 7: Collaborations, Approvals, Payments & Analytics**
  - Deliverable submission & review workflow, payment escrow integration (Stripe / Razorpay), real-time notifications.
