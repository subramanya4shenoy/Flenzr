# Shared collaboration activity history

Step 37, 26 November 2026. **Activity history** is available alongside Messages in individual collaborations and the brand's grouped Offer workspace. Choose an influencer in the grouped view to see only that saved collaboration's timeline. It follows the completed notification work; mutually agreed scope changes, then UI polish/accessibility remain next. Staging is deferred.

## Included records

The timeline reads existing saved collaboration records. Older collaborations work immediately; no new database table, migration, backfill or invented historical event is required.

| Event | Attribution | Related section |
| --- | --- | --- |
| Collaboration started | Actor not recorded | Overview |
| Proposal version shared | Saved proposal author | Proposals & Agreement |
| Acceptance of a proposal version | Saved accepting participant | Proposals & Agreement |
| Agreement confirmed | Both participants | Proposals & Agreement |
| Delivery version submitted | Saved creator | Deliveries & Review |
| Delivery approved / revision requested | Saved reviewer | Deliveries & Review |
| Publishing proof version shared | Saved creator | Publishing Proof |
| Publishing proof confirmed | Saved reviewer | Publishing Proof |
| Collaboration completed | Saved completing participant | Deliveries & Review |

Each entry shows its saved timestamp, generic description and version where applicable. Attribution uses the saved collaboration's brand/creator names; **You** identifies the viewer's own actions. Both individual acceptances remain visible, including historical acceptance of an older proposal that never became an agreement. Agreement confirmation is a separate joint event. The model does not retain which participant originally started the collaboration, so that event explicitly says **Actor not recorded** for both existing and newly started records.

Draft saves, chat, typing, call summaries, comments, draft uploads and private feedback are excluded. The timeline does not fetch their contents. Proposal terms, money, notes, files, proof URLs, reviewer feedback text and raw participant IDs are not included in the activity response. Use the related section to inspect an authorized shared record. The timeline is a projection of existing source records, not a separate tamper-proof audit ledger.

## Read API and pagination

`GET /api/v1/collaborations/{id}/activity?limit=25&before={cursor}`

The endpoint authorizes the saved participants before querying history, returning 401 for no session and 404 for another account. It uses no-store responses. POST/PUT/DELETE are not supported. Reading history does not acknowledge notifications/messages or change agreement/delivery state.

The response contains `items`, `next_cursor` and `limit`. Items have a stable prefixed ID, event kind, title/description, actor role/name, `is_mine`, version, UTC timestamp and related section. No recipient/actor database IDs are returned. Page size defaults to 25 and is bounded at 50. Invalid cursors return a controlled error after authorization.

SQL UNION reads select only event identity, actor, time and version, scoped to the collaboration on every branch. Ordering is newest first by saved creation timestamp, deterministic event rank, then ID. Rank gives agreement confirmation a consistent position relative to an acceptance at the same timestamp. Keyset cursors use that complete sort key, avoiding duplicate/skipped older entries when a new latest event arrives. The API does not load all event records into application memory.

**Load older activity** appends a page. An error preserves previously loaded history and offers **Retry activity** for the failed request. **Refresh activity** returns to the latest page; activity also reloads when the section is reopened. There is no separate live subscription for this view. Switching influencers remounts the view and clears the prior cursor/data. Opening an event's related section preserves the selected influencer. Hash navigation and the allowlisted `?view=activity` sign-in return destination are supported.

## Verification

- **603 backend tests passed / 22 opt-in checks skipped.** Twelve activity API cases cover event/actor/version projection, both viewers, identical retries, private content exclusion, read-only behavior, permissions, tied timestamps, new-event pagination and malformed/bounded requests.
- **187 web tests passed.** New helper checks cover page deduplication and actor labels; Google/password destination checks include the fixed activity view. TypeScript passed; focused activity/navigation lint reports zero errors and one existing image warning in the grouped workspace.
- **One opt-in native PostgreSQL activity check passed.** It uses isolated cloned event tables and rolls back all DDL/data. The real UNION query, timestamp/rank/ID pagination, actor scope and private-field exclusion pass with twelve equal-timestamp records.
- **Nine fresh browser scenarios passed with zero uncaught exceptions**, using actual UI/BFF/API/SQLite. A fixture with 35 saved events exercises initial and older-page failure/retry, duplicate-free pagination, refresh without reading notifications, shared brand/creator IDs, exact related-step navigation, creator switching, outsider denial, reload and a 390px viewport. Desktop/mobile screenshots were visually inspected.
- OpenAPI and TypeScript contracts were regenerated and matched. The development schema remains at migration 0034; no database write or migration is needed to enable activity history. No real-user records, external messages or storage objects were created by these checks.

Step 38 extends this projection with scope proposed/accepted/declined/withdrawn events, attributed to the saved actor. The original agreement confirmation remains separate from each later accepted scope request. These additional source tables require migration 0035; the Step 37 projection itself required no migration. See [Scope changes](SCOPE-CHANGES.md). User-profile edits, deletions of draft material and an independent full audit log remain outside this milestone.

## Repeat the isolated browser check

The seed fixes its database to `/tmp/flenzr-activity-20261126.sqlite` and refuses to overwrite an existing file. Stop any isolated API using it before retaining/removing your own old fixture. Test tokens are stored in mode-0600 `/tmp/flenzr-activity-fixture.json`; the test-only signing secret cannot authenticate to the normal development API.

```sh
cd backend
.venv/bin/python scripts/seed_collaboration_activity.py
DEBUG=false \
DATABASE_URL=sqlite+aiosqlite:////tmp/flenzr-activity-20261126.sqlite \
SUPABASE_JWT_SECRET=activity-regression-signing-secret-not-real \
SUPABASE_JWKS_URL='' CORS_ORIGINS='["http://localhost:3232"]' \
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8332
```

Use an isolated copy of the current web source with `BACKEND_API_URL=http://127.0.0.1:8332` and `APP_ORIGIN=http://localhost:3232`, running on port 3232. Start a dedicated headless Chrome profile with debugging port 9362, as described in [call qualification](CALL-READINESS.md). From the repository root:

```sh
node web/tests/collaboration-activity.browser.mjs
```

The runner closes its browser contexts; stop the isolated API, Next and Chrome processes afterward. For the PostgreSQL check, use only a disposable migrated database:

```sh
cd backend
DEBUG=false DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:55436/postgres \
FLENZR_TEST_ACTIVITY_POSTGRES=1 \
.venv/bin/python -m pytest tests/test_collaboration_activity_postgres.py -q
```
