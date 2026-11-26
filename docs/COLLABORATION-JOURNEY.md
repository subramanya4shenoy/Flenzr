# Full creator-to-brand journey regression

The current multi-creator workflow passed isolated verification on **26 November 2026**. The earlier 20 November direct-enquiry report remains below with its original results.

## Step 32 result · 26 November 2026

**P13.03.01 complete for the isolated development workflow.** A fresh uninterrupted run used a brand, two creators and an outsider against the current Next.js UI, cookie gateway, actual FastAPI service and disposable SQLite persistence. No application API, message stream or storage response was mocked. Deliberate failure cases intercepted requests only to inject failures. A supplementary pass covered history/unread/error recovery and light-theme mobile activity.

| Current check | Result |
| --- | --- |
| Campaign with public/private Offers; publication; signed-out public access and private outsider denial | Passed |
| Batch creator selection; one failed invitation retained for retry; independent saved invitations | Passed |
| Two private pitches/quotes; brand counter and creator acceptance; separate collaboration starts | Passed |
| Offer stays open after selection; application remains unclaimed until both accept the same proposal | Passed |
| Grouped Offer → section → creator; creator counterproposal; stale-version acceptance rejected | Passed |
| Separate agreed prices/deadlines, printable agreement sheets and unchanged agreement hashes | Passed |
| Real private Supabase WebM upload; draft download denied to brand before submission; video playback after submission | Passed |
| File-specific timestamped comment, general reply, resolve, author-only deletion and outsider denial | Passed |
| Comments leave formal review unchanged; revision allowance enforced; v2 approved without inheriting v1 decision | Passed |
| Proof recording/brand confirmation; completion; private feedback from both sides on both collaborations | Passed |
| Second creator completes approved work without an invented publishing-proof prerequisite | Passed |
| Real SSE text/typing/reactions/read receipts; saved messages reconcile after abrupt test-worker restart | Passed |
| Unsent draft preserved across reconnect; exact message retry reuses saved ID | Passed |
| Per-creator unread counts reconcile; older-history/latest navigation; grouped-read failure/Retry | Passed |
| Call invite/decline/cancel, two-way synthetic audio/video, end propagation and denied media permission | Passed on one host |
| Grouped completion/feedback totals; outsider and cross-creator API/UI denial; saved applicant DPs | Passed |
| Calendar for all three roles, proof/campaign/activity at 390px; light-theme mobile activity | Passed |
| Uncaught browser exceptions in successful runs | 0 |
| Default backend suite | 575 passed, 18 opt-in checks skipped |
| Web unit suite | 165 passed |
| Selected native PostgreSQL checks | 13 passed |
| TypeScript / focused chat-call ESLint | Passed / 0 errors, 2 existing image-element warnings |

### Defects found and fixed

1. **Missing database privacy boundary:** the new read-marker, reaction and delivery-comment tables lacked RLS. Migration `0033_private_chat_and_comments` adds the same restrictive API-only policy used by older collaboration tables. Native tests grant a browser-like role SELECT/INSERT/UPDATE/DELETE and verify no private reads or writes succeed, while the trusted owner retains access. Upgrade, downgrade and re-upgrade passed in the disposable PostgreSQL cluster.
2. **Missed replies after reconnect:** the SSE `ready` handler restored presence but did not reconcile persisted history. It now reloads history/receipts and refreshes group summaries on connection without clearing the draft or history cursor. The browser test genuinely kills and replaces its isolated API worker while a creator is offline; it then verifies the missed saved reply appears automatically.
3. **Hidden permission error:** the call UI could hide a local media-permission failure once remote video arrived. An independent alert now keeps that error visible; the denied-permission test verifies it alongside received remote media.

An additional pre-existing onboarding edge case was recorded as **P06.01.01**: a different brand using the same organization name can hit the unique generated slug and receive 500. The seed helper uses a unique name for repeatability. This was subsequently fixed and verified in Step 33; see [Brand onboarding](BRAND-PROFILE.md). The historical Step 32 result does not silently absorb the later fix.

The older native messaging fixture was also updated to clone the new read/reaction tables into its isolated schema instead of accidentally writing through their public-table foreign keys. The first native attempt lacked the `anon`/`authenticated` roles required by the existing tests; creating those roles only in the disposable cluster resolved the environment setup failure. No fake Supabase realtime schema was installed.

### Boundaries and remaining release checks

- The browser database is isolated SQLite. PostgreSQL concurrency, constraints, immutable records and database privacy were checked separately in a disposable migrated PostgreSQL cluster; this is not PostgreSQL-backed browser coverage.
- Browser sessions use signed test cookies. Supabase Auth/OAuth sign-in, external social analytics and email delivery were not re-tested.
- Storage used the configured private development bucket and small test-owned video objects. Cleanup removed **3 test objects** recorded only in this isolated test database, including earlier diagnostic uploads.
- Calls used synthetic Chrome media devices and one host. Separate networks/TURN, real devices, screen sharing and active-call disconnect/rejoin remain unverified. The Step 32 run used process-local fan-out. Step 34 adds and separately tests shared Redis transport; see COLLABORATION-MESSAGES.md.
- At the Step 32 checkpoint, migration `0033` was verified only on the disposable cluster. The subsequent authorized follow-up applied it to the configured **development** database and verified all three restrictive policies plus anon/authenticated read isolation. Staging/production rollout remains a separate target migration step.
- No production deployment, load test or real-user communication occurred. P13.05 and the remaining operations/integration work remain open.

