# Media-kit enquiries

The first persisted creator/brand collaboration slice is available in the web app.

- On a public creator media kit, select **Custom Offer** or a package’s **Send enquiry** action.
- Sign in to a **brand** account to send. If needed, the composer opens sign-in in another tab and retains its fields while you return and retry.
- Creators review requests in **Studio → Collabs**. Brands use **Brand Portal → Enquiries** or `/dashboard/brand/enquiries`.
- **Unread badges:** a new request flags Collabs for the creator; replies flag the other participant's inbox. Use **Open enquiry** to view the brief/actions and mark only the displayed revision as read. Listing, refreshing or closing requests does not clear unread state. Read failures keep the badge and offer **Mark as read** to retry.
- Brands can withdraw a pending or countered enquiry from **Enquiries → Open enquiry → Withdraw enquiry**. Confirm with an optional reason; **Keep enquiry** leaves it unchanged. Both sides retain the original brief, terms and response history.
- Creators can accept, decline or counter the budget. Brands can accept or decline a counter. The brief, package snapshot, budget and response history persist across browsers and reloads.
- Package and custom enquiries accept an optional **Preferred delivery date**. Both inboxes and response dialogs label it as a requested date, subject to agreement; accepting a budget does not turn it into a guaranteed delivery date. Undated enquiries show **To discuss**.
- Acceptance expresses interest in the displayed terms. It does not create a funded deal, reserve money, publish content or transfer money. Saved notifications and email queue delivery are described in [NOTIFICATIONS.md](NOTIFICATIONS.md).

## API and storage

Apply migrations through `backend/alembic/versions/0013_enquiry_abuse_index.py` (`alembic upgrade head`). The `enquiries` table stores participant IDs, the original package title/price/currency snapshot, brief, preferred delivery date, status, revision, separate creator/sender read revisions and response history. The nullable `DATE` column preserves existing rows without inventing deadlines. The read-tracking migration baselines both participants to the current revision of existing enquiries, so old history does not suddenly create unread alerts. Package changes do not alter existing requests. PostgreSQL row-level security blocks direct PostgREST access; the backend database owner/service role accesses the table, enforcing participant ownership in the API.

`preferred_delivery_date` is `null` or a strict `YYYY-MM-DD` calendar date. New requests require today or later using the UTC calendar-day boundary consistently in the UI and API. No time or timezone is attached to the requested day, and display formatting cannot shift it between timezones. The sent history records the original date. Budget responses leave it unchanged. Duplicate retries are checked before the past-date rule, so retrying a successfully saved request still works after its requested day passes. Undated request hashes remain compatible with enquiries saved before this field existed.

| Endpoint | Access / behavior |
| --- | --- |
| `POST /api/v1/enquiries` | Signed-in brand owner; validated creator/package; caller-owned request UUID deduplicates retries. |
| `GET /api/v1/enquiries/me?view=received\|sent&limit=30&offset=0` | Signed-in participant; only their requests, paginated newest first. |
| `GET /api/v1/enquiries/unread-counts` | Signed-in caller's received/sent unread enquiry counts across all pages; no read side effects. |
| `POST /api/v1/enquiries/{id}/read` | Participant only; `seen_revision` acknowledges exactly the version displayed, advances monotonically and rejects future revisions. |
| `POST /api/v1/enquiries/{id}/withdraw` | Sending participant only; pending/countered requests, expected revision required, optional reason, retry-safe history; accepted/declined requests unchanged. |
| `POST /api/v1/enquiries/{id}/respond` | Participant and state checked; requires `expected_revision`; stale updates return 409. |

