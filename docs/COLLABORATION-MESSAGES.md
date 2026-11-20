# Private collaboration messages

Step 26 · P09.03.01. Open a saved collaboration and use **Messages**, above the proposal and delivery sections. The saved creator and brand/client can exchange plain-text messages during discussion, agreement and after completion.

## Behaviour

- Messages are persisted, timestamped and shown in conversation order. Each account sees its own messages labelled **You** and its collaborator's role on replies.
- **Refresh messages** loads the latest replies. **Older messages** and **Newer messages** page through 20 messages at a time. There is no automatic/live refresh, unread badge, read receipt, email or chat attachment in this milestone. Delivery files remain available through Deliveries.
- Text supports ordinary paragraphs, up to 4,000 Unicode code points. HTML/Markdown is rendered as plain text; no automatic link execution or embedded content.
- Sending disables the composer until acknowledged. A failed or ambiguous response preserves the exact request/text and offers **Retry send**; retrying cannot duplicate the saved message. A read failure preserves the draft. Navigating away warns about unsent/unconfirmed text. Drafts and pending requests are held only in memory; after reloading, check saved history before composing again.
- Sent messages cannot be edited/deleted. Sending never accepts a proposal, changes agreed terms, submits or approves work, completes a collaboration, or moves money.

## Access and persistence

`GET /api/v1/collaborations/{id}/messages?limit=20&before={sequence}` returns a private page; `POST` accepts only `request_id` (UUID) and `text`.

Every operation repeats participant authorization from the authenticated session. Outsiders receive 404 and logged-out users 401. Clients cannot choose an author, role, sequence or collaboration recipient. Internal author IDs, request keys and hashes are omitted from responses. API/BFF responses use `Cache-Control: no-store`.

Migration `0027_collaboration_messages` adds an independent conversation counter and append-only message rows. A transaction locks the collaboration, checks the author/request UUID, increments the message counter and saves the message together. Exact retries return the same receipt; changing text under a used key returns 409. Unique constraints enforce per-collaboration sequence order and per-author request idempotency. PostgreSQL RLS blocks direct browser-role access and a trigger prevents message updates/deletion.

Pagination uses sequence cursors instead of shifting offsets. A new arrival cannot duplicate or skip messages in an already requested older range. Reads are bounded to at most 50 rows. Messages and the counter have no effect on proposal/delivery version numbers or immutable agreement/completion receipts.

The migration is applied to the current development database. No new environment variables are needed.

## Manual check

1. Open a saved collaboration as the brand/client. In **Messages**, send a short message.
2. Open the same collaboration as its saved creator and click **Refresh messages**. Reply, then refresh the brand/client view.
3. Reload either page: the conversation remains. Send paragraphs and verify that HTML-like text displays literally.
4. With more than 20 messages, use **Older messages** / **Newer messages**. Send while viewing older history: the view returns to the latest messages.
5. Interrupt a send response and use **Retry send**. There must be one saved message. A failed history refresh should offer retry without clearing an unsent draft.
6. Try the endpoints as an unrelated account: expect 404. No author/role fields should be accepted in the send body.
7. Check a completed collaboration: follow-up conversation remains available, while formal delivery/review/completion history stays unchanged.

## Verification

547 backend tests and 150 web tests pass, plus focused TypeScript/lint and an isolated production build. Native PostgreSQL verifies concurrent sends, ordered counters, exact retries, RLS and immutable message rows.

The two-user production-browser journey verifies exchange/reload persistence, escaped text, committed-response retries without duplicates, stable pagination with new arrivals, sends from older history, draft preservation on refresh failure, outsider denial and mobile width. No messages were sent to real users during these isolated checks.
