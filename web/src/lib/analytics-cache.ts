import type { SocialAccount, SocialPlatform } from "./social-accounts";

export interface AccountStats {
  platform: SocialPlatform;
  handle: string;
  isRealData: boolean;
  avatarUrl?: string;
  displayName?: string;
  followersAvailable?: boolean;
  following?: number | null;
  likes?: number | null;
  likesAvailable?: boolean;
  category?: string | null;
  postCount?: number | null;
  connected?: boolean;
  source?: string;
  followers: number | null;
  totalViews?: number | null;
  videoCount?: number | null;
  subscribersHidden?: boolean;
  avgViews: number | null;
  engagementRate: number | null;
}

interface StatsSnapshot { data: AccountStats; checkedAt: number }
interface StoredSnapshot extends StatsSnapshot { ownerId: string; revision: string }
const PREFIX = "flenzr_analytics_v1:";
const MAX_AGE = 24 * 60 * 60 * 1000;
const pending = new Map<string, Promise<StatsSnapshot>>();
const generations = new Map<string, number>();

function key(ownerId: string, platform: SocialPlatform, handle: string) {
  return `${PREFIX}${encodeURIComponent(ownerId)}:${platform}:${encodeURIComponent(handle)}`;
}
function revision(account: SocialAccount) {
  return `${account.is_verified}:${account.connected ?? "unknown"}`;
}
function generation(ownerId: string, account: SocialAccount) {
  return `${generations.get(`${ownerId}:${account.platform}`) ?? 0}:${generations.get(key(ownerId, account.platform, account.handle)) ?? 0}`;
}
export function analyticsFreshness(platform: SocialPlatform) {
  return (platform === "x" ? 15 : 5) * 60 * 1000;
}
export function readAnalyticsSnapshot(ownerId: string | null, account: SocialAccount): StatsSnapshot | null {
  if (!ownerId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(ownerId, account.platform, account.handle));
    if (!raw) return null;
    const value: StoredSnapshot = JSON.parse(raw);
    const age = Date.now() - value.checkedAt;
    if (value.ownerId !== ownerId || value.revision !== revision(account) || !Number.isFinite(age) || age < 0 || age > MAX_AGE ||
        value.data?.platform !== account.platform || value.data?.handle !== account.handle || value.data?.isRealData !== true) return null;
    return { data: value.data, checkedAt: value.checkedAt };
  } catch { return null; }
}

export function invalidateAnalytics(ownerId: string | null, platform: SocialPlatform, handle?: string) {
  if (!ownerId || typeof window === "undefined") return;
  const scope = handle ? key(ownerId, platform, handle) : `${ownerId}:${platform}`;
  generations.set(scope, (generations.get(scope) ?? 0) + 1);
  try {
    const prefix = `${PREFIX}${encodeURIComponent(ownerId)}:${platform}:`;
    for (const storageKey of Object.keys(localStorage)) {
      if (handle ? storageKey === key(ownerId, platform, handle) : storageKey.startsWith(prefix)) localStorage.removeItem(storageKey);
    }
  } catch { /* Browser caching is optional. */ }
}

export class AnalyticsFetchError extends Error {
  constructor(message: string, public discardCached = false) { super(message); }
}

export function loadAnalytics(ownerId: string | null, account: SocialAccount, force = false): Promise<StatsSnapshot> {
  const cached = readAnalyticsSnapshot(ownerId, account);
  if (!force && cached && Date.now() - cached.checkedAt < analyticsFreshness(account.platform)) return Promise.resolve(cached);
  const startedGeneration = ownerId ? generation(ownerId, account) : null;
  const requestKey = ownerId ? `${key(ownerId, account.platform, account.handle)}:${revision(account)}:${startedGeneration}` : null;
  const existing = requestKey && pending.get(requestKey);
  if (existing) return existing;
  const task = (async () => {
    const response = await fetch("/api/social/enrich", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: account.platform, handle: account.handle }),
    });
    const data = await response.json();
    if (!response.ok) {
      const discard = [401, 403, 409].includes(response.status);
      if (discard) invalidateAnalytics(ownerId, account.platform, account.handle);
      throw new AnalyticsFetchError(typeof data.error === "string" ? data.error : "Could not fetch this account’s stats.", discard);
    }
    if (data.platform !== account.platform || data.handle !== account.handle || data.isRealData !== true) {
      throw new AnalyticsFetchError("Stats are unavailable for this account right now. You can try again later.");
    }
    const result: StatsSnapshot = { data, checkedAt: Date.now() };
    if (ownerId && generation(ownerId, account) !== startedGeneration) {
      throw new AnalyticsFetchError("This account connection changed. Please try again.", true);
    }
    if (ownerId && typeof window !== "undefined" && generation(ownerId, account) === startedGeneration) {
      try {
        localStorage.setItem(key(ownerId, account.platform, account.handle), JSON.stringify({ ...result, ownerId, revision: revision(account) }));
      } catch { /* An unavailable or full cache must not prevent loading live data. */ }
    }
    return result;
  })();
  if (requestKey) {
    pending.set(requestKey, task);
    const cleanup = () => { if (pending.get(requestKey) === task) pending.delete(requestKey); };
    void task.then(cleanup, cleanup);
  }
  return task;
}
