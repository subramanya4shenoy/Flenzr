# Creator opportunities — P06 Step 10 · P06.07.01

Implemented 19 November 2026. Creators open **Studio → Opportunities**, also accessible at `/dashboard/creator#opportunities`. Reloading that URL restores the tab.

## Workflow

The board lists published campaigns with an end date of today or later (or no end date). It supports search across campaign title, brief and brand name, a niche filter, explicit refresh and pages of 12 records. Results sort newest first with a stable ID tie-breaker. Loading, empty/filter-empty, out-of-range-page and failed-read states are explicit; filter changes reset to page 1 and abort obsolete requests.

Cards identify the brand, niche, deliverables, campaign budget and optional UTC end date. Campaign budget is separate from a creator's proposed quote. View brief & apply loads the current full brief, deliverables and planned dates. Enter a proposed quote in the campaign's currency and an optional pitch, then Review application. Edit application preserves the entered fields; Submit application is an explicit second step. Closing entered unsent content asks before discarding it.

After submission, the saved application appears immediately. View in Collabs opens the existing application tracking view. The owning brand sees the same persisted proposal in Campaigns → Applications & invitations and can accept/reject through the existing response controls. My applications also navigates from the board to Collabs.

Campaign cards display the signed-in creator's saved application status. Reopening an applied campaign displays the saved quote, pitch and current status instead of another form. Final applications, including withdrawn ones, cannot be submitted again. Historical records remain in Collabs after the campaign leaves the open board.

No deal, agreement, payment, email or notification is automatically created. There is no automatic matching, audience requirement or currency conversion in this slice.

## API, eligibility and privacy

- Authenticated creator/admin `GET /api/v1/campaigns/opportunities`: optional q (max 255), niche (max 128), page (1–10,000), page_size (1–50, default 12). Returns items, total, page and page_size.
- Authenticated creator/admin `GET /api/v1/campaigns/opportunities/{campaign_id}`: only currently open campaigns. Draft, paused, closed, cancelled, expired and unknown IDs return 404.
- Existing `POST /api/v1/campaigns/{campaign_id}/apply`: proposed_rate_cents, optional pitch_message and optional expected_campaign_revision. The new UI always supplies the freshly reviewed revision; legacy clients may omit it.

The board requires an existing creator profile. Creator identity comes from the session. The opportunity query projects campaign display fields and public brand name; it joins only the signed-in creator's application. It never includes billing email, credentials, organization ownership IDs or other creators' pitches/quotes. Existing owner-only campaign details remain owner-only. Browser traffic uses the existing HttpOnly cookie gateway and no-store reads. API-only table RLS remains unchanged.

Application quotes must be integer cents between 100 and 2,000,000,000. Optional pitches are trimmed, limited to 5,000 characters and stored as null when blank. Extra payload fields, including creator/status overrides, are rejected. Dates use the inclusive UTC end-day rule from campaign lifecycle; future planned start dates do not prevent a published campaign from accepting applications.

A current campaign row lock coordinates submission with lifecycle changes. An old reviewed revision returns 409; Reload brief preserves entered fields and requires a new review. New submissions to inactive/expired campaigns are blocked independently of the UI. If the campaign is no longer available, the dialog offers retry and navigation to the creator's saved applications.

Identical retries return the original application, including its final status if the brand/creator responded or the campaign closed afterward. A different pitch or quote for an existing creator/campaign returns `409 APPLICATION_EXISTS`. The unique index and integrity-conflict recovery protect simultaneous submissions. Retrying does not edit, reopen or duplicate an application. This changes the previous duplicate-application behavior to a retry-safe result. No migration is required.

## Verification

- Full backend: **379 passed, 4 skipped** (opt-in PostgreSQL checks).
- Full web: **130 passed**; TypeScript and focused lint passed.
- Separate native PostgreSQL: **1 passed** on disposable PostgreSQL 16 with project migrations. Checks concurrent identical applications, changed-proposal rejection, projected own-application joins, literal wildcard search, and existing invitation/lifecycle/privacy concurrency behavior.
- Production build and browser checks on disposable test data: 13-result pagination, published-only visibility, search/niche and empty states, failed-read retry, full brief/other-creator privacy, exact quote validation, review/edit preservation, stale campaign review recovery, failed-submit retry, mobile dialog fit, creator tracking, brand receipt, persisted rejected status and duplicate prevention.
- The installed Next.js security advisory remains a separate dependency follow-up. Verification does not establish production load capacity, email delivery or social-provider availability.

## Manual checks

1. As a brand, publish a complete test campaign. Keep separate test campaigns in Draft, Paused, Closed and Cancelled states; a past end date should also make a campaign unavailable.
2. Sign in as a creator and choose Opportunities. Only eligible published campaigns should appear. Search by title/brand and filter by niche. Clear filters and refresh. With more than 12 results, test Next/Previous.
3. Open View brief & apply. Check the full saved brief, brand, deliverables, budget, currency and dates. Cancel without entering content; no application should be created.
4. Reopen and try a quote such as 12.345. Correct it to 123.45, add a pitch and Review application. Check the exact proposed amount/currency. Edit and verify the fields remain.
5. Review again and Submit application. Expect a saved Pending application and no second submission form. Choose View in Collabs and verify the application remains after refresh.
6. As the owning brand, open that campaign's Applications & invitations. The proposal and quote should appear. Reject or accept it through the existing response dialog. Refresh the creator board and reopen View application to see that status.
7. Apply as a second test creator. Each creator should see only their own saved application; neither should see the other's pitch or quote. The owning brand can see both.
8. Open a review, then pause/resume the campaign in another tab. Submitting the old review should fail. Reload brief, check retained fields, review again and explicitly submit. If the campaign stays paused/closed, it should no longer be available.
9. Block the application POST in browser network tools. The error should preserve the review. Unblock and retry; only one application should be saved. A repeat opening should show the saved application, including after withdrawal.
10. Check at 390px: the brief/form can scroll and the review, close button and footer controls fit. Open `/dashboard/creator#opportunities` directly and reload to verify tab restoration.

Use test accounts: submissions are real saved proposals visible to the owning brand.

Step 11 is complete: [Private brand shortlists](SHORTLISTS.md). Next: **P06 Step 12 · P06.08.01 — Real campaign application and invitation pipeline totals**. Brand financial/pipeline reporting and creator comparison remain separate roadmap work.
