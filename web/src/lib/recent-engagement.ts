import type { SocialAccount, SocialPlatform } from "./social-accounts";

export interface RecentEngagement {
  platform: SocialPlatform;
  handle: string;
  status: "ready" | "unsupported" | "not_refreshed";
  posts: { id: string; publishedAt: string | null; likes: number | null; comments: number | null; total: number | null }[];
  total: number | null;
  likes?: number | null;
  comments?: number | null;
  postsRead?: number;
  measuredPosts?: number;
  fetchedAt?: number;
  source?: "x-public-profile";
  coverage?: "public_subset";
  latestTenGuaranteed?: boolean;
}
const prefix = "flenzr_recent_engagement_v1:";
const pending = new Map<string, Promise<RecentEngagement>>();
const versions = new Map<string, number>();
function key(ownerId: string, account: SocialAccount) {
  return `${prefix}${encodeURIComponent(ownerId)}:${account.platform}:${encodeURIComponent(account.handle)}:${account.is_verified}:${account.connected ?? "unknown"}`;
}
export function invalidateRecentEngagement(ownerId: string | null, platform: SocialPlatform) {
  if (!ownerId || typeof window === "undefined") return;
  const scope = `${prefix}${encodeURIComponent(ownerId)}:${platform}:`;
  versions.set(scope, (versions.get(scope) ?? 0) + 1);
  try { for (const name of Object.keys(localStorage)) if (name.startsWith(scope)) localStorage.removeItem(name); } catch {}
}
export function savedRecentEngagement(ownerId: string | null, account: SocialAccount): RecentEngagement | null {
  if (!ownerId || typeof window === "undefined") return null;
  try {
    const data = JSON.parse(localStorage.getItem(key(ownerId, account)) || "null") as RecentEngagement | null;
    if (data?.platform !== account.platform || data.handle !== account.handle || data.status !== "ready" || !Array.isArray(data.posts)) return null;
    return typeof data.fetchedAt === "number" && Number.isFinite(data.fetchedAt) && data.fetchedAt > 0 ? data : null;
  } catch { return null; }
}
export function loadRecentEngagement(ownerId: string | null, account: SocialAccount, force = false): Promise<RecentEngagement> {
  const name = ownerId ? key(ownerId, account) : `${account.platform}:${account.handle}`;
  const scope = `${prefix}${encodeURIComponent(ownerId || "")}:${account.platform}:`;
  const version = versions.get(scope) ?? 0;
  const requestKey = `${name}:${version}:${force ? "refresh" : "saved"}`;
  const existing = pending.get(requestKey);
  if (existing) return existing;
  const task = (async () => {
    const response = await fetch(`/api/account/creators/me/recent-engagement?platform=${account.platform}&handle=${encodeURIComponent(account.handle)}`, { method: force ? "POST" : "GET", cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status) && ownerId) {
        try { localStorage.removeItem(name); } catch {}
      }
      throw new EngagementFetchError(data.error?.message || data.error || "Recent post counts are unavailable.", [401, 403, 404].includes(response.status));
    }
    if (data.platform !== account.platform || data.handle !== account.handle || !Array.isArray(data.posts) || !["ready", "unsupported", "not_refreshed"].includes(data.status)) throw Error("Recent post counts are unavailable.");
    if ((versions.get(scope) ?? 0) !== version) throw new EngagementFetchError("This account connection changed. Please refresh.", true);
    if (ownerId) {
      try {
        if (data.status === "ready") localStorage.setItem(name, JSON.stringify(data));
        else localStorage.removeItem(name);
      } catch {}
    }
    return data as RecentEngagement;
  })();
  pending.set(requestKey, task);
  void task.finally(() => { if (pending.get(requestKey) === task) pending.delete(requestKey); }).catch(() => {});
  return task;
}

export class EngagementFetchError extends Error {
  constructor(message: string, public discardSaved = false) { super(message); }
}
