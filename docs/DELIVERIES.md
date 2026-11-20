# Versioned delivery submissions

P08 Step 16 · P08.01.01 completed 19 November 2026.

After mutual agreement, the saved creator can submit delivery links and notes from the collaboration's **Deliveries** section. The form supports a title, optional notes and up to ten labelled links. **Review delivery** opens an explicit confirmation; **Submit delivery** saves a numbered version visible to both participants.

Earlier submissions remain available through paginated history. Each version preserves its links, notes, agreement reference and server submission time. Both participants can refresh the same history and restore it after reload. Brand/client accounts have read-only delivery access.

## Rules

- A completed mutual agreement and Agreed collaboration are required for a new submission. A pending proposal or one participant's acceptance does not open deliveries.
- Only the creator user saved on the collaboration can submit. Participant IDs, timestamps, status and version numbers cannot be chosen through the body. Unrelated collaboration IDs return 404; the saved brand/client receives 403 on writes.
- Submission requires the saved agreement ID and expected latest delivery version. Another tab's newer submission causes 409 instead of silently creating a competing version. Refresh and review before submitting again.
- A UUID request key and normalized payload fingerprint make an identical retry return the same version after a lost response, including after later versions exist. Reusing the key for changed details returns 409.
- Submitted versions cannot be edited/deleted through the API. PostgreSQL also blocks updates/deletion with an immutable-record trigger. Corrections are new submissions.
- Links must be full HTTPS URLs without embedded login details, spaces, backslashes or control characters. There must be 1–10 labelled links, with duplicate normalized URLs rejected within a submission. Titles are 3–160 characters, labels 1–80, URLs up to 2,048 and notes up to 5,000.
- Links open only on an explicit user click, in a new tab with opener/referrer protection. No remote preview or backend fetch is performed. Flenzr validates link format, not remote availability, contents or sharing permissions.
- Only the stored links and notes are fixed. External file contents and permissions can change independently. Creators must share links the other participant can open.
- Submission does not change agreed terms, mark approval/completion or create payment. Agreed work may still be submitted after its deadline; overdue/review rules are separate tasks.

Unsubmitted form data is local to the open editor, preserved after errors and review cancellation. It is not a server draft. Cancelling or navigating away prompts before discarding entered details; refresh/history controls are disabled while editing. Saved versions persist on the server. Use **Refresh deliveries** to check another participant/tab's updates; no live subscription was added in this slice.

## API

- `GET /api/v1/collaborations/{id}/deliveries?page=1&page_size=10`: participant-only workspace with latest version, agreement ID or null, creator submit permission, shared history, total and pagination. Maximum page size 50.
- `POST /api/v1/collaborations/{id}/deliveries`: `{request_id, agreement_id, expected_latest_version, title, notes, links: [{label, url}]}`. Uses the signed-in saved creator. Returns the saved submission or its exact retry result.

Responses omit creator user IDs, request keys and payload fingerprints. The existing HttpOnly account gateway provides no-store reads and same-origin mutation checks. A submission timestamp is returned explicitly in UTC. History is bounded to the version observed for the request, with newest-first pagination.

## Migration

`0020_deliveries` adds a delivery version counter and `collaboration_deliveries`, with restrictive references to collaboration, agreement and creator user. Unique constraints enforce one version number and one request key per collaboration. PostgreSQL RLS denies direct browser database access, and a trigger rejects updates/deletion of saved submission rows.

The migration was verified on disposable PostgreSQL and applied to the development database. No real-user deliveries were created during testing.

## Manual test

1. Open a collaboration before mutual agreement. Deliveries should explain that both participants must accept the same proposal; no submission form should appear.
2. Complete acceptance in both accounts. Refresh proposals or reload: the creator should see **New delivery submission**, while the brand/client sees a read-only history.
3. As the creator, enter a title, notes and one labelled HTTPS preview/share link. Add/remove an additional link to check the controls.
4. Try an HTTP or JavaScript URL, duplicate URL or missing label. **Review delivery** should show an error without losing valid inputs.
5. Review valid details, then **Keep editing**. Nothing should be submitted yet and the form should remain intact.
6. Review again and **Submit delivery**. Both accounts should see Version 1 after refreshing deliveries. Confirm the links open and the actual sharing permissions allow the recipient access.
7. Use **Submit a new version** with updated links/notes. Both accounts should see Version 2; Version 1 must retain its original details/time. Reload and check persistence.
8. Open two creator tabs based on the same version. Submit from one, then the stale tab. The stale attempt must conflict, preserve inputs and require refreshing/reviewing the saved version.
9. Simulate a failed submission response and retry: there should be one saved version. Block a deliveries read, unblock and **Retry deliveries** to confirm recovery.
10. Try the same URL/API as an unrelated account and attempt a write as the brand: access should be rejected. At 390px width, check the form, links, history and confirmation dialog fit.

## Verification

- Backend: **441 passed, 9 skipped** opt-in native checks. New API tests cover agreement gating, creator-only writes, participant isolation, bounded URL/form validation, exact retries, stale tabs, paginated immutable history and unchanged agreement/status.
- Native PostgreSQL: identical concurrent requests create one version; competing requests based on the same version produce one success and one conflict. Direct browser roles cannot read/write; the trigger prevents update/delete of saved submissions.
- Web: **139 passed**, including URL normalization, unsafe-link/duplicate rejection and field bounds. TypeScript and focused lint pass; isolated production build passes. The existing Next dependency advisory remains a separate maintenance follow-up.
- Production-browser journey with disposable records passes: agreement gating without full reload, creator-only form, link controls, validation, review cancellation, lost-response retry after commit, stale-tab recovery, shared/paginated history, read retry, reload, unchanged agreement, mobile fit and privacy.

Next: Step 17 — brand/client review of an exact submitted version, with approval or a revision request and saved feedback. Secured file attachments, revision-limit rules, publishing proof, completion and payments remain separate tasks.

Step 17 adds brand/client decisions on saved versions: see [Delivery reviews](DELIVERY-REVIEWS.md).

## Private attachments

Step 24 adds private Supabase file attachments alongside delivery links. See [COLLABORATION-FILES.md](COLLABORATION-FILES.md) for limits, access, draft lifecycle, setup and manual verification. Earlier link-only versions and agreement snapshots remain unchanged.
