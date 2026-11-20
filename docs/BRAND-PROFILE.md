# Brand profile persistence — P06.02.01

Implemented 18 November 2026. Open **Brand profile** from the brand workspace header, or visit `/dashboard/brand/profile` while signed in as a brand owner.

## Shipped behavior

The editor loads the signed-in owner's organization through the HttpOnly-cookie account gateway. Brand name, company name and billing email are required; industry, website and description are optional. A missing organization opens an empty setup form and is created on the first save. Existing organizations use `PATCH /api/v1/organizations/me`.

Saving returns the persisted organization. Reloading or signing back in retrieves the saved details. The editor reports loading and save failures, retains unsuccessful edits for retry, disables controls during saving, warns before closing/reloading with unsaved changes, and provides Discard changes. Optional fields can be cleared. No profile data is stored in localStorage.

The PATCH endpoint resolves ownership from the authenticated user, requires the brand-owner role, and accepts only editable fields. Organization IDs, owner, slug, billing status and verification cannot be supplied in updates. Omitted fields stay unchanged. Names, email, field lengths and HTTP/HTTPS website addresses are validated; website URLs containing credentials are rejected. No schema migration is required.

Team membership, company-logo uploads and campaign persistence are separate roadmap tasks.

## Verification

- Full backend suite: **285 passed, 3 skipped** (opt-in PostgreSQL tests).
- Full web suite: **106 passed**.
- TypeScript, focused ESLint and the production build passed.
- The build reported an existing Next.js security advisory. Dependency upgrading is a separate follow-up; this profile change does not resolve that advisory.
- Isolated real browser/API/database flow passed: first save, six-field reload, discard, one injected save failure followed by successful retry, optional-field clearing, 390px mobile layout, and creator access denial. No browser exceptions. These checks used disposable test accounts and SQLite on ports 3211/8312.
- OpenAPI contract and generated TypeScript definitions refreshed.

## Manual check

1. Sign in as a brand and open **Brand profile** in the workspace header.
2. Enter a brand name, company name, billing email and any optional details. Click **Save profile**; confirm the saved message.
3. Refresh. Check the values, then sign out and back in to confirm persistence in your normal session.
4. Change a field and click **Discard changes**. The saved value should return.
5. Try an invalid email or a website without `https://`. Correct the validation error and save.
6. Clear an optional field, save, and refresh. It should remain empty.
7. In another brand account, confirm that the profile shows that account's details. A creator account cannot open this brand page.

The next build slice is **P06.03.01 — Connect creator discovery filters and pagination**.
