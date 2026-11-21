import type { SavedCampaign } from "./campaign-drafts";

export type CampaignAction = "publish" | "pause" | "resume" | "close" | "cancel";
export const campaignStatusLabel = { draft: "Draft", active: "Published", paused: "Paused", completed: "Closed", cancelled: "Cancelled" };
export const campaignActionInfo: Record<CampaignAction, { label: string; done: string; target: SavedCampaign["status"]; description: string }> = {
  publish: { label: "Publish offer", done: "Offer published.", target: "active", description: "Make this brief visible to creators and open it for applications. Publishing does not take a payment." },
  pause: { label: "Pause offer", done: "Offer paused.", target: "paused", description: "Hide this opportunity and stop new applications and invitations. You can resume it later." },
  resume: { label: "Resume offer", done: "Offer resumed.", target: "active", description: "Make this opportunity visible again and accept new applications and invitations." },
  close: { label: "Close offer", done: "Offer closed.", target: "completed", description: "Stop accepting new applications and invitations permanently. This does not mark existing collaboration work as delivered or paid." },
  cancel: { label: "Cancel offer", done: "Offer cancelled.", target: "cancelled", description: "Cancel this offer permanently. Existing collaboration records and payments remain unchanged." },
};
export function campaignActions(status: SavedCampaign["status"]): CampaignAction[] {
  return status === "draft" ? ["publish", "cancel"] : status === "active" ? ["pause", "close", "cancel"] : status === "paused" ? ["resume", "close", "cancel"] : [];
}
export function campaignPublishIssues(campaign: SavedCampaign, today = new Date().toISOString().slice(0, 10)): string[] {
  const issues: string[] = [];
  if (campaign.title.trim().length < 3) issues.push("A title with at least 3 characters");
  if (campaign.brief.trim().length < 10) issues.push("A brief with at least 10 characters");
  if (!campaign.target_niche?.trim()) issues.push("A target niche");
  if (!campaign.deliverable_summary?.trim()) issues.push("The required deliverables");
  if (!Number.isInteger(campaign.budget_total_cents) || campaign.budget_total_cents < 1000 || campaign.budget_total_cents > 2_000_000_000) issues.push("A budget between 10 and 20,000,000 in the selected currency");
  if (!/^[A-Z]{3}$/.test(campaign.currency)) issues.push("A valid currency");
  if (campaign.start_date && campaign.end_date && campaign.end_date.slice(0, 10) < campaign.start_date.slice(0, 10)) issues.push("An end date on or after the start date");
  if (campaign.end_date && campaign.end_date.slice(0, 10) < today) issues.push("An end date of today or later");
  return issues;
}
export function campaignOpen(campaign: SavedCampaign, today = new Date().toISOString().slice(0, 10)) {
  return campaign.status === "active" && (!campaign.end_date || campaign.end_date.slice(0, 10) >= today);
}
