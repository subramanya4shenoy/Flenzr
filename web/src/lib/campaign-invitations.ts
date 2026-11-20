import type { components } from "@/types/api";
import { draftBudgetCents, type SavedCampaign } from "./campaign-drafts";
export type InvitationRecipient = components["schemas"]["CampaignInvitationRecipient"];
export type SavedInvitation = components["schemas"]["CampaignInvitationRead"];
export class InvitationRequestError extends Error {
  constructor(message: string, public status: number, public code = "") { super(message); this.name = "InvitationRequestError"; }
}
export async function invitationRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/account/campaigns${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new InvitationRequestError(response.status === 401 ? "Your session expired. Sign in again."
    : response.status === 403 ? "Only the owning brand can send or view this invitation."
    : response.status === 404 ? path === "/me" ? "Set up your brand profile before inviting creators." : "This creator or campaign is no longer available."
    : data?.error?.message || "Could not load or send the invitation. Please retry.", response.status, data?.error?.code || "");
  return data as T;
}
export function invitationQuoteCents(value: string): number {
  try { const cents = draftBudgetCents(value); if (cents >= 100) return cents; } catch {}
  throw new Error("Enter an offered quote between 1 and 20,000,000, with up to two decimal places.");
}
export function invitationPayload(recipient: InvitationRecipient, campaign: SavedCampaign, quote: string, message: string) {
  if (message.trim().length > 5000) throw new Error("Keep your invitation message within 5,000 characters.");
  return { creator_id: recipient.id, offered_rate_cents: invitationQuoteCents(quote), message: message.trim() || null, expected_campaign_revision: campaign.revision };
}
