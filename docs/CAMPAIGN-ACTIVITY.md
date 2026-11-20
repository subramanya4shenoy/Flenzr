# Campaign activity — P06 Step 07 · P06.06.01

Implemented 19 November 2026.

Brands: **Brand workspace → Campaigns → Applications & invitations** on a campaign card. Creators: **Collabs → Campaign activity**, below the enquiry inbox. The two buttons switch between Applications and Invitations. Viewing records does not mark enquiries read, respond to campaigns, or create a deal/payment.

The lists show saved participant names, campaign title/status, proposed/offered quote in the campaign currency, submission date and record status. Expand View pitch or View invitation to read the saved message. Missing messages are stated explicitly. Closed/paused/cancelled campaigns retain their existing activity history.

Each page contains up to 20 records, ordered newest first with ID as a deterministic tie-breaker. Switching record type or campaign resets pagination. Refresh fetches saved backend records; no timer or provider request is added. Failed reads clear the displayed list and offer Retry. Loading, empty, expired-session and access-denied states are explicit. Requests are aborted when the view changes to prevent old responses replacing the current list.

## API and privacy

Authenticated GET routes:

- `/api/v1/campaigns/me/applications` and `/me/invitations`: owning brand organization only.
- `/api/v1/campaigns/creator/applications` and `/creator/invitations`: current creator profile only.

All accept optional campaign_id, page (1–10,000), and page_size (1–50, default 20), returning items, total, page and page_size. Browser calls go through `/api/account/campaigns/...`, retaining access tokens in HttpOnly cookies. Private responses bypass caching.

Scope comes from the session, never a supplied creator/organization ID. Brand campaign filters require ownership. Creator filters remain limited to the creator's own rows, including when another campaign ID is supplied. Queries project only display fields; credentials, billing email and other participants' messages are excluded. Existing campaign-table API-only RLS remains unchanged. No migration is needed beyond the existing campaign migrations.

This slice adds lists. Application submission and invitation composition are separate flows; their existing creation APIs can populate the lists. The [discovery invitation composer](CAMPAIGN-INVITATIONS.md) now supports sending invitations in the brand UI. Response controls are now available in [Step 08](CAMPAIGN-RESPONSES.md). The [creator opportunity board](CAMPAIGN-OPPORTUNITIES.md) is now available.

## Verification

- Full backend: **340 passed, 4 skipped** (opt-in PostgreSQL checks).
- Full web: **118 passed**, plus TypeScript and focused lint.
- Production build and browser checks: brand pagination across 21 real saved applications/invitations, message expansion, tab reset, failed refresh/retry, creator isolation, empty views and mobile layout.
- Existing Next.js security advisory remains a separate dependency follow-up. Tests do not establish production load capacity.

## Manual checks

1. Sign in as a brand. Open Campaigns and choose Applications & invitations on a campaign. With no records, both lists should show a clear empty state.
2. For a campaign with existing applications/invitations, check creator names, statuses, currency/quotes and dates. Expand a message and verify its saved text. Return with ← Campaigns.
3. Sign in as a participating creator. Open Collabs and scroll to Campaign activity. Applications must show only that creator's applications; Invitations must show only invitations sent to them.
4. Refresh the browser. Both accounts should see the saved records again. A different creator/brand must not see the first account's records.
5. If more than 20 records exist, use Next/Previous, then change record type. Pagination should restart at page 1.
6. In browser network tools, block the campaign list request, click Refresh, and verify Retry appears without stale records. Unblock and Retry.
7. Check the same views at mobile width. Long messages should wrap within the card.

### Optional development record setup

If there are no existing records, use the authenticated same-origin gateway in browser DevTools on your local Flenzr instance. This writes real test records, so use a test campaign and test accounts.

First publish a complete campaign as a brand and copy its ID. As a test creator, run:

```js
const campaignId = 'YOUR_TEST_CAMPAIGN_ID';
const creator = await fetch('/api/account/creators/me').then(r => r.json());
console.log('Creator ID for invitation:', creator.id);
await fetch(`/api/account/campaigns/${campaignId}/apply`, {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({pitch_message: 'A test campaign pitch.', proposed_rate_cents: 12345})
}).then(async r => ({status: r.status, body: await r.json()}));
```

As the owning test brand, substitute the same campaign ID and printed creator ID:

```js
await fetch('/api/account/campaigns/YOUR_TEST_CAMPAIGN_ID/invite', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({creator_id: 'TEST_CREATOR_ID', message: 'A test invitation.', offered_rate_cents: 23456})
}).then(async r => ({status: r.status, body: await r.json()}));
```

Successful creation returns 201; duplicate records are rejected. Refresh each list to verify the records. Quotes are 123.45 and 234.56 in the campaign currency. No money is transferred.

Step 08 is complete: [Campaign responses](CAMPAIGN-RESPONSES.md). Step 09 is complete: [Campaign invitations](CAMPAIGN-INVITATIONS.md). Step 10 is complete: [Campaign opportunities](CAMPAIGN-OPPORTUNITIES.md). Step 11 is complete: [Private brand shortlists](SHORTLISTS.md). Next: **P06 Step 12 · P06.08.01 — Real campaign application and invitation pipeline totals**.
