# Flenzr — Creator & Brand Collaboration Platform

Flenzr connects digital creators and forward-thinking brands through verified metrics, dynamic rate cards, tracked links, direct campaign collaborations, and milestone-based approvals.

## Architecture Highlights

- **Shared Backend**: Python 3.12+ / FastAPI / SQLAlchemy 2.x (Async) / Alembic / Pydantic v2
- **Data & Auth Layer**: Supabase PostgreSQL / Supabase Auth JWTs / Supabase Private Storage
- **Web App**: Next.js 15+ (App Router) / TypeScript / Tailwind CSS / shadcn/ui / TanStack Query
- **iOS App**: 100% Native Swift / SwiftUI / Swift Concurrency (Separate Creator & Brand Targets)
- **Android App**: 100% Native Kotlin / Jetpack Compose / Coroutines & Flow / Hilt / Room (Separate Creator & Brand Modules)

## Repository Layout

```
.
├── backend/            # Python FastAPI modular monolith
├── web/                # Next.js web application (dashboards & public pages)
├── mobile-ios/         # Native iOS SwiftUI apps (Creator & Brand)
├── mobile-android/     # Native Android Compose apps (Creator & Brand)
├── contracts/          # OpenAPI specifications and client code generators
└── docs/               # Technical specifications and documentation
```

For complete architectural details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
