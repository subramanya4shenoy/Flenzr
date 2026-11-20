# Enquiry notifications and email delivery

Both creators and brands have a notification bell in their workspace. The saved notification center at `/dashboard/notifications` lists only the signed-in account's updates, including historical read items. New enquiries notify the creator and save a read confirmation for the sender. Creator decisions/counters notify the brand; brand decisions/withdrawals notify the creator. Own replies do not create an unread bell alert.

Notifications are distinct from unread enquiries: opening the notification center does not mark items read. Selecting **Open enquiry** acknowledges that alert and follows its protected, exact-record link. A failed acknowledgement retains the badge and offers retry. Viewing an enquiry also reads its alerts through the displayed revision; a newer alert remains unread. Listing and fetching a deep link have no read side effects. The link does not depend on the enquiry appearing on the first inbox page. Password and Google sign-in preserve allowlisted notification/enquiry destinations, with participant authorization repeated after sign-in. New creators still complete required onboarding first.

## Storage and privacy

Apply `alembic upgrade head` through migration `0012_notifications`. No historical alerts/emails are backfilled. `notifications` has a unique recipient/enquiry/revision constraint. `notification_emails` is a separate one-row-per-notification outbox. Both are inserted in the same transaction as the successful enquiry transition. Failed/stale actions and duplicate request/withdrawal retries do not create another alert or email. The outbox contains delivery state rather than another copy of email/contact data.

Both tables enable PostgreSQL RLS with no browser read/write policy. Access is through the authenticated account API only. Notifications include generic action text and owned enquiry links; emails omit the brief, budget and contact details. Notifications/read acknowledgements use the existing private account channel and stream to refresh bell counts and saved lists. No notification rows, credentials or recipient email addresses are broadcast. Read state and queues persist across browsers and restarts; transient client caches are account-scoped. Notification count failures do not claim an unread count of zero.

API:
- `GET /api/v1/notifications?limit=30&offset=0`: owned notifications, newest first.
- `GET /api/v1/notifications/unread-count`: owned unread count across pages.
- `POST /api/v1/notifications/{id}/read`: owner-only, idempotent acknowledgement.
- `GET /api/v1/enquiries/{id}`: participant-only detail, including the caller's viewer role.

## Email worker

Run separately from API instances:

```sh
cd backend
./run-notification-worker.sh
# Process at most one queued message and exit:
./run-notification-worker.sh --once
```

The default is **sink**, which writes `.eml` messages to `backend/.mail-sink/` without contacting an email provider. That directory is ignored by Git; files are private to the local OS user. Open them with a mail app or inspect them locally. The development worker was started in sink mode. Existing test messages were captured under `/tmp/flenzr-notifications-mail-sink/`. No live emails were sent during verification.

Configuration is documented in `backend/.env.example`:

- `NOTIFICATION_EMAIL_TRANSPORT=sink` or explicitly `smtp`.
- `NOTIFICATION_MAIL_SINK=.mail-sink` for local capture.
- `NOTIFICATION_APP_ORIGIN`: canonical application origin used in email links.
- `NOTIFICATION_EMAIL_FROM`: production sender address/domain when configured.
- `NOTIFICATION_SMTP_HOST`, `PORT` (default 587), `USERNAME`, `PASSWORD`, `STARTTLS` (default true).

Before production delivery, configure a real verified sender and SMTP service, set the application origin to the deployed HTTPS origin, and run the worker under a process supervisor. This development completion does not imply production email delivery is enabled.

Workers claim one due row using PostgreSQL `FOR UPDATE SKIP LOCKED` and an atomic claim/lease check; they release database locks before mail I/O. Expired five-minute leases can be reclaimed. Attempts and the safe failure category are saved, with exponential delay/jitter and at most five attempts. Exhaustion becomes `failed`; inactive recipients are `skipped`. A database outage retries the worker loop instead of killing it. Inspect `notification_emails.status`, `attempts`, `next_attempt_at`, `transport`, `last_error`, `sent_at` for operations. SMTP error bodies and credentials are not logged.

Sink filenames and email Message-IDs are stable per notification. Sink retries replace the same file. SMTP delivery is **at least once**: a crash after provider acceptance but before saving success can produce a duplicate. A stable Message-ID helps correlate it but does not guarantee provider deduplication. Add a provider idempotency API if stronger delivery guarantees are needed. `delivered` means the sink wrote the file or SMTP accepted the message; it is not proof of inbox placement or reading. Notification read state and email delivery state are independent.

## Manual check

1. Keep a creator and a brand signed in in separate browsers. Refresh each once to load the new bell.
2. Send a new enquiry as the brand. The creator bell increases; the brand gets a saved sent confirmation without an unread self-alert.
3. Open the creator's bell. The alert remains unread until **Open enquiry** is selected; the exact enquiry opens. Use **Open enquiry** there to review its brief and read the enquiry revision.
4. Counter/accept/decline as the creator. The brand receives a saved live alert. Repeat with a brand acceptance/decline or withdrawal to check the creator's alerts.
5. Reload: read state and history remain. Check another account cannot open the linked enquiry.
6. Inspect the local mail sink and outbox states. No real inbox delivery is expected in development sink mode.
7. Disconnect/reconnect the browser. Live updates recover; foreground polling is the fallback.

Automated coverage includes recipient isolation, deduplication, atomic rollback, read/enquiry revision boundaries, owner-only deep links, capture delivery, retry delays, exhausted leases and inactive recipients. Browser checks with an isolated SQLite API cover bell/list updates, failed read/retry, protected link return through login, exact-record views, live withdrawal, reload persistence and mobile layout. A real PostgreSQL concurrent transition test confirms one winning state, one notification/outbox row and direct-table RLS isolation.
