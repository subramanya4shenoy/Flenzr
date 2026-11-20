# Creator discovery — P06.03.01

Steps P06.03.01–P06.03.03 implemented 19 November 2026. Open **Brand workspace → Creator Discovery**.

## Behavior

Brands can combine a name, handle or bio search with free-text niche and location filters. Search is case-insensitive, waits 300ms after typing, and runs against the API. Changing any filter resets to the first page. Older requests are cancelled and cannot replace the latest result.

Results show 12 creators per page with filtered totals, Previous/Next controls, and public media-kit links. Loading, failed searches with retry, an empty directory and no matching results have separate states. The previous Invite alert has been removed; brands can open the media kit to start the existing enquiry flow. Unknown ratings stay “No reviews yet”; prices and audience counts are not invented.

`GET /api/v1/discovery/creators/page` returns `items`, `total`, `limit`, and `offset`. It applies the same filters to the count and item queries, excludes inactive accounts, and orders by verification, rating, then unique creator ID to keep ties stable. SQL wildcard characters in search text are treated literally. Page size and query lengths are bounded and validated. The legacy `/discovery/creators` list response stays compatible.

The browser uses a same-origin `/api/discovery/creators` gateway with a fixed upstream path, allowlisted query fields, a request timeout and no-store responses. This remains a public-data endpoint, with an explicit public policy in the route-access test. Responses expose only the existing public creator schema.

Discovery uses saved profile data and does not contact social providers or refresh analytics. Saved audience ranges and freshness are now included; P06.03 is complete. Offset pagination suits this directory slice; this verification does not establish production load capacity or cover changes to directory rankings between separate page requests.

## Verification

Full backend suite: **308 passed, 3 skipped** (opt-in PostgreSQL checks). Full web suite: **109 passed**. TypeScript, focused lint (no errors) and the production build passed. OpenAPI and generated TypeScript contracts were updated. The existing Next.js security advisory remains a separate upgrade follow-up.

- Backend tests cover multiple pages and stable ties, combined filters and totals, inactive-account exclusion, public-field boundaries, literal handle searches, empty results, rating filters and invalid parameters.
- Web checks cover query encoding, cancellation signals, error propagation, fixed gateway routing and HTTP status preservation.
- An isolated browser/API/database flow with 15 test creators verified 12+3 distinct results, filter reset and combined results, real media-kit URLs, empty-state clearing, injected search failure/retry, and a 390px viewport without overflow or browser exceptions.

## Manual check

1. Sign in as a brand. Open **Creator Discovery**.
2. Search a known creator by name or handle. Confirm the results and count update.
3. Add a niche and location. Confirm all filters apply together. Clear them to restore the directory.
4. With more than 12 matching creators, use Next and Previous. Confirm distinct pages and correct ranges.
5. Change a filter while on page two. The results should restart at page one.
6. Search a nonexistent name. Confirm the no-matches state, then click Clear filters.
7. Open a creator’s Media kit. Confirm it opens that creator’s public page in a new tab.
8. Check the page on a narrow/mobile screen. Filters and cards should fit the viewport.

## Connected-network filtering

The **Connected network** selector supports Instagram, YouTube, Facebook Pages, X and LinkedIn, and combines with the other filters. Selecting a network resets to page one. Clear filters restores All networks. Result cards list the creator’s saved authorized networks.

A matching saved account and encrypted authorization record are required; entering a handle or having a verification/connected badge alone is insufficient. Known expired Instagram, Facebook and LinkedIn authorizations are excluded. YouTube and X may stay eligible with a saved refresh token. Instagram unified authorizations without an expiry follow the existing connection rules. Removing an account or its credentials removes eligibility. Multiple accounts on the same network count as one creator. These are saved authorization states, not live provider revalidation; revoked tokens cannot be detected until an authorized connection operation reports that change.

Filtering happens in SQL before counting and pagination. Public results expose only network names, never provider IDs, authorization metadata or tokens. No schema migration is required.

Additional verification: all five predicates ran against production PostgreSQL in read-only queries. Separate PostgreSQL temporary fixtures checked additional-account matching, network badges and duplicate elimination; the transaction was rolled back. Backend tests cover manual/stale handles, orphan credentials, pending flows, expiry, refresh tokens, disconnects, combined filters and unsupported networks. Provider-client construction is blocked in the network regression test. The browser checks cover selecting networks, correct totals, badges, page reset, combined location filters, empty results, clearing and a 390px mobile layout.

