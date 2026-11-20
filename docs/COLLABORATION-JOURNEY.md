# Full creator-to-brand journey regression

Verified on **20 November 2026**, after the private messaging milestone. The numbered build queue remains at 26 completed tasks; this is a regression checkpoint, not another feature step.

## Result

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
