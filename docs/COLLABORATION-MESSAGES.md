# Private collaboration messages and calls

Documentation reconciled on **26 November 2026**. Durable messaging was introduced in Step 26 (P09.03.01); live chat and video-call UI were added in P09.03.02/.03.

## Current behaviour

Open **Messages** in an individual collaboration. Brands using an Offer group first choose Messages, then a creator. The saved creator and brand/client can converse during discussion, agreement and after completion.

- Messages are persisted, timestamped and ordered by sequence. The latest view fetches 30 messages; **Load older messages** uses sequence cursors and **Jump to latest** returns to current history.
- An authenticated event stream supplies live messages, typing, online presence, reactions and read receipts. The brand's creator rail includes message previews and unread counts. **Refresh messages** remains a manual recovery action; it is not required for every reply.
- Text supports up to 4,000 Unicode code points and is rendered as plain text. Emoji reactions can be toggled. Chat attachments are not implemented; delivery files belong in Deliveries.
- Sending disables the composer until acknowledged. A failed/ambiguous send preserves the request and text for **Retry send**, preventing duplicate saved messages. Drafts and pending sends are in memory, so check saved history after reloading.
- Sent messages cannot be edited/deleted. Messages, reactions and calls do not accept proposals, approve work, complete collaborations or move money.
- **Video call** sends a call invitation. The other participant can accept or decline; the caller can cancel and either participant can end an active call. Browser camera/microphone permission is required. The UI uses WebRTC with collaboration-scoped signaling and can save call summaries in conversation history.

## Access and persistence

All endpoints authorize the saved participants using the session. Outsiders receive 404 and signed-out users 401. Reads and the cookie gateway use no-store responses; callers cannot choose another author or recipient.

- `GET /api/v1/collaborations/{id}/messages?limit=30&before={sequence}`: saved history and participant metadata; API page sizes are bounded at 50.
- `POST /api/v1/collaborations/{id}/messages`: request UUID, plain text and optional `message_type` (`text` or `call_event`). Exact retries reuse the saved message; changed content under a used key conflicts.
- `POST /api/v1/collaborations/{id}/messages/read`: monotonically increasing read sequence.
- `POST /api/v1/collaborations/{id}/messages/{messageId}/reactions`: toggle a supported emoji.
- `POST /api/v1/collaborations/{id}/chat/signal`: participant-scoped typing, heartbeat and call signaling.
- `GET /api/v1/collaborations/{id}/chat/events`: live SSE stream, bridged by `/api/collaborations/{id}/live` in the web app.

Migration `0027_collaboration_messages` adds sequence-ordered, retry-safe append-only messages. `0031_collaboration_chat` adds read markers, reactions and call-event support. Message sequences remain independent of proposal and delivery versions.

The live event hub now supports shared Redis fan-out across backend workers. Without `CHAT_REDIS_URL`, it retains the single-process local transport. Each authenticated stream connection now reloads persisted history/receipts and refreshes grouped summaries, preserving drafts and history cursors. The current browser journey verifies catch-up after a real isolated-worker restart. The call implementation supports STUN and optional `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME` and `NEXT_PUBLIC_TURN_CREDENTIAL` configuration. Invite/accept/decline/cancel/end and denied media permissions pass the same-host synthetic-device check. Step 35 adds local ICE restart/recovery and qualifies actual TURN UDP/TCP relay using generated browser tracks. Physical devices/separate networks are skipped at user request; native media, TLS relay and full-reload rejoin remain unverified. See [Call readiness](CALL-READINESS.md). No production or cross-network call pass is claimed.

## Manual checks for the current implementation

1. Open the same collaboration in separate brand and creator sessions. Exchange text without refreshing; check plain-text rendering and reload persistence.
2. Toggle reactions, check typing/presence and read markers, then reconcile unread counts in the brand's creator rail.
3. Load older history, send from either side, return to latest and check for duplicates/missing messages.
4. Interrupt a committed send response, retry the same request and confirm one saved message. Disconnect/reconnect the live stream and use Refresh messages to reconcile history.
5. Invite, accept, decline, cancel and end a call. Test blocked camera/microphone permission, disconnects, simultaneous tabs and actual separate networks.
6. Try history, receipts, reactions and signaling as an outsider. Expect denial and no private data. Confirm completed collaborations retain messaging without reopening delivery writes.
7. Check narrow layouts with and without a call active.

