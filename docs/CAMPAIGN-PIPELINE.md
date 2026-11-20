# Campaign pipeline totals

P06 Step 12 · P06.08.01 completed 19 November 2026.

The brand dashboard now shows server-calculated totals from saved campaign records, independent of list pagination. `GET /api/v1/campaigns/me/summary` requires the owning brand session and derives organization scope from that session. The browser uses the existing HttpOnly `/api/account/campaigns/me/summary` gateway.

## Count definitions

- Campaign count includes all owned campaigns, including drafts, paused, closed and cancelled campaigns.
- Active count uses active status and an unexpired inclusive UTC end date, matching opportunity eligibility.
- Applications show total, pending, accepted, rejected and withdrawn records.
- Invitations show total, invited, accepted and declined records.
- Applications and invitations are aggregated independently, avoiding a multiplied count when both exist on one campaign. They are separate records, not unique creators or agreements.
- Planned budgets sum declared campaign budgets across all owned campaigns, grouped by currency without conversion. They are not spending, payments, accepted quotes or committed obligations.

The endpoint returns a server retrieval timestamp. It does not fetch social-provider data or send messages. No database migration is required. Read aggregation executes in the database without loading campaign or participant collections. Existing organization/campaign indexes scope the queries.

Totals load on entering the dashboard and refresh after saving a campaign or returning from its activity view. **Refresh totals** explicitly checks for new responses from other users. This slice does not add live subscriptions. Loading disables duplicate refresh, cancelled requests cannot replace newer results, and failed reads show an actionable retry instead of false zero counts. Empty workspaces show a first-campaign prompt.

## Manual test

1. Sign in as a brand with an organization; open the brand dashboard.
2. Check that planned budgets are labelled clearly and currencies remain separate.
3. Create a draft, save it and confirm the campaign count/budget update. Publish it and confirm the active count updates.
4. In a creator session, submit an application. In the brand dashboard click **Refresh totals**; check Pending and the application total.
5. Invite a creator, then accept/decline from that creator's account. Refresh totals and check that the invitation status changes without increasing the total.
6. Accept/reject an application or withdraw a pending one as its creator. Refresh totals and check the correct application status.
7. Pause/close a campaign: it leaves Active campaigns but retains its historical responses.
8. Reload and confirm totals persist. A separate brand must see only its own records.
9. Block the summary request in browser developer tools, refresh and confirm an error. Unblock it and use **Refresh totals** to recover.
10. Check at a narrow mobile width: counts and currency values should wrap without horizontal scrolling.

## Verification

- Backend: **389 passed, 5 skipped** (opt-in database checks). New tests cover all response statuses, mixed currencies, empty totals, owner isolation, unauthorized access, expired/end-today eligibility and independent aggregation.
- Web: **134 passed**; TypeScript and focused ESLint pass.
- Isolated production build passes. Existing dependency security advisory remains a separate maintenance follow-up.
- Production-browser journey against disposable local records passes: real application/invitation creation, explicit refresh, failure/retry, reload persistence, separate-brand empty state, mobile width and no browser exceptions. No real-user records or external provider requests were used.

P06.08 remains partial until actual spending can be derived from a future payment ledger. Next: P07 Step 13, shared collaboration persistence. Creator comparison remains a later P2 feature.