Web requests use the existing HttpOnly-cookie account gateway and same-origin mutation checks. Contact email comes from the authenticated sender, not an editable form field. Brand name is sender-supplied, not a verified organization claim. No enquiries or contact details are stored in browser localStorage. Lists and unread counts use account-specific transient query keys and cancel inactive requests. Both refresh on load/focus, after read/response actions, on the Refresh button, and on live change signals. While the private stream is healthy, interval polling is disabled; if the stream is unavailable, both use a 30-second foreground fallback. Background list refreshes retain visible cards rather than flashing an empty inbox. No social analytics refresh is triggered. A maximum of 30 new enquiries per sender in a rolling 24 hours applies; idempotent retries remain allowed after reaching the cap.

New requests start unread for the creator and read for their sender. Each successful response advances its author's own cursor with the new revision and leaves the other participant's cursor unchanged. Only the caller's `read_revision` and `is_unread` are returned in list/read responses; the other participant's read cursor is private. A late acknowledgement cannot clear a newer update or move the cursor backwards. Reading changes neither the enquiry revision nor `updated_at`, status or history. A newer reply arriving during acknowledgement remains unread, with a prompt to review and mark the newer update. Navigation hides a badge on count failure rather than presenting an unverified zero.

States: `pending → accepted | declined | countered` by the creator; `pending | countered → withdrawn` by the sender; `countered → accepted | declined` by the brand. Decisions are final in this initial enquiry flow. Full versioned scope negotiations and deal contracts belong to the later proposals workstream.

## Validation and remaining work

Backend tests cover two-user persistence, unauthorized access, retry conflicts, package ownership and snapshots, state transitions, stale revisions, validation and daily limits. Browser checks use an isolated SQLite API with separate test identities; user accounts and social connections are not changed.

Deadline checks cover package/custom persistence for both participants, omitted/null dates, invalid dates and timestamps, past dates, retries across midnight, old request hashes, unchanged dates through counter/accept responses, migration preservation and timezone-safe display. Isolated browser checks cover date entry, validation, reloads, response history and mobile layouts.

Unread validation includes participant isolation, author-versus-recipient behavior, persistence after fresh database loads, stale/duplicate/future read acknowledgements, counts across pagination, activity/history preservation and migration baselining. Isolated browser checks cover creator navigation (including collapsed mode), brand badges, explicit opening, a failed mark-read and retry, counter/accept replies, reloads and mobile layout.

Remaining: richer term negotiation, production email-provider setup, moderation controls and integration into overview/calendar widgets. Legacy browser-only pipeline data is not migrated or turned into accepted enquiries; Collabs now opens the persisted inbox.

## Live updates

Migration 0011 installs an enquiry trigger and private Supabase Realtime Broadcast authorization. Enquiry inserts and revision changes signal both participants. A changed read cursor signals only that participant's devices, without sending the counterpart a read receipt. Signals participate in the database transaction: rollbacks do not publish them. Only change signals are supplied to `realtime.send`; Supabase may add a message ID. No enquiry fields, briefs, email addresses, budgets or cursor values are broadcast.

A private topic is `enquiries:<internal user ID>`. A narrowly granted, security-definer authorization function maps the verified `auth.uid()` to an active internal user. A restrictive policy prevents broader SELECT policies from opening another user's Flenzr topic. Direct enquiry-table access remains blocked. No client INSERT/Broadcast-send policy is granted.

`GET /api/enquiries/live` validates the HttpOnly session and derives the topic exclusively from the verified identity. It subscribes to Supabase from the Node server, then forwards only `ready`, `changed`, `heartbeat`, `rotate` and `unavailable` SSE signals. Access and refresh tokens never reach browser JavaScript. The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configure the transport; no service-role key is used. A server bridge is intentional to preserve the existing cookie security model.

Each dashboard shares one connection per visible tab. Events within 150 ms are combined into one refresh. Hidden tabs disconnect; returning reconnects and reloads current state. Disconnects, errors and missing heartbeats restore foreground polling. Streams rotate after roughly four minutes to revalidate identity and reconcile missed signals. Unmounting cancels timers, listeners and sockets. The browser never treats an event as enquiry data or marks anything read because of an event.

