# Brand/client confirmation of publishing proof

P08 Step 22 · P08.04.02 completed 20 November 2026.

The saved brand/client can review supplied final post links and explicitly confirm an exact publishing proof version. Both participants see the confirmation and its server time. A newer proof version starts unconfirmed and keeps earlier confirmations in history.

## Rules

- Only the brand/client saved on the collaboration can confirm. Creator requests return 403, and unrelated accounts receive 404. Reviewer identity comes from the authenticated session.
- The proof must be the latest saved proof and reference the current approved delivery. After completion it must match the pinned final delivery. Older delivery/proof versions cannot receive a new confirmation.
- The dialog reloads the current proof before confirmation, displays the exact notes and links, and requires an explicit checkbox. Cancelling records nothing. The server independently checks proof version, delivery eligibility and explicit consent.
- Each proof version has one immutable confirmation. A new proof never inherits it, even when its links match. A newer delivery also prevents confirming old proof; saved acknowledgements remain attached to their original versions.
- A UUID request key and payload fingerprint preserve the original receipt/time after an ambiguous response. Exact retries work after later proof versions exist. Changed request details or a new request against already-confirmed proof return 409.
- Confirmation, proof saves, submissions, delivery review and completion lock the same collaboration row. If new proof/submission commits first, stale confirmation fails. If confirmation commits first, it remains scoped to the old version and the newer proof starts unconfirmed.
- Confirmation can be recorded on agreed or completed collaborations. It does not change agreement terms, links, delivery approval, revision counts, completion or payment state, and does not publish content or send an external message.
- This is the brand/client's recorded acknowledgement after reviewing the supplied links. Flenzr does not automatically verify remote content or account ownership. External posts and sharing permissions can change later.
- There is no confirmation edit/delete/undo endpoint. Corrections to links use a new proof version, which requires a fresh confirmation.

## API and persistence

POST /api/v1/collaborations/{id}/publishing-proof/{proof_id}/confirm accepts request_id, expected_proof_version and confirmed: true. Booleans used as versions, string consent, false consent and extra actor fields are rejected.

The receipt includes id, proof_id, proof_version, delivery_id, delivery_version and confirmed_at. Internal reviewer IDs, request keys and fingerprints are omitted.

GET /api/v1/collaborations/{id}/publishing-proof now returns can_confirm and each proof's confirmation (null before confirmation). History uses a paginated outer join and does not issue one query per confirmation. Only the latest eligible proof offers the action; older confirmation labels name the exact proof/delivery version.

Proof save receipts remain stable for retries. Read the workspace to obtain the current confirmation state. Both accounts use Refresh publishing proof for updates; no new background subscription is added.

Migration 0024_proof_confirmations adds the confirmation table, restricted foreign keys, one-confirmation-per-proof and request-key uniqueness, API-only RLS and immutable trigger. It was tested on disposable PostgreSQL and applied to the main development database. Browser/API tests used disposable accounts and did not confirm real-user proof.

## Manual testing

1. As creator, record publishing proof against the latest approved delivery. As brand/client, click Refresh publishing proof.
2. Open **Review & confirm proof N**. Confirm the proof version, notes and links match the saved proof. Open the links to inspect the published work.
3. Before checking consent, **Confirm proof** must be disabled. **Keep reviewing proof** records nothing.
4. Reopen, check the confirmation statement and confirm. Both accounts should see the same confirmation/time after refreshing. Creator accounts have no confirmation button.
5. Record a corrected proof version as creator. The newest version must show no confirmation and require a fresh brand/client review. Older confirmation remains visible in history.
6. Keep a confirmation open while another proof version is saved. Confirming the stale version must fail without acknowledging the newer one.
7. Keep a confirmation open while a new delivery is submitted. Confirmation must fail; approving the new delivery alone does not make old proof eligible. Record new proof against that approved delivery.
8. Complete an approved collaboration, then record/confirm its proof. Status stays Completed, and agreement, delivery review and submission history stay unchanged.
9. Simulate a failed response after confirmation commits. Retry in the same dialog: receipt ID/time remain unchanged, with one saved confirmation. A separate tab using another request must conflict if already confirmed.
10. Test fresh-read failure and **Reload confirmation**, historical pagination/reload, mobile dialog/page fit, keyboard dismissal and creator/unrelated-account rejection.

## Verification

- Backend: 499 tests pass; 14 opt-in checks are skipped in the default run. New checks cover shared receipts, exact retries, consent validation, actor isolation, stale proof/delivery, completed confirmation, no inherited confirmation and unchanged agreement/review/status.
- Native PostgreSQL: two publishing-proof/confirmation checks pass. Identical concurrent confirmation creates one receipt; competing requests conflict; proof and submission races preserve exact version scope. RLS and immutable trigger checks pass.
- Web: 144 tests pass, TypeScript and focused lint pass, and isolated production build passes.
- Production-browser checks pass fresh-read recovery, explicit checkbox/cancellation, lost-response retry, shared history, no inheritance, stale proof/delivery and competing confirmation conflicts, post-completion confirmation, pagination/reload, privacy and mobile fit. Screenshot inspected.

Step 23 is now implemented: see [Deadline indicators](DEADLINE-INDICATORS.md) for current-state calendar urgency and manual tests. Reminders, secure attachments and moderated feedback remain separate P08 work.
