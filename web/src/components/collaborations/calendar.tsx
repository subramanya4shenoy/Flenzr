"use client";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { collaborationRequest } from "@/lib/collaborations";
import { calendarDate, dateLabel, localMonth, localDate, dateUrgency, deadlineIndicator, monthParts, shiftMonth, type CalendarPage } from "@/lib/collaboration-calendar";
import "./calendar.css";

function subscribeLocalDay(notify: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function schedule() {
    clearTimeout(timer);
    const now = new Date(), midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(wake, Math.max(50, midnight.getTime() - now.getTime() + 50));
  }
  function wake() { notify(); schedule(); }
  function visible() { if (document.visibilityState === "visible") wake(); }
  schedule(); window.addEventListener("focus", wake); document.addEventListener("visibilitychange", visible);
  return () => { clearTimeout(timer); window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", visible); };
}
const serverMonth = () => null;
export function CollaborationCalendar({ compact = false }: { compact?: boolean }) {
  // Resolve the initial month in the viewer's timezone after hydration.
  const today = useSyncExternalStore(subscribeLocalDay, localDate, serverMonth);
  return today ? <Calendar compact={compact} initialMonth={today.slice(0, 7)} today={today} /> : <section className="fl-collab-calendar" aria-label="Collaboration calendar"><WorkspaceLoader label="Loading calendar…" compact /></section>;
}
function Calendar({ compact, initialMonth, today }: { compact: boolean; initialMonth: string; today: string }) {
  const [month, setMonth] = useState(initialMonth), [day, setDay] = useState<number | null>(null);
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const key = `${month}:${day}:${page}:${attempt}:${compact}`;
  const [state, setState] = useState<{ key: string; data?: CalendarPage; error?: string } | null>(null);
  const loading = state?.key !== key, data = loading ? undefined : state?.data;
  const { year, number, days, offset } = monthParts(month);
  const label = new Date(year, number - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ month, page: String(page), page_size: compact ? "5" : "20" });
    if (day !== null) query.set("day", String(day));
    collaborationRequest<CalendarPage>(`/calendar?${query}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load calendar." }); });
    return () => controller.abort();
  }, [month, day, page, compact, key]);
  function changeMonth(value: string) { setMonth(value); setDay(null); setPage(1); }
  const counts = new Map(data?.day_counts.map(row => [row.delivery_date, row.total]));
  const outstanding = new Map(data?.outstanding_counts.map(row => [row.delivery_date, row.total]));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <section className="fl-collab-calendar" data-compact={compact} aria-label="Collaboration calendar" aria-busy={loading}>
    <header><div><h2>Collaboration calendar</h2><p>Delivery dates from your shared agreements.</p></div><button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Refresh calendar</button></header>
    <div className="fl-calendar-toolbar"><button type="button" aria-label="Previous month" disabled={month === "1900-01"} onClick={() => changeMonth(shiftMonth(month, -1))}>←</button><h3 aria-live="polite">{label}</h3><button type="button" aria-label="Next month" disabled={month === "9998-12"} onClick={() => changeMonth(shiftMonth(month, 1))}>→</button><button type="button" onClick={() => { const today = new Date(); setMonth(localMonth(today)); setDay(today.getDate()); setPage(1); }}>Today</button></div>
    <div className="fl-calendar-grid" aria-label={label}>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(value => <span className="fl-calendar-weekday" key={value}>{value}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
      {Array.from({ length: days }, (_, index) => { const value = index + 1, date = calendarDate(month, value), count = counts.get(date) || 0, owed = outstanding.get(date) || 0, urgency = owed ? dateUrgency(date, today).key : undefined; return <button type="button" key={value} data-deadline={urgency} aria-pressed={day === value} aria-label={`${dateLabel(date)}${data ? ` · ${count} ${count === 1 ? "deadline" : "deadlines"}${owed ? ` · ${owed} outstanding · ${urgency === "due_today" ? "due today" : urgency === "due_soon" ? "due within 7 days" : urgency}` : ""}` : ""}`} onClick={() => { setDay(value); setPage(1); }}><span>{value}</span>{count > 0 && <span className="fl-calendar-count" aria-hidden="true">{count}</span>}</button>; })}
    </div>
    <div className="fl-calendar-filter"><button type="button" aria-pressed={day === null} onClick={() => { setDay(null); setPage(1); }}>All dates</button><span>{day === null ? label : dateLabel(calendarDate(month, day))}</span></div>
    {loading ? <WorkspaceLoader label="Loading agreed deadlines…" compact /> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry calendar</button></div> : data && <>
      <p className="fl-calendar-summary">{data.total} {data.total === 1 ? "deadline" : "deadlines"}{day !== null ? " on this date" : " this month"}. Completed work stays visible.</p>
      {!data.items.length && <p>{page > 1 ? "No deadlines on this page. Go back to the previous page." : day !== null ? "No agreed deliveries due on this date." : "No agreed deliveries due this month."}</p>}
      <p className="fl-calendar-date-basis">Status as of {dateLabel(today)} · {timezone}. Due soon means the next 7 calendar days.</p>
      <div className="fl-calendar-events">{data.items.map(item => { const indicator = deadlineIndicator(item, today); return <article key={item.collaboration_id} data-status={item.status} data-deadline={indicator.key}><div className="fl-calendar-event-top"><time dateTime={item.delivery_date}>{dateLabel(item.delivery_date)}</time><span className="fl-deadline-badge">{indicator.label}</span></div><h3><Link href={`/dashboard/collaborations/${item.collaboration_id}`}>{item.title}</Link></h3><p className="fl-deadline-detail">{indicator.detail}</p><p>{item.brand_name} · {item.creator_name}</p><p className="fl-calendar-deliverables">{item.deliverables}</p>{item.completed_at && <p>Completed {new Date(item.completed_at).toLocaleString()}</p>}<Link href={`/dashboard/collaborations/${item.collaboration_id}`}>Open collaboration →</Link></article>; })}</div>
      <nav aria-label="Calendar deadline pages"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous deadlines</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button type="button" disabled={page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>More deadlines</button></nav>
    </>}
    <footer><p>Dates are all-day delivery deadlines. Markers count all deadlines; colors highlight outstanding work. Only unsubmitted work or requested revisions can be overdue. Submitted work awaiting review is shown separately. Draft proposal dates appear after both participants agree.</p>{compact && <Link href="/dashboard/calendar">Open full calendar →</Link>}</footer>
  </section>;
}