Deployment requires a Node host/reverse proxy that supports unbuffered streaming and long-lived outbound WebSockets. Each active tab uses one SSE connection to the web server and one private Supabase subscription. Scale and monitor these connections against hosting and Supabase limits; this is not a load-test capacity claim. Generic PostgreSQL without `realtime.send` retains polling. Supabase creates daily message partitions when a WebSocket client connects; an offline account catches up from the API when it returns.

Verification: `node --test tests/enquiry-live.test.cjs tests/enquiries.test.cjs tests/access-control.test.cjs` in `web`; enquiry backend tests; opt-in `FLENZR_TEST_REALTIME_POSTGRES=1 .venv/bin/python -m pytest tests/test_enquiry_realtime_postgres.py -q` in `backend` after applying migrations with a Realtime client connected that day. The integration test inserts disposable rows inside a rolled-back transaction, checks actual authenticated-role RLS, participant-only signals, private read acknowledgements and rollback behavior. Browser checks exercise the real dashboard components with controlled events/API responses. A full live-browser flow with real user sessions remains a manual acceptance check; no administrative Supabase credential is required by the feature.

Manual acceptance:
1. Keep a creator's Collabs page open in one browser and sign into a separate brand account in another.
2. Send a new enquiry from the brand. The creator badge and inbox should update without reloading.
3. Open it as the creator: their badge clears, including in another visible tab of that creator account.
4. Counter the budget. The brand's badge and inbox should update automatically; opening the enquiry clears only the brand's unread state.
5. Disconnect/reconnect the network, then return to the tab. Current counts and requests should recover automatically. If streaming is unavailable, an active tab catches up within the 30-second fallback interval.

## Withdrawal behavior and checks

Withdrawal is a dedicated sender-only `POST /api/v1/enquiries/{id}/withdraw` with strict `expected_revision` and optional `note` (maximum 2,000 characters). Unknown records and non-senders return 404. Only pending and countered enquiries can transition; accepted, declined and already withdrawn requests cannot be edited. An identical retry of a successful withdrawal (original expected revision and normalized reason) returns the saved result without another history entry or broadcast. A changed reason/revision conflicts.

The transition uses an atomic revision/status comparison, appends a dated brand withdrawal event, advances the sender's read cursor and leaves the creator's cursor unchanged. Terms, requested delivery date, package snapshot and prior history remain intact. Withdrawal is a new unread update for the creator, even if they had already read the original request; acknowledging an older revision cannot clear it. The existing database trigger broadcasts the revision change to both participants. Withdrawing neither deletes the enquiry nor changes payments.

The UI offers the action only on the sending brand's open enquiry, explains that it cannot be reopened, and asks for explicit confirmation. A failed save retains the reason and offers retry. Stale confirmations show the server conflict instead of replacing a newer decision. Withdrawn enquiries retain their history and have no response/withdrawal actions.

Backend coverage includes ownership, malformed payloads, stale versions, both decision orderings, countered withdrawal, duplicate retries and read-state preservation. The opt-in PostgreSQL test `test_concurrent_withdrawal_and_accept_have_exactly_one_winner` holds two real API handlers after reading the same pending version, then releases them against separate database transactions: exactly one returns 200, the other 409, with one history event and revision advance. It uses disposable test records and removes them afterward. Browser validation against an isolated SQLite API covers cancelling confirmation, a failed withdrawal and retry, reload persistence, creator unread/history/action state, mobile layout and a creator decision arriving while confirmation is open.

Saved notifications, live bells, exact-enquiry links and the test-sink email worker are implemented. See [NOTIFICATIONS.md](NOTIFICATIONS.md) for configuration, delivery guarantees and manual checks.

## Pilot submission protections

New enquiries use these defaults, enforced in the API rather than only the form:

