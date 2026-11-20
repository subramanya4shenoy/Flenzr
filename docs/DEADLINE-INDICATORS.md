# Due-soon and overdue calendar indicators

P08 Step 23 · P08.06.01 completed 20 November 2026.

The shared calendar now distinguishes upcoming, due-soon, due-today and overdue outstanding work using each saved agreement's date and its current delivery state. The creator overview, creator Calendar tab and shared brand calendar use the same data and rules.

## Display rules

- Unsubmitted work is Upcoming when its deadline is more than seven calendar days away, Due in N days for the next one through seven days, Due today on the agreed date, and Overdue after it.
- Requested revisions use the same agreed date, with Revision due today or Revision overdue where appropriate. No replacement deadline is invented.
- Submitted work without a review is Awaiting review. If the agreed date has passed, the explanation says so without labelling the creator's submitted work overdue.
- The latest approved delivery is Approved, irrespective of its past date. Completion remains a separate action.
- Completed work remains Completed on the historical agreed date. It cannot become overdue.
- Only the exact latest delivery and its review determine state. An earlier approval cannot hide newer unreviewed work; submitting a new version after a revision request changes the state back to Awaiting review.

All labels have text, not just color. Day markers retain the total count of all deadlines and highlight urgency only when that date has unsubmitted work or outstanding revisions. Their accessible labels also identify the outstanding count and urgency. Completed, approved and pending-review records do not contribute to outstanding marker counts. Counts cover the full month independently of pagination/day filters.

## Date basis and refresh

Deadlines are all-day calendar dates. The page states its current local date and timezone and defines due soon as the next seven calendar days. Viewers in different timezones may see a different urgency label around local midnight; the saved agreement date and delivery state stay the same.

Date differences use calendar-day ordinals, avoiding DST-related 23/25-hour off-by-one errors. The initial date resolves after hydration in the viewer's timezone. A local-midnight timer and focus/visibility checks update the date basis without refetching account data. Refresh calendar fetches new submissions/review/completion state; no background account polling or live subscription was added.

These are read-only indicators. They do not amend an agreement, impose a penalty, change approval or completion, charge money, create a booking, or send reminders. Written scope still applies.

## API and privacy

GET /api/v1/collaborations/calendar now includes each item's delivery_state and latest_delivery_version, plus month-wide outstanding_counts using the existing date/count shape. Existing day_counts continue to count every matching deadline.

The read joins only the current delivery/review and aggregates outstanding counts with participant/month scope. It avoids one lookup per event and is verified on SQLite and PostgreSQL. Unauthenticated requests receive 401 and unrelated accounts receive empty events/counts. No database migration or stored agreement rewrite is needed.

## Manual testing

1. Open an agreed collaboration with a delivery date in the displayed month. Before submission, verify Upcoming, Due in N days, Due today or Overdue according to the date basis shown on the calendar.
2. Check the seven-day boundary: a deadline seven days away is due soon; eight days away is Upcoming. A date earlier than today is Overdue, not Due today.
3. Submit work as creator and refresh the calendar in both accounts. It becomes Awaiting review, including when the agreed date has passed.
4. Request revisions as brand/client and refresh. The original agreed date determines revision urgency. Submit a new version: Awaiting review returns.
5. Approve the current version and refresh. It is Approved and no longer contributes to outstanding counts. Submit a newer version before completion: only its new state is used.
6. Complete approved work and refresh. It remains Completed even when viewing older months/dates.
7. On a date with mixed records, verify all deadlines are counted but only unsubmitted work/revisions contribute to urgency. Pagination and date filtering must preserve month-wide counts.
8. Check the date/timezone printed on the page. Leave the page open across local midnight, or return to the tab afterward. The date basis and badges update without an account-data refresh. Today selects the viewer's local date.
9. Test a timezone change near midnight and DST/leap/year boundaries. A saved calendar date must not shift; urgency uses the viewer's stated date basis.
10. Verify creator overview compact pagination, brand/creator access, error/retry, empty months, record links, keyboard labels and narrow/mobile widths. No reminder or payment action should occur.

## Verification

- Backend: 500 tests pass, 14 opt-in checks skipped by default. Calendar tests cover unsubmitted → awaiting review → revisions → newer submission → approval → completion and participant-only outstanding counts.
- Native PostgreSQL: current delivery state and outstanding-count aggregation pass alongside the existing completion/concurrency/privacy check.
- Web: 146 tests pass; TypeScript, focused lint and isolated production build pass. Added coverage includes lifecycle precedence, the inclusive seven-day threshold, leap/year rollover, DST and multiple timezones.
- Production-browser checks pass both roles' badges, review/approval/completion exclusions, full-month counts across compact pagination, local-date/timezone focus rollover without refetch, refreshed review state, failed read/retry, privacy, record links and mobile fit. Screenshot inspected.

Updated scope: deadline reminders are reserved for native push notifications under P15.05, with shared backend scheduling/preferences. Next web task: Step 24 — private collaboration file uploads. Email delivery and moderated feedback remain separate roadmap work.
