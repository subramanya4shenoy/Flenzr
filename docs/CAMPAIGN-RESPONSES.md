# Campaign responses — P06 Step 08 · P06.06.02

Implemented 19 November 2026. Open **Brand workspace → Campaigns → Applications & invitations**, or **Creator → Collabs → Campaign activity**.

| Record | Account | Pending actions | Final statuses |
| --- | --- | --- | --- |
| Application | Owning brand | Accept, reject | Accepted, rejected |
| Application | Applicant | Withdraw | Withdrawn |
| Invitation | Invited creator | Accept, decline | Accepted, declined |

Final responses cannot be reversed. An existing application cannot be submitted again after withdrawal. Each application/invitation is an independent record. This slice saves the response only: no agreement, deal, payment, email or notification is created automatically.

Acceptance requires an active campaign whose end date has not passed (inclusive UTC calendar day). Rejecting, declining and withdrawing remain available for pending records after pause, closure, cancellation or expiry. The UI explains when acceptance is unavailable; the API enforces the rule independently.

## Confirmation and concurrency

Choosing an action opens a native modal and fetches the current participant-scoped record. It displays the campaign, participant, saved message, quote/currency and statuses. Keep current status or Escape cancels without writing. The save button blocks repeated submits while busy. A successful response immediately updates the displayed record and removes final-state actions; both participants can refresh to see the persisted status.

The submitted fields are action, expected_status and expected_campaign_revision. The server derives participant scope from the signed-in account. Record/creator/organization IDs, messages and quotes cannot be overwritten through response payloads. Final status checks and a conditional SQL update prevent conflicting responses from both succeeding. Campaign row locking coordinates responses with lifecycle changes on PostgreSQL. A pause/resume cycle also changes the campaign revision, requiring a new confirmation even when its status returns to Published.

Identical retries of a completed response return the saved result without a second update. Competing actions return 409. Reload response fetches the latest state and requires an explicit confirmation again; if the record is now final or the campaign cannot accept, that action is removed. Failed reads/writes offer retry. Tokens remain in the existing HttpOnly gateway cookie, and private reads bypass caching.

## API

Scoped record GET routes extend all four [activity list routes](CAMPAIGN-ACTIVITY.md) with `/{record_id}`. A record outside the account scope returns 404.

POST response routes:

- `/api/v1/campaigns/me/applications/{record_id}/respond`: brand accept/reject, expected_status `pending`.
- `/api/v1/campaigns/creator/applications/{record_id}/respond`: creator withdraw, expected_status `pending`.
- `/api/v1/campaigns/creator/invitations/{record_id}/respond`: creator accept/decline, expected_status `invited`.

Bodies forbid extra fields and require expected_campaign_revision >= 1. The returned activity record includes campaign_revision and campaign_end_date. No schema migration is required; existing campaign revision and API-only RLS migrations remain prerequisites. Published briefs/quotes are not edited by a response.

## Verification

- Full backend: **351 passed, 4 skipped** (opt-in PostgreSQL checks).
- Full web: **121 passed**; TypeScript and focused lint passed.
- Native PostgreSQL concurrency: **1 passed** on a disposable local PostgreSQL 16 instance after applying migrations through `0015`. Covers accept versus withdraw, accept versus decline, acceptance versus pause, and existing revision/privacy checks. At implementation time, the direct database connection was unreachable from this IPv4 network, so the remote PostgreSQL check could not complete. Switching backend/.env to the supplied IPv4-compatible Session pooler on 19 November restored the database query. Local native checks cover SQL locking; the live API is checked separately.
- Production browser checks cover all five actions, confirmation cancellation, failed-save retry, competing response conflicts, lifecycle revision reload/reconfirmation, reload persistence and mobile dialog layout. Production build passes after the existing Next.js advisory reminder; dependency remediation remains separate.

No SMTP, provider API or load-capacity claim is made by these checks.

## Manual checks

Use test accounts and existing records, or the optional API setup in [Campaign activity](CAMPAIGN-ACTIVITY.md). Use separate records for final decisions.

1. As the owning brand, open a pending application and click Accept application. Check the current pitch, quote and campaign. Choose Keep current status; it should remain Pending.
2. Accept and confirm. Expect Accepted immediately with no response buttons. Refresh and verify it remains Accepted. The creator should see the same status after refreshing.
3. Reject a different pending application and verify Rejected persists for both participants.
4. As a creator, withdraw another pending application. Verify Withdrawn persists; it cannot be accepted afterward or submitted again.
5. Open Invitations and accept one invitation, then decline a different one. Confirm the results persist after refresh and final actions disappear.
6. Open a pending application in two browser sessions: the creator's Withdraw dialog and brand's Accept dialog. Confirm acceptance first. Confirming the stale withdrawal must fail; Reload response should show Accepted and no withdrawal button.
7. Open an Accept dialog, then pause and resume the campaign in another tab. The old confirmation must fail. Reload response and explicitly confirm again.
8. Pause a campaign and refresh pending lists. Acceptance should be unavailable, while reject/withdraw/decline remain possible. Closing or a past end date follows the same acceptance rule.
9. Block a response request using browser network tools. A failed save should keep the dialog open with an error. Unblock and retry. At 390px, verify the entire modal, close button and both footer buttons fit.
10. A different brand/creator must not be able to read or respond to these records by copying their IDs.

Step 09 is complete: [Campaign invitations](CAMPAIGN-INVITATIONS.md). Step 10 is complete: [Campaign opportunities](CAMPAIGN-OPPORTUNITIES.md). Step 11 is complete: [Private brand shortlists](SHORTLISTS.md). Next: **P06 Step 12 · P06.08.01 — Real campaign application and invitation pipeline totals**. The creator opportunity board and application form are now available in [Step 10](CAMPAIGN-OPPORTUNITIES.md).
