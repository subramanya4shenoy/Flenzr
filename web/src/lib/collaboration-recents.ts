import type { Collaboration, CollaborationGroupItem } from "./collaborations";

/** A small snapshot so recent shortcuts render without loading every page. */
export interface RecentCollaboration {
  kind: "offer" | "collaboration";
  id: string;
  title: string;
  subtitle: string;
  status: Collaboration["status"];
  opened_at: string;
}

export const recentCollaborationsLimit = 4;
const storedLimit = 12;
export const recentCollaborationsEvent = "flenzr-recent-collaborations";

export function recentCollaborationsKey(viewerId: string) {
  return `flenzr_recent_collaborations_${viewerId}`;
}

export function recentHref(item: Pick<RecentCollaboration, "kind" | "id">) {
  return item.kind === "offer" ? `/dashboard/collaborations/offer/${item.id}` : `/dashboard/collaborations/${item.id}`;
}

export function parseRecentCollaborations(raw: string | null | undefined): RecentCollaboration[] {
  if (!raw) return [];
  try {
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    const parsed: RecentCollaboration[] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.opened_at !== "string") continue;
      if (!Number.isFinite(Date.parse(r.opened_at))) continue;
      const kind = r.kind === "offer" ? "offer" : "collaboration";
      const subtitle = typeof r.subtitle === "string"
        ? r.subtitle
        : `${typeof r.brand_name === "string" ? r.brand_name : ""} · ${typeof r.creator_name === "string" ? r.creator_name : ""}`.replace(/^ · | · $/g, "");
      const status = r.status === "completed" || r.status === "agreed" ? r.status : "discussion";
      parsed.push({ kind, id: r.id, title: r.title, subtitle, status, opened_at: r.opened_at });
    }
    return parsed;
  } catch { return []; }
}

/** Moves the opened item to the front, de-duplicated and capped. */
export function withOpenedRecent(rows: RecentCollaboration[], entry: Omit<RecentCollaboration, "opened_at">, openedAt = new Date().toISOString()): RecentCollaboration[] {
  const full: RecentCollaboration = { ...entry, opened_at: openedAt };
  return [full, ...rows.filter(item => !(item.kind === entry.kind && item.id === entry.id))].slice(0, storedLimit);
}

export function withoutRecent(rows: RecentCollaboration[], kind: "offer" | "collaboration", id: string) {
  return rows.filter(item => !(item.kind === kind && item.id === id));
}

/** Most recent first; fresher list data replaces stale snapshot fields. */
export function recentCollaborations(rows: RecentCollaboration[], fresh: CollaborationGroupItem[] = [], limit = recentCollaborationsLimit): RecentCollaboration[] {
  const latest = new Map(fresh.map(row => [`${row.kind}:${row.id}`, row]));
  return [...rows].sort((a, b) => Date.parse(b.opened_at) - Date.parse(a.opened_at)).slice(0, limit).map(item => {
    const row = latest.get(`${item.kind}:${item.id}`);
    if (!row) return item;
    const subtitle = row.kind === "offer"
      ? `${row.creator_count} ${row.creator_count === 1 ? "influencer" : "influencers"} · ${row.agreed_count} agreed`
      : `${row.brand_name} · ${row.creator_name || "Creator"}`;
    return { ...item, title: row.title, subtitle, status: row.status };
  });
}

export function collaborationStatusLabel(status: Collaboration["status"]) {
  return status === "completed" ? "Completed" : status === "agreed" ? "Agreed" : "Discussion";
}
