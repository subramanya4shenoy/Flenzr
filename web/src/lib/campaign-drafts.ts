export interface CampaignDraftFields {
  title: string; brief: string; target_niche: string; deliverable_summary: string;
  budget: string; currency: string; start_date: string; end_date: string;
}
export interface SavedCampaign {
  id: string; organization_id: string; title: string; brief: string;
  target_niche: string | null; deliverable_summary: string | null;
  budget_total_cents: number; currency: string; start_date: string | null; end_date: string | null;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  revision: number; applicants_count: number; created_at: string; updated_at: string;
}
export const emptyCampaignDraft: CampaignDraftFields = { title: "", brief: "", target_niche: "", deliverable_summary: "", budget: "", currency: "INR", start_date: "", end_date: "" };
export function campaignDraftFields(campaign: SavedCampaign): CampaignDraftFields {
  return { title: campaign.title, brief: campaign.brief, target_niche: campaign.target_niche || "",
    deliverable_summary: campaign.deliverable_summary || "", budget: campaign.budget_total_cents ? (campaign.budget_total_cents / 100).toFixed(2) : "",
    currency: campaign.currency, start_date: campaign.start_date?.slice(0, 10) || "", end_date: campaign.end_date?.slice(0, 10) || "" };
}
export function draftBudgetCents(value: string): number {
  const text = value.trim();
  if (!text) return 0;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Enter a budget with up to two decimal places.");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 2_000_000_000) throw new Error("Budget must be between 0 and 20,000,000.");
  return cents;
}
export function campaignDraftPayload(fields: CampaignDraftFields) {
  if (fields.title.trim().length < 3) throw new Error("Add a campaign title with at least three characters.");
  function date(value: string) {
    if (!value) return null;
    const timestamp = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== value) throw new Error("Choose valid campaign dates.");
    return timestamp.toISOString();
  }
  const start_date = date(fields.start_date), end_date = date(fields.end_date);
  if (start_date && end_date && end_date < start_date) throw new Error("End date must be on or after start date.");
  return { title: fields.title.trim(), brief: fields.brief.trim(), target_niche: fields.target_niche.trim() || null,
    deliverable_summary: fields.deliverable_summary.trim() || null, budget_total_cents: draftBudgetCents(fields.budget),
    currency: fields.currency, start_date, end_date };
}
export class CampaignRequestError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "CampaignRequestError"; }
}
export async function campaignRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/account/campaigns${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 401 ? "Your session expired. Sign in again to continue."
      : response.status === 403 ? "Only the owning brand can access this campaign."
      : response.status === 404 ? (path === "/drafts" || path === "/me" ? "Set up your brand profile before saving campaigns." : "This campaign could not be found.")
      : data?.error?.message || (typeof data?.error === "string" ? data.error : null)
      || (response.status === 422 ? "Check the campaign details and try again." : "Could not load or save campaigns. Please retry.");
    throw new CampaignRequestError(message, response.status);
  }
  return data as T;
}
export function campaignMoney(cents: number, currency: string) {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(cents / 100); }
  catch { return `${(cents / 100).toFixed(2)} ${currency}`; }
}
export function campaignBudgetTotals(campaigns: SavedCampaign[]): string[] {
  const totals = new Map<string, number>();
  for (const campaign of campaigns) {
    if (campaign.budget_total_cents) totals.set(campaign.currency, (totals.get(campaign.currency) || 0) + campaign.budget_total_cents);
  }
  return [...totals].map(([currency, cents]) => campaignMoney(cents, currency));
}
