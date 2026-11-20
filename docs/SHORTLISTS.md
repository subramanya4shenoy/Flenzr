# Private brand shortlists — P06 Step 11 · P06.04.01

Implemented 19 November 2026. Brands use **Creator Discovery → Save** or the new **Shortlists** tab.

## Workflow

From a creator card, Save opens the group's picker. Choose an existing shortlist and Save creator, or enter a new name and choose Create & save. The picker supports group search and pagination. Existing membership is shown explicitly and cannot create a duplicate. The same creator can be saved in several groups. A successful save offers View shortlist.

The Shortlists tab supports creating groups, paginated browsing/search, opening saved creators, removing a membership and deleting a group after confirmation. Remove affects only the selected group's membership; deleting a group removes its memberships without deleting creator profiles, campaigns or invitations. Renaming groups is not part of this slice.

Saved cards display current public profile fields and link to the media kit. Invite to campaign opens the existing invitation composer for that creator. If a creator's account becomes unavailable, the saved card hides its profile fields and invitation/media-kit actions, and remains removable. Deleted creator profiles cascade-delete memberships on PostgreSQL. Group counts count saved memberships, including unavailable profiles.

Groups are private to the owning brand organization. Saving does not notify creators, and does not automatically send invitations, emails or notifications. Only references are stored: no copied social credentials, account emails or profile snapshots.

## API and retry behavior

All routes require the brand-owner role and derive organization ownership from the session:

- `GET /api/v1/shortlists`: q (max 80), page (1–10,000), page_size (1–50, default 20). Returns groups with membership counts.
- `POST /api/v1/shortlists`: request_id UUID and name (1–80 characters after whitespace normalization). Same ID/name retries return the original group. Group names are unique within an organization after case folding; different IDs using an existing name return 409.
- `GET /api/v1/shortlists/{id}`: owned group and current count.
- `GET /api/v1/shortlists/{id}/members`: paginated current public fields, saved_at and opaque membership IDs.
- `GET /api/v1/shortlists/{id}/creators/{handle}`: saved membership or null.
- `PUT /api/v1/shortlists/{id}/creators/{handle}`: save an available creator once; identical retries return the same membership. Existing membership remains readable/removable when the account becomes unavailable.
- `DELETE /api/v1/shortlists/{id}/members/{member_id}`: idempotent scoped removal, returning 204 even when already absent.
- `DELETE /api/v1/shortlists/{id}`: delete owned group and memberships. Unknown/other-organization groups return 404; the UI treats an already deleted group as gone.

Group row locks coordinate membership changes/deletion. Unique indexes and integrity-conflict recovery handle simultaneous group creation and duplicate membership writes. Names, quotes, campaign data and creator profiles cannot be changed through membership endpoints. Body-supplied organization overrides are rejected by group creation; other scopes always come from the session and route.

Browser traffic uses `/api/account/shortlists` with HttpOnly authentication, same-origin mutation checks and no-store reads. The gateway now forwards PUT in addition to its existing methods. Read failures show Retry; write failures preserve inputs. The Create & save flow can recover when group creation succeeded but saving the creator failed. Closing an unsaved group name asks before discarding it.

## Migration

`0016_brand_shortlists` creates brand_shortlists and brand_shortlist_members, ownership/creator foreign keys and uniqueness indexes. Both tables have PostgreSQL RLS enabled with a restrictive API-only false policy. Browser anon/authenticated database roles cannot read or write either table; the trusted backend enforces owner scope.

The additive migration was applied to the development database. For another deployment, run `env DEBUG=false .venv/bin/alembic upgrade head` from backend before using shortlists. No existing business records are rewritten. SQLite tests use the matching ORM schema; PostgreSQL checks use actual migrated tables.

## Verification

- Full backend: **387 passed, 5 skipped** (opt-in database checks).
- Full web: **134 passed**; TypeScript and focused lint passed.
- Separate native PostgreSQL shortlist check: **1 passed** on disposable PostgreSQL 16 after applying migrations. Validates RLS policies and permission-denied SQLSTATE for browser-role writes, concurrent group creation, duplicate saves, removals and save/delete races in an isolated schema.
- Production build/browser: create-and-save failure/retry, multiple groups, duplicate prevention, mobile picker fit, invitation from a saved creator, live public-profile refresh, failed member read/retry, scoped removal, cancelled/confirmed deletion, group pagination/search, reload persistence and cross-brand isolation.
- Existing Next.js dependency security advisory remains a separate follow-up. These checks do not establish load capacity or email deliverability.

Opt-in native check: `env DEBUG=false FLENZR_TEST_SHORTLIST_POSTGRES=1 .venv/bin/python -m pytest tests/test_shortlists_postgres.py -q`. It requires migrated PostgreSQL with anon/authenticated testable roles, creates/drops its own temporary schema, and does not insert business data into public tables.

## Manual checks

1. Sign in as a brand with its profile saved. Search for a test creator in Creator Discovery and click Save.
2. With no groups, enter Launch creators and choose Create & save. Expect Creator saved, then View shortlist should show one saved creator.
3. Return to discovery and Save the same creator into the same group. Expect Already saved and no duplicate. Select or create another group and save there; both groups should contain the creator independently.
4. Open Shortlists. Refresh and reopen the group to verify persistence. Search by group name; with more than 20 groups/members, test pagination.
5. Update the creator's public name/bio through that creator's account, then refresh the saved group. It should show current public details.
6. Choose Invite to campaign on a saved card. Complete the existing invitation flow; View invitation should open the campaign's Invitations tab.
7. Remove a creator using its remove icon. The count should decrease only in that group. The creator should remain in another group and the public profile should still exist.
8. Choose Delete shortlist, then Keep shortlist. It must remain. Delete and confirm; the group and its memberships disappear, while creator accounts and campaign invitations remain.
9. Sign in as a different brand in another browser/profile. Its group list must not contain the first brand's groups, and copied group IDs must not grant access. A creator account also cannot access brand shortlists.
10. Simulate failed list/save requests in browser network tools. Retry should recover without creating duplicate groups/memberships. At 390px, verify the picker, search, create form and close controls fit.

Use test accounts for invitations. Saving to a private group alone does not contact the creator.

Next: **P06 Step 12 · P06.08.01 — Real campaign application and invitation pipeline totals**. Actual spending remains later work tied to deal/payment records; creator comparison is also separate roadmap work.
