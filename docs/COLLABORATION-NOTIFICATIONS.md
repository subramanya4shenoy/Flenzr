# Collaboration notifications

Step 36, 26 November 2026. Collaboration milestones now use the existing account notification inbox and bell. The next agreed work is activity history, then mutually agreed scope changes, followed by UI polish/accessibility. Staging remains deferred.

## Events and recipients

| Saved event | Recipient | Destination |
| --- | --- | --- |
| Proposal sent, including a counterproposal | Other saved participant | Proposals & Agreement |
| First participant accepts a proposal | Other saved participant | Proposals & Agreement |
| Second acceptance creates the agreement | Other saved participant | Proposals & Agreement |
| Creator submits a delivery version | Brand/client | Deliveries & Review |
| Brand approves or requests revision | Creator | Deliveries & Review |
| Brand completes approved work | Creator | Deliveries & Review |
| Creator saves a publishing-proof version | Brand/client | Publishing Proof |
| Brand confirms proof | Creator | Publishing Proof |

The actor does not receive an unread self-alert. Saving drafts, viewing records, chat/typing, calls, delivery comments and private feedback do not produce these milestone alerts. Each real transition creates one alert; stale, forbidden and failed actions create none. Exact request retries reuse the saved transition and notification. Collaboration alerts do not enqueue email. Existing enquiry confirmations, email jobs and delivery worker behavior remain unchanged.

## Persistence and authorization

Migration `0034_collaboration_notifications` extends `notifications` with nullable enquiry fields and a collaboration target/event key. A check constraint requires exactly one complete target; a unique recipient/collaboration/event-key constraint prevents duplicate alerts. Existing enquiry rows and their unique revision constraint are retained. The migration does not backfill historical collaboration events. It preserves PostgreSQL RLS and the existing private account broadcast trigger.

Notifications are inserted in the same transaction as the business transition, before commit. A notification failure rolls back the proposal, acceptance, delivery/review, proof or completion write. Existing collaboration row locks serialize competing requests. The API derives recipients from the saved participant IDs; clients cannot submit a recipient, notification text or destination.

The existing owned-list/count/read APIs remain in place. Notification responses now include nullable `enquiry_id` and `collaboration_id`; internal event keys and recipient IDs are omitted. Text is generic and contains no proposal prices, drafts, delivery notes, files, proof URLs or private feedback. Other accounts cannot list or acknowledge these alerts, and collaboration APIs repeat participant authorization when a link opens.

Links use `/dashboard/collaborations/{id}?view=proposal`, `?view=deliveries` or `?view=proof`. The proposal alias selects the existing Proposals & Agreement step. Password/Google return destinations and the server login redirect allow only these fixed views for collaboration notification links. The normal hash navigation still works, and a manual step selection removes the initial `view` query so reload follows the user's latest selection.

The inbox labels collaboration actions **Open collaboration** and enquiry actions **Open enquiry**. Selecting an alert acknowledges it before navigating. A failed acknowledgement leaves the item unread and offers retry. Listing, reloading and opening a collaboration directly do not acknowledge all its notifications.

On Supabase PostgreSQL, the existing notification trigger sends only an invalidation on the recipient's private account channel. Account-scoped client queries refresh bell/list state; foreground polling is the fallback where live transport is unavailable. The SQLite browser qualification exercises polling/manual refresh, not the hosted Supabase broadcast service.

## Verification

- 591 backend tests passed; 21 opt-in checks skipped. Eight new collaboration notification checks cover milestones, recipients, retries, stale/forbidden actions, generic summaries, owned read state, target uniqueness and rollback of failed writes.
- 184 web tests passed, including the existing cookie-gateway checks and new CTA, login-destination and return-link cases. TypeScript passed. Focused notification/navigation/auth lint reports zero errors and four existing unused-import warnings on the login page.
- Eleven native PostgreSQL checks passed across collaboration proposals, agreements, delivery/review/completion, proof, revision allowance, messaging, feedback and the notification migration. They include concurrent proposal sends producing exactly one winning alert, and migration upgrade/downgrade/upgrade with preserved enquiry rows, FK/target/deduplication constraints and browser-role RLS denial.
- OpenAPI and TypeScript contracts were regenerated. Migration 0034 is applied to development; staging/production rollout remains pending.

Nine fresh browser scenarios passed with zero uncaught exceptions, including acknowledgement failure/retry, signed-out view preservation, exact proposal/delivery destinations, bell updates, reload, outsider denial and mobile width. Development notification RLS, constraints and direct anon/authenticated denial were also verified. The browser result is recorded in the roadmap. This is an in-app notification milestone; SMTP delivery of collaboration alerts, preferences/quiet periods and a shared activity timeline are separate work.

## Repeat the isolated browser check

The seed refuses to overwrite an existing `/tmp/flenzr-notifications-20261126.sqlite`. Use a fresh disposable file after stopping the isolated API and retaining/removing only your own earlier test data. It fixes the database and JWT secret to test-only values, creates brand/creator/outsider accounts and one sent proposal, and writes tokens to a mode-0600 `/tmp/flenzr-notifications-fixture.json` file.

```sh
cd backend
.venv/bin/python scripts/seed_collaboration_notifications.py
DEBUG=false \
DATABASE_URL=sqlite+aiosqlite:////tmp/flenzr-notifications-20261126.sqlite \
SUPABASE_JWT_SECRET=notifications-regression-signing-secret-not-real \
SUPABASE_JWKS_URL='' CORS_ORIGINS='["http://localhost:3232"]' \
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8332
```

Run an isolated current-source Next app on `localhost:3232` with `BACKEND_API_URL=http://127.0.0.1:8332` and `APP_ORIGIN=http://localhost:3232`. Use a dedicated headless Chrome profile with debugging port 9362, as in [call qualification](CALL-READINESS.md). From the repository root:

```sh
node web/tests/collaboration-notifications.browser.mjs
```

The runner uses actual UI/BFF/API calls. It checks signed-out view preservation, failed acknowledgement/retry, exact proposal and delivery destinations, bell/list refresh, duplicate-safe acceptance/submission/review/completion, reload persistence, outsider denial and a 390-pixel viewport. The runner closes its browser contexts; shut down your isolated API, web and Chrome processes afterward. No storage uploads or live emails are sent.


Step 38 adds generic counterparty-only scope proposed/accepted/declined/withdrawn alerts to this inbox. They link to Proposals & Agreement, where the Scope changes action opens the request/history. These alerts commit with the immutable request/decision and do not create email jobs. See [Scope changes](SCOPE-CHANGES.md).
