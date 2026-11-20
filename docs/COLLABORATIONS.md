# Shared collaboration persistence

P07 Step 13 · P07.01.01 completed 19 November 2026.

Both participants can explicitly start a shared collaboration from an accepted enquiry, campaign application or invitation. A confirmation explains the Discussion state and opens a new saved record, or reopens the existing record for that source. Accepting a source alone never creates a collaboration.

Brands have a Collaborations header link; creators can use Shared collaborations in Collabs / Campaign activity. Both enquiry views and campaign activity offer Start collaboration on accepted records. `/dashboard/collaborations` lists only the signed-in participant's records, with pagination, loading, empty, refresh and retry states. `/dashboard/collaborations/{id}` restores the same record for either participant after reload.

## API and ownership

- `POST /api/v1/collaborations`: `{source_kind: "enquiry" | "application" | "invitation", source_id: UUID}`. Returns the saved record; identical retries return the same ID.
- `GET /api/v1/collaborations?page=1&page_size=20`: participant-scoped list, total and stable creation-date/ID pagination. Page size is capped at 50.
- `GET /api/v1/collaborations/{id}`: participant-scoped detail; unavailable/unrelated IDs return 404.

Participant IDs come from the saved source and its creator/organization, never the request body. An enquiry sender can be an individual client without a brand organization. Campaign sources resolve the owning organization user. Only those two users can create or read the record; there is no administrator bypass or team-sharing inference. Self-collaborations are rejected.

The source row is locked before conversion, coordinated with existing source response writes. Unique constraints on each source foreign key prevent duplicate conversions, including simultaneous brand/creator requests. New conversions require an accepted source. Already accepted campaigns may have been paused or closed: conversion preserves the existing accepted activity without changing the campaign or implying new availability.

Each record snapshots the source title, brief, requested deliverables, quote, currency, requested date and participant display names at conversion time. Subsequent source/profile changes do not rewrite it. Quotes and dates are labelled as source context and subject to agreement, not accepted proposal terms. Separate accepted application and invitation sources remain separate records, even for the same campaign/creator; different quotes are not silently merged.

No API accepts arbitrary participant IDs, prices, statuses or browser-local deal data. Responses omit participant user IDs, emails, private account data and credentials. Browser calls use the existing HttpOnly account gateway and same-origin mutation checks with no-store reads. Cancelled page requests cannot overwrite a newer page.

## Migration

`0017_collaborations` adds one source reference per record, enforced by a check constraint and source-specific uniqueness; restrictive foreign keys preserve source/participant references. PostgreSQL RLS denies all direct browser-role access; trusted backend sessions enforce participant ownership. There is no deletion or state-transition endpoint in this slice. Future account deletion/retention workflows must handle these references deliberately.

The migration was tested on disposable PostgreSQL and applied to the development database. No real-user collaboration records were created during verification.

## Manual test

1. Use a brand/client and a different creator account. Send and accept an enquiry, or accept an application/invitation on a published campaign.
2. In the accepted source, click **Start collaboration**. Check the explanation, then Cancel: no record should be created.
3. Open it again and confirm **Start collaboration**. Check Discussion, source brief, requested deliverables, quote and requested date.
4. Open the same source as the other participant and start again. It must open the same collaboration ID.
5. Reload the detail and open **All collaborations**. Both accounts must see the saved record.
6. Use an unrelated account to open its URL. It must show unavailable, and its list must not contain the record.
7. Confirm pending/rejected/withdrawn/declined sources have no Start action. Calling the API on those sources must fail.
8. Simulate a failed creation request, retry and verify there is still just one saved record. Block a list/detail read and verify Retry recovers after unblocking.
9. Check a 390px mobile width: the confirmation dialog and cards stay within the screen.

## Verification

- Backend: 401 passed, 6 skipped opt-in database checks. New API checks cover three source types, all unaccepted states, owner isolation, both participants, individual enquiry senders, snapshots, pagination, replay safety, self-collaboration and rejected field overrides.
- Native PostgreSQL: concurrent participant conversion returns one record; RLS prevents direct browser reads/writes; one-source constraint rejects missing sources.
- Web: 134 passed; TypeScript and focused lint pass. Isolated production build passes (existing Next dependency advisory remains a separate maintenance follow-up).
- Browser against disposable records: confirmation/cancel, failed creation/retry, shared participant detail, reload, all three source types, duplicate safety, failed read/retry, unrelated-account isolation and mobile layout pass.

This is a shared discussion record, not a proposal, accepted agreement, booking or payment. Browser-local legacy drafts/balances are not imported or promoted. Remaining local overview metrics, proposal versions, mutual agreement, transition history and local draft migration stay in their respective roadmap tasks.

Next: P07 Step 14 · P07.02.01 — draft and revise versioned proposals within the shared collaboration.
