import type { components } from "@/types/api";
import { draftBudgetCents } from "./campaign-drafts";
export type CampaignOpportunity = components["schemas"]["CampaignOpportunityRead"];
export type OpportunityPage = components["schemas"]["CampaignOpportunityPage"];
export type SavedApplication = components["schemas"]["CampaignApplicationRead"];
export class OpportunityRequestError extends Error {
  constructor(message: string, public status: number, public code = "") { super(message); this.name = "OpportunityRequestError"; }
}
export function opportunityQuery(q: string, niche: string, page = 1) {
  const query = new URLSearchParams({ page: String(page), page_size: "12" });
  if (q.trim()) query.set("q", q.trim()); if (niche.trim()) query.set("niche", niche.trim());
  return query.toString();
}
export async function opportunityRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/account/campaigns${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new OpportunityRequestError(response.status === 401 ? "Your session expired. Sign in again."
    : response.status === 403 ? "Sign in with a creator account to browse and apply."
    : response.status === 404 ? path.startsWith("/opportunities?") ? "Complete your creator profile before browsing opportunities." : "This campaign is no longer open. Your saved applications remain in Collabs."
    : data?.error?.message || "Could not load or submit the application. Please retry.", response.status, data?.error?.code || "");
  return data as T;
}
export function applicationPayload(campaign: CampaignOpportunity, quote: string, pitch: string) {
  let cents = 0;
  try { cents = draftBudgetCents(quote); } catch {}
  if (cents < 100) throw new Error("Enter a proposed quote between 1 and 20,000,000, with up to two decimal places.");
  if (pitch.trim().length > 5000) throw new Error("Keep your pitch within 5,000 characters.");
  return { proposed_rate_cents: cents, pitch_message: pitch.trim() || null, expected_campaign_revision: campaign.revision };
}
export function opportunityDate(value: string | null | undefined) {
  if (!value) return "Open end date";
  // Campaign dates are saved as UTC calendar days, including SQLite's timezone-free representation.
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
