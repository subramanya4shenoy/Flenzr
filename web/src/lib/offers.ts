export interface PublicOffer {
  id: string; title: string; brief: string; brand_name: string; deliverables: string | null;
  niche: string | null; budget_cents: number; currency: string; starts_at: string | null; ends_at: string | null;
  status: string; visibility: "public" | "invited"; revision: number; accepting: boolean;
}
export interface OfferApplication {
  id: string; creator_name: string; creator_handle: string; amount_cents: number; pitch: string | null;
  status: string; revision: number; proposed_by: "brand" | "creator";
  collaboration_id: string | null; claimed: boolean;
  history: { action: string; author: string; amount_cents: number; message: string; at: string }[];
}
export interface OfferWorkspace extends PublicOffer {
  parent_campaign_id?: string | null; parent_campaign_title?: string | null;
  viewer_role: "brand" | "creator"; applications: OfferApplication[]; total_applications: number; page: number; invited: boolean;
}
export async function offerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/account/offers${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Error(response.status === 404 ? "This Offer is unavailable or you haven’t been invited." : data?.error?.message || "Could not load or update this Offer. Please retry.");
  return data;
}
