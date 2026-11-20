# Publishing proof and final post links

P08 Step 21 · P08.04.01 completed 20 November 2026.

The saved creator can record labelled final post URLs against the current approved delivery. Both participants see the same versioned proof history. Publishing proof is separate from delivery preview links and can be recorded or corrected before or after collaboration completion.

## Rules and persistence

- Only the creator saved on the collaboration can write proof. Brand/client writes return 403; unrelated users receive 404 for reads and writes. Identity comes from the session.
- A new proof version must reference the current delivery and its exact saved approval. Unapproved deliveries and revision requests are ineligible. After completion, the target must also match the pinned final delivery.
- The form reloads the eligible delivery and latest proof version before confirmation. The API checks both again while holding the same collaboration row lock used by submissions, reviews and completion.
- Each version is the complete set of supplied final links, with optional notes, the agreement/delivery/approval references and server save time. Corrections append a new immutable proof version; they never overwrite earlier records.
- Proof is versioned across the collaboration. A new approved delivery does not inherit earlier proof; history keeps its original delivery version visible. The editor starts blank when the eligible delivery changes rather than silently reusing older links.
- A UUID request key and payload hash make exact retries return the original receipt/time, even after newer deliveries or proof versions exist. Changed payloads using that key, or stale proof versions, return 409 without saving another record.
- Concurrent saves serialize on the collaboration row. Only one update with a given expected proof version wins. If a new delivery wins a race, the old proof save is rejected; if proof saves first, it stays linked to the older delivery. Completion and proof can both save when they target the same approved work.
- Proof does not change agreement terms, review decisions, revision counts or collaboration status. Completed delivery submissions and reviews remain closed; adding proof does not reopen them.
- Links are creator-provided. Flenzr does not fetch or certify external content, verify account ownership, automatically publish, collect payment or send external messages. Remote contents and access can change after a link is recorded.
- Manual brand/client acknowledgement is now implemented: see [Proof confirmation](PROOF-CONFIRMATION.md). Merely viewing links does not create confirmation.

## Validation and privacy

One to ten labelled HTTPS links are required; labels are 1–80 characters, URLs at most 2,048 characters and notes at most 5,000 characters. Embedded credentials, whitespace/control characters, unsupported schemes and duplicate normalized URLs are rejected. Preview and proof links share the same validation rules. External links open with noopener/noreferrer.

Proof reads are paginated and participant-only. Receipts omit creator user IDs, request keys and payload hashes. PostgreSQL RLS denies direct browser-role access and an immutable trigger rejects updates/deletion of proof records. There is no proof edit/delete endpoint.

Migration 0023_publishing_proof adds the proof table, foreign keys, version/request uniqueness, index, API-only RLS and immutable trigger. It was tested on disposable PostgreSQL and applied to the main development database. Tests used disposable local accounts and did not create proof for real users.

## API

GET /api/v1/collaborations/{id}/publishing-proof accepts page and page_size (maximum 50). Returns can_publish, eligible_delivery (null when no eligible approval), latest_proof_version, items, total, page and page_size.

POST to the same path accepts request_id, delivery_id, review_id, expected_delivery_version, expected_latest_proof_version, notes and links. Extra fields are rejected. Returns id, version, agreement_id, delivery_id, delivery_version, review_id, notes, links and saved_at.

Both participants use Refresh publishing proof for updates. No background subscription was added. The existing same-origin HttpOnly account gateway carries browser requests.

## Manual testing

1. Open a shared collaboration before its latest delivery is approved. Publishing proof should explain the requirement and show no Record button.
2. As brand/client, approve the latest delivery. As creator, click Refresh publishing proof, then Record publishing proof.
3. Enter a label and final post URL. Try an HTTP link or a duplicate: Review publishing proof should show validation and preserve inputs.
4. Use a valid HTTPS URL and optional notes. Review the exact delivery version and links in the dialog. Keep editing proof must save nothing.
5. Confirm Save publishing proof. Both participants should see the same proof version, links and save time after refreshing. The brand/client cannot record proof.
6. Correct a link and save again: a new proof version appears and earlier proof remains unchanged. Record a full link set for each new version.
7. Keep a confirmation open while another proof version is saved. The stale save must conflict. Likewise, a newer delivery submission must prevent saving new proof against an older approval.
8. Approve a newer delivery and refresh proof. The editor starts blank for that delivery; earlier proof remains labelled with its original delivery version.
9. Complete the approved collaboration. As creator, record another proof version. Status stays Completed, the agreement and delivery review remain unchanged, and submissions/reviews remain closed.
10. Simulate a failed response after the server commits proof, then retry the same dialog: one version and the original receipt/time remain. Test fresh-check failure and Reload proof check, history pagination, reload, keyboard dismissal and mobile fit.
11. An unrelated account must not read proof or save it. Recorded URLs are supplied evidence; opening a URL does not create a saved brand confirmation.

## Verification

- Backend: 490 tests passed, 13 opt-in checks skipped in the default run. Proof API checks cover creator ownership, shared history, approval requirements, exact retries, stale targets/versions, completed updates, unchanged agreement/review/status and bounded links/notes.
- Native PostgreSQL: identical concurrent saves yield one receipt; competing updates produce one success and one conflict. New-delivery and completion races preserve exact targets. Proof RLS and immutability checks pass.
- Web: 144 tests pass; TypeScript, focused lint and isolated production build pass. Proof helpers share URL validation and serialize only notes/links.
- Production-browser checks pass validation, fresh-check retry, cancellation, lost-response retry, shared creator-only saves, stale delivery/proof rejection, completed updates, older delivery history, pagination/reload, privacy and mobile dialog/page fit. Screenshot inspected.

Step 22 is now implemented: see [Proof confirmation](PROOF-CONFIRMATION.md) for exact-version acknowledgement and manual tests. Other P08 work remains on the roadmap.
