export interface Enquiry {
  viewer_role: "brand" | "creator";
  id: string;
  creator_handle: string;
  creator_name: string;
  brand_name: string;
  sender_email: string;
  brief: string;
  deliverable: string;
  rate_card_id: string | null;
  amount_cents: number | null;
  currency: string;
  preferred_delivery_date: string | null;
  status: "pending" | "accepted" | "declined" | "countered" | "withdrawn";
  revision: number;
  read_revision: number;
  is_unread: boolean;
  history: Array<{ actor: "brand" | "creator"; action: string; note: string; amount_cents: number | null; preferred_delivery_date?: string; at: string }>;
  created_at: string;
  updated_at: string;
}

export const enquiryStatuses = { pending: "Awaiting creator", countered: "Awaiting brand", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn" };

// A late read response must not replace a newer list response or roll back its read cursor.
export function mergeEnquiryRead(current: Enquiry, acknowledged: Enquiry): Enquiry {
  if (current.id !== acknowledged.id) return current;
  const latest = acknowledged.revision >= current.revision ? acknowledged : current;
  const readRevision = Math.max(current.read_revision, acknowledged.read_revision);
  return { ...latest, read_revision: readRevision, is_unread: readRevision < latest.revision };
}

export function enquiryDeliveryDate(value: string | null | undefined) {
  if (!value) return "To discuss";
  // A requested day is a calendar date, not a timestamp in the viewer's timezone.
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function validateEnquiryDeliveryDate(value: string, today = new Date().toISOString().slice(0, 10)): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Choose a valid preferred delivery date.");
  if (value < today) throw new Error("Choose today or a later preferred delivery date.");
  return value;
}

export function enquiryMoney(amount: number | null, currency: string) {
  if (amount === null) return "Budget to discuss";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
}

// Parse decimal text without silently accepting scientific notation, rounded fractions or NaN.
export function enquiryCents(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Enter a budget with up to two decimal places.");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 100 || cents > 1_000_000_000) throw new Error("Budget must be between 1 and 10,000,000.");
  return cents;
}

export class EnquiryRequestError extends Error {
  constructor(message: string, public retryAfterSeconds?: number) {
    super(message);
    this.name = "EnquiryRequestError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function enquiryRetryLabel(seconds: number) {
  const remaining = Math.max(0, Math.ceil(seconds));
  if (remaining >= 3600) return `${Math.floor(remaining / 3600)}h ${Math.floor(remaining % 3600 / 60)}m`;
  if (remaining >= 60) return `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
  return `${remaining}s`;
}

export async function enquiryRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/account/enquiries${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error(path === "" ? "Sign in to your brand account, then retry sending this enquiry." : "Sign in again to view or update your enquiries.");
    if (res.status === 403) throw new Error(path === "" ? "Use a brand account to send enquiries. This account does not have access." : "This account does not have access to these enquiries.");
    const detail = data?.error?.message || (typeof data?.error === "string" ? data.error : null);
    const value = Number(res.headers?.get("Retry-After") || data?.error?.details?.[0]?.retry_after_seconds);
    const retryAfter = res.status === 429 && Number.isInteger(value) && value > 0 && value <= 86400 ? value : undefined;
    throw new EnquiryRequestError(detail || (res.status === 422 ? "Check the enquiry details and try again." : "Could not load or save the enquiry. Please retry."), retryAfter);
  }
  return data;
}
