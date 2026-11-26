# Mutual proposal acceptance and shared agreements

P07 Step 15 · P07.03.01 completed 19 November 2026.

**Current extension:** Step 38 adds [mutually agreed scope changes](SCOPE-CHANGES.md) and immutable agreement revisions. The original acceptance flow below creates revision 1; later accepted scope requests create separate revisions without editing it. Current delivery/review/proof/calendar operations use the latest revision, while every older agreement remains readable/downloadable. The dated original-slice limitations below are historical.

Both saved participants must explicitly accept the same current sent proposal. Sending a proposal is not acceptance, including for its author. The first acceptance records that participant's decision; the second atomically creates one saved agreement and changes the collaboration from Discussion to Agreed.

The collaboration shows each participant's acceptance time, the final agreed price, deliverables, date and usage rights, and a **Download agreement (JSON)** action. Both accounts download the same saved data. An agreement does not create payment or funding.

## Rules and concurrency

- Acceptance names a specific proposal ID and expected version and requires an explicit confirmation. The server derives the actor from the session; it rejects body-supplied actors/terms.
- Only the two saved participants can read/accept/download. Unrelated IDs return 404; signing in as an administrator does not infer participant access.
- Sending a new proposal before agreement leaves earlier acceptance records intact for evidence but requires fresh acceptance from both participants for the new version. A stale proposal cannot be newly accepted or replayed as current consent.
- New acceptance is rejected after the proposed delivery date has passed. Accepted agreements remain readable/downloadable after that date. A previously saved acceptance can be acknowledged again without rewriting its time.
- All proposal sends and acceptances lock the same collaboration row. A race between final acceptance and a new version either completes the reviewed agreement or publishes the new proposal and rejects stale acceptance. It cannot silently agree different terms.
- One acceptance per proposal/participant and one agreement per collaboration/proposal are enforced by unique constraints. Identical acceptance retries reuse the original receipt and agreement, including after a response was lost following commit.
- Agreement snapshots preserve source identity, title and participant display names, exact proposal terms/version, proposal send time, both acceptance times and agreement time. Later source/profile edits do not rewrite them.
- After agreement, draft writes and new proposal sends return 409. Existing private drafts remain visible only to their author with editing closed. An exact replay of a previously successful send can still return its original version without modifying the agreement.
- There is no acceptance withdrawal, agreement edit/delete, amendment, cancellation, payment or delivery API in this slice. Those remain separate roadmap tasks.

## API and downloadable record

- `GET /api/v1/collaborations/{id}/proposals`: now includes `acceptance` for the latest version, `agreement` (null until complete), and `collaboration_status`.
- `POST /api/v1/collaborations/{id}/proposals/accept`: `{proposal_id, expected_version, confirmed: true}`. Returns current acceptance/agreement state. Invalid confirmation or extra fields return 422; stale/ineligible requests return 409.
- `GET /api/v1/collaborations/{id}/agreement`: participant-only saved agreement. Returns 404 before agreement exists or when unavailable to the caller.

The existing HttpOnly account gateway handles these no-store requests and rejects cross-origin mutations. The download uses the agreement GET response and contains no participant user IDs, emails, access tokens, private drafts or request fingerprints. Author roles and server-recorded acceptance times are included in the shared snapshot.

`snapshot_hash` is a SHA-256 content checksum of `snapshot`, serialized as UTF-8 JSON with recursively sorted keys, no extra separators/whitespace, and unescaped Unicode. It supports consistency checks; it is not an external digital signature. Both participants receive the same snapshot and checksum.

## Migration

`0019_agreements` adds proposal acceptance and agreement tables with restrictive foreign keys, uniqueness constraints and API-only PostgreSQL RLS. A PostgreSQL trigger rejects UPDATE and DELETE on saved agreement rows, including trusted-session writes. Snapshot changes require a separate future amendment record rather than rewriting the accepted record.

The migration was tested on disposable PostgreSQL and applied to the development database. Future account deletion/retention workflows must deliberately handle the restrictive references and immutable record policy. No real-user agreements were created during tests.

## Manual test

1. Open a collaboration with a sent proposal in separate brand/client and creator sessions.
2. Confirm neither side is implicitly accepted. Click **Review & accept version N**, inspect all terms, and confirm the Accept button is disabled until its checkbox is checked.
3. Use **Keep reviewing**: no acceptance should be recorded. Open again, check the confirmation and accept.
4. Confirm only that participant is marked accepted, with a saved time; the agreement should not exist yet.
5. Accept the same version in the other account. Both should see **Agreed** and **Agreement saved · Version N** after refreshing proposals.
6. Download the JSON in both accounts. IDs, snapshot, checksum and timestamps must match. Reload and confirm the same record persists.
7. Check that proposal editing/sending is closed, including any previously saved private draft. Earlier sent versions remain viewable.
8. On a different unagreed collaboration, let one side accept Version 1, then send Version 2. Both must accept Version 2 anew. A tab still reviewing Version 1 must receive a conflict.
9. Simulate a failed acceptance response, retry and verify there is one receipt and one final agreement. Block an agreement download, retry after unblocking, and confirm recovery.
10. Copy the URL to an unrelated account: it must not read/accept/download. At mobile width, verify the review dialog and agreement fit on screen.

No live subscription was added: use **Refresh proposals** to check the other participant's response. Accepted terms are closed to editing; cancellation/amendment rules will be added separately.

## Verification

- Backend: **422 passed, 8 skipped** opt-in native tests. New checks cover both acceptance orders, exact confirmation, participant isolation, stale versions, repeat receipts, one agreement, past dates, unchanged snapshots, download checksums and frozen proposal writes.
- Native PostgreSQL: simultaneous acceptances create one agreement; final acceptance versus new-version races preserve a valid outcome; the immutable trigger blocks update/delete; browser anon/authenticated roles cannot read or write the new tables even when granted table privileges.
- Web: **136 passed**, TypeScript and focused lint pass; isolated production build passes. The existing Next dependency advisory remains a separate maintenance follow-up.
- Browser with disposable records: explicit checkbox/cancel, lost-response retries after both first/final commits, stale consent rejection, mutual agreement, closed editing, matching downloaded bytes and checksum, failed-download recovery, reload, mobile and privacy checks pass.

Next: P08 Step 16 — creator delivery submissions with saved links/notes and version history. File attachments and brand review are separate follow-up slices.
