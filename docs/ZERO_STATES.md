# Fresh-state cleanup

The development application database was backed up and reset on 20 October 2026.
Two users, two creator profiles, six rate cards, two tracked links, and two user roles were removed. All eleven application tables were verified empty. Supabase Auth identities and Storage objects were not changed.

Account screens run a one-time browser data migration before mounting. It clears legacy `flenzr_` account records, tokens, metrics, portfolios, deals, and balances, preserving the language preference. Subsequent reloads preserve newly entered data. Switching email accounts clears the previous account's browser records.

The UI no longer supplies demo people, campaigns, ratings, audience metrics, bank details, portfolio results, or a fallback public profile. Landing-page creator discovery uses the API; product illustrations contain no sample identities or financial results. Missing performance analytics are shown as unavailable rather than zero, which would imply a measurement.

Google sign-in, booking submission, withdrawals, and payment release do not report fabricated success. Some editing and collaboration tools still use browser-local records; this cleanup does not implement backend collaboration/payment persistence. The subsequent route audit adds credential-backed authentication; see [ACCESS_CONTROL.md](ACCESS_CONTROL.md). Rate suggestions and the offer calculator are estimates, not observed performance.

Checks:
- `cd backend && DEBUG=false .venv/bin/python -m pytest -q`
- `cd web && npm run test:zero-state`
- `cd web && ./node_modules/.bin/tsc --noEmit`
- `cd web && ./node_modules/.bin/next build --webpack`

`backend/reset_test_data.py` defaults to a read-only count. `--execute` backs up application rows privately under `/private/tmp`, deletes them in a transaction, and verifies zero counts. It refuses to run outside the development environment. Use it only for an intentional development reset.
