# Campaign lifecycle — P06 Step 06 · P06.05.02

Implemented 19 November 2026 in Brand workspace → Campaigns.

## Behavior

Saved drafts now offer Publish. The confirmation loads the current saved brief and checks readiness: title of 3–255 characters, brief of 10–20,000 characters, niche, deliverables, a budget of at least 1,000 cents (10 currency units), and a three-letter uppercase currency. Dates are optional; an end date cannot precede its start or be before today when publishing/resuming. Dates normalize to UTC. An end date includes the whole UTC calendar day. Incomplete drafts offer Edit draft; publishing stays disabled until ready.

| Current status | Available actions |
| --- | --- |
| Draft | Publish, cancel draft |
| Published (`active`) | Pause, close, cancel |
| Paused | Resume, close, cancel |
| Closed (`completed`) or cancelled | View brief |

Every action requires confirmation; Keep current status dismisses it. Only the owning brand can transition a campaign. Published and paused briefs are read-only; draft editing remains a separate action. Closing and cancelling are terminal. Lifecycle changes leave existing applications, invitations, collaboration records and payments unchanged.

Only active campaigns whose end date has not passed appear in public explore and accept new applications/invitations. Past-end-date campaigns retain their saved status and show an explanatory hint in the owner list. Resume rechecks readiness. This feature does not add scheduled publication or automatically change stored statuses when dates pass.

`POST /api/v1/campaigns/{id}/transition` takes action, expected_revision and expected_status. Atomic conditional updates prevent stale actions from overwriting changes. Identical immediate retries return the saved result. Conflicts require Reload campaign and explicit confirmation again; failed requests offer retry. Applications and invitations lock the campaign row while checking eligibility, so their creation is coordinated with lifecycle transitions.

The legacy `POST /api/v1/campaigns` remains create-and-publish and now enforces the same readiness rules. This intentionally tightens that API contract. Old incomplete published records can still be paused, closed or cancelled; resuming requires readiness, and published brief editing is not included in this slice.

## Deployment and verification

No new migration is required. Existing migrations `0014_campaign_revision` and `0015_campaign_api_privacy` must be applied; see [Campaign drafts](CAMPAIGN-DRAFTS.md). Direct Supabase anon/authenticated campaign-table access remains denied; clients use the authorized API.

- Full backend suite: **338 passed, 4 skipped** (opt-in PostgreSQL checks).
- Separate native PostgreSQL check: **1 passed**, covering competing publication/edit requests, application row locking, revision checks and existing database privacy/concurrent draft cases in a disposable schema.
- Full web suite: **115 passed**; TypeScript and focused lint passed.
- Production build passed. The installed Next.js version still reports a security advisory; dependency remediation remains a separate follow-up.
- Production browser with disposable database/accounts passed readiness → edit → publish, cancelled confirmation, failed-request retry, pause/resume/close, public filtering, stale-action reload/reconfirmation, cancellation and other-brand denial. A 390px confirmation was inspected with no overflow or browser exceptions.

These checks do not establish production load capacity, social-provider availability or SMTP deliverability.

## Manual check

1. Sign in as a brand, create a title-only draft and click Publish. Confirm the checklist explains missing fields and publishing is disabled.
2. Choose Edit draft; add a brief, niche, deliverables and budget. Save and reopen Publish.
3. Choose Keep current status. The campaign should remain a private draft.
4. Publish and confirm. It should display Published and appear in public opportunities (`GET /api/v1/campaigns/explore`).
5. Pause and confirm: it disappears publicly and rejects new applications/invitations. Resume restores eligibility.
6. Open a draft's Publish dialog in one tab, save edits in another, then confirm in the first. Expect a conflict; Reload campaign must show the updated brief and require confirmation again.
7. Close a published campaign. Expect Closed, no further lifecycle actions, and no public listing. Existing applications/invitations remain stored.
8. Create another draft and cancel it. Expect Cancelled and no further lifecycle actions. Check a separate brand cannot see or change either private record.
9. Repeat a confirmation at mobile width; all content and buttons should fit.

Step 07 is complete: [Campaign application and invitation lists](CAMPAIGN-ACTIVITY.md). Step 08 is complete: [Campaign responses](CAMPAIGN-RESPONSES.md). Step 09 is complete: [Campaign invitations](CAMPAIGN-INVITATIONS.md). Step 10 is complete: [Campaign opportunities](CAMPAIGN-OPPORTUNITIES.md). Step 11 is complete: [Private brand shortlists](SHORTLISTS.md). Next: **P06 Step 12 · P06.08.01 — Real campaign application and invitation pipeline totals**.