- 30 seconds between new enquiries from the same sender, across all creators.
- At most 3 new enquiries from that sender to one creator per rolling 24 hours.
- At most 30 new enquiries from that sender across all creators per rolling 24 hours (existing cap).
- An identical enquiry cannot be resent to the same creator with a new request ID within 24 hours. Text comparison normalizes Unicode compatibility, case and whitespace. It compares the brief, deliverable/package, original submitted budget/currency and requested date; changing the displayed brand name does not bypass it. Materially different terms remain distinct requests, subject to the other limits. Provider/package terms are taken from the server snapshot, not ignored client fields. A later counter-budget does not erase the original submission from duplicate protection.

All limits use the original creation time and include withdrawn/accepted/declined requests. A reply/read acknowledgement does not extend a submission window. Withdrawing a request does not refund the allowance. Limits are account-scoped; one sender cannot consume another sender's allowance. No global creator inbox lock or one-open-enquiry restriction is introduced.

The existing request UUID + payload retry check runs before these guards. A successful same-payload retry returns the existing enquiry, even during a cooldown or at a cap; it creates no extra notification/email. Changed payload with the same UUID remains a 409 conflict. Rejected new requests are not saved and consume no additional allowance. Their drafts remain editable. Validation, ownership, role checks, authenticated identity and same-origin gateway protection remain in place.

Creation holds the sender's database user-row lock through validation, limit checks, insertion and commit. Separate PostgreSQL API workers therefore share the same allowance; no process-local counter or timer is used. Migration 0013 indexes `(sender_id, created_at)` for the bounded submission-window query. With more than one active limit, the API reports the longest required wait to avoid successive contradictory cooldowns.

Blocked requests return HTTP 429 with a stable error code (`ENQUIRY_COOLDOWN`, `ENQUIRY_CREATOR_LIMIT`, `ENQUIRY_DUPLICATE` or `ENQUIRY_LIMIT`), `Retry-After` seconds, and `error.details[0]` containing `retry_after_seconds` and an ISO `retry_at`. The gateway preserves Retry-After. The composer retains every field and its attempt UUID, offers a Sent enquiries link, disables sending during the countdown, and clears the expired rate error when retry becomes available. Closing/reloading the form cannot bypass backend limits.

`backend/.env.example` documents `ENQUIRY_SEND_COOLDOWN_SECONDS` (default 30, 0–3600), `ENQUIRY_CREATOR_DAILY_LIMIT` (default 3, 1–30), and `ENQUIRY_BLOCK_DUPLICATES` (default true). Daily total remains 30. Disabling these pilot protections should be an intentional operator decision. Broader IP/edge traffic protection, multi-account abuse, reporting and operator moderation belong to deployment/trust workstreams; these account-based controls are not a complete bot-defense system.

Verification covers production guard settings, expiry, sender/creator scope, duplicate normalization, package snapshots, original-versus-countered budgets, withdrawal behavior, successful retry bypass, original daily cap and no notification/email side effects. Older workflow tests relax new-submission timing/content guards so they can isolate state transitions; dedicated abuse tests explicitly restore production values. The opt-in PostgreSQL `test_concurrent_new_requests_obey_shared_sender_cooldown` uses separate real API/database transactions and proves one creation + one 429 with exactly two participant notifications/outbox entries. It removes only disposable test records afterward. Browser checks verify the retained draft, disabled countdown, automatic expiry, Sent enquiries link, same UUID on retry and mobile layout.

Manual check: send one enquiry as a brand, then open another creator's composer and try sending immediately. The form should show a short cooldown and retain the draft. After expiry, sending becomes available. Resending identical terms to the original creator with a new request is blocked for the remaining duplicate window; use Sent enquiries to review the original. For the per-creator limit, send three distinct requests at least 30 seconds apart and confirm the fourth is blocked. Test with disposable accounts rather than filling a real creator's inbox.

P05’s complete regression gate passed on 18 November 2026. See [ENQUIRY-REGRESSION.md](ENQUIRY-REGRESSION.md) for results and repeatable isolated browser/email checks.
