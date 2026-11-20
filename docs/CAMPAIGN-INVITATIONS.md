# Campaign invitations — P06 Step 09 · P06.06.03

Implemented 19 November 2026. Open **Brand workspace → Creator Discovery**, find a creator and choose **Invite to campaign**.

## Workflow

The composer loads the signed-in brand's saved campaigns and resolves the selected discovery handle to an available creator. Select a published campaign with an end date of today or later (or no end date), enter an offered quote and optional message, then choose Review invitation. Quotes use the selected campaign currency; they are never automatically converted. The review shows the creator, campaign, deliverables, exact quote and message before an explicit Send invitation.

Edit invitation returns to the preserved fields. Closing an unsent form with entered quote/message asks before discarding. Missing brand setup links to Brand profile. With no eligible campaigns, Go to campaigns opens the existing campaign list. Recipient/load failures and duplicate-check failures offer retry.

On success, View invitation opens that campaign's Invitations tab. The creator sees the same record under Collabs → Campaign activity → Invitations and can use the existing accept/decline controls. No agreement, deal, payment, email or notification is automatically created by this feature.

## Retry, eligibility and privacy

Only the owning brand may read existing invitations or send them. A private brand endpoint resolves creator ID/name/handle; the public discovery response does not gain private identifiers. The send API rechecks that the creator exists and its account is active.

The UI checks for a previous invitation when selecting a campaign and again before review. An existing record displays its saved quote, message and current status. Brands can select another eligible campaign from that view. There is one invitation per creator/campaign, including after acceptance or decline; this feature does not reopen or edit previous offers.

The composer sends expected_campaign_revision from the freshly loaded review. A later pause/resume or other lifecycle change rejects the old confirmation; Reload campaigns preserves entered fields and requires review again. Past-end-date, draft, paused, closed and cancelled campaigns cannot receive new invitations. Server checks apply independently of the client.

Identical retries return the existing invitation without inserting or changing it, even if the creator responded or the campaign paused after the original send. A different quote/message for the same creator/campaign returns `409 INVITATION_EXISTS`. A campaign row lock serializes creation with lifecycle changes; the existing unique index and an integrity-conflict recovery path protect concurrent inserts.

## API and deployment

- Brand-only `GET /api/v1/campaigns/invitation-recipient/{handle}` returns id, handle and display_name for an active creator account.
- Owner-only `GET /api/v1/campaigns/{campaign_id}/invitation/{creator_id}` returns the saved invitation or null.
- Existing owner-only `POST /api/v1/campaigns/{campaign_id}/invite` now supports safe retries and optional expected_campaign_revision. Existing API clients can omit the revision; the composer always sends it.

Quotes must be integer cents between 100 and 2,000,000,000. Messages are trimmed, optional, and limited to 5,000 characters; blank messages become null. Payloads forbid extra fields. Browser requests use the existing HttpOnly cookie gateway and bypass caching. No new migration is needed: the unique index and API-only RLS already exist.

## Verification

- Full backend: **365 passed, 4 skipped** (opt-in PostgreSQL checks).
- Full web: **125 passed**, plus TypeScript and focused lint.
- Native PostgreSQL: **1 passed** on a disposable PostgreSQL 16 database with migrations applied; concurrent identical invitation sends return the same row and changed offers cannot overwrite it. Existing privacy, draft and response concurrency checks also pass.
- Production build and browser flow cover no eligible campaigns, eligible-only selection, decimal validation, review/edit preservation, changed-campaign recovery, failed-send retry, mobile fit, creator receipt, duplicate prevention and navigation to Invitations.
- The existing Next.js dependency security advisory remains a separate follow-up. These checks do not establish production load capacity or email deliverability.

## Manual checks

1. Sign in as a brand and publish a complete test campaign. Keep another campaign in Draft or Paused.
2. In Creator Discovery, search for a test creator and click Invite to campaign. Only eligible published campaigns should be selectable.
3. Select the test campaign. Enter 123.45 and an optional message. Review should show the exact amount in the campaign currency, the intended creator and campaign.
4. Choose Edit invitation and verify the values remain. Review again and Send invitation.
5. Check the Saved invitation receipt. Choose View invitation; the campaign's Invitations tab should show the creator, offered quote and Invited status.
6. Sign in as the test creator in another browser/profile. Open Collabs → Campaign activity → Invitations. Refresh and verify the same campaign, quote and message. Decline or accept through the existing confirmation.
7. Reopen Invite to campaign for the same creator/campaign. It should show the existing invitation's current status and provide no second Send action. If another eligible campaign exists, select it to prepare a separate invitation.
8. Open a review, pause/resume that campaign in another tab, then send the old review. Expect a conflict. Reload campaigns, review again and explicitly send.
9. Block the invitation POST in browser network tools. A failed send should keep the review and error visible. Unblock and retry; only one saved invitation should exist.
10. Try an invalid quote such as 12.345, close a filled unsent form, and inspect the modal at 390px. Validation, discard confirmation and all buttons should work without overflow.

Use test accounts: sending stores a real invitation visible to the selected creator. For a brand without published campaigns, verify Go to campaigns; for missing brand setup, complete Brand profile first.

Step 10 is complete: [Campaign opportunities](CAMPAIGN-OPPORTUNITIES.md). Step 11 is complete: [Private brand shortlists](SHORTLISTS.md). Next: **P06 Step 12 · P06.08.01 — Real campaign application and invitation pipeline totals**.