### Reproduce the current journey

The reusable runner is `web/tests/multi-creator-journey.browser.mjs`; the API seed helper is `backend/scripts/seed_multi_creator_regression.py`.

1. Start a dedicated API worker on **8332** with a **fresh disposable** SQLite file. Override `DATABASE_URL`, `SUPABASE_JWT_SECRET=multi-creator-regression-signing-secret-not-real`, `SUPABASE_JWKS_URL` empty, `DEBUG=false`, and `CORS_ORIGINS=["http://localhost:3232"]`. Retain the configured development Supabase issuer/Storage credentials for the real private-upload check. Capture this isolated worker's PID.
2. From `backend`, run the seed helper with `DEBUG=false PYTHONPATH=. FLENZR_QA_API_PID=<isolated-worker-pid>` and optionally `FLENZR_QA_DATABASE_PATH=<disposable-sqlite-path>`. The default path is `/tmp/flenzr-multi-creator-20261126.sqlite`. It seeds four sessions, a campaign and two draft Offers into the API on 8332. The fixture at `/tmp/flenzr-multi-creator-fixture.json` is mode 0600; it contains test tokens and must not be committed.
3. Serve a separate copy of the current web source on **3232**, with its own `.next`, `BACKEND_API_URL=http://127.0.0.1:8332` and `APP_ORIGIN=http://localhost:3232`. Keep the main 3210/8210 stack untouched.
4. Start a separate headless Chrome with a fresh profile, debugging port **9362** and `--use-fake-device-for-media-stream`. The runner grants/denies camera and microphone permissions within its own contexts.
5. From the repository root, run `node web/tests/multi-creator-journey.browser.mjs`. It records checkpoints in the private fixture and closes its own contexts. Start from a fresh fixture/database for an uninterrupted repeat; checkpoints permit diagnosing a failed stage without rewriting earlier records.
6. The reconnect case intentionally kills the worker PID in the test fixture and starts a replacement on 8332, using the same SQLite path and test JWT settings. The fixture's `api_pid` is updated. Stop that replacement worker during cleanup.
7. Remove only Storage object keys in `collaboration_files` in the disposable SQLite database. Stop the isolated API/web/Chrome and PostgreSQL processes; retain only non-secret reports/screenshots as needed.

Screenshots from this run include `/tmp/flenzr-multi-proof-mobile.png` and `/tmp/flenzr-multi-activity-mobile-light.png`. Local API/browser/native logs are supplementary artifacts, not credentials to publish.

## Automated audit · 26 November 2026

- Full default backend suite: **575 passed, 17 optional checks skipped**. The skipped PostgreSQL/external checks were not run in this audit.
- Web unit suite: **165 passed**. TypeScript and focused guide ESLint passed; both brand and creator guides render all eight steps with current navigation guidance.
- Fixed two test issues discovered by the audit: the public-offer whitelist omitted the implemented `brand_logo_url`, and the comment fixture used fabricated source/proposal foreign keys that failed after SQLite foreign-key enforcement was enabled by another test.
- Regenerated the OpenAPI contract and TypeScript types for current grouped collaboration, chat/read/reaction and delivery-comment endpoints. The generated contract matches FastAPI's schema.
- This automated pass does **not** mark P13.03.01 complete. The dated Step 32 results above now cover the current isolated browser journey and selected PostgreSQL/migration/privacy checks; production network/device/deployment behaviour remains separately scoped.

## Historical result · 20 November 2026

The same collaboration passed through the actual browser UI and authenticated cookie gateway from a public offer to completion, feedback and follow-up messaging. No product defect was found in this run. A reusable runner is saved at `web/tests/collaboration-journey.browser.mjs`.

| Check | Result |
| --- | --- |
| Public media kit → custom offer → creator accepts enquiry → brand starts collaboration | Passed |
| Private conversation between the saved participants | Passed |
| Brand drafts proposal → creator counteroffers → both accept exact version | Passed |
| Saved agreement amount, structured revision allowance and real calendar deadline | Passed |
| Direct private Supabase upload, verification and brand download | Passed |
| Brand requests revision → creator submits new version → allowance exhausted → brand approves | Passed |
| Creator records publishing proof → brand confirms it | Passed |
| Brand completes latest approved work → both leave private feedback | Passed |
| Follow-up messages after completion, reload persistence, unchanged agreement and earlier file history | Passed |
| Outsider denied across agreement, delivery, proof, feedback, conversation and file-download endpoints | Passed |
| Mobile page width and browser exception checks | Passed |
| Backend suite | 547 passed; 16 opt-in native checks skipped in the ordinary run |
| Web unit suite | 150 passed |
| Native PostgreSQL/Supabase checks, explicitly enabled in suitable environments | 16 passed across the runs described below |
| Current OpenAPI contract compared with application schema | Matched |

