"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/language-context";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  ShieldCheck,
  Plus,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  day: number;
  time: string;
  title: string;
  brand: string;
  deliverableType: string;
  amount: string;
  status: "in_progress" | "review" | "completed";
  color: "indigo" | "violet" | "emerald";
}

const EVENTS_DATA: CalendarEvent[] = [];

interface CreatorScheduleCalendarProps {
  deals?: any[];
}

export function CreatorScheduleCalendar({ deals }: CreatorScheduleCalendarProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [localDeals, setLocalDeals] = useState<any[]>(deals || []);

  useEffect(() => {
    if (deals !== undefined) {
      setLocalDeals(deals);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("flenzr_collab_pipeline_deals");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLocalDeals(parsed);
          return;
        }
      }
    } catch {}
  }, [deals]);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem("flenzr_collab_pipeline_deals");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setLocalDeals(parsed);
        }
      } catch {}
    };
    window.addEventListener("flenzr_pipeline_updated", handleUpdate);
    return () => window.removeEventListener("flenzr_pipeline_updated", handleUpdate);
  }, []);

  const activeEvents: CalendarEvent[] = (() => {
    if (localDeals && localDeals.length > 0) {
      const filtered = localDeals.filter((d) => {
        if (d.stage === "inbound" || !d.dueDate) return false;
        const date = new Date(d.dueDate);
        return !Number.isNaN(date.getTime()) && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
      });
      if (filtered.length > 0) {
        return filtered.map((deal, idx) => {
          const dueDate = new Date(deal.dueDate);
          const day = dueDate.getDate();
          return {
            id: `ev-${deal.id || idx}`,
            day,
            time: deal.time || "Time not set",
            title: `${deal.brand} ${deal.deliverable}`,
            brand: deal.brand,
            deliverableType: deal.deliverable,
            amount: deal.amount,
            status: deal.stage === "completed" ? "completed" : deal.stage === "review" ? "review" : "in_progress",
            color: deal.stage === "completed" ? "emerald" : deal.stage === "review" ? "violet" : "indigo",
          };
        });
      }
    }
    return [];
  })();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const eventsForSelectedDay = activeEvents.filter((e) => e.day === selectedDay);

  return (
    <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-4 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">{t("Collab Calendar")}</h4>
            <p className="text-[10px] text-[#7e8697]">{t("Milestones & Shoot Schedule")}</p>
          </div>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-[#18181b] p-1 rounded-xl border border-[#27272a]">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-6 h-6 rounded-lg hover:bg-[#27272a] text-[#8c94a6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-white px-1 select-none">
            {monthNames[month].slice(0, 3)} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-lg hover:bg-[#27272a] text-[#8c94a6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#686f82]">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading empty slots */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8" />
        ))}

        {/* Calendar Day Buttons */}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const isSelected = selectedDay === day;
          const dayEvents = activeEvents.filter((e) => e.day === day);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`h-8 rounded-lg flex flex-col items-center justify-center text-xs font-semibold relative transition-all cursor-pointer ${
                isSelected
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : hasEvents
                  ? "bg-[#18181b] text-white hover:bg-[#222226] border border-[#27272a]"
                  : "text-[#8c94a6] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <span>{day}</span>
              {/* Event Indicator Dots */}
              {hasEvents && !isSelected && (
                <div className="flex items-center gap-0.5 absolute bottom-1">
                  {dayEvents.map((ev) => (
                    <span
                      key={ev.id}
                      className={`w-1 h-1 rounded-full ${
                        ev.color === "emerald"
                          ? "bg-emerald-400"
                          : "bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Schedule Feed */}
      <div className="pt-2 border-t border-[#27272a] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
            <span>{monthNames[month].slice(0, 3)} {selectedDay} {t("Schedule")}</span>
            {eventsForSelectedDay.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-white text-[9px] font-bold border border-white/20">
                {eventsForSelectedDay.length} {t("Items")}
              </span>
            )}
          </span>
          <span className="text-[10px] text-[#7e8697]">
            {eventsForSelectedDay.length > 0 ? t("Brand Deliverables") : t("Free Slot")}
          </span>
        </div>

        {eventsForSelectedDay.length > 0 ? (
          <div className="space-y-2">
            {eventsForSelectedDay.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="font-semibold text-white text-[11px] truncate">{ev.title}</h5>
                    <p className="text-[10px] text-[#7e8697] truncate">{ev.brand} • {t(ev.deliverableType, ev.deliverableType)}</p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      ev.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/10 text-white border border-white/20"
                    }`}
                  >
                    {ev.status === "completed" ? t("Released") : ev.time}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#27272a]">
                  <span className="text-[#8c94a6] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{ev.time}</span>
                  </span>
                  <span className="font-bold text-white">{t(ev.amount, ev.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#18181b]/60 border border-dashed border-[#27272a] text-center space-y-1">
            <p className="text-[11px] text-[#8c94a6]">{t("No deliverables due on")} {monthNames[month].slice(0, 3)} {selectedDay}</p>
            <p className="text-[10px] text-[#686f82]">{t("Open for brand bookings & review syncs")}</p>
          </div>
        )}
      </div>

      {/* Quick Calendar Footer Actions */}
      <div className="pt-1 flex items-center justify-between text-[10px] text-[#7e8697]">
        <button
          type="button"
          onClick={() => setSelectedDay(19)}
          className="hover:text-white transition-colors cursor-pointer"
        >
          {t("Jump to Today")} (Oct 19)
        </button>
        <span className="text-white hover:underline flex items-center gap-1 cursor-pointer">
          <span>{t("Sync iCal")}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
}
