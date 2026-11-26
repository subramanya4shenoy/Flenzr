# Shared collaborations and offer workspaces

Core persistence: P07 Step 13 · P07.01.01 completed 19 November 2026. Navigation and workflow documentation reconciled on 26 November 2026.

Both participants can explicitly start a shared collaboration from an accepted enquiry, campaign application or invitation. A confirmation explains the Discussion state and opens a new saved record, or reopens the existing record for that source. Accepting a source alone never creates a collaboration.

Open **Collabs** from the brand or creator menu. Brands see offer groups for accepted applicants/invitees and their started collaborations, alongside individual direct-enquiry collaborations. Creators see their own individual collaboration records. Grouping does not merge creator terms or grant creators access to other participants.

## Current navigation and workflow

The brand acquisition flow is **Campaigns → campaign → Offer → Overview / Manage / Applicants**. Manage includes publication controls and a searchable creator multi-selector. A shared invitation quote is sent independently to each selected creator; failures remain selected for retry. Applicants shows saved DPs, pitches, quotes and private negotiation histories. Selecting several creators leaves their progress independent. Closing applications stops new selections/counters but does not close existing collaborations.

The brand delivery flow is **Collabs → Offer → workflow section → Summary or creator** at `/dashboard/collaborations/offer/{offerId}`. Overview contains the common brief and opted-in/started/agreed/completed totals. Other sections collapse the workflow menu to icons and show the creator rail:

- **Proposals & Agreement**: private drafts, shared versions, counters and exact-version acceptance. The proposal and saved agreement have a printable document view. Only both participants accepting the same version creates the immutable agreement and marks that application claimed.
- **Deliveries & Review**: versioned links/private files, media review studio, comments and explicit approve/request-revision decisions. Comments may reference a submitted file and video timestamp. Both participants can resolve/reopen comments; only the author can delete their own comment. Comments do not consume a formal revision round or approve work.
- **Publishing Proof**: the creator records live post links against approved work; the brand confirms a specific proof version. Flenzr does not publish the posts.
- **Feedback**: private participant feedback after explicit completion of the current approved delivery. Completion and proof confirmation are separate records; proof confirmation is not a backend prerequisite for completion.
- **Messages**: live private conversation, reactions, typing/presence, read receipts and video-call controls. See [Messaging](COLLABORATION-MESSAGES.md).

Accepted sources without a collaboration show **Start collaboration**. Each source gets a separate record. Direct enquiries and creator views use `/dashboard/collaborations/{id}` with the same workflow sections. Section hashes preserve navigation; breadcrumbs show the current section and, in grouped views, the selected creator. Recent shortcuts are stored per viewer on the current device.

## API and ownership

- `POST /api/v1/collaborations`: `{source_kind: "enquiry" | "application" | "invitation", source_id: UUID}`. Returns the saved record; identical retries return the same ID.
- `GET /api/v1/collaborations?page=1&page_size=20`: participant-scoped list, total and stable creation-date/ID pagination. Page size is capped at 50.
- `GET /api/v1/collaborations/{id}`: participant-scoped detail; unavailable/unrelated IDs return 404.
- `GET /api/v1/collaborations/groups?page=1&page_size=20`: viewer-scoped offer groups or individual records.
- `GET /api/v1/collaborations/offers/{offerId}`: owning-brand-only participant summaries and workflow state. Creators and unrelated brands receive 404.

Participant IDs come from the saved source and its creator/organization, never the request body. An enquiry sender can be an individual client without a brand organization. Campaign sources resolve the owning organization user. Only those two users can create or read the record; there is no administrator bypass or team-sharing inference. Self-collaborations are rejected.

The source row is locked before conversion, coordinated with existing source response writes. Unique constraints on each source foreign key prevent duplicate conversions, including simultaneous brand/creator requests. New conversions require an accepted source. Already accepted campaigns may have been paused or closed: conversion preserves the existing accepted activity without changing the campaign or implying new availability.

Each record snapshots the source title, brief, requested deliverables, quote, currency, requested date and participant display names at conversion time. Subsequent source/profile changes do not rewrite it. Quotes and dates are labelled as source context and subject to agreement, not accepted proposal terms. Separate accepted application and invitation sources remain separate records, even for the same campaign/creator; different quotes are not silently merged.

No API accepts arbitrary participant IDs, prices, statuses or browser-local deal data. Responses omit participant user IDs, emails, private account data and credentials. Browser calls use the existing HttpOnly account gateway and same-origin mutation checks with no-store reads. Cancelled page requests cannot overwrite a newer page.

## Migration

`0017_collaborations` adds one source reference per record, enforced by a check constraint and source-specific uniqueness; restrictive foreign keys preserve source/participant references. PostgreSQL RLS denies all direct browser-role access; trusted backend sessions enforce participant ownership. The original persistence slice had no state-transition endpoint; later proposal, delivery and completion endpoints implement the transitions described above. There is no collaboration deletion endpoint. Future account deletion/retention workflows must handle these references deliberately.

The migration was tested on disposable PostgreSQL and applied to the development database. No real-user collaboration records were created during verification.

## Manual test

1. Use a brand/client and a different creator account. Send and accept an enquiry, or accept an application/invitation on a published campaign.
2. In the accepted source, click **Start collaboration**. Check the explanation, then Cancel: no record should be created.
3. Open it again and confirm **Start collaboration**. Check Discussion, source brief, requested deliverables, quote and requested date.
4. Open the same source as the other participant and start again. It must open the same collaboration ID.
5. Reload the detail and open **All collaborations**. Both accounts must see the saved record.
6. Use an unrelated account to open its URL. It must show unavailable, and its list must not contain the record.
7. Confirm pending/rejected/withdrawn/declined sources have no Start action. Calling the API on those sources must fail.
8. Simulate a failed creation request, retry and verify there is still just one saved record. Block a list/detail read and verify Retry recovers after unblocking.
9. Check a 390px mobile width: the confirmation dialog and cards stay within the screen.

## Historical persistence verification · 19 November 2026

- Backend: 401 passed, 6 skipped opt-in database checks. New API checks cover three source types, all unaccepted states, owner isolation, both participants, individual enquiry senders, snapshots, pagination, replay safety, self-collaboration and rejected field overrides.
- Native PostgreSQL: concurrent participant conversion returns one record; RLS prevents direct browser reads/writes; one-source constraint rejects missing sources.
- Web: 134 passed; TypeScript and focused lint pass. Isolated production build passes (existing Next dependency advisory remains a separate maintenance follow-up).
- Browser against disposable records: confirmation/cancel, failed creation/retry, shared participant detail, reload, all three source types, duplicate safety, failed read/retry, unrelated-account isolation and mobile layout pass.

The 19 November checks cover the original persistence slice. Later agreements, delivery/review, completion, publishing proof, private feedback, grouped workspaces and live chat are implemented. None creates a payment. Legacy local overview metrics and legitimate local-draft migration remain separately tracked.

The latest combined multi-creator browser journey **passed in isolation on 26 November 2026** under P13.03.01. It includes batch invitations, independent creators, comments, real private-media previews, live-chat recovery and synthetic-device video permissions. Production/multi-worker/cross-network checks remain separate; see [Journey verification](COLLABORATION-JOURNEY.md). Historical test passes above do not verify those later UI changes.


Step 37 adds participant-only activity history in both individual and grouped collaboration views, derived from existing saved milestones with actor/time/version and cursor pagination. No migration is required. See [Shared activity history](COLLABORATION-ACTIVITY.md) for event coverage, attribution limits and current verification.