To test manually: choose a network with an authorized creator account, confirm its badge and media-kit link, combine it with a location or niche, then select All networks or Clear filters. A manually entered handle should not qualify as connected.

## Saved audience ranges and freshness

Select a network, then set Minimum and/or Maximum audience counts. YouTube uses subscribers; the other networks use followers. Both bounds are inclusive, including a genuine count of zero. Last saved can be Any date, Past 7 days, Past 30 days or Past 90 days. Changing any filter resets to the first page; clearing the network clears its audience filters.

The count is the **largest connected account on the selected network**, rather than a sum of potentially overlapping audiences. For equal counts, the most recently saved snapshot wins. The card shows the same count used by filtering, its provider source and saved date. No audience identities, provider IDs, handles or credentials are added to the public audience summary.

Unknown/hidden counts remain unavailable. They are included when browsing without audience criteria and excluded once an audience range or freshness filter is applied. Missing or future save timestamps display “Update date unavailable” and cannot match freshness filters. Known counts with an unknown date can still match a range. Negative counts, strings, fractions, booleans and values above the supported bound are ignored. An invalid range produces an inline error; the API independently validates ranges and requires a network for audience criteria.

The SQL count and page queries apply the same rules before pagination. Freshness is evaluated for the largest account’s snapshot: a smaller but more recently saved account cannot make an older largest account qualify. Data comes exclusively from existing authorized connection snapshots; discovery does not refresh statistics, decrypt tokens or contact providers. Provider revocations still cannot be detected without a later authorized connection operation. No database migration is required.

Additional checks cover zero vs unknown/hidden counts, old/missing/future dates, multiple-account selection and ties, invalid stored numbers, range validation, filtered totals and pagination. Native PostgreSQL temporary fixtures verify numeric handling, largest-account selection, freshness and summaries; the transaction is rolled back. Production-browser checks cover ranges, source/date labels, freshness, invalid-range recovery, clearing network-dependent filters, hidden counts, zero counts and mobile layout. The full backend run retains three skipped opt-in PostgreSQL tests; the audience PostgreSQL checks were run separately.

### Manual audience check

1. Open Brand workspace → Creator Discovery and choose a connected network.
2. Enter a minimum and maximum that include a creator’s saved count. Confirm the result shows that count, source and saved date.
3. Select Past 7 days. Older or undated snapshots should no longer match. Choose Any date to restore them.
4. Enter a minimum above the maximum. Confirm the inline error, then correct it.
5. Clear the network. Audience inputs and freshness should reset and become disabled.
6. If a network hides its count or does not provide it (such as LinkedIn sign-in), confirm Audience unavailable. A real zero should show 0 and remain searchable with Minimum = Maximum = 0.

Next: **P06 Step 05 · P06.05.01 — Persist campaign drafts and edit them**.

## Creator table

Discover uses a dark, compact table with one row per creator. Columns show profile photo/name, connected-network icons, total saved audience, row actions and the public media-kit link. Missing photos use initials. Clicking a non-interactive area of the row, pressing Enter on the focused row, or following the name/media-kit link opens that creator’s media kit.

Hover or focus a network icon to see its exact saved follower/subscriber count, source and saved date. On touch screens, tap an icon. Tooltips render outside the scrolling table so they are not clipped. Audience unavailable remains distinct from a real zero.

Total audience adds the available largest-account snapshots across all connected networks, including YouTube subscribers. It does not estimate unique people or add multiple accounts on the same network. A plus sign identifies a partial total when another connected network lacks a count; the tooltip explains what is missing. All-unknown counts display a dash. Choosing a network filter highlights its icon without changing the overall-total basis.

Invite to Offer and Save to shortlist appear on row hover or keyboard focus and remain visible on touch screens. These actions and network buttons do not trigger row navigation. The real invitation/shortlist dialogs are retained. On narrow screens, the table scrolls horizontally inside its container. Semantic headers provide a basis for future columns and sorting; this change does not add sorting controls. Existing search, filters and pagination remain in place.

Checks cover aggregation with known/zero/unknown/partial values, per-network tooltip contents, focus/hover actions, invitation/shortlist dialogs, row media-kit navigation and mobile overflow. TypeScript, focused lint and the discovery/shortlist tests pass.
