"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, ArrowUpRight, ChevronDown, Link2, Loader2, MoreHorizontal, RefreshCw, ShieldCheck, Unplug, Users } from "lucide-react";
import { AnalyticsFetchError, invalidateAnalytics, loadAnalytics, readAnalyticsSnapshot, type AccountStats } from "@/lib/analytics-cache";
import { useCreatorAccountId } from "./creator-account-context";
import { InstagramIcon, YoutubeIcon, XTwitterIcon, LinkedInIcon, FacebookIcon, TikTokIcon, TwitchIcon } from "./creator-profile-header";
import "./creator-analytics.css";
import { RecentEngagementPanel } from "./recent-engagement-panel";
import { invalidateRecentEngagement } from "@/lib/recent-engagement";
import { FacebookPageSelection } from "./facebook-page-selection";
import { getSocialAccounts, socialUrl, type SocialAccount, type SocialPlatform } from "@/lib/social-accounts";

const platforms: Record<SocialPlatform, { name: string; initials: string; accent: string }> = {
  facebook: { name: "Facebook", initials: "FB", accent: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  instagram: { name: "Instagram", initials: "IG", accent: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  youtube: { name: "YouTube", initials: "YT", accent: "bg-red-500/10 text-red-400 border-red-500/20" },
  x: { name: "X", initials: "X", accent: "bg-white/5 text-white border-white/15" },
  tiktok: { name: "TikTok", initials: "TK", accent: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
  linkedin: { name: "LinkedIn", initials: "IN", accent: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  twitch: { name: "Twitch", initials: "TW", accent: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};


function metric(value: number | null | undefined, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? `${new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value)}${suffix}` : "—";
}

const platformIcons = { facebook: FacebookIcon, instagram: InstagramIcon, youtube: YoutubeIcon, x: XTwitterIcon, linkedin: LinkedInIcon, tiktok: TikTokIcon, twitch: TwitchIcon };

function AccountAvatar({ url, account }: { url?: string; account: SocialAccount }) {
  const [failed, setFailed] = useState(false);
  const Icon = platformIcons[account.platform];
  const hasImage = !failed && url?.startsWith("/api/proxy-image?");
  return (
    <div className="analytics-card-avatar">
      {hasImage ? <Image src={url!} alt={`${account.display_name || "@" + account.handle} profile picture`} width={48} height={48} unoptimized onError={() => setFailed(true)} /> : <Icon className="h-5 w-5" />}
    </div>
  );
}

function AccountSection({ account }: { account: SocialAccount }) {
  const ownerId = useCreatorAccountId();
  const platform = platforms[account.platform];
  const canFetch = account.platform === "instagram" || account.platform === "youtube" || account.platform === "linkedin" || account.platform === "x" || account.platform === "facebook";
  const [initialSnapshot] = useState(() => readAnalyticsSnapshot(ownerId, account));
  const [stats, setStats] = useState<AccountStats | null>(initialSnapshot?.data ?? null);
  const [loading, setLoading] = useState(canFetch);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<Date | null>(initialSnapshot ? new Date(initialSnapshot.checkedAt) : null);
  const [refresh, setRefresh] = useState(0);
  const lastRefresh = useRef(0);
  const [connecting, setConnecting] = useState(false);


  useEffect(() => {
    if (!canFetch) return;
    let active = true;
    const force = refresh !== lastRefresh.current;
    lastRefresh.current = refresh;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const snapshot = await loadAnalytics(ownerId, account, force);
        if (active) {
          setStats(snapshot.data);
          setCheckedAt(new Date(snapshot.checkedAt));
        }
      } catch (cause) {
        if (active) {
          if (cause instanceof AnalyticsFetchError && cause.discardCached) setStats(null);
          setError(cause instanceof Error ? cause.message : "Could not fetch this account’s stats.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [account, ownerId, canFetch, refresh]);

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
      const allowed = account.platform === "x" ? url.origin === "https://x.com" && url.pathname === "/i/oauth2/authorize" : account.platform === "linkedin" ? url.origin === "https://www.linkedin.com" && url.pathname === "/oauth/v2/authorization" : account.platform === "youtube" ? url.origin === "https://accounts.google.com" && url.pathname === "/o/oauth2/v2/auth" : account.platform === "facebook" ? url.origin === "https://www.facebook.com" && url.pathname === "/dialog/oauth" : (url.origin === "https://www.facebook.com" && url.pathname === "/dialog/oauth") || (url.origin === "https://www.instagram.com" && url.pathname === "/oauth/authorize");
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
      invalidateAnalytics(ownerId, account.platform, account.handle);
      invalidateRecentEngagement(ownerId, account.platform);
      setStats(null);
      window.dispatchEvent(new Event("flenzr_socials_updated"));
      setRefresh((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Could not disconnect ${platform.name}.`); }
    finally { setConnecting(false); }
  };

  const connected = Boolean(stats?.connected || account.connected);
  const Icon = platformIcons[account.platform];
  const name = stats?.displayName || account.display_name || `@${account.handle}`;
  const metrics = account.platform === "facebook" ? [
    { label: "Followers", value: stats?.followersAvailable === false ? null : stats?.followers, detail: "Page followers" },
    { label: "Likes", value: stats?.likesAvailable === false ? null : stats?.likes, detail: "Page likes · unavailable on New Pages Experience" },
  ] : account.platform === "linkedin" ? [] : account.platform === "youtube" ? [
    { label: "Subscribers", value: stats?.followersAvailable === false ? null : stats?.followers, detail: stats?.subscribersHidden ? "Hidden by the channel" : "Public subscriber count · rounded by YouTube" },
    { label: "Views", value: stats?.totalViews, detail: "Total channel views" },
    { label: "Videos", value: stats?.videoCount, detail: "Publicly visible uploads" },
  ] : account.platform === "instagram" || account.platform === "x" ? [
    { label: "Followers", value: stats?.followersAvailable === false ? null : stats?.followers, detail: "Audience count" },
    { label: "Following", value: stats?.following, detail: "Accounts followed" },
    { label: "Posts", value: stats?.postCount, detail: "Published post count" },
  ] : [
    { label: "Followers", value: stats?.followersAvailable === false ? null : stats?.followers, detail: "Audience count" },
    { label: "Avg. views", value: stats?.avgViews, detail: "Not available yet" },
    { label: "Engagement", value: stats?.engagementRate, detail: "Not available yet", suffix: "%" },
  ];
  const status = connecting ? "Connecting…" : connected ? "Connected" : account.is_verified ? "Verified" : canFetch ? "Not connected" : "Linked";
  const cadence = account.platform === "x" ? "Updates every 15 min" : canFetch ? "Updates every 5 min" : "Stats unavailable";
  const checkedLabel = checkedAt ? `Checked at ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : cadence;
  const connectionDetails = account.platform === "facebook"
    ? "Facebook Page access only. Likes are unavailable on New Pages Experience. Post insights, reach and audience demographics are not included."
    : account.platform === "instagram"
    ? "Creator or Business account required. Meta asks you to share your account and grants messaging access. Flenzr does not read or send messages. Reach, saves and demographics are not included."
    : account.platform === "linkedin"
    ? "LinkedIn shares your name and photo. Follower counts, post analytics and public profile URLs are not included. Connecting does not verify your real-world identity."
    : account.platform === "youtube"
    ? "Public subscriber counts may be rounded or hidden by YouTube. Views are channel lifetime totals. Watch time and audience demographics are not included."
    : account.platform === "x"
    ? "Profile counts update at most every 15 minutes. Views and audience demographics are not included."
    : "Your profile link is saved. Account statistics are not available for this network yet.";

  return (
    <section aria-label={`${platform.name} ${account.display_name || "@" + account.handle} analytics`} className="analytics-card" data-platform={account.platform}>
      <div className="analytics-card-cover" aria-hidden="true">
        <span className="analytics-card-platform"><Icon className="h-3 w-3" />{platform.name}</span>
      </div>
      <div className="analytics-card-content">
        <div className="analytics-card-topline">
          <AccountAvatar key={stats?.avatarUrl || account.avatar_url || "fallback"} url={stats?.avatarUrl || account.avatar_url} account={account} />
          <span className="analytics-card-status" data-connected={connected || account.is_verified}>
            <span aria-hidden="true" />{status}
          </span>
        </div>
        <div className="analytics-card-identity">
          <div className="analytics-card-name" title={name}>{name}</div>
          {account.platform === "linkedin" && account.display_name ? <p className="analytics-card-handle">LinkedIn member</p> : (
            <a href={socialUrl(account.platform, account.handle)} target="_blank" rel="noopener noreferrer" className="analytics-card-handle" title={`Open ${account.platform === "facebook" ? name : "@" + account.handle} on ${platform.name}`}>
              <span>{account.platform === "facebook" ? stats?.category || "Facebook Page" : "@" + account.handle}</span><ArrowUpRight size={11} aria-hidden="true" />
            </a>
          )}
          {canFetch && <details className="analytics-card-actions" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.removeAttribute("open");
          }} onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.removeAttribute("open");
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}>
            <summary aria-label={`Manage ${platform.name} ${account.display_name || "@" + account.handle}`} title="Manage account"><MoreHorizontal size={16} aria-hidden="true" /></summary>
            <div className="analytics-card-action-menu">
              <button type="button" disabled={connecting} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); void connectAccount(); }}>
                <RefreshCw size={12} aria-hidden="true" />{connected ? "Reconnect" : "Connect"} {platform.name}
              </button>
              {connected && <button type="button" disabled={connecting} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); void disconnectAccount(); }}>
                <Unplug size={12} aria-hidden="true" />Disconnect
              </button>}
            </div>
          </details>}
        </div>

        {metrics.length > 0 ? <dl className="analytics-card-metrics" aria-busy={loading && !stats}>
          {metrics.map((item) => <div key={item.label} title={`${item.detail}: ${typeof item.value === "number" ? new Intl.NumberFormat("en").format(item.value) + ("suffix" in item ? item.suffix || "" : "") : "Unavailable"}`}>
            <dd>{loading && !stats ? <span className="analytics-card-skeleton" aria-label="Loading" /> : metric(item.value, "suffix" in item ? item.suffix : undefined)}</dd>
            <dt>{item.label}</dt>
          </div>)}
        </dl> : <div className="analytics-card-profile-only">
          <LinkedInIcon className="h-4 w-4 shrink-0" />
          <div><p>Member profile</p><span>Name & photo access</span></div>
        </div>}

        {canFetch && !connected && !loading && <div className="analytics-card-connect">
          {account.platform === "instagram" && <p>Meta requests profile and messaging access. Flenzr does not read or send messages.</p>}
          <button type="button" disabled={connecting} onClick={connectAccount}>{connecting ? <Loader2 size={12} className="animate-spin" /> : <Icon className="h-3 w-3" />}{connecting ? "Connecting…" : `Connect ${platform.name}`}</button>
        </div>}

        {error && <p className="analytics-card-error" role="status"><AlertCircle size={12} aria-hidden="true" />{error}{stats ? " Showing saved data." : ""}</p>}
        <div className="analytics-card-footer">
          <details className="analytics-card-info">
            <summary title="Connection details" aria-label={`Connection details for ${platform.name}. ${checkedLabel}`}>{loading ? stats ? "Updating…" : "Loading…" : checkedLabel}<ChevronDown size={9} aria-hidden="true" /></summary>
            <p>{cadence}. {connectionDetails}</p>
          </details>
          {canFetch && <span className="analytics-card-refresh">
            <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} aria-label={`Refresh ${platform.name} ${account.display_name || "@" + account.handle} ${account.platform === "linkedin" ? "profile" : "stats"}`}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
            <span role="tooltip">{account.platform === "linkedin" ? "Refresh profile" : "Refresh stats"}</span>
          </span>}
        </div>
      </div>
    </section>
  );
}

export function CreatorAnalyticsView() {
  const ownerId = useCreatorAccountId();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const [facebookSelection, setFacebookSelection] = useState(false);
  const load = useCallback(() => {
    return getSocialAccounts().then((linked) => {
      setError("");
      const params = new URLSearchParams(window.location.search);
      const youtubeResult = params.get("youtube");
      const linkedinResult = params.get("linkedin");
      const xResult = params.get("x");
      const facebookResult = params.get("facebook");
      if (facebookResult === "select_pages") setFacebookSelection(true);
      const result = params.get("instagram");
      for (const network of ["instagram", "youtube", "linkedin", "x", "facebook"] as const) {
        if (params.has(network)) { invalidateAnalytics(ownerId, network); invalidateRecentEngagement(ownerId, network); }
      }
      setAccounts(linked);
      // Consume callback outcomes once so later visits can reuse the refreshed cache.
      if (["instagram", "youtube", "linkedin", "x", "facebook"].some((network) => params.has(network))) {
        const clean = new URL(window.location.href);
        for (const network of ["instagram", "youtube", "linkedin", "x", "facebook"]) {
          if (network !== "facebook" || facebookResult !== "select_pages") clean.searchParams.delete(network);
        }
        window.history.replaceState(window.history.state, "", clean);
      }
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
      const facebookMessages: Record<string, string> = {
        connected: "Facebook Pages connected. Available audience counts have been imported.",
        cancelled: "Facebook Pages connection was cancelled.",
        expired: "Facebook Pages connection expired. Please start again.",
        session_expired: "Sign in again before connecting Facebook Pages.",
        not_configured: "Facebook Pages connection has not been configured yet.",
        configuration_required: "Facebook Pages needs a configuration update. Please contact Flenzr support.",
        permissions_required: "Approve Page-list and Page-read access, then reconnect.",
        no_pages: "No accessible Pages were shared. Use an account with Page access and select your Pages during Facebook login.",
        too_many_pages: "Share up to 100 Pages during Facebook login, then select up to 20 to import at a time.",
        rate_limited: "Facebook’s request limit has been reached. Please try again later.",
        page_mismatch: "Facebook did not share the matching Page. Reconnect and select it.",
        authorization_failed: "Facebook Page access could not be confirmed. Please reconnect and approve Page access.",
        failed: "Could not connect Facebook Pages. Please try again.",
      };
      const notice = facebookResult ? facebookMessages[facebookResult] || "" : xResult ? xMessages[xResult] || "" : linkedinResult ? linkedinMessages[linkedinResult] || "" : youtubeResult ? youtubeMessages[youtubeResult] || "" : result ? messages[result] || "" : "";
      if (notice) setConnectionNotice(notice);
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load linked accounts.");
    }).finally(() => setLoading(false));
  }, [ownerId]);

  useEffect(() => {
    void load();
    window.addEventListener("flenzr_socials_updated", load);
    return () => window.removeEventListener("flenzr_socials_updated", load);
  }, [load]);

  const closeFacebookSelection = () => {
    setFacebookSelection(false);
    const clean = new URL(window.location.href);
    clean.searchParams.delete("facebook");
    window.history.replaceState(window.history.state, "", clean);
  };

  return (
    <div className="space-y-6">
      {facebookSelection && <FacebookPageSelection onCancel={closeFacebookSelection} onConnected={() => {
        closeFacebookSelection();
        invalidateAnalytics(ownerId, "facebook");
        invalidateRecentEngagement(ownerId, "facebook");
        setConnectionNotice("Facebook Pages connected. Available audience counts have been imported.");
        window.dispatchEvent(new Event("flenzr_socials_updated"));
      }} />}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Your social footprint</p>
          <h2 className="text-2xl font-bold tracking-tight text-white">Account analytics</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-neutral-400">Your connected profiles and audience, at a glance.</p>
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
        : <div className="analytics-workspace"><div className="analytics-account-grid">{accounts.map((account) => <AccountSection key={`${ownerId}:${account.platform}:${account.handle}:${account.is_verified}:${account.connected}`} account={account} />)}</div><RecentEngagementPanel accounts={accounts} /></div>}
    </div>
  );
}
