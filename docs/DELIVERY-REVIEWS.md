# Delivery review and revision requests

P08 Step 17 · P08.02.01 completed 19 November 2026.

The saved brand/client can approve the latest delivery version or request revisions with feedback. Both participants see the same saved decision, feedback and server review time beside that delivery. Older decisions stay in history and are labelled as belonging to an earlier version.

## Review rules

- Only the brand/client user saved on the collaboration can review. A creator cannot review their own submission, even if their account has additional brand roles. Unrelated users receive 404.
- A review targets one exact delivery ID and expected latest version. The dialog reloads the latest submission before confirmation; the server checks again when saving.
- Revision requests require at least five characters of feedback. Approval feedback is optional. Feedback is plain text, capped at 5,000 characters.
- Each submitted version has one fixed decision: Approved or Revisions requested. It cannot be flipped or edited later; changes to work are submitted as a new delivery version.
- A newer submission starts unreviewed. An earlier approval or revision request does not apply to it.
- Reviews and submissions lock the same collaboration row. If a newer submission commits before review, the stale review is rejected. If review commits first, it remains attached to that earlier version and the newer work is still unreviewed.
- A UUID request key and normalized payload fingerprint preserve the original decision/time after a lost response. Exact retries acknowledge that historical decision even after newer submissions exist, without applying it to newer work. Reusing a key for different details returns 409.
- PostgreSQL prevents updates and deletion of saved review rows. The API has no review-edit/delete endpoint.
- Review does not rewrite submission contents or agreement terms, mark the collaboration complete, publish content, charge money or send an external message.
- Structured revision limits are now supported for explicitly agreed allowances; see [Revision allowance](REVISION-ALLOWANCE.md). Free-text agreement wording is not automatically parsed into limits. Publishing proof, cancellation and payment rules remain separate tasks.

Only stored links/notes are fixed; remote file contents and permissions can change independently. The reviewer must open the actual shared work. The application does not fetch or certify external contents.

## Interface

In **Collaboration → Deliveries**, the latest unreviewed version shows **Approve version N** and **Request revisions for version N** only for the saved brand/client. The dialog shows the actual latest title, notes and links, then asks for feedback and explicit confirmation.

**Keep reviewing** closes without saving. After a write attempt, feedback is held fixed so retrying cannot accidentally change an ambiguously saved decision. If a conflict occurs, close and refresh deliveries to inspect the current work/decision. Both participants use **Refresh deliveries** to see updates; no live subscription was added.

Creators see requested changes with guidance to submit a new version. Reviewed versions no longer show review actions. Decisions on older versions remain accessible by opening the relevant history entry.

## API

POST /api/v1/collaborations/{id}/deliveries/{delivery_id}/review accepts:

    {request_id, expected_latest_version, action: "approve" | "request_revision", feedback}

The receipt includes id, delivery_id, version, decision, feedback and reviewed_at.

GET /api/v1/collaborations/{id}/deliveries now includes can_review and each version's review (null before review).

The receipt omits reviewer user IDs, request keys and payload fingerprints. Reads use one outer join for paginated submission/review data. The existing HttpOnly account gateway retains same-origin mutation checks and no-store reads.

## Migration

0021_delivery_reviews adds a review table, reviewer/collaboration/submission references, one-review-per-delivery and request-key uniqueness, valid-decision constraint, API-only PostgreSQL RLS, and an immutable review trigger. It was verified on disposable PostgreSQL and applied to the development database. Tests did not create reviews for real users.

## Manual test

1. Complete a shared agreement and submit Version 1 as the creator.
2. Open the collaboration as the saved brand/client. In Deliveries, inspect its notes and links, then click **Request revisions for version 1**.
3. Verify **Keep reviewing** saves nothing. Reopen and try sending without useful feedback: the form should show validation and preserve inputs.
4. Enter requested changes and click **Send revision request**. Both accounts should see Revisions requested, feedback and review time after refreshing.
5. As the creator, use **Submit a new version**. The earlier request stays on Version 1; Version 2 starts awaiting review.
6. As the brand/client, open **Approve version 2**, inspect the latest work, optionally add feedback and **Confirm approval**. Both should see Approved for Version 2. Collaboration status remains Agreed until the separate completion action is implemented.
7. Keep a review dialog open while the creator submits a newer version. Saving the old review must conflict without approving the newer work.
8. Open review dialogs in two brand tabs. Save a decision in one, then attempt another decision from the other: it must not overwrite the saved review.
9. Simulate a failed response after a review write and retry the same decision. IDs/times remain unchanged with only one decision.
10. Check history pagination, reload, failed fresh-review read and **Reload review**, mobile dialog fit, creator-only lack of review buttons, and unrelated-account rejection.

## Verification

- Backend: **452 passed, 10 skipped** opt-in native checks. New API checks cover both decisions, shared receipts/history, required feedback, exact retries, stale versions, final-per-version decisions, reviewer isolation, field validation and unchanged agreement/status.
- Native PostgreSQL: identical concurrent reviews create one decision; competing decisions produce one success and one conflict; submission/review races never approve newer work implicitly. Browser roles cannot read/write reviews, and saved reviews reject UPDATE/DELETE.
- Web: **140 passed**; TypeScript and focused lint pass; isolated production build passes. Existing Next dependency advisory remains a separate maintenance follow-up.
- Production-browser checks with disposable accounts pass: fresh-read retry, reviewer-only actions, cancel/feedback validation, lost-response retries for both actions, creator revision cycle, stale submission/review rejection, no inherited approval, paginated history/reload, unchanged agreement/status and mobile/privacy.

Step 18 is now implemented: see [Collaboration completion](COMPLETIONS.md) for final approved work, shared completion receipts and closed submissions/reviews.
