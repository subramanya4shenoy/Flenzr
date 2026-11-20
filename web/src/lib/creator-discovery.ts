import type { PublicCreatorProfile } from "./api";

export const discoveryPageSize = 12;
export const discoveryNetworks = [
  { value: "instagram", label: "Instagram" }, { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook Pages" }, { value: "x", label: "X" },
  { value: "linkedin", label: "LinkedIn" },
] as const;
export type DiscoveryNetwork = typeof discoveryNetworks[number]["value"];
export interface DiscoveryFilters { q: string; niche: string; location: string; network?: DiscoveryNetwork | ""; min_audience?: string; max_audience?: string; updated_within_days?: string }
export interface DiscoveryAudience {
  network: DiscoveryNetwork; count: number | null; metric: "followers" | "subscribers";
  source: string; updated_at: string | null; basis: "largest_connected_account";
}
export type DiscoveryCreator = PublicCreatorProfile & { connected_networks: DiscoveryNetwork[]; audiences: DiscoveryAudience[] };
export function validateAudienceFilters(filters: DiscoveryFilters): string | null {
  const values = [filters.min_audience || "", filters.max_audience || ""];
  if (!filters.network && (values.some(Boolean) || filters.updated_within_days)) return "Choose a network before filtering its audience.";
  if (values.some(value => value && (!/^\d+$/.test(value) || Number(value) > 1_000_000_000_000))) return "Enter whole audience counts between 0 and 1,000,000,000,000.";
  if (values.every(Boolean) && Number(values[0]) > Number(values[1])) return "Minimum audience must not exceed maximum audience.";
  return null;
}
export function audienceSavedDate(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Update date unavailable";
  return `Saved ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value))}`;
}
export interface DiscoveryPage { items: DiscoveryCreator[]; total: number; offset: number; limit: number }
export function discoveryQuery(filters: DiscoveryFilters, offset = 0) {
  const query = new URLSearchParams({ limit: String(discoveryPageSize), offset: String(offset) });
  for (const key of ["q", "niche", "location"] as const) {
    if (filters[key].trim()) query.set(key, filters[key].trim());
  }
  if (filters.network) {
    query.set("network", filters.network);
    for (const key of ["min_audience", "max_audience", "updated_within_days"] as const) {
      if (filters[key]) query.set(key, filters[key]!);
    }
  }
  return query.toString();
}
export async function discoverCreators(filters: DiscoveryFilters, offset: number, signal: AbortSignal): Promise<DiscoveryPage> {
  const res = await fetch(`/api/discovery/creators?${discoveryQuery(filters, offset)}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error("Could not load creators. Please retry.");
  return res.json();
}

/** Saved largest-account count per connected network; not a unique-person estimate. */
export function discoveryTotalAudience(creator: Pick<DiscoveryCreator, "connected_networks" | "audiences">) {
  const networks = Array.from(new Set(creator.connected_networks || []));
  const counts = networks.map(network => creator.audiences?.find(item => item.network === network)?.count)
    .filter((count): count is number => typeof count === "number" && Number.isSafeInteger(count) && count >= 0);
  return { count: counts.length ? counts.reduce((sum, count) => sum + count, 0) : null,
    known: counts.length, networks: networks.length, partial: counts.length < networks.length };
}
