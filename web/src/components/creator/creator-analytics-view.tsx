"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, ArrowUpRight, BarChart3, CheckCircle2, Link2, Loader2, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { getSocialAccounts, socialUrl, type SocialAccount, type SocialPlatform } from "@/lib/social-accounts";

const platforms: Record<SocialPlatform, { name: string; initials: string; accent: string }> = {
  instagram: { name: "Instagram", initials: "IG", accent: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  youtube: { name: "YouTube", initials: "YT", accent: "bg-red-500/10 text-red-400 border-red-500/20" },
  x: { name: "X", initials: "X", accent: "bg-white/5 text-white border-white/15" },
  tiktok: { name: "TikTok", initials: "TK", accent: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
  linkedin: { name: "LinkedIn", initials: "IN", accent: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  twitch: { name: "Twitch", initials: "TW", accent: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};

type AccountStats = {
  platform: SocialPlatform;
  handle: string;
  isRealData: boolean;
  avatarUrl?: string;
  displayName?: string;
  followersAvailable?: boolean;
  following?: number | null;
  postCount?: number | null;
  connected?: boolean;
  source?: string;
  followers: number | null;
  totalViews?: number | null;
  videoCount?: number | null;
  subscribersHidden?: boolean;
  avgViews: number | null;
  engagementRate: number | null;
};

function metric(value: number | null | undefined, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)}${suffix}` : "—";
}

function AccountAvatar({ url, account }: { url?: string; account: SocialAccount }) {
  const [failed, setFailed] = useState(false);
  const platform = platforms[account.platform];
  const hasImage = !failed && url?.startsWith("/api/proxy-image?");
  return (
    <div className="relative shrink-0">
      <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border text-sm font-black ${platform.accent}`}>
        {hasImage ? <Image src={url!} alt={`@${account.handle} profile picture`} width={56} height={56} unoptimized className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <span aria-label={`${platform.name} profile`}>{platform.initials}</span>}
      </div>
      {hasImage && <span aria-hidden="true" className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#121215] bg-[#27272a] text-[8px] font-black ${platform.accent.split(" ").find((color) => color.startsWith("text-"))}`}>{platform.initials}</span>}
    </div>
  );
}

function AccountSection({ account }: { account: SocialAccount }) {
  const platform = platforms[account.platform];
  const canFetch = account.platform === "instagram" || account.platform === "youtube" || account.platform === "linkedin" || account.platform === "x";
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!canFetch) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setStats(null);
      try {
        const response = await fetch("/api/social/enrich", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: account.platform, handle: account.handle }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not fetch this account’s stats.");
        if (data.platform !== account.platform || data.handle !== account.handle || !data.isRealData) {
          throw new Error("Public stats are unavailable for this account right now. You can try again later.");
        }
        if (!controller.signal.aborted) {
          setStats(data);
          setCheckedAt(new Date());
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not fetch this account’s stats.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [account.platform, account.handle, canFetch, refresh]);

  const connectAccount = async () => {
    setConnecting(true);
    setError("");
    try {
      const response = await fetch(`/api/account/creators/me/${account.platform}/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: account.handle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || `Could not connect ${platform.name}.`);
      if (data.callbackOrigin && data.callbackOrigin !== window.location.origin) throw new Error(`Open Flenzr at ${data.callbackOrigin} and sign in there before connecting ${platform.name}.`);
      const url = new URL(data.url);
      const allowed = account.platform === "x" ? url.origin === "https://x.com" && url.pathname === "/i/oauth2/authorize" : account.platform === "linkedin" ? url.origin === "https://www.linkedin.com" && url.pathname === "/oauth/v2/authorization" : account.platform === "youtube" ? url.origin === "https://accounts.google.com" && url.pathname === "/o/oauth2/v2/auth" : (url.origin === "https://www.facebook.com" && url.pathname === "/dialog/oauth") || (url.origin === "https://www.instagram.com" && url.pathname === "/oauth/authorize");
      if (!allowed) throw new Error(`Could not connect ${platform.name}.`);
      window.location.assign(url.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not connect ${platform.name}.`);
      setConnecting(false);
    }
  };

  const disconnectAccount = async () => {
    if (!window.confirm(`Disconnect ${platform.name} access for ${account.display_name || "@" + account.handle}? The account will stay listed.`)) return;
    setConnecting(true);
    try {
      const response = await fetch(`/api/account/creators/me/${account.platform}/connection?handle=${encodeURIComponent(account.handle)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Could not disconnect ${platform.name}.`);
      window.dispatchEvent(new Event("flenzr_socials_updated"));
      setRefresh((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Could not disconnect ${platform.name}.`); }
    finally { setConnecting(false); }
  };

  const metrics = account.platform === "linkedin" ? [] : account.platform === "youtube" ? [
    { label: "Subscribers", value: metric(stats?.followersAvailable === false ? null : stats?.followers), detail: stats?.subscribersHidden ? "Hidden by the channel" : "Public count · rounded by YouTube" },
    { label: "Total channel views", value: metric(stats?.totalViews), detail: "Channel lifetime views" },
    { label: "Public videos", value: metric(stats?.videoCount), detail: "Publicly visible uploads" },
  ] : account.platform === "instagram" || account.platform === "x" ? [
    { label: "Followers", value: metric(stats?.followersAvailable === false ? null : stats?.followers), detail: account.platform === "x" ? "X audience count" : "Instagram audience count" },
    { label: "Following", value: metric(stats?.following), detail: "Accounts followed" },
    { label: "Posts", value: metric(stats?.postCount), detail: account.platform === "x" ? "Published post count" : "Published media count" },
  ] : [
    { label: "Followers", value: metric(stats?.followersAvailable === false ? null : stats?.followers), detail: "Public audience count" },
    { label: "Average views", value: metric(stats?.avgViews), detail: "Not available yet" },
    { label: "Engagement rate", value: metric(stats?.engagementRate, "%"), detail: "Not available yet" },
  ];

  return (
    <section aria-label={`${platform.name} ${account.display_name || "@" + account.handle} analytics`} className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#27272a] bg-[#121215]">
      <div className="flex flex-col gap-4 border-b border-[#27272a] p-5">
        <div className="flex min-w-0 items-center gap-3">
          <AccountAvatar key={stats?.avatarUrl || account.avatar_url || "fallback"} url={stats?.avatarUrl || account.avatar_url} account={account} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white">{platform.name}</h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${(account.is_verified || account.connected) ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
                {account.is_verified && <CheckCircle2 className="h-3 w-3" />}
                {account.platform === "linkedin" ? account.connected ? "Account connected" : "Not connected" : account.is_verified ? "Ownership verified" : "Verification pending"}
              </span>
            </div>
            {account.platform === "linkedin" && account.display_name ? (
              <p className="mt-1 truncate text-xs text-neutral-300">{stats?.displayName || account.display_name}</p>
            ) : <a href={socialUrl(account.platform, account.handle)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-neutral-400 hover:text-white">
              <span className="truncate">@{account.handle}</span><ArrowUpRight className="h-3 w-3 shrink-0" />
            </a>}
          </div>
        </div>
        {account.platform === "instagram" && <p className="text-[11px] leading-relaxed text-neutral-400">Connect to verify this account and load its profile counts. Meta will ask you to select its business portfolio. This login configuration also requests messaging access; Flenzr currently does not read or send your messages.</p>}
        {canFetch && <div className="flex flex-wrap gap-2">
          <button type="button" disabled={connecting} onClick={connectAccount} className="rounded-lg border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-xs font-semibold text-pink-300 hover:bg-pink-500/20 disabled:opacity-50">{connecting ? "Connecting…" : (stats?.connected || account.connected) ? `Reconnect ${platform.name}` : `Connect ${platform.name}`}</button>
          {(stats?.connected || account.connected) && <button type="button" disabled={connecting} onClick={disconnectAccount} className="px-2 text-xs text-neutral-400 hover:text-white disabled:opacity-50">Disconnect</button>}
        </div>}
        {canFetch && <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} aria-label={`Refresh ${platform.name} ${account.display_name || "@" + account.handle} ${account.platform === "linkedin" ? "profile" : "stats"}`} className="inline-flex self-start items-center gap-2 rounded-lg border border-[#303036] px-3 py-2 text-xs font-semibold text-neutral-300 transition hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{loading ? "Refreshing…" : account.platform === "linkedin" ? "Refresh profile" : "Refresh stats"}
        </button>}
      </div>
      <div className="flex flex-1 flex-col gap-5 p-5" aria-busy={loading}>
        {account.platform === "linkedin" && <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 text-xs leading-relaxed text-neutral-300">
          LinkedIn shares your name and profile photo with this connection. Follower counts, post analytics, and public profile URLs are not included. Account connection does not verify your real-world identity.
        </div>}
        <div className="flex flex-col gap-3">
          {metrics.map((item) => <div key={item.label} className="rounded-xl border border-white/5 bg-[#18181b] p-4">
            <p className="text-xs text-neutral-400">{item.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-white tabular-nums">{loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-white/5" aria-label="Loading" /> : item.value}</p>
            <p className="mt-2 text-[10px] text-neutral-500">{item.detail}</p>
          </div>)}
        </div>
        <div className="mt-auto flex items-start gap-2 text-xs leading-relaxed text-neutral-500" role={error ? "status" : undefined}>
          {error ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" /> : <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <p>{error || (account.platform === "x" ? loading ? "Loading X profile and counts…" : "Connected to X · Counts update at most every 15 minutes. Views and engagement analytics are not included." : account.platform === "linkedin" ? loading ? "Loading LinkedIn profile…" : "LinkedIn profile connection · Profile updates every 5 minutes. Reconnect when access expires." : !canFetch ? `${platform.name} stats are not available yet. Your linked account is saved.` : loading ? "Fetching the latest available public stats for this account." : account.platform === "youtube" ? `${stats?.connected ? "YouTube connected" : "YouTube public stats"} · Updates every 5 minutes${checkedAt ? ` · Checked at ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}. Watch time and audience demographics require additional channel authorization.` : stats?.source === "instagram-api" ? "Connected to Instagram · Stats update every 5 minutes. Reach, engagement and demographics are not included." : `Public profile snapshot${checkedAt ? ` · Checked at ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}. Views, engagement trends and audience demographics are not available yet.`)}</p>
        </div>
      </div>
    </section>
  );
}

export function CreatorAnalyticsView() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const load = useCallback(() => {
    return getSocialAccounts().then((linked) => {
      setAccounts(linked);
      setError("");
      const params = new URLSearchParams(window.location.search);
      const youtubeResult = params.get("youtube");
      const linkedinResult = params.get("linkedin");
      const xResult = params.get("x");
      const result = params.get("instagram");
      const messages: Record<string, string> = { authorization_failed: "Instagram was not linked because Meta could not confirm access. Try connecting again and approve access to your Creator or Business account. If this keeps happening, contact Flenzr support.", account_not_shared: "Meta did not return an assigned Instagram account. Reconnect, select the portfolio that owns your account, and explicitly share the account with Flenzr. Your account has not been linked yet.", account_not_authorized: "Meta denied access to the selected Instagram account. While the Meta app is unpublished, choose Continue with Facebook and use the Facebook account listed as an app Administrator.", business_required: "Meta did not return a business portfolio. Reconnect and select the portfolio that owns your Instagram account.", configuration_changed: "Instagram configuration changed during login. Please start Connect Instagram again.", connected: "Instagram connected. Your account stats are ready.", cancelled: "Instagram connection was cancelled. You can try again.", expired: "Instagram connection expired. Please try again.", session_expired: "Sign in again using the secure preview URL before connecting Instagram.", account_mismatch: "The connection expired or Instagram authorized a different handle. Start again and choose the matching account.", failed: "Instagram connection failed. Make sure your Creator or Business account is eligible and try again." };
      const youtubeMessages: Record<string, string> = { connected: "YouTube connected. Channel ownership is verified.", cancelled: "YouTube connection was cancelled.", expired: "YouTube connection expired. Please start again.", session_expired: "Sign in again before connecting YouTube.", account_mismatch: "The connection expired or Google authorized a different channel. Start again and choose the matching channel.", failed: "YouTube connection failed. Check that you are a test user and have granted channel access." };
      const linkedinMessages: Record<string, string> = {
        permissions_unavailable: "LinkedIn connection is not ready: Flenzr’s LinkedIn app needs profile access enabled. Please contact Flenzr support.",
        connected: "LinkedIn connected. Your name and profile photo have been imported.",
        cancelled: "LinkedIn connection was cancelled. You can try again.",
        expired: "LinkedIn connection expired. Please start Connect LinkedIn again.",
        session_expired: "Sign in again before connecting LinkedIn.",
        not_configured: "LinkedIn connection has not been configured yet.",
        authorization_failed: "LinkedIn did not grant profile access. Please connect again and approve profile access.",
        account_mismatch: "LinkedIn authorized a different member. Please choose the matching account.",
        failed: "Could not connect LinkedIn. Please try again.",
      };
      const xMessages: Record<string, string> = {
        client_configuration: "X connection needs a Flenzr application configuration update. Please contact Flenzr support.",
        api_access_required: "X did not allow Flenzr to read your profile. Please contact Flenzr support.",
        connected: "X connected. Your profile and available audience counts have been imported.",
        cancelled: "X connection was cancelled. You can try again.",
        expired: "X connection expired. Please start Connect X again.",
        session_expired: "Sign in again before connecting X.",
        not_configured: "X connection has not been configured yet.",
        permissions_unavailable: "X could not grant the required read access. Please contact Flenzr support if this continues.",
        authorization_failed: "X access could not be confirmed. Please connect again.",
        account_mismatch: "X authorized a different account. Please choose the matching account.",
        service_unavailable: "X connection is temporarily unavailable. Please contact Flenzr support.",
        rate_limited: "X’s request limit has been reached. Please try again later.",
        failed: "Could not connect X. Please try again.",
      };
      setConnectionNotice(xResult ? xMessages[xResult] || "" : linkedinResult ? linkedinMessages[linkedinResult] || "" : youtubeResult ? youtubeMessages[youtubeResult] || "" : result ? messages[result] || "" : "");
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load linked accounts.");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("flenzr_socials_updated", load);
    return () => window.removeEventListener("flenzr_socials_updated", load);
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Your social footprint</p>
          <h2 className="text-2xl font-bold tracking-tight text-white">Account analytics</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-neutral-400">A separate view of every linked account. See your audience and available performance stats, one account at a time.</p>
        </div>
        {!loading && !error && accounts.length > 0 && <div className="flex shrink-0 gap-4 text-xs text-neutral-400">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><strong className="text-white">{accounts.length}</strong> linked</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /><strong className="text-white">{accounts.filter((account) => account.is_verified).length}</strong> verified</span>
        </div>}
      </header>

      {connectionNotice && <p role="status" className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-neutral-300">{connectionNotice}</p>}
      {loading ? <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#27272a] bg-[#121215] p-12 text-sm text-neutral-400" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading linked accounts…</div>
        : error ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-200" role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-3 font-semibold underline underline-offset-4">Try again</button></div>
        : accounts.length === 0 ? <div className="rounded-2xl border border-dashed border-[#303036] bg-[#121215] px-6 py-14 text-center"><Link2 className="mx-auto mb-4 h-7 w-7 text-neutral-500" /><h3 className="text-sm font-semibold text-white">Your accounts, all in one place</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-neutral-400">Link a social account from your Studio Overview to see its available stats here. You can link multiple accounts on the same platform.</p></div>
        : <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{accounts.map((account) => <AccountSection key={`${account.platform}:${account.handle}`} account={account} />)}</div>}
    </div>
  );
}
