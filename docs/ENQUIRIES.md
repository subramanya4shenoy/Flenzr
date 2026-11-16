# Media-kit enquiries

The first persisted creator/brand collaboration slice is available in the web app.

- On a public creator media kit, select **Custom Offer** or a package’s **Send enquiry** action.
- Sign in to a **brand** account to send. If needed, the composer opens sign-in in another tab and retains its fields while you return and retry.
- Creators review requests in **Studio → Collabs**. Brands use **Brand Portal → Enquiries** or `/dashboard/brand/enquiries`.
- Creators can accept, decline or counter the budget. Brands can accept or decline a counter. The brief, package snapshot, budget and response history persist across browsers and reloads.
- Acceptance expresses interest in the displayed terms. It does not create a funded deal, reserve money, publish content or send email.

## API and storage

Apply `backend/alembic/versions/0008_enquiries.py` (`alembic upgrade head`). The `enquiries` table stores participant IDs, the original package title/price/currency snapshot, brief, status, revision and response history. Package changes do not alter existing requests. PostgreSQL row-level security blocks direct PostgREST access; the backend database owner/service role accesses the table, enforcing participant ownership in the API.

| Endpoint | Access / behavior |
| --- | --- |
| `POST /api/v1/enquiries` | Signed-in brand owner; validated creator/package; caller-owned request UUID deduplicates retries. |
| `GET /api/v1/enquiries/me?view=received\|sent&limit=30&offset=0` | Signed-in participant; only their requests, paginated newest first. |
| `POST /api/v1/enquiries/{id}/respond` | Participant and state checked; requires `expected_revision`; stale updates return 409. |

Web requests use the existing HttpOnly-cookie account gateway and same-origin mutation checks. Contact email comes from the authenticated sender, not an editable form field. Brand name is sender-supplied, not a verified organization claim. No enquiries or contact details are stored in browser localStorage. The inbox uses account-specific transient query keys, cancels inactive requests and does not refetch on focus. A maximum of 30 new enquiries per sender in a rolling 24 hours applies; idempotent retries remain allowed after reaching the cap.

States: `pending → accepted | declined | countered`; `countered → accepted | declined` by the brand. Decisions are final in this initial enquiry flow. Full versioned scope negotiations and deal contracts belong to the later proposals workstream.

## Validation and remaining work

Backend tests cover two-user persistence, unauthorized access, retry conflicts, package ownership and snapshots, state transitions, stale revisions, validation and daily limits. Browser checks use an isolated SQLite API with separate test identities; user accounts and social connections are not changed.

Remaining: structured deadlines, unread/read tracking, withdrawing an open request, richer term negotiation, in-app/email notifications, moderation controls and integration into overview/calendar widgets. Legacy browser-only pipeline data is not migrated or turned into accepted enquiries; Collabs now opens the persisted inbox.
