import type { components } from "@/types/api";
export type Collaboration = components["schemas"]["CollaborationRead"];
export type CollaborationPage = components["schemas"]["CollaborationPage"];
export type CollaborationSource = components["schemas"]["CollaborationCreate"]["source_kind"];

export interface CollaborationGroupItem {
  kind: "offer" | "collaboration";
  id: string;
  title: string;
  brand_name: string;
  creator_name: string | null;
  source_kind: "offer" | "application" | "invitation" | "enquiry";
  creator_count: number;
  started_count: number;
  agreed_count: number;
  completed_count: number;
  status: "discussion" | "agreed" | "completed";
  quoted_amount_cents: number | null;
  currency: string;
  requested_delivery_date: string | null;
  updated_at: string;
}

export interface CollaborationGroupPage {
  items: CollaborationGroupItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface OfferParticipantSummary {
  key: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  source_kind: "application" | "invitation";
  source_id: string;
  collaboration_id: string | null;
  collaboration: Collaboration | null;
  quoted_amount_cents: number | null;
  currency: string;
  proposal_status: "not_started" | "no_proposal" | "in_discussion" | "awaiting_other" | "agreed";
  proposal_version: number;
  delivery_status: "locked" | "awaiting_submission" | "awaiting_review" | "revisions_requested" | "approved" | "completed";
  delivery_version: number;
  proof_status: "locked" | "awaiting_proof" | "awaiting_confirmation" | "confirmed";
  proof_version: number;
  feedback_status: "locked" | "pending" | "partial" | "both_submitted";
  brand_feedback_submitted: boolean;
  creator_feedback_submitted: boolean;
  message_count: number;
  updated_at: string;
}

export interface OfferCollaborationWorkspace {
  offer_id: string;
  title: string;
  brand_name: string;
  brief: string;
  deliverable: string;
  budget_total_cents: number | null;
  currency: string;
  requested_delivery_date: string | null;
  offer_status: string;
  created_at: string;
  updated_at: string;
  participants: OfferParticipantSummary[];
}
export async function collaborationRequest<T>(path = "", options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/account/collaborations${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to access collaborations."
    : response.status === 404 ? "This record is unavailable or you are not a participant."
    : response.status === 403 ? data?.error?.message || "Only the saved creator can submit delivery work."
    : response.status === 422 ? data?.error?.message || "Check the fields and try again."
    : response.status === 409 ? data?.error?.message || "This source is no longer eligible."
    : response.status === 429 ? data?.error?.message || "Upload limit reached. Please try later."
    : response.status === 503 ? data?.error?.message || "The service is temporarily unavailable. Please retry."
    : "Could not load or save the collaboration. Please retry.");
  return data as T;
}
