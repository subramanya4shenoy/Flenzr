"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, RefreshCw } from "lucide-react";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { collaborationRequest } from "@/lib/collaborations";
import {
  calendarDate, dateLabel, dateUrgency, deadlineIndicator, localDate, localMonth,
  monthParts, shiftMonth, type CalendarPage,
} from "@/lib/collaboration-calendar";
import "./calendar.css";

type CalendarItem = CalendarPage["items"][number];
type ViewMode = "grid" | "split";

const WEEKDAYS_MON = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const LONG_WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildMonthCells(month: string) {
  const { year, number, days, offset } = monthParts(month);
  // Convert Sunday-first offset (0=Sun..6=Sat) to Monday-first (0=Mon..6=Sun)
  const monOffset = (offset + 6) % 7;
  const prevMonthStr = shiftMonth(month, -1);
  const prevDays = monthParts(prevMonthStr).days;
  const nextMonthStr = shiftMonth(month, 1);

  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  for (let i = monOffset - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ date: `${prevMonthStr}-${pad2(d)}`, day: d, inMonth: false });
  }
  for (let d = 1; d <= days; d++) {
    cells.push({ date: calendarDate(month, d), day: d, inMonth: true });
  }
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= trailing; d++) {
    cells.push({ date: `${nextMonthStr}-${pad2(d)}`, day: d, inMonth: false });
  }
  return { year, number, cells };
}

function agendaHeading(month: string, selectedDay: number | null) {
  const { year, number } = monthParts(month);
  const shortMon = SHORT_MONTHS[number - 1].toUpperCase();
  if (selectedDay === null) return `ALL OF ${shortMon}' ${year}`;
  const dt = new Date(year, number - 1, selectedDay);
  return `${pad2(selectedDay)}' ${shortMon}, ${LONG_WEEKDAYS[dt.getDay()]}`;
}

export function CollaborationCalendar({ compact = false }: { compact?: boolean }) {
  const today = useSyncExternalStore(subscribeLocalDay, localDate, serverMonth);
  return today
    ? <Calendar compact={compact} initialMonth={today.slice(0, 7)} today={today} />
    : <section className="fl-cal" aria-label="Collaboration calendar"><WorkspaceLoader label="Loading calendar…" compact /></section>;
}

