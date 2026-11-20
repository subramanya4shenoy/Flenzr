import type { components } from "@/types/api";
export type Collaboration = components["schemas"]["CollaborationRead"];
export type CollaborationPage = components["schemas"]["CollaborationPage"];
export type CollaborationSource = components["schemas"]["CollaborationCreate"]["source_kind"];
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
