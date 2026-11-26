# Structured revision allowance

P08 Step 20 · P08.03.01 completed 20 November 2026.

Either participant can propose an optional number of included revision rounds. Both explicitly accept the same version before that allowance becomes part of the immutable agreement. Deliveries show the saved allowance, rounds used and remaining rounds for both participants.

## Rules

- The proposal field accepts a whole number from 0 to 20, or can remain unspecified. Zero means no included revision requests. Unspecified is not an invented promise of unlimited work: written scope still applies.
- One saved Request revisions decision uses one round across the entire collaboration. Submitting versions, cancelling a review, approving work and failed requests use no rounds.
- A saved review stays attached to its submitted version. Changing versions does not reset the agreed allowance. Approvals do not refund earlier rounds.
- Counts derive from immutable revision-request decisions against the agreement across all submission history, independent of the page being viewed.
- Once the allowance is used, the UI disables further revision requests and the API independently rejects them with 409 REVISION_LIMIT_REACHED. Approval and creator submissions remain possible; work is never automatically approved, completed or charged.
- The review dialog refreshes current permissions/allowance before confirmation. Saved review retries return the original receipt before checking the cap, so a lost response cannot consume a second round.
- Review writes and new submissions use the same collaboration row lock. Concurrent requests cannot consume a round twice or overrun the cap; existing one-decision-per-version constraints still apply.
- Only the saved brand/client can request revisions. Creators and unrelated users cannot use or inspect another collaboration's allowance.
- A changed allowance requires a new proposal version and fresh acceptance from both participants before an agreement is saved. An existing saved agreement cannot be edited to add rounds. Additional scope must be discussed separately; this feature does not implement agreement amendments or billing.

## Historical compatibility

Existing proposals and agreements without the structured field keep their original JSON and snapshot hash. Missing or unspecified revision limits are omitted when serializing terms, rather than injected into historical agreement downloads. No database migration or rewrite of saved agreements is needed.

Free-text wording such as “one revision included” is not parsed into an enforceable number. An older agreement keeps its previous revision-request behaviour; both participants see “No structured revision limit agreed” and the actual number of requested rounds. That label does not override their written scope.

## API

ProposalTerms accepts optional revision_limit: integer 0..20 or null. Invalid booleans, fractions, strings and out-of-range values are rejected. Unspecified/null terms serialize without the field.

GET /api/v1/collaborations/{id}/deliveries adds revision_allowance (null before agreement; otherwise limit, used and remaining) and can_request_revision. Limit/remaining are null when no structured limit exists. Existing can_review still controls reviewer ownership and approvals.

POST /api/v1/collaborations/{id}/deliveries/{delivery_id}/review enforces the cap after identity, exact-version, agreement and saved-request checks. A denied request creates no review and consumes no round. No new write endpoint or direct browser database access is added.

## Manual testing

1. Start a new collaboration from an accepted source. Click **Draft proposal** and enter normal price, deliverables, delivery date and usage rights.
2. In **Included revision rounds**, try 21 or a fraction: saving should fail while keeping inputs. Enter 1 and save the private draft.
3. Open **Review & send**. Confirm “1 across this collaboration” appears. **Keep draft** saves no sent proposal; reopening and sending shares the terms with the other participant.
4. In both accounts, use **Review & accept version N**. Confirm the allowance is visible before accepting. Once both accept, the agreement shows the same allowance.
5. As creator, submit Version 1. As brand/client, open **Request revisions**, then cancel. Refresh deliveries: usage remains 0 of 1.
6. Request revisions with useful feedback. Both accounts should see 1 of 1 used and 0 remaining after refreshing.
7. Submit Version 2 as creator. The brand's revision-request button is disabled, with an explanation; direct API requests must also fail. **Approve version 2** still works.
8. Reload both accounts and download the agreement: the agreed limit and unchanged snapshot/hash persist. Approval leaves the collaboration Agreed until explicit completion.
9. Test a new agreement with 0 rounds: requests are closed immediately, approval works. Test an older agreement with no field: no structured cap is imposed and the original JSON/hash is preserved.
10. Before mutual acceptance, send a counterproposal changing the allowance. Prior acceptance must not carry over. Both participants must accept the new version.
11. Simulate a lost review response after server commit; retry in the same dialog. Usage must increase once only, with the same receipt. Concurrent requests must not exceed the cap. Check mobile dialog fit and unrelated-account rejection.

## Verification

- Backend: 477 tests pass, 12 opt-in checks skipped in the default run. New checks cover zero/one/unspecified limits, strict validation, changed proposal acceptance, cap enforcement, shared counts, retries, approval at the cap and historical JSON/hash preservation.
- Native PostgreSQL: identical simultaneous requests consume one round; distinct concurrent requests preserve one decision per version; exhausted allowance rejects the next request while allowing approval. Counts match on older history pages. Review RLS and immutability checks pass.
- Web: 143 tests pass; TypeScript, focused lint and isolated production build pass. Field helpers preserve explicit zero and omit unspecified limits.
- Production-browser journey passes private draft validation, send/accept previews for both accounts, cancellation, lost-response retry, used/remaining display, disabled/rejected extra requests, approval after exhaustion, reload, unchanged agreement and mobile fit. Screenshot inspected.

Step 21 is now implemented: see [Publishing proof](PUBLISHING-PROOF.md) for versioned final links and manual testing. Overdue behaviour, secure attachments, reminders and moderated collaboration feedback remain separate roadmap work.


Step 38: revision usage is counted against the current immutable agreement revision. An explicitly accepted scope request supplies a new allowance and requires fresh work; previously used rounds remain attached to the earlier agreement and delivery history. See [Scope changes](SCOPE-CHANGES.md).
