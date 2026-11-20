import type { components } from "@/types/api";
export type CampaignActivityPage = components["schemas"]["CampaignActivityPage"];
export type CampaignActivityKind = "applications" | "invitations";
export type CampaignAudience = "brand" | "creator";
export const activityStatusLabel: Record<string, string> = {
  pending: "Pending", invited: "Invited", accepted: "Accepted", rejected: "Rejected", withdrawn: "Withdrawn", declined: "Declined",
};
export function campaignActivityPath(audience: CampaignAudience, kind: CampaignActivityKind, page: number, campaignId?: string) {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  if (campaignId) params.set("campaign_id", campaignId);
  return `/api/account/campaigns/${audience === "brand" ? "me" : "creator"}/${kind}?${params}`;
}
export async function loadCampaignActivity(path: string, signal?: AbortSignal): Promise<CampaignActivityPage> {
  const response = await fetch(path, { signal, cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(response.status === 401 ? "Your session expired. Sign in again."
      : response.status === 403 ? "You do not have access to these campaign records."
      : response.status === 404 ? "Campaign or account profile not found. Complete your profile or return to your campaigns."
      : data?.error?.message || "Could not load campaign activity. Please retry.");
  }
  return response.json();
}

export type CampaignActivityRecord = components["schemas"]["CampaignActivityRead"];
export type CampaignResponseAction = "accept" | "reject" | "withdraw" | "decline";
export function activityAccepting(item: CampaignActivityRecord, today = new Date().toISOString().slice(0, 10)) {
  const end = item.campaign_end_date;
  const utcEnd = end && new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(end) ? end : `${end}Z`).toISOString().slice(0, 10);
  return item.campaign_status === "active" && (!utcEnd || utcEnd >= today);
}
export function activityActions(audience: CampaignAudience, kind: CampaignActivityKind, item: CampaignActivityRecord): CampaignResponseAction[] {
  if (kind === "applications" && item.status === "pending") {
    return audience === "brand" ? [...(activityAccepting(item) ? ["accept" as const] : []), "reject"] : ["withdraw"];
  }
  if (kind === "invitations" && item.status === "invited" && audience === "creator") {
    return [...(activityAccepting(item) ? ["accept" as const] : []), "decline"];
  }
  return [];
}
export function activityResponseLabel(kind: CampaignActivityKind, action: CampaignResponseAction) {
  return `${action[0].toUpperCase()}${action.slice(1)} ${kind === "applications" ? "application" : "invitation"}`;
}
export function campaignRecordPath(audience: CampaignAudience, kind: CampaignActivityKind, recordId: string) {
  return `/api/account/campaigns/${audience === "brand" ? "me" : "creator"}/${kind}/${encodeURIComponent(recordId)}`;
}
export class CampaignActivityError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "CampaignActivityError"; }
}
async function recordRequest(path: string, options?: RequestInit): Promise<CampaignActivityRecord> {
  const response = await fetch(path, { ...options, cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new CampaignActivityError(response.status === 401 ? "Your session expired. Sign in again."
    : response.status === 403 ? "You cannot respond to this record."
    : response.status === 404 ? "This record is no longer available to your account."
    : data?.error?.message || "Could not save or load the response. Please retry.", response.status);
  return data;
}
export function loadCampaignRecord(path: string, signal?: AbortSignal) { return recordRequest(path, { signal }); }
export function respondCampaignActivity(path: string, item: CampaignActivityRecord, action: CampaignResponseAction) {
  return recordRequest(`${path}/respond`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, expected_status: item.status, expected_campaign_revision: item.campaign_revision }) });
}
