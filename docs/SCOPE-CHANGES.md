# Mutually agreed scope changes

Step 38 · 27 November 2026. Open **Proposals & Agreement**, then **Scope changes**. Either saved participant can propose updated price, deliverables, delivery date, revision allowance, usage rights and notes. The currency and saved parties remain fixed. The current agreement stays in force while the request is pending.

## Consent and agreement history

The proposer must explicitly confirm approval of the exact requested terms before sending. Sending with that confirmation records their consent. The other participant must review the terms and impact, check a separate confirmation and accept. The proposer cannot accept their own request. The recipient can decline; only the proposer can withdraw. These actions each require explicit confirmation and create one permanent decision.

Acceptance creates a new **immutable agreement revision**. It never updates the original agreement or its snapshot/checksum. Revision 1 retains the original proposal reference. Later revisions link to the accepted scope request and preserve its reason, proposal time, prior agreement ID/checksum and both consent times in a schema-version-2 snapshot. The new record has its own ID/checksum. Both participants can read/download every saved revision through **Saved agreement revisions**. The original JSON download was compared with the original fixture during browser verification.

Only one request may be pending per collaboration. Requests and decisions are append-only. A declined/withdrawn request stays in history; a changed request needs a new request ID and version. An accepted revision can be changed again only through another mutually approved request. Completed collaborations cannot be reopened through scope changes. Pending requests can still be declined/withdrawn after completion.

## Work and approval boundaries

**Accepting revised scope requires fresh delivery and review against the new agreement revision.** This impact is shown before proposing and accepting.

- Existing submissions, files, review decisions and proof remain readable as history. Their original agreement IDs and consent are unchanged.
- Old approved work cannot complete the revised scope. Old proof cannot certify it. New submissions/reviews/proof must match the current agreement.
- Delivery and proof version numbers keep increasing; history is not reset or renumbered. The revision allowance applies to the new agreement's terms. Earlier used revision rounds remain recorded under the earlier agreement.
- Unsubmitted uploads reserved for the old agreement are not offered or attachable under the new agreement. Submitted file access remains participant-authorized. Unattached old objects remain subject to existing expiry/cleanup rules; scope acceptance does not delete storage objects.
- Calendar dates and outstanding counts use the current agreement. Grouped delivery/proof badges distinguish historical work from current requirements. Confirmed proof for an earlier delivery does not mark new work confirmed.
- Work under the current agreement can continue while a request is pending. A submitted delivery, saved review, proof version, proof confirmation or completion changes the work-state fingerprint. Acceptance of a request based on the older state is rejected. Decline/withdraw it, then review a fresh request. Draft uploads and chat do not enter this shared fingerprint.

A proposed delivery date must be today or later at publication and acceptance. A passed date blocks acceptance without silently changing the request. There is no automatic expiry job in this milestone. No-op changes, missing terms/allowance, currency changes, forged actor/recipient fields and non-boolean consent are rejected. No payment, invoice, funding or payout is created.

## API and concurrency

All routes authorize the saved participants, return no-store responses and use the existing same-origin HttpOnly account gateway. Unrelated accounts receive 404; signed-out users receive 401. There are no request edit/delete APIs.

- `GET /api/v1/collaborations/{id}/scope-changes?page=1&page_size=10`: current agreement, current work-state token, pending request and paginated request/decision history. Page size is bounded at 50.
- `POST /api/v1/collaborations/{id}/scope-changes`: request UUID, expected current agreement ID, expected work-state token, complete terms, reason and strict `confirmed: true`.
- `POST /api/v1/collaborations/{id}/scope-changes/{changeId}/decide`: request UUID, `accept`, `decline` or `withdraw`, optional note and strict `confirmed: true`.
- `GET /api/v1/collaborations/{id}/agreement`: current immutable agreement revision.
- `GET /api/v1/collaborations/{id}/agreements?limit=20&offset=0`: bounded revision history.
- `GET /api/v1/collaborations/{id}/agreements/{agreementId}`: exact owned historical revision.

Request creation, decisions, delivery/review/proof and completion serialize on the collaboration row. The server captures the work-state token and verifies it again before acceptance. A unique decision per request and unique agreement revision/scope-request links provide database backstops. Request UUIDs are scoped to the actor/collaboration; exact retries reuse the result, while changed payloads or a reused decision UUID for another request conflict. A notification failure rolls back its scope decision and new agreement together.

