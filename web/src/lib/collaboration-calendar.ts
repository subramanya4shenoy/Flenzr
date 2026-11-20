import type { components } from "@/types/api";
export type CalendarPage = components["schemas"]["CalendarPage"];
export function localMonth(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}
export function monthParts(month: string) {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(month);
  const year = Number(match?.[1]), number = Number(match?.[2]);
  if (!match || year < 1900 || year > 9998 || number < 1 || number > 12) throw new Error("Choose a valid calendar month.");
  return { year, number, days: new Date(year, number, 0).getDate(), offset: new Date(year, number - 1, 1).getDay() };
}
export function shiftMonth(month: string, delta: -1 | 1) {
  const { year, number } = monthParts(month);
  const shifted = new Date(year, number - 1 + delta, 1);
  if (shifted.getFullYear() < 1900 || shifted.getFullYear() > 9998) return month;
  return localMonth(shifted);
}
export function calendarDate(month: string, day: number) {
  const { days } = monthParts(month);
  if (!Number.isInteger(day) || day < 1 || day > days) throw new Error("Choose a day in the displayed month.");
  return `${month}-${String(day).padStart(2, "0")}`;
}
export function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}


export function localDate(value = new Date()) {
  return calendarDate(localMonth(value), value.getDate());
}
function ordinal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (calendarDate(`${year}-${String(month).padStart(2, "0")}`, day) !== value) throw new Error("Use a calendar date in YYYY-MM-DD format.");
  return Date.UTC(year, month - 1, day) / 86400000;
}
export function dateUrgency(due: string, today: string) {
  const days = ordinal(due) - ordinal(today);
  return { days, key: days < 0 ? "overdue" : days === 0 ? "due_today" : days <= 7 ? "due_soon" : "upcoming" } as const;
}
export function deadlineIndicator(item: CalendarPage["items"][number], today: string) {
  const { days, key } = dateUrgency(item.delivery_date, today);
  if (item.status === "completed" || item.delivery_state === "completed") return { key: "completed", label: "Completed", detail: "The collaboration is complete; its agreed deadline remains in history." };
  if (item.delivery_state === "approved") return { key: "approved", label: "Approved", detail: "The latest delivery is approved. Collaboration completion is still separate." };
  if (item.delivery_state === "awaiting_review") return { key: "awaiting_review", label: "Awaiting review", detail: `Version ${item.latest_delivery_version} is submitted and waiting for brand/client review.${days < 0 ? " The agreed date has passed; this is not marked as overdue creator work." : ""}` };
  const revision = item.delivery_state === "revisions_requested";
  const label = key === "overdue" ? (revision ? "Revision overdue" : "Overdue") : key === "due_today" ? (revision ? "Revision due today" : "Due today") : key === "due_soon" ? `Due in ${days} ${days === 1 ? "day" : "days"}` : "Upcoming";
  const detail = `${revision ? "Requested revisions are outstanding" : "No delivery has been submitted"}.${days < 0 ? ` ${Math.abs(days)} ${days === -1 ? "day" : "days"} past the agreed delivery date.` : ""}`;
  return { key, label, detail };
}