function Calendar({ compact, initialMonth, today }: { compact: boolean; initialMonth: string; today: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [view, setView] = useState<ViewMode>(compact ? "split" : "grid");
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    const tParts = today.split("-").map(Number);
    return today.startsWith(initialMonth) ? tParts[2] : null;
  });
  const [attempt, setAttempt] = useState(0);

  const key = `${month}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: CalendarPage; error?: string } | null>(null);
  const loading = state?.key !== key;
  const data = loading ? undefined : state?.data;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ month, page: "1", page_size: "50" });
    collaborationRequest<CalendarPage>(`/calendar?${query}`, { signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setState({ key, data: res }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load calendar." }); });
    return () => controller.abort();
  }, [month, key]);

  const { year, number, cells } = useMemo(() => buildMonthCells(month), [month]);
  const monthTitle = `${SHORT_MONTHS[number - 1]}' ${year}`;
  const isCurrentMonth = today.startsWith(month);
  const todayWeekdayMon = useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    return (new Date(y, m - 1, d).getDay() + 6) % 7;
  }, [today]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of data?.items ?? []) {
      const list = map.get(item.delivery_date);
      if (list) list.push(item);
      else map.set(item.delivery_date, [item]);
    }
    return map;
  }, [data?.items]);

  const counts = useMemo(() => new Map(data?.day_counts.map(row => [row.delivery_date, row.total])), [data?.day_counts]);
  const outstanding = useMemo(() => new Map(data?.outstanding_counts.map(row => [row.delivery_date, row.total])), [data?.outstanding_counts]);

  const selectedDateStr = selectedDay !== null ? calendarDate(month, selectedDay) : null;
  const agendaItems = useMemo(() => {
    if (!data?.items) return [];
    if (selectedDateStr) return itemsByDate.get(selectedDateStr) ?? [];
    return data.items;
  }, [data?.items, itemsByDate, selectedDateStr]);

  function changeMonth(next: string) {
    setMonth(next);
    if (today.startsWith(next)) setSelectedDay(Number(today.slice(8, 10)));
    else setSelectedDay(null);
  }

  function jumpToday() {
    const now = new Date();
    setMonth(localMonth(now));
    setSelectedDay(now.getDate());
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return <section className="fl-cal" data-compact={compact} data-view={view} aria-label="Collaboration calendar" aria-busy={loading}>
    {/* Editorial header */}
    <header className="fl-cal-header">
      <div className="fl-cal-title-block">
        <div className="fl-cal-month-row">
          <h2 aria-live="polite">{monthTitle}</h2>
          <div className="fl-cal-nav" role="group" aria-label="Month navigation">
            <button type="button" aria-label="Previous month" disabled={month === "1900-01"} onClick={() => changeMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" className="fl-cal-today-dot" aria-label="Jump to today" title="Jump to today" onClick={jumpToday}>
              <span aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next month" disabled={month === "9998-12"} onClick={() => changeMonth(shiftMonth(month, 1))}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="fl-cal-subtitle">
          Delivery deadlines from your shared agreements. {data ? `${data.total} ${data.total === 1 ? "deadline" : "deadlines"} this month.` : ""}
        </p>
      </div>

      <div className="fl-cal-controls">
        <div className="fl-cal-view-switch" role="tablist" aria-label="Calendar view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "grid"}
            data-active={view === "grid"}
            title="Full month grid"
            aria-label="Full month grid"
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "split"}
            data-active={view === "split"}
            title="Month & day agenda"
            aria-label="Month and day agenda"
            onClick={() => setView("split")}
          >
            <CalendarDays size={15} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="fl-cal-icon-btn"
          disabled={loading}
          title="Refresh calendar"
          aria-label="Refresh calendar"
          onClick={() => setAttempt(v => v + 1)}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
        </button>

        {compact ? (
          <Link className="fl-cal-cta" href="/dashboard/calendar">
            Full calendar <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        ) : (
          <Link className="fl-cal-cta" href="/dashboard/collaborations">
            Collaborations <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        )}
      </div>
    </header>

    {state?.error && (
      <div className="fl-cal-error" role="alert">
        <p>{state.error}</p>
        <button type="button" onClick={() => setAttempt(v => v + 1)}>Retry</button>
      </div>
    )}

    {/* VIEW 1: Full Month Editorial Grid (Inspiration 1) */}
    {view === "grid" ? (
      <div className="fl-cal-grid-wrap">
        <div className="fl-cal-weekdays">
          {WEEKDAYS_MON.map((wd, idx) => (
            <span key={wd} className="fl-cal-weekday" data-today={isCurrentMonth && idx === todayWeekdayMon}>
              {wd}
            </span>
          ))}
        </div>

        <div className="fl-cal-month-grid" aria-label={monthTitle}>
          {cells.map(cell => {
            const isToday = cell.date === today;
            const isSelected = cell.inMonth && selectedDay === cell.day;
            const dayItems = cell.inMonth ? (itemsByDate.get(cell.date) ?? []) : [];
            const totalCount = cell.inMonth ? (counts.get(cell.date) ?? dayItems.length) : 0;
            const owed = cell.inMonth ? (outstanding.get(cell.date) ?? 0) : 0;
            const urgency = owed ? dateUrgency(cell.date, today).key : undefined;
            const shown = dayItems.slice(0, 2);
            const overflow = Math.max(0, totalCount - shown.length);

            return (
              <div
                key={cell.date}
                className="fl-cal-cell"
                data-outside={!cell.inMonth}
                data-today={isToday}
                data-selected={isSelected}
                data-deadline={urgency}
                onClick={() => {
                  if (!cell.inMonth) {
                    changeMonth(cell.date.slice(0, 7));
                    setSelectedDay(cell.day);
                    return;
                  }
                  setSelectedDay(cell.day);
                }}
              >
                <div className="fl-cal-cell-head">
                  <span className="fl-cal-day-num">{pad2(cell.day)}</span>
                  {isToday && <span className="fl-cal-today-tag">Today</span>}
                </div>

                {cell.inMonth && shown.length > 0 && (
                  <div className="fl-cal-cell-events">
                    {shown.map(item => {
                      const ind = deadlineIndicator(item, today);
                      return (
                        <Link
                          key={item.collaboration_id}
                          href={`/dashboard/collaborations/${item.collaboration_id}`}
                          className="fl-cal-cell-event"
                          data-deadline={ind.key}
                          onClick={e => e.stopPropagation()}
                        >
                          <strong>{item.title}</strong>
                          <span>{ind.label} · {item.creator_name}</span>
                        </Link>
                      );
                    })}
                    {overflow > 0 && (
                      <button
                        type="button"
                        className="fl-cal-more-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDay(cell.day);
                          setView("split");
                        }}
                      >
                        And {overflow} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      /* VIEW 2: Split Dot Calendar + Editorial Day Agenda (Inspiration 2) */
      <div className="fl-cal-split">
        <div className="fl-cal-split-left">
          <div className="fl-cal-weekdays fl-cal-weekdays-ruled">
            {WEEKDAYS_MON.map((wd, idx) => (
              <span key={wd} className="fl-cal-weekday" data-today={isCurrentMonth && idx === todayWeekdayMon}>
                {wd}
              </span>
            ))}
          </div>

          <div className="fl-cal-dot-grid" aria-label={monthTitle}>
            {cells.map(cell => {
              const isToday = cell.date === today;
              const isSelected = cell.inMonth && selectedDay === cell.day;
              const totalCount = cell.inMonth ? (counts.get(cell.date) ?? 0) : 0;
              const owed = cell.inMonth ? (outstanding.get(cell.date) ?? 0) : 0;
              const urgency = owed ? dateUrgency(cell.date, today).key : undefined;
              const dotCount = Math.min(5, totalCount);

              return (
                <button
                  key={cell.date}
                  type="button"
                  className="fl-cal-dot-cell"
                  data-outside={!cell.inMonth}
                  data-today={isToday}
                  data-selected={isSelected}
                  data-deadline={urgency}
                  aria-pressed={isSelected}
                  aria-label={`${dateLabel(cell.date)}${totalCount > 0 ? ` · ${totalCount} ${totalCount === 1 ? "deadline" : "deadlines"}` : ""}`}
                  onClick={() => {
                    if (!cell.inMonth) {
                      changeMonth(cell.date.slice(0, 7));
                      setSelectedDay(cell.day);
                      return;
                    }
                    setSelectedDay(prev => (prev === cell.day ? null : cell.day));
                  }}
                >
                  <span className="fl-cal-dot-num">{pad2(cell.day)}</span>
                  <span className="fl-cal-dots" aria-hidden="true">
                    {Array.from({ length: dotCount }, (_, i) => (
                      <i key={i} data-urgent={urgency === "overdue" || urgency === "due_today"} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Editorial Day Agenda */}
        <aside className="fl-cal-agenda" aria-label="Selected day deadlines">
          <div className="fl-cal-agenda-head">
            <h3>{agendaHeading(month, selectedDay)}</h3>
            {selectedDay !== null && (
              <button type="button" className="fl-cal-agenda-all" onClick={() => setSelectedDay(null)}>
                Show all month
              </button>
            )}
          </div>

          {loading ? (
            <WorkspaceLoader label="Loading deadlines…" compact />
          ) : agendaItems.length === 0 ? (
            <div className="fl-cal-agenda-empty">
              <p>{selectedDay !== null ? "No agreed delivery deadlines on this date." : "No agreed delivery deadlines this month."}</p>
            </div>
          ) : (
            <div className="fl-cal-agenda-list">
              {agendaItems.map(item => {
                const ind = deadlineIndicator(item, today);
                const highlight = ind.key === "overdue" || ind.key === "due_today";
                return (
                  <Link
                    key={item.collaboration_id}
                    href={`/dashboard/collaborations/${item.collaboration_id}`}
                    className="fl-cal-agenda-item"
                    data-highlight={highlight}
                    data-deadline={ind.key}
                  >
                    <div className="fl-cal-agenda-item-top">
                      <span className="fl-cal-agenda-time">
                        {selectedDay === null ? `${dateLabel(item.delivery_date)} · ` : ""}{ind.label}
                      </span>
                      <ArrowUpRight size={14} className="fl-cal-agenda-arrow" aria-hidden="true" />
                    </div>
                    <strong>{item.title}</strong>
                    <span className="fl-cal-agenda-sub">{item.brand_name} · {item.creator_name}</span>
                    {item.deliverables && <p className="fl-cal-agenda-deliv">{item.deliverables}</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    )}

    <footer className="fl-cal-footer">
      <span>Status as of {dateLabel(today)} ({timezone}) · Draft dates appear after mutual agreement.</span>
    </footer>
  </section>;
}
