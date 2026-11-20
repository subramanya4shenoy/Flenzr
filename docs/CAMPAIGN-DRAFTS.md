# Campaign drafts — P06.05.01

Implemented 19 November 2026. Open **Brand workspace → New campaign**, or reopen a saved item from **Campaigns → Edit draft**. Complete the Brand profile setup first if the workspace does not yet have an organization.

## Behavior

Only a title (3–255 characters) is required to save a draft. A brief, target niche, deliverables, planned budget, currency and planned dates can be added later. Blank budget is stored as undecided (zero cents) and displayed as “Budget to discuss.” Dates are optional planned calendar days, stored at midnight UTC; an end date cannot precede its start. No date is invented.

The editor loads the current saved brief before editing, keeps form values after a failed save, and provides retry. Cancel/Escape asks before discarding unsaved changes. Browser reload/close also warns while the form has unsaved edits. Reopening and reloading restore server data. A successfully reloaded brief refreshes its campaign card as well.

`POST /api/v1/campaigns/drafts` always creates a private `draft`. A client-generated UUID request_id is used as the draft ID. Identical retries return the existing record; reusing that ID with different fields or for another brand cannot overwrite it. Concurrent identical creation attempts produce one row.

`PATCH /api/v1/campaigns/{id}/draft` requires expected_revision and the owning brand role. Omitted fields are preserved; optional fields can be explicitly cleared. Validation applies to the merged saved details, including dates. Revision checks and the conditional SQL update prevent stale editors from overwriting newer values. An identical retry after a successful edit returns the saved revision. A conflicting editor keeps its local values and offers **Reload saved draft**, explicitly stating that reload replaces those unsaved values.

Organization, ownership, status and revision cannot be supplied as editable fields. The draft editor cannot modify a published campaign. Existing published campaigns can be opened as read-only briefs.

Drafts are absent from public explore, cannot receive creator applications or invitations, and cannot be read or edited by another brand. Publishing and lifecycle controls are now available in Step 06; see [Campaign lifecycle](CAMPAIGN-LIFECYCLE.md). The legacy active-create API now enforces the same publishing readiness rules.

The dashboard now uses saved campaign records. Active count excludes drafts, application counts come from saved application rows, and declared campaign budgets are grouped by currency. Budgets are planning figures, not payments or actual spending. Loading/failure displays do not fabricate totals. Campaign-list pagination and complete financial/pipeline reporting remain separate work.

## Migration

`0014_campaign_revision` adds a non-null integer revision with default 1. It was applied to the development PostgreSQL database. Existing campaigns retain their data and start at revision 1. No other campaign columns are changed.

`0015_campaign_api_privacy` was also applied. Campaigns, applications and invitations now have row-level security with a restrictive API-only policy. Supabase anon/authenticated roles cannot directly read or write these tables; even an owning brand uses the authorized API. The trusted backend uses its existing table-owning/BYPASSRLS database role. Public opportunities remain available through the filtered API.

For another deployment, run `env DEBUG=false .venv/bin/alembic upgrade head` from backend before starting code that reads campaign revisions.

## Verification

- Full backend suite: **329 passed, 4 skipped** (opt-in PostgreSQL checks).
- Separate native PostgreSQL concurrency check: **1 passed**. It uses an isolated schema, verifies direct anon/authenticated read/write denial, duplicate-create retries and two concurrent editors, and drops the schema in finally. Run from backend with `env DEBUG=false FLENZR_TEST_CAMPAIGN_POSTGRES=1 .venv/bin/python -m pytest tests/test_campaign_drafts_postgres.py -q`.
- Full web suite: **112 passed**. Budget parsing, dates, request failures, cookie gateway usage and currency-separated totals are covered.
- TypeScript, focused lint and production build passed. The existing Next.js security advisory remains a separate dependency upgrade follow-up.
- Production-browser flow on disposable SQLite test data: failed-save retry, exact budget, draft privacy, reload/reopen, edits, stale-editor recovery, unsaved-discard confirmation, another brand’s access denial, and a 390px editor without overflow or browser exceptions.

No production email or social-provider requests are needed by this feature. The tests do not establish production load capacity or SMTP deliverability.

## Manual check

1. Sign in as a brand with its profile saved. Click **New campaign**.
2. Enter just a title and click **Save draft**. Confirm a private draft card appears with Budget to discuss.
3. Refresh, click **Campaigns**, then **Edit draft**. The title should still be present.
4. Add a brief, niche, deliverables, a budget such as 12345.67, currency and optional start/end dates. Save, refresh and reopen. Check all values.
5. Try an end date before the start or a budget with more than two decimals. Correct the error and save.
6. Change a field, click Cancel, then Keep editing. Confirm the value remains. Cancel again and Discard changes; no additional draft should be created.
7. Open the same draft in two tabs. Save different edits in the first, then save from the second. The second should report a conflict and retain its local values. Reload saved draft to see the first tab’s saved version.
8. Sign in as another brand in a separate browser/profile. Its campaign list must not include the first brand’s draft. Draft IDs also stay absent from `GET /api/v1/campaigns/explore`.

Step 06 is complete: [Publish and manage campaign lifecycle](CAMPAIGN-LIFECYCLE.md). Next: **P06 Step 07 · P06.06.01 — List campaign applications and invitations**.
