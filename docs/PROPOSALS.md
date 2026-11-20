# Versioned collaboration proposals

P07 Step 14 · P07.02.01 completed 19 November 2026.

Open a saved collaboration to draft proposed price/currency, deliverables, delivery date, usage rights and an optional note. Drafts save privately to the server. **Review & send** opens an explicit confirmation; sending publishes a numbered version for both participants. A counteroffer is a new version, not an overwrite of prior terms.

## Rules

- Either saved participant can draft and send. A draft belongs to its author; the other participant never receives it through the API. No request can nominate a different author.
- Incomplete drafts can be saved. Sending requires a price between 1 and 10,000,000 (stored as exact integer cents), supported currency, deliverables and usage rights of at least five characters, and a real calendar date today or later in UTC.
- Supported currencies: INR, USD, EUR, GBP, AED, CAD, AUD and SGD. There is no currency conversion. An unsupported source currency does not silently reuse its numeric quote in another currency.
- Sent versions retain their terms, author role and server timestamp. Both participants see the same numbered history, paginated newest first. Private draft revision numbers are separate from shared version numbers.
- Draft writes check the expected private revision and latest shared version. A stale tab cannot overwrite a newer draft. If another proposal arrives, review it, edit/save the draft against the latest version, then send.
- Send checks the saved draft revision and the shared version the author reviewed. Simultaneous sends serialize on the collaboration row: one succeeds, and the other must review/rebase.
- Save retries with identical terms and expected revision are safe. Send uses a UUID request key and payload fingerprint; a retry after a lost response returns the same sent version, including after later versions exist. Reusing a send key with different expectations returns 409.
- Successful send removes only that author's sent draft. The other participant's draft remains private and is flagged stale when based on an older version.
- Saving, sending or revising does not accept an agreement, change the collaboration's Discussion status, create a booking, charge money or send an external message. Refresh proposals checks for changes from the other participant.

There is no sent-version edit/delete API. History is append-only through the service. Future retention/account deletion work must explicitly handle the restrictive references. Legacy local drafts and balances are not imported.

## API

All endpoints require a signed-in saved collaboration participant. Unknown/unrelated collaboration IDs return 404. Cookie traffic uses the existing no-store account gateway with same-origin mutation checks.

- `GET /api/v1/collaborations/{id}/proposals?page=1&page_size=10`: latest shared version, the caller's private draft or null, shared version history, total and pagination. Page size is capped at 50. History is bounded to the latest version observed by the request.
- `PUT /api/v1/collaborations/{id}/proposals/draft`: `{expected_revision, expected_latest_version, terms}`. Use revision 0 for a new draft.
- `POST /api/v1/collaborations/{id}/proposals/send`: `{request_id, expected_draft_revision, expected_latest_version}`. The server loads the saved terms; it does not accept replacement terms in a send request.

Terms: `amount_cents` (nullable in draft), `currency`, `deliverables`, `delivery_date` (YYYY-MM-DD or null), `usage_rights`, `note`. Fields are bounded and unexpected fields are rejected. Shared responses expose author role and whether it is your version, without author user IDs, request fingerprints or private account details.

## Migration

`0018_proposals` adds the collaboration version counter, author-owned draft table and shared revision table. Unique constraints enforce one draft per participant, one shared version number per collaboration, and one send key per author/collaboration. Both new tables have restrictive API-only PostgreSQL RLS. The migration was verified on disposable PostgreSQL and applied to the development database.

## Manual test

1. Start/open a collaboration as the brand/client. Click **Draft proposal** and enter a price, deliverables, date and usage rights. Save an incomplete draft first if desired.
2. Reload: **Your private draft** should return. Open the same collaboration as the creator: the unsent draft must not appear.
3. Complete the fields and click **Save private draft**, then **Review & send**. Check the terms and use **Keep draft** to cancel without sharing.
4. Review again and **Send proposal**. Both accounts should see Version 1 with the same terms and timestamp; the sender's private draft disappears.
5. As the other participant, use **Draft a revision**, change terms, save and send. Both should see Version 2 while Version 1 remains unchanged.
6. Save an unsent draft in one account. Send a newer proposal from the other account. Refresh proposals: the first account's draft remains private, but sending is disabled until it reviews and saves against the new version.
7. Open a draft in two tabs. Save changed terms in one tab, then try saving the stale tab. Expect a conflict with its typed inputs preserved.
8. Attempt sending an incomplete draft or past date: it should remain a draft and show an actionable error.
9. Block a proposals read in developer tools, refresh, unblock and **Retry proposals**. Confirm recovery without losing saved history.
10. Check an unrelated account cannot read/save/send by copying the collaboration URL. At mobile width, check the editor, history and review dialog fit on screen.

Unsaved edits prompt before cancellation, link navigation or page unload. While editing/reviewing, history navigation and proposal refresh are disabled. Cancelling the editor keeps the saved draft; discarding unsaved edits does not delete it.

## Verification

- Backend: **417 passed, 7 skipped** opt-in native checks. Sixteen new API tests cover private drafts, reloads, snapshots, counteroffers, exact retry behavior, stale writes/sends, incomplete/invalid fields, pagination, participant isolation and no implicit agreement.
- Native PostgreSQL: concurrent sends produce one version and one conflict; rebasing preserves both versions. Direct anon/authenticated roles cannot read/write either proposal table even with table privileges.
- Web: **136 passed**, including proposal currency/date and exact-cent checks. TypeScript and focused lint pass; isolated production build passes. Existing Next dependency advisory remains a separate maintenance follow-up.
- Production-browser journey against disposable records passes: saved private draft restoration, draft privacy, lost-response retries after actual save/send commits, shared version history, counteroffer, stale draft guard, history pagination, failed read/retry, outsider isolation and mobile dialog/layout.

Next: Step 15 — both participants explicitly accept the same proposal version and save an immutable shared agreement snapshot.
