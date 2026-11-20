import type { components } from "@/types/api";
export type Shortlist = components["schemas"]["ShortlistRead"];
export type ShortlistPage = components["schemas"]["ShortlistPage"];
export type ShortlistMember = components["schemas"]["ShortlistMemberRead"];
export type ShortlistMembers = components["schemas"]["ShortlistMemberPage"];
export class ShortlistError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "ShortlistError"; }
}
export function shortlistName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error("Enter a shortlist name between 1 and 80 characters.");
  return name;
}
export function shortlistQuery(q: string, page = 1) {
  const query = new URLSearchParams({ page: String(page), page_size: "20" });
  if (q.trim()) query.set("q", q.trim()); return query.toString();
}
export async function shortlistRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/account/shortlists${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ShortlistError(response.status === 401 ? "Your session expired. Sign in again."
    : response.status === 403 ? "Only the owning brand can manage shortlists."
    : response.status === 404 ? path.startsWith("?") || path === "" ? "Set up your brand profile before using shortlists." : "This shortlist or creator is no longer available. Reload your shortlists."
    : data?.error?.message || "Could not load or save shortlists. Please retry.", response.status);
  return data as T;
}