The frontend retains the same request/body after an ambiguous response. Browser checks commit the action through the actual isolated API before returning a simulated 503, then retry through the UI and confirm exactly one request/accepted revision. Refreshing scope changes also refreshes the main agreement if its current revision changed in the other session.

Scope publication/acceptance/decline/withdrawal notify only the counterparty through the existing in-app inbox. They also appear in shared activity history. Generic notifications omit terms/reason; the protected scope view contains the shared details. No collaboration email jobs are enqueued.

## Migration and rollout

`0035_scope_changes` adds private immutable scope-request/decision tables and extends agreements with revision/origin constraints. It changes the old single-agreement uniqueness to a unique collaboration/revision pair. Existing rows become revision 1 without updating their original snapshot/checksum. The existing agreement immutability trigger and RLS remain in place. New tables have restrictive API-only RLS and triggers rejecting UPDATE/DELETE even for the trusted application role.

The migration is applied to development. Original agreement checksums were verified; the new development scope tables were empty at verification. No real-user scope requests were created by tests. Staging/production rollout remains deferred.

The downgrade refuses once scope history or accepted revisions exist; it will not silently remove consent records or contract revisions. Keep compatible code or use a reviewed restore plan. A no-scope-data upgrade/downgrade/upgrade is tested against disposable PostgreSQL.

The SQLite test fixture temporarily disables foreign keys **only during table teardown** to drop cyclic agreement/scope references, restoring the prior setting before the next test. Foreign-key enforcement during business operations is retained. PostgreSQL tests exercise the actual migrated constraints and immutable triggers.

## Verification

- **622 backend tests passed / 23 opt-in checks skipped.** Nineteen scope cases cover mutual consent, both proposer roles, strict inputs, stale work, retries, hash chains, decline/withdrawal, notification rollback, current calendar/delivery/proof state and old-upload rejection.
- **187 web tests passed; TypeScript and focused scope/proposal/delivery/proof lint passed with zero errors or warnings.**
- **Twelve selected native PostgreSQL checks passed**, including concurrent proposals and competing decisions, original snapshot preservation across migration, exact retry, immutable records, browser-role read/write denial and guarded downgrade.
- **Ten isolated browser scenarios passed with zero uncaught exceptions**: cancelled editor/review, lost send and acceptance responses after commit, original agreement download, historical approval/proof boundaries, decline/withdrawal, stale consent after fresh work, current-work completion, activity/creator isolation, mobile layout and Escape without consent. A supplementary focus check verifies that the mobile dialog initially focuses the title rather than the optional note field. Desktop editor/mobile dialog screenshots were visually inspected.

The current scope API is locally/development verified. Cancellation, automatic expiry, payment implications and production rollout remain separate. The next agreed work is UI polish/accessibility.

## Repeat the isolated browser check

The seed refuses to overwrite an existing fixed test database. Stop any isolated API using it before retaining/removing your own previous fixture.

```sh
cd backend
.venv/bin/python scripts/seed_scope_changes.py
DEBUG=false DATABASE_URL=sqlite+aiosqlite:////tmp/flenzr-scope-20261127.sqlite \
SUPABASE_JWT_SECRET=scope-regression-signing-secret-not-real \
SUPABASE_JWKS_URL='' CORS_ORIGINS='["http://localhost:3232"]' \
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8332
```

The mode-0600 fixture is `/tmp/flenzr-scope-fixture.json`. Run an isolated current web copy on port 3232 with `BACKEND_API_URL=http://127.0.0.1:8332` and `APP_ORIGIN=http://localhost:3232`, and a dedicated headless Chrome profile on debugging port 9362, as in [call qualification](CALL-READINESS.md). From the repository root:

```sh
node web/tests/scope-changes.browser.mjs
```

The runner uses actual UI/BFF/API/SQLite and test-only tokens, creates controlled agreement downloads in a private temporary directory, and closes its browser contexts. Stop the isolated API/web/Chrome services afterward. No live mail or storage uploads are used. Native migration/race/privacy check:

```sh
cd backend
DEBUG=false DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:55436/postgres \
FLENZR_TEST_SCOPE_POSTGRES=1 .venv/bin/python -m pytest tests/test_scope_changes_postgres.py -q
```
