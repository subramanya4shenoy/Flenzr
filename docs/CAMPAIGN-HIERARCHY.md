# Campaigns and offers

The brand workspace now uses **Brand → Campaign → Offers → Applications and invitations → Collaborations**.

Choose **Campaigns** in the brand menu to see up to four recent campaign folders above a searchable table of every campaign. Recent folders also remain in the table. Unassigned offers can also be reopened from the recent shelf; their opening history is saved on this device and scoped to the brand organization. Recent shortcuts include only folders actually opened, ordered by their last opening; opening is saved for the owning brand without changing its edit revision. Create a campaign with a name and optional objective, open it, then choose **New Offer**. New offers inherit that campaign. A campaign can contain several offers with independent briefs, audiences, deadlines, budgets and publication states. Its status is derived from its offers; its planned budgets add offer budgets separately for each currency. These are declared budgets, not actual spend.

Existing offers remain available under **Unassigned offers**. Use **Manage Offer → Move to campaign** to organise them, including published and closed offers. Moving an offer preserves its ID, brief, audience, applications, invitations, negotiations and collaborations. It increments the offer revision so an older editor or negotiation cannot silently act on stale information. Direct Offers remain a separate workflow.

Campaign folders are private to the owning brand. Creator-facing public offers and opportunities continue to show individual offer briefs. The owning brand's offer page has a return link to its parent campaign. Folder links use `/dashboard/brand#campaigns/{id}` and survive reload and browser navigation; `/dashboard/brand#campaigns` opens the folder grid.

## Storage and compatibility

Migration `0029_campaign_hierarchy` adds `marketing_campaigns` and nullable `campaigns.parent_campaign_id`. The existing `campaigns` table and `/campaigns` offer API names stay stable for existing clients. No offer or participant rows are rewritten or deleted. A composite foreign key enforces that an offer and its parent belong to the same organization. PostgreSQL row-level security blocks browser access to the new table; authorized backend routes enforce ownership.

Private parent endpoints under `/api/v1/campaigns`:

- `GET /folders` and `POST /folders`: list and create the owner's parent campaigns. Creation uses a request UUID for safe retries.
- `GET /folders/{id}` and `PATCH /folders/{id}`: read or edit a parent. Edits require `expected_revision`.
- `PATCH /{offer_id}/folder`: move an existing offer to an owned parent using `parent_campaign_id` and `expected_revision`.

Draft creation and the legacy create-and-publish path accept `parent_campaign_id`. Legacy clients may omit it; those offers appear as unassigned. The browser's new-offer flow always supplies the selected parent. Applications, invitations and collaborations continue referencing the existing offer ID.

## Verification

Backend hierarchy tests cover parent validation, same-brand ownership at the API and database layers, safe retries, stale edits and moves, multiple offers per parent, legacy offers, public folder privacy, and preservation of application/invitation records. Existing offer and collaboration suites verify the unchanged workflows. Web tests cover grouping, separate currency totals, derived status and parent URLs.

Browser checks use a disposable SQLite database and isolated web server. They create a campaign, add two offers, move a pre-existing published offer into it, verify its parent return link and reload, and inspect desktop/mobile layouts.

Migration `0030_campaign_recency` adds nullable `marketing_campaigns.last_opened_at`. `POST /api/v1/campaigns/folders/{id}/open` records an owner opening; it preserves the content revision and edit timestamp.
