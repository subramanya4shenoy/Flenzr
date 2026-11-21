import { campaignBudgetTotals, type SavedCampaign } from "./campaign-drafts";
import { campaignOpen } from "./campaign-lifecycle";

export interface CampaignFolder {
  id: string;
  title: string;
  objective: string;
  revision: number;
  created_at: string;
  updated_at: string;
  last_opened_at?: string | null;
}

export const unassignedCampaign = "unassigned";
export function campaignFolderHref(id?: string | null) {
  return `/dashboard/brand#campaigns${id ? `/${encodeURIComponent(id)}` : ""}`;
}
export function offersInCampaign(offers: SavedCampaign[], id: string): SavedCampaign[] {
  return offers.filter(offer => id === unassignedCampaign ? !offer.parent_campaign_id : offer.parent_campaign_id === id);
}
export function campaignFolderSummary(offers: SavedCampaign[]) {
  const active = offers.filter(offer => campaignOpen(offer)).length;
  const drafts = offers.filter(offer => offer.status === "draft").length;
  const status = !offers.length ? "No offers yet" : active ? "Active" : drafts === offers.length ? "Drafts"
    : offers.every(offer => offer.status === "completed" || offer.status === "cancelled") ? "Closed" : "No active offers";
  return { count: offers.length, active, drafts, status, budgets: campaignBudgetTotals(offers) };
}

export function campaignLastActivity(folder: CampaignFolder, offers: SavedCampaign[]): number {
  const timestamp = (value?: string | null) => {
    const parsed = value ? Date.parse(value) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return Math.max(timestamp(folder.created_at), timestamp(folder.updated_at), timestamp(folder.last_opened_at),
    ...offersInCampaign(offers, folder.id).map(offer => timestamp(offer.updated_at)));
}

export function recentCampaigns(folders: CampaignFolder[], limit = 4): CampaignFolder[] {
  return folders.filter(folder => folder.last_opened_at && Number.isFinite(Date.parse(folder.last_opened_at)))
    .sort((a, b) => Date.parse(b.last_opened_at!) - Date.parse(a.last_opened_at!)
    || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)).slice(0, limit);
}
