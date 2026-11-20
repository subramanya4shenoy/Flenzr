# Complete an approved collaboration

P08 Step 18 · P08.08.01 completed 20 November 2026.

The saved brand/client can explicitly complete a collaboration after its latest delivery is approved. Both participants see the completion time and final approved version; list and detail screens show Completed. This completes the first usable enquiry → agreement → delivery → revision/review → completion flow. It does not finish every P08 feature or establish production launch readiness.

## Rules and persistence

- Only the saved brand/client can confirm completion. Creators receive 403; unrelated users receive 404. Identity comes from the session, never from a request field.
- The confirmation reloads the latest work and shows its actual title, notes and links. Cancelling saves nothing. The server independently checks the agreement, delivery ID, approval ID and latest version when confirming.
- Earlier approvals cannot complete newer unreviewed work. A revision request cannot be used as approval.
- Completion and submissions/reviews lock the same collaboration row. If a new submission wins the race, completion fails until that version is approved. If completion wins, a new submission fails.
- One completion receipt per collaboration references its immutable agreement, delivery and approval and records the brand/client actor and server time. The transaction saves both the receipt and Completed status together.
- A UUID request key plus payload hash makes exact retries return the same receipt/time after a lost response. A new request or changed payload against completed work returns 409; refresh shows the saved result.
- Completed collaborations close new submissions, reviews and proposal edits. Exact retries of previously saved submissions/reviews may still acknowledge those historical records; they create no new work or decisions.
- Agreement terms, submissions and review history stay available to both participants. Proposal reads and acceptance replays preserve Completed status.
- PostgreSQL RLS denies direct browser-role access; an immutable trigger rejects updates/deletion of completion receipts. There is no completion edit, undo or delete endpoint.
- Completion does not collect/release money, post content, verify externally hosted files or send email. External link contents and sharing permissions can change independently.

## API

POST /api/v1/collaborations/{id}/complete accepts request_id, delivery_id, review_id, expected_latest_version and confirmed: true. Unexpected fields are rejected. Returns id, agreement_id, delivery_id, review_id, version and completed_at; internal actor/request/hash fields are omitted.

GET /api/v1/collaborations/{id}/deliveries includes collaboration_status, can_complete and completion (null before completion), alongside existing submission history and permissions. Both participants refresh deliveries to fetch changes; this slice adds no live subscription.

Migration 0022_completions was tested on disposable PostgreSQL and applied to the main development database. Browser tests used disposable local accounts and database, without completing real-user collaborations.

## Manual test

1. As the creator, submit work on an agreed collaboration. As the brand/client, approve the latest version.
2. In Deliveries, click **Complete collaboration**. Verify the dialog displays the correct version and shared links.
3. Click **Keep collaboration open**. Confirm the status remains Agreed.
4. Reopen and click **Confirm completion**. Verify Completed status, completion time and final version appear.
5. As the creator, click **Refresh deliveries**. The same receipt appears; new submission and review actions are absent.
6. Reload both accounts and open the collaborations list. Completed persists. Open the agreement and history; they remain unchanged and accessible.
7. Before completing a fresh collaboration, keep its confirmation open while the creator submits a new version. Confirmation must fail. Refresh, approve the new version, then complete it.
8. Test without approval or after a revision request: no completion action should appear. Creator and unrelated-account completion requests must be denied.
9. Simulate a failed response after the server saves completion. Retry in the same dialog: the receipt ID/time must stay unchanged. A separate tab attempting a different completion must conflict.
10. Check fresh-read failure and **Reload final work**, keyboard dismissal, mobile dialog fit, empty/loading/error states and final-work history navigation.

## Verification

- Backend: 455 passed; native checks are opt-in. API coverage includes shared receipts, unchanged agreement, list/detail/proposal status, safe retries, closed writes, stale/unapproved work, actor isolation and explicit confirmation validation.
- Native PostgreSQL: simultaneous completion requests produce one receipt; competing new submission/completion yields one success and one conflict. RLS denies browser roles and the immutable trigger blocks UPDATE/DELETE.
- Web: 140 tests pass; TypeScript and focused lint pass; isolated production build passes. Existing Next dependency advisory remains a separate maintenance follow-up.
- Production-browser flow passes: fresh-read retry, cancel, stale/new unreviewed work, lost-response retry, shared receipt, closed actions, persisted list/detail status, agreement preservation and mobile fit.

Step 19 is now implemented: see [Collaboration calendar](COLLABORATION-CALENDAR.md) for shared deadlines and manual testing. P08 still includes structured revision limits, publishing proof, secure attachments, reminders and moderated feedback.

## Participant feedback

Step 25 adds one private review from each saved participant after completion. See [COLLABORATION-FEEDBACK.md](COLLABORATION-FEEDBACK.md) for visibility, persistence and manual verification. Reviews do not change the completion receipt or publish profile ratings.
