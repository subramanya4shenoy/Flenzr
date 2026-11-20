# P05 creator–brand regression

Regression date: **18 November 2026**. Scope: the complete enquiry workflow, including deadlines, read state, notifications, withdrawal, submission protections and email retry handling. This closes the P05 development exit gate; it does not assert production social-provider approval, SMTP deliverability or a load-tested connection capacity.

## Results

| Check | Result |
| --- | --- |
| Entire backend suite | 273 passed; 3 PostgreSQL-only checks skipped in the ordinary run |
| PostgreSQL integration checks, run explicitly | 3 passed: private broadcast/RLS/rollback, concurrent decision, concurrent sender cooldown |
| Entire web test suite | 104 passed |
| TypeScript and focused enquiry/notification ESLint | Passed |
| Production Next.js build in an isolated source copy | Passed |
| Exported OpenAPI versus current application schema | Matched |
| Real UI + cookie gateway + isolated SQLite API, separate browser contexts | Passed |
| Test mail sink, injected delivery failure and retry | Passed; no real emails sent |

The backend suite initially exposed an outdated LinkedIn test expectation. A manually saved LinkedIn handle already returns `connected: false`; the regression assertion now checks that field explicitly. No LinkedIn connection behavior was changed.

## Browser coverage and limits

`web/tests/enquiry-journey.browser.mjs` exercises the actual public media kit, brand workspace, creator workspace, notification center and protected enquiry pages. Creator, brand and outsider use separate browser contexts and HttpOnly session cookies. All application data requests pass through the actual cookie gateway, role checks, participant-scoped API and SQL persistence. It verifies:

1. Custom enquiry submission with budget and preferred date; creator inbox/bell update.
2. Explicit opening and unread acknowledgement; creator budget counter.
3. Brand notification, failed notification acknowledgement/retry and exact-enquiry link.
4. Brand acceptance; reload; complete response history; date preserved as requested.
5. Duplicate original submission stays blocked even after the budget was countered.
6. Outsider cannot read or withdraw another enquiry, or see its notifications.
7. Package request uses server-stored package price and requested deadline.
8. Cancelling withdrawal confirmation leaves the request pending.
9. Withdrawal preserves its reason/history; a creator acceptance from an older open dialog conflicts.
10. Creator reload/read state and mobile enquiry/notification layout; no browser exceptions.

Only the realtime transport signals and one deliberately failed acknowledgement are controlled in this browser runner. It does not forge API data or bypass the gateway. Supabase private-channel authorization, database-trigger behavior and rollback semantics are checked separately against real PostgreSQL. This separation avoids using personal sessions or creating production Supabase Auth accounts. Existing unit/browser checks also cover countdown expiry, malformed/past dates, same-ID retry recovery, failed enquiry reads, pagination totals, expired mail leases and foreground polling/reconnect recovery.

`backend/scripts/check_enquiry_regression_mail.py` runs only against the disposable SQLite database and sink directory below. It injects one delivery timeout, drains the other due messages, advances that test retry time, and verifies delivered states, stable capture filenames and one outbox entry per notification. Delivery-to-inbox is not tested: the development sink intentionally captures mail locally.

## Repeat the checks

Run normal suites from the repository:

```sh
cd backend
env DEBUG=false .venv/bin/python -m pytest -q
# With migrated Supabase PostgreSQL and today's Realtime message partition available:
env DEBUG=false FLENZR_TEST_REALTIME_POSTGRES=1 .venv/bin/python -m pytest tests/test_enquiry_realtime_postgres.py -q

cd ../web
node --test tests/*.test.cjs
npx tsc --noEmit
npx eslint src/components/enquiries src/components/notifications src/app/api/enquiries src/app/dashboard/enquiries src/app/dashboard/notifications src/lib/enquiries.ts src/lib/enquiry-live.ts src/lib/notifications.ts tests/enquiry-journey.browser.mjs
```

For the browser journey, use a **fresh disposable SQLite file** at `/tmp/flenzr-p05-regression.sqlite`, ports **8312/3211**, and a separate Chrome profile/debug port **9333**. Do not point the fixture scripts at a deployed API. The scripts intentionally fix the API target and use test-only JWT credentials; the mail checker additionally rejects any other database or non-sink transport. Re-seeding creates fresh account identities so previous requests do not consume the new run's allowances.

Start an isolated API in a separate terminal:

```sh
cd backend
env DEBUG=false DATABASE_URL=sqlite+aiosqlite:////tmp/flenzr-p05-regression.sqlite SUPABASE_JWT_SECRET=p05-regression-only-signing-secret-not-real SUPABASE_JWKS_URL= SUPABASE_URL=https://example.supabase.co CORS_ORIGINS='["http://localhost:3211"]' NOTIFICATION_EMAIL_TRANSPORT=sink NOTIFICATION_MAIL_SINK=/tmp/flenzr-p05-mail-sink .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8312
```

Prepare an isolated web copy from the repository root (macOS clone-copy example; ordinary copying is also fine). Exclude real environment files:

```sh
P05_ROOT=$(mktemp -d /tmp/flenzr-p05-regression.XXXXXX)
mkdir "$P05_ROOT/web"
rsync -a --exclude=node_modules --exclude=.next --exclude='.env*' --exclude='*.tsbuildinfo' web/ "$P05_ROOT/web/"
cp -cR web/node_modules "$P05_ROOT/web/node_modules"
env DEBUG= BACKEND_API_URL=http://127.0.0.1:8312 NEXT_PUBLIC_API_URL=http://127.0.0.1:8312/api/v1 NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=regression-test-only APP_ORIGIN=http://localhost:3211 node "$P05_ROOT/web/node_modules/next/dist/bin/next" dev "$P05_ROOT/web" --hostname localhost --port 3211
```

In other terminals, seed and launch a dedicated headless browser:

```sh
cd backend
.venv/bin/python scripts/seed_enquiry_regression.py

'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/flenzr-p05-journey-chrome --no-first-run --no-default-browser-check about:blank
```

Run the journey from the repository root, then verify captured mail from `backend`:

```sh
node web/tests/enquiry-journey.browser.mjs
cd backend
env DEBUG=false DATABASE_URL=sqlite+aiosqlite:////tmp/flenzr-p05-regression.sqlite NOTIFICATION_EMAIL_TRANSPORT=sink NOTIFICATION_MAIL_SINK=/tmp/flenzr-p05-mail-sink PYTHONPATH=. .venv/bin/python scripts/check_enquiry_regression_mail.py
```

The browser runner closes its test contexts/browser. Stop the isolated API and web processes afterward; keep the regular services on 8210/3210 running. The fixture JSON contains only test tokens and is written with owner-only permissions. Browser results/screenshots are under `/tmp/flenzr-p05-*`; keep them local or delete them after review. To check a production build, build a separate copy with these same test environment values, so a running dev server's `.next` directory is unaffected.
