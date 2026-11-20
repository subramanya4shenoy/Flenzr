# Participant feedback after completion

P08 · Step 25 · `P08.08.02`.

Both saved participants can rate their collaborator from **Collaboration → Collaboration feedback** after the brand/client completes the approved delivery. Each participant submits one rating (1–5) and a plain-text comment (10–2,000 characters). The form requires deliberate rating selection, previews the exact text, reloads eligibility and asks for explicit confirmation before saving.

## Visibility and moderation decision

Feedback is visible immediately to **only the two saved participants**. The form explains this before submission. It is not blind feedback and there is no delayed reveal. Each participant can submit independently, with clear Submitted / Not submitted / Awaiting feedback status and a Refresh feedback control.

There is no public feedback route, profile rating aggregation, discovery score update or public publication in this step. The existing creator rating field is not modified. Public ratings remain deferred until an audited moderation/publication workflow exists; this implementation does not claim content has been moderated or approved. Future moderation should preserve the original record and store audited decisions separately. Support/reporting and public moderation are separate roadmap work.

## Authorization and persistence

- The actor comes from the authenticated session and the recipient is computed from the saved collaboration pair. The request cannot choose an author, recipient, role, visibility or moderation result.
- A completed status **and** its saved completion receipt are required. The request pins that receipt; an unrelated or invented completion ID fails with 409. Acceptance, delivery approval or publishing proof alone does not open feedback.
- Unauthenticated requests return 401, unrelated accounts get 404, and self-review is rejected. Changes in general workspace membership do not grant access to another person's collaboration.
- PostgreSQL stores completion, author, recipient, role, rating, comment and server timestamp. The shared response omits internal actor IDs, request keys and hashes. The viewer's `is_mine` flag is computed server-side.
- One review per collaboration/author is enforced by a unique constraint. Completion and feedback use the same collaboration row lock. A request UUID plus canonical payload hash returns the same receipt for an exact retry after a lost response. A second request or changed payload from that author fails with 409.
- The confirmation keeps its request and content fixed after a write attempt. Failed requests retain the exact details for retry. A competing tab cannot overwrite a saved review; closing the draft and refreshing shows the saved record.
- Submitted feedback cannot be edited or deleted. PostgreSQL RLS blocks direct anon/authenticated access; a trigger rejects updates/deletion even through ordinary privileged SQL. There is no user-facing edit/delete endpoint.
- API and BFF responses are `no-store`. Comments render as escaped plain text, never HTML/Markdown. This step adds no email, notification, payment, agreement or delivery side effects.

Migration: `0026_collaboration_feedback`, applied to the development database. Generated OpenAPI and web contracts include:

- `GET /api/v1/collaborations/{id}/feedback`: participant workspace, recipient name, completion reference, eligibility and up to two reviews.
- `POST /api/v1/collaborations/{id}/feedback`: `request_id`, `completion_id`, integer `rating`, bounded `comment`, `confirmed: true`.

## Manual test

1. Open an agreed collaboration before completion. Feedback should say **Opens after completion**, with no Leave feedback button—even if a delivery is already approved.
2. As the saved brand/client, approve the latest delivery and choose **Complete collaboration → Confirm completion**. Feedback opens on the same screen. The creator can use **Refresh feedback** to see eligibility without reloading the page.
3. Choose **Leave feedback**. Try reviewing without a rating or with a short comment: validation should explain what is missing.
4. Select a rating, add a comment, and choose **Review feedback**. Check the recipient, score and text. **Submit feedback** stays disabled until the confirmation box is checked. **Keep editing feedback** preserves the draft and saves nothing.
5. Confirm and submit. The saved review appears with score/time and **Your feedback submitted**. Refresh the page: it remains, and you cannot leave a second review.
6. Open the same collaboration as the creator. Refresh feedback: the brand/client review is visible, while the creator can still leave their own review about the brand/client.
7. Submit the creator's review and refresh the brand/client view. Both see **Both reviews submitted**, with one review marked as their own.
8. In a second tab for the same account, open a confirmation before the first tab submits. After the first succeeds, submitting different feedback in the second must fail. Cancel the stale draft and refresh to view the original review.
9. For an interrupted response, retry in the same confirmation. It must acknowledge the original review rather than creating another one. An unrelated account must receive 404 from the feedback endpoints.
10. Check mobile and keyboard interaction: radio ratings, comment, confirmation checkbox, dialog close and buttons should remain usable. Public profile/discovery ratings should not change.

## Verification

535 backend tests and 149 web tests pass, including API boundaries/validation and feedback helpers. A native PostgreSQL test covers concurrent exact retries, competing reviews, two-participant projection, RLS, unique/range/self-review constraints and immutable rows. TypeScript, focused lint and an isolated production build pass.

The production browser journey verified completion gating and immediate opening after completion, both participants' submissions/status, validation, fresh-read failure/retry, deliberate confirmation/cancellation, committed-response replay, stale-tab rejection, safe text rendering, outsider denial, unchanged agreement and mobile layout. Main UI/backend health checks remain successful.