A final health check found the local development backend stalled during reload. Restarting the existing API restored its health response; the main UI remained available. No application behaviour needed changing. The seed helper now accepts `FLENZR_REGRESSION_SUPABASE_URL` so isolated JWTs can use the real development project's issuer while private uploads use its Storage service. Its default remains the existing example issuer.

## Test boundaries

- Creator, brand and outsider use separate browser contexts and test-only HttpOnly cookies. All application reads/writes use the actual UI, BFF, authorization and isolated SQLite persistence. The browser stack is separate from the running user app on ports 3210/8210.
- This is one continuous flow through a single saved enquiry/collaboration, not a collection of unrelated feature screenshots. Financial proposal amounts are saved as terms; no payment is collected or released.
- The browser upload/download uses the configured development **private Supabase bucket**, with a small disposable file. Only test-owned storage keys are removed after the run.
- Supabase Auth/OAuth sign-in and external social-provider refresh are not repeated. The test seeds signed local sessions. Realtime transport signals are controlled in the browser; database broadcast authorization is checked separately on Supabase.
- The browser portion does not claim PostgreSQL-backed UI coverage: its database is isolated SQLite, while PostgreSQL locking, constraints, RLS and immutable records are tested natively.
- No live email is sent. SMTP inbox delivery, production deployment/load and moderation of public ratings remain outside this checkpoint.

## Native test environments

Fourteen native checks passed in the migrated local PostgreSQL test cluster. The first combined attempt also enabled two Supabase-specific realtime checks there; one requires `realtime.messages`, which is absent on plain PostgreSQL, and its failed cleanup left a pooled connection bound to the previous test loop. These were environment/setup failures rather than an application regression.

The enquiry accept/withdraw concurrency check then passed in a fresh local PostgreSQL test process. The private broadcast/JWT/RLS/rollback check passed separately against the configured Supabase database, with disposable rows/signals enclosed in a rolled-back transaction. All 16 enabled checks were therefore verified in their required environments. Do not enable the broadcast check against vanilla PostgreSQL or replace Supabase's realtime schema with a fake table just to satisfy it.

## Reproduce the browser journey

Use an isolated stack as described in [ENQUIRY-REGRESSION.md](ENQUIRY-REGRESSION.md), with these differences:

1. Run the API on **8312**, using a **fresh** temporary SQLite file and the test signing secret `p05-regression-only-signing-secret-not-real`; set `SUPABASE_JWKS_URL` empty. Keep the configured development `SUPABASE_URL` and server-only Storage key for the upload check. Never change the real app's JWT/database settings.
2. Seed isolated sessions with the matching issuer from the backend directory:

   ```sh
   DEBUG=false .venv/bin/python - <<'PY'
   import os, runpy
   from app.core.config import settings
   os.environ['FLENZR_REGRESSION_SUPABASE_URL'] = settings.SUPABASE_URL
   runpy.run_path('scripts/seed_enquiry_regression.py', run_name='__main__')
   PY
   ```

   The fixture is stored at `/tmp/flenzr-p05-regression-fixture.json` with mode 0600. It contains test tokens; do not commit it or print them.

3. Serve an isolated copy of the current web build on **3211**, using `BACKEND_API_URL=http://127.0.0.1:8312` and `APP_ORIGIN=http://localhost:3211`. Keep the main web `.next` and running app untouched.
4. Start a separate headless Chrome with a fresh temporary profile and remote debugging on **9333**. Node 22 or later supplies the WebSocket client used by the runner.
5. From the repository root, run:

   ```sh
   node web/tests/collaboration-journey.browser.mjs
   ```

   It prints five checkpoint results and closes its test Chrome. The mobile screenshot is written to `/tmp/flenzr-collaboration-journey-mobile.png`.

6. After checks, remove only object keys listed in `collaboration_files` in that isolated SQLite database, using the private Storage adapter. Stop the isolated API/web processes. Do not delete real delivery files or stop the main app.

A fresh seed/database is required for a repeat run. The date comes from the fixture's future delivery date, so the runner does not depend on a hardcoded calendar month.

## Quick manual acceptance

Use a creator account and a separate brand/client session. Send an offer from the creator's public page, accept it, start the collaboration, negotiate/accept terms, submit work, request and deliver a revision, approve, record/confirm publishing proof, complete, and leave feedback from both sides. Exchange a message and reload both sessions. Check the agreed date in Calendar and confirm that the first file/version remains accessible. This is the next useful user acceptance pass before choosing additional scope.


## Step 35 call follow-up — 26 November 2026

Local call qualification is recorded in [CALL-READINESS.md](CALL-READINESS.md). Two isolated browser sessions passed selected TURN UDP and TCP relay, delayed media setup, live controls, relay restart/ICE recovery, simulated screen sharing and permission denial, audio-only screen sharing and invitation/acceptance failures, with zero uncaught exceptions. Generated canvas/audio tracks were used because host synthetic-camera capture hung. This is a separate call check using one isolated API process; it does not rerun or replace the Step 32 full journey or Step 34 multi-worker test. Physical-device and separate-network testing was skipped at the user's request. Staging/production qualification remains open.
