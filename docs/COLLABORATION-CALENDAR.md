# Calendar from agreed collaboration deadlines

P08 Step 19 · P08.05.01 completed 20 November 2026.

Creators and brands can view their own delivery deadlines at /dashboard/calendar. The creator overview and Calendar tab use the same saved feed; brands have a Calendar link beside Collaborations. Each event opens the participant-only shared collaboration.

## Source of truth and scope

- The date and deliverable details come from the immutable agreement accepted by both participants. Requested enquiry/campaign dates and private or unaccepted proposal dates are not commitments and do not appear.
- Reads join saved collaborations to their agreements, scoped on the server to the authenticated participant. No user ID is accepted from the browser. Unauthenticated requests receive 401; unrelated accounts receive an empty calendar with no other-account counts.
- Dates are all-day calendar dates, with no invented shoot times, review milestones or payment-release dates. Date formatting uses local calendar components, avoiding UTC shifts into a different day. The initial month resolves in the viewer's timezone after hydration; Today uses the viewer's current local date.
- Completed collaborations remain on their agreed delivery date with a Completed label and their completion time. Refresh fetches updated status for both accounts.
- The calendar is read-only. It does not reschedule an immutable agreement, send reminders, create bookings, collect payment, export iCal or add background subscriptions.
- Browser-local pipeline records are no longer a calendar source. The old local-deal count badge was removed from the Calendar menu so it cannot imply a saved deadline count.

## Navigation and pagination

Month controls support 1900–9998, including leap years and December/January transitions. Selecting a date filters its deadlines; All dates restores the entire month's list. Changing months resets the selected day and page, preventing invalid dates such as 31 February.

Day markers count all the account's matching deadlines for the month, independent of the current list page or selected date. Lists use bounded server pagination: five rows in the compact overview and twenty on the full calendar. Loading, failed requests, retry, no deadlines and out-of-range pages have explicit states. Aborted older requests cannot replace the currently displayed month/day.

Refresh calendar fetches current saved data. No account data or credentials are cached in localStorage by this feature. Existing shared HttpOnly account gateway and participant access rules are retained.

## API

GET /api/v1/collaborations/calendar accepts month=YYYY-MM, optional day=1..31 (validated against that month), page=1..10000 and page_size=1..50.

Response: month, day, items, total, page, page_size, month_total and day_counts. Each item includes collaboration_id, agreement_id, agreed title/participant names, delivery_date, deliverables, status and optional completed_at. Internal participant IDs, private proposal drafts, full agreement snapshots, contact data and payment details are omitted.

The static calendar route precedes the collaboration-ID route. Reads use a participant-scoped join and ISO date comparison against the saved JSON agreement field, verified on SQLite and PostgreSQL. This feature creates no new table or migration and does not rewrite existing agreements.

## Manual testing

1. In an agreed collaboration, note the saved agreement's delivery date. A requested source date or private proposal alone should not appear.
2. As the creator, open **Calendar** in the sidebar. Navigate to the agreed month and confirm the event, deliverables and counterpart names.
3. Select its date; only that date's deadlines appear. Select **All dates** to restore the month. Click **Open collaboration** and verify it opens the correct shared record.
4. As the brand, open **Calendar** from the brand workspace. Confirm the same agreed date and event. An unrelated account must not see this event or its day count.
5. Complete an approved collaboration. Click **Refresh calendar** in both accounts: the event stays on the same agreed date and shows Completed and the same completion time.
6. With several deadlines in a month, check list pagination. Day marker counts must remain the same across pages and date filters. The creator overview uses five rows per page.
7. Select January 31, then move to February. The date filter resets and shows February's actual dates. Test leap February and a December/January transition.
8. Click **Today** and verify the viewer's current local month/day is selected. Dates must stay on the same calendar day in different browser time zones.
9. Simulate a failed calendar GET: verify the error and **Retry calendar** restore the selected view. Move quickly between months; an older response must not overwrite the latest month.
10. Check narrow/mobile widths, keyboard focus, empty months and creator overview → **Open full calendar**. Browser-local pipeline entries should not appear as agreed events.

## Verification

- Backend: 468 tests passed, 11 opt-in checks skipped in the default run. Calendar API tests cover agreed versus requested dates, drafts excluded, both participants, outsiders, completion status/time, pagination/full-month counts, empty pages and invalid months/days.
- Native PostgreSQL: participant-scoped calendar reads, JSON date extraction/filtering and completion projection pass alongside the completion concurrency/privacy check.
- Web: 142 tests passed, including leap years, year limits, month rollover and date stability across time zones. TypeScript, focused lint and isolated production build pass.
- Production-browser checks pass for creator and brand views, month/day filters, full counts across compact pagination, completion refresh, local placeholder exclusion, read retry, privacy, collaboration links and mobile fit. Mobile screenshot inspected.

Step 20 is now implemented: see [Revision allowance](REVISION-ALLOWANCE.md) for agreed limits, enforcement and manual testing. Publishing proof, secure attachments, reminders and moderated feedback remain visible as separate P08 work.

Current-state due-soon/overdue indicators are implemented in Step 23: see [Deadline indicators](DEADLINE-INDICATORS.md) for the local date basis, latest-delivery rules and outstanding counts.
