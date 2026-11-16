export interface Enquiry {
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
  status: "pending" | "accepted" | "declined" | "countered";
  revision: number;
  history: Array<{ actor: "brand" | "creator"; action: string; note: string; amount_cents: number | null; at: string }>;
  created_at: string;
  updated_at: string;
}

export const enquiryStatuses = { pending: "Awaiting creator", countered: "Awaiting brand", accepted: "Accepted", declined: "Declined" };

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

export async function enquiryRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/account/enquiries${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error("Sign in to your brand account, then retry sending this enquiry.");
    if (res.status === 403) throw new Error("Use a brand account to send enquiries. This account does not have access.");
    const detail = data?.error?.message || (typeof data?.error === "string" ? data.error : null);
    throw new Error(detail || (res.status === 422 ? "Check the enquiry details and try again." : "Could not load or save the enquiry. Please retry."));
  }
  return data;
}
