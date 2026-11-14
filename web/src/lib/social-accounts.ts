export type SocialPlatform = "instagram" | "youtube" | "x" | "tiktok" | "linkedin" | "twitch";
export interface SocialAccount { platform: SocialPlatform; handle: string; is_verified: boolean; display_name?: string; avatar_url?: string; connected?: boolean }
export interface SocialLink { id: string; platform: SocialPlatform; handle: string; url: string; isVerified: boolean; avatarUrl?: string; createdAt?: number; displayName?: string; isConnected?: boolean }
export function socialUrl(platform: SocialPlatform, handle: string) {
  const prefix = { instagram: "https://instagram.com/", youtube: "https://youtube.com/@", x: "https://x.com/", tiktok: "https://tiktok.com/@", linkedin: "https://linkedin.com/in/", twitch: "https://twitch.tv/" };
  return prefix[platform] + encodeURIComponent(handle);
}
export function mergeSocialAccounts(accounts: SocialAccount[], previous: SocialLink[]): SocialLink[] {
  return accounts.map((account, index) => {
    const cached = previous.find((item) => item.platform === account.platform && item.handle.toLowerCase() === account.handle.toLowerCase());
    return { id: `soc-${account.platform}-${account.handle}`, platform: account.platform, handle: account.handle, url: account.platform === "linkedin" && account.display_name ? "" : socialUrl(account.platform, account.handle), isVerified: account.is_verified, avatarUrl: account.avatar_url || cached?.avatarUrl, displayName: account.display_name, isConnected: account.connected, createdAt: cached?.createdAt ?? Date.now() + index };
  }).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}
export function mergeSocialAvatars(current: SocialLink[], updates: SocialLink[]) {
  return current.map((item) => {
    const enriched = updates.find((update) => update.platform === item.platform && update.handle === item.handle);
    return enriched?.avatarUrl ? { ...item, avatarUrl: enriched.avatarUrl } : item;
  });
}
async function checkedAccounts(response: Response): Promise<SocialAccount[]> {
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.message || data.error || "Could not update linked accounts. Please retry.");
  return data;
}
export async function getSocialAccounts() {
  return checkedAccounts(await fetch("/api/account/creators/me/social-accounts", { cache: "no-store" }));
}
export async function saveSocialAccount(platform: SocialPlatform, handle: string, expectedHandle?: string) {
  return checkedAccounts(await fetch(`/api/account/creators/me/social-accounts/${platform}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, ...(expectedHandle === undefined ? {} : { expected_handle: expectedHandle }) }) }));
}
export async function deleteSocialAccount(platform: SocialPlatform, handle: string) {
  return checkedAccounts(await fetch(`/api/account/creators/me/social-accounts/${platform}?expected_handle=${encodeURIComponent(handle)}`, { method: "DELETE" }));
}

export async function connectYouTube(handle?: string) {
  const response = await fetch("/api/account/creators/me/youtube/connect", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(handle ? { handle } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.message || "Could not connect YouTube.");
  if (data.callbackOrigin !== window.location.origin) throw Error(`Open Flenzr at ${data.callbackOrigin} and sign in there before connecting YouTube.`);
  const url = new URL(data.url);
  if (url.origin !== "https://accounts.google.com" || url.pathname !== "/o/oauth2/v2/auth") throw Error("Could not connect YouTube.");
  window.location.assign(url.toString());
}

export async function connectInstagram(handle?: string, accountId?: string) {
  const body: { handle?: string; account_id?: string } = {};
  if (handle) body.handle = handle;
  if (accountId) body.account_id = accountId;
  const response = await fetch("/api/account/creators/me/instagram/connect", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.message || "Could not connect Instagram.");
  if (data.callbackOrigin !== window.location.origin) throw Error(`Open Flenzr at ${data.callbackOrigin} and sign in there before connecting Instagram.`);
  const url = new URL(data.url);
  if (!((url.origin === "https://www.facebook.com" && url.pathname === "/dialog/oauth") || (url.origin === "https://www.instagram.com" && url.pathname === "/oauth/authorize"))) throw Error("Could not connect Instagram.");
  window.location.assign(url.toString());
}

export async function connectLinkedIn(handle?: string) {
  const response = await fetch("/api/account/creators/me/linkedin/connect", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(handle ? { handle } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.message || "Could not connect LinkedIn.");
  if (data.callbackOrigin !== window.location.origin) throw Error(`Open Flenzr at ${data.callbackOrigin} and sign in there before connecting LinkedIn.`);
  const url = new URL(data.url);
  if (url.origin !== "https://www.linkedin.com" || url.pathname !== "/oauth/v2/authorization") throw Error("Could not connect LinkedIn.");
  window.location.assign(url.toString());
}

export async function connectX(handle?: string) {
  const response = await fetch("/api/account/creators/me/x/connect", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(handle ? { handle } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error?.message || "Could not connect X.");
  if (data.callbackOrigin !== window.location.origin) throw Error(`Open Flenzr at ${data.callbackOrigin} and sign in there before connecting X.`);
  const url = new URL(data.url);
  if (url.origin !== "https://x.com" || url.pathname !== "/i/oauth2/authorize") throw Error("Could not connect X.");
  window.location.assign(url.toString());
}