## Historical verification and current gate

The original **20 November 2026** text-message milestone recorded 547 backend tests and 150 web tests, native PostgreSQL checks and a two-user browser pass. Those results apply to durable text messaging and the earlier UI. They do not verify later SSE recovery, grouped unread state or WebRTC media.

Fresh automated results are recorded in the roadmap audit. **P13.03.01 passed the isolated current workflow on 26 November 2026**, including real SSE catch-up and synthetic media. Migration `0033_private_chat_and_comments` adds API-only RLS to read/reaction metadata; it is now applied and verified in development; staging/production rollout remains. Shared Redis transport is verified locally in Step 34 below; deployment configuration and cross-network call checks remain release work. See [Journey verification](COLLABORATION-JOURNEY.md).


## Shared transport — Step 34 (26 November 2026)

Set `CHAT_REDIS_URL` to the same private Redis service on every backend worker, and use the same `CHAT_REDIS_NAMESPACE` (default `flenzr:chat`). Use a different namespace per environment. An authenticated TLS URL (`rediss://...`) belongs in server secrets; it never goes to the browser. Install the backend dependencies before starting workers. No database migration or frontend change is required.

For an isolated local Redis instance, start it explicitly (no login service required):

```sh
redis-server --bind 127.0.0.1 --port 56379 --save '' --appendonly no
```

Configure each API worker with `CHAT_REDIS_URL=redis://127.0.0.1:56379/0`. The existing SSE gateway and authorization remain unchanged: only saved participants can subscribe or send signals. All message, receipt, reaction, typing and WebRTC signal events share the bus. A worker accepts requests only after its Redis subscription is acknowledged; configured Redis startup failure fails application startup. `/health` reports `chat_transport` (`local` or `redis`) and `chat_ready` for operational checks.

Presence uses a separate 35-second lease for each worker/user, refreshed every 10 seconds while streams are open. Multiple tabs/workers keep the user online until the final connection closes. An abrupt worker death expires without requiring Redis keyspace notifications; peer streams detect expired presence on their next maintenance cycle (up to about 45 seconds). Graceful SSE cancellation shields cleanup so it can remove the lease.

Pub/Sub events are ephemeral. Database messages, reactions and read state remain authoritative. Subscription reconnect or queue overflow closes the SSE stream, allowing native EventSource reconnect and the existing `ready` history reconciliation. A failed fan-out after a committed write preserves the successful API result. A failed typing/call signal returns `CHAT_UNAVAILABLE` (503); active calls are not restored by replaying signals. Deployment still needs Redis availability monitoring, private access and the same namespace across all workers.

Run the focused real-service regression against an isolated Redis instance:

```sh
cd backend
DEBUG=false FLENZR_TEST_CHAT_REDIS_URL=redis://127.0.0.1:56379/0 \
  .venv/bin/python -m pytest tests/test_chat_realtime.py tests/test_chat_multiworker.py -q
```

The integration test creates a disposable database and a unique Redis namespace, launches two independent Uvicorn processes, and cleans up its own workers/keys. It disconnects Pub/Sub clients to verify reconnect recovery, so use a dedicated test Redis instance. It does not use the running development API or user records.


Verification: **583 backend tests passed / 20 opt-in checks skipped**, and **17 focused chat checks passed** with the real-service opt-in enabled. The latter cover two independent API processes, messages in both directions, exact retry, receipts/reactions, all typing/call signals (including 12 KB payloads), sender exclusion, outsider denial, multiple tabs, subscriber socket disconnect/reconnect, saved-history catch-up and hard-worker-crash presence expiry. Local tests also cover queue overflow, committed-write fan-out failure, signal 503 and configured-Redis startup failure. OpenAPI remains equal to the checked-in contract. The existing frontend is unchanged by Step 34; previous browser/media results retain their original scope. Redis was started only for these isolated checks and is not provisioned for deployment.


Step 35 (26 November 2026): call negotiation now waits for local media, binds the callee to the offered transceivers and serializes SDP/candidates. ICE recovery, a Retry connection action, streamless remote tracks, audio-only screen sharing and visible call-signal failures are implemented. Local UDP/TCP relay interruption/recovery and controls passed in two browser sessions with generated media. 174 web tests and TypeScript passed; focused lint has zero errors and two existing image warnings. Physical-device/separate-network testing was explicitly skipped. See [Call qualification and deployment gaps](CALL-READINESS.md).
