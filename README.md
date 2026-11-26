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

## Project roadmap

Open [roadmap.html](roadmap.html) in a browser for the feature roadmap, audited implementation statuses, dependencies and release gates. Update statuses, owners, target dates and notes as work progresses.

Edits are saved in that browser. Use **Export progress** to back them up or **Download HTML snapshot** to save an updated roadmap for sharing or replacing the repository copy; browser edits do not automatically change this file.

The first persisted collaboration slice is documented in [docs/ENQUIRIES.md](docs/ENQUIRIES.md): media-kit requests, creator responses and brand enquiry history.

## Local development ports

Flenzr uses **frontend 3210** and **backend 8210** to stay separate from other local projects.

Start the backend from the repository root:

```sh
./backend/run-dev.sh
```

Start the frontend in a second terminal:

```sh
cd web
npm run dev
```

Open `http://localhost:3210`. The backend API docs are at `http://127.0.0.1:8210/docs`.
The frontend environment files, API defaults, and backend CORS allowlist use this pair.
See [Google login configuration](docs/GOOGLE_LOGIN.md) for the matching OAuth origin and callback.

Notification setup and manual checks: [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md). Development emails are captured locally; production SMTP must be configured explicitly.

P05 enquiry regression results and repeatable checks: [docs/ENQUIRY-REGRESSION.md](docs/ENQUIRY-REGRESSION.md).

Brand workspace profile editing and manual checks: [Brand profile persistence](docs/BRAND-PROFILE.md).

Creator directory filters, pagination and manual checks: [Creator discovery](docs/CREATOR-DISCOVERY.md).

Campaign draft persistence, migration and manual checks: [Campaign drafts](docs/CAMPAIGN-DRAFTS.md).

Publishing, lifecycle actions and manual checks: [Campaign lifecycle](docs/CAMPAIGN-LIFECYCLE.md).


Campaign application/invitation lists and manual checks: [Campaign activity](docs/CAMPAIGN-ACTIVITY.md).

Campaign response rules and manual checks: [Campaign responses](docs/CAMPAIGN-RESPONSES.md).

Discovery invitation composer and manual checks: [Campaign invitations](docs/CAMPAIGN-INVITATIONS.md).

Creator campaign browsing/application workflow and manual checks: [Campaign opportunities](docs/CAMPAIGN-OPPORTUNITIES.md).

Private brand shortlists, migration and manual checks: [Shortlists](docs/SHORTLISTS.md).

Brand campaign pipeline totals and manual checks: [Campaign pipeline](docs/CAMPAIGN-PIPELINE.md).

Shared collaboration records, migration and manual checks: [Collaborations](docs/COLLABORATIONS.md).

Private proposal drafts, shared revision history and manual checks: [Proposals](docs/PROPOSALS.md).

Mutual proposal acceptance, immutable agreements and manual checks: [Agreements](docs/AGREEMENTS.md).

Creator delivery links, immutable version history and manual checks: [Deliveries](docs/DELIVERIES.md).

Brand/client delivery decisions and revision requests: [Delivery reviews](docs/DELIVERY-REVIEWS.md).

- [Collaboration completion and manual testing](docs/COMPLETIONS.md) — Step 18, final approved work, shared completion receipts and closed writes.

- [Collaboration calendar and manual testing](docs/COLLABORATION-CALENDAR.md) — Step 19, shared agreed deadlines for creators and brands.

- [Revision allowance and manual testing](docs/REVISION-ALLOWANCE.md) — Step 20, mutually agreed limits, shared usage and safe enforcement.

- [Publishing proof and manual testing](docs/PUBLISHING-PROOF.md) — Step 21, versioned final post links against approved work.

- [Publishing proof confirmation and manual testing](docs/PROOF-CONFIRMATION.md) — Step 22, explicit brand/client acknowledgement and version-scoped history.

- [Deadline indicators and manual testing](docs/DEADLINE-INDICATORS.md) — Step 23, current-state calendar urgency without false overdue delivery flags.

Private delivery attachments and setup/manual checks: [Collaboration files](docs/COLLABORATION-FILES.md).

Private participant reviews after completion: [Collaboration feedback](docs/COLLABORATION-FEEDBACK.md).

Private collaboration conversations: [Messaging and manual checks](docs/COLLABORATION-MESSAGES.md).

Full creator-to-brand regression report and reusable browser runner: [Journey verification](docs/COLLABORATION-JOURNEY.md).

Collaboration milestone alerts, recipient rules and regression checks: [Collaboration notifications](docs/COLLABORATION-NOTIFICATIONS.md).

Shared collaboration milestone timeline, privacy and regression checks: [Activity history](docs/COLLABORATION-ACTIVITY.md).

Mutual scope changes, immutable agreement revisions and current-work boundaries: [Scope changes](docs/SCOPE-CHANGES.md).
