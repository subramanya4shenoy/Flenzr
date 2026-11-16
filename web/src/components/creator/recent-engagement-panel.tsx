"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Heart, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import type { SocialAccount } from "@/lib/social-accounts";
import { EngagementFetchError, loadRecentEngagement, savedRecentEngagement, type RecentEngagement } from "@/lib/recent-engagement";
import { useCreatorAccountId } from "./creator-account-context";
import { InstagramIcon, YoutubeIcon, FacebookIcon, XTwitterIcon, LinkedInIcon, TikTokIcon, TwitchIcon } from "./creator-profile-header";
import "./recent-engagement-panel.css";

const networks = {
  instagram: { name: "Instagram", color: "#e879c6", icon: InstagramIcon },
  youtube: { name: "YouTube", color: "#fa7780", icon: YoutubeIcon },
  facebook: { name: "Facebook", color: "#65abff", icon: FacebookIcon },
  x: { name: "X", color: "#d1d5df", icon: XTwitterIcon },
  linkedin: { name: "LinkedIn", color: "#58b9da", icon: LinkedInIcon },
  tiktok: { name: "TikTok", color: "#56d6d5", icon: TikTokIcon },
  twitch: { name: "Twitch", color: "#b995ff", icon: TwitchIcon },
};
type Reading = { data: RecentEngagement | null; error?: string; loading: boolean };
const signature = (account: SocialAccount) => `${account.platform}:${account.handle}:${account.is_verified}:${account.connected}`;
const format = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);

export function RecentEngagementPanel({ accounts }: { accounts: SocialAccount[] }) {
  const ownerId = useCreatorAccountId();
  const titleId = useId();
  const [readings, setReadings] = useState<Record<string, Reading>>({});
  const [refresh, setRefresh] = useState(0);
  const previousRefresh = useRef(0);
  const [refreshTarget, setRefreshTarget] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const force = refresh !== previousRefresh.current;
    previousRefresh.current = refresh;
    const queue = force && refreshTarget ? accounts.filter((account) => signature(account) === refreshTarget) : [...accounts];
    const worker = async () => {
      while (queue.length && active) {
        const account = queue.shift()!;
        const key = `${ownerId}:${signature(account)}`;
        const cached = savedRecentEngagement(ownerId, account);
        if (active) setReadings((current) => ({ ...current, [key]: { data: current[key]?.data ?? cached, loading: true } }));
        try {
          const data = await loadRecentEngagement(ownerId, account, force);
          if (active) setReadings((current) => ({ ...current, [key]: { data, loading: false } }));
        } catch (cause) {
          if (active) setReadings((current) => ({ ...current, [key]: { data: cause instanceof EngagementFetchError && cause.discardSaved ? null : current[key]?.data ?? cached, loading: false, error: cause instanceof Error ? cause.message : "Post counts unavailable." } }));
        }
      }
    };
    void Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
    return () => { active = false; };
  }, [accounts, ownerId, refresh, refreshTarget]);
  const requestRefresh = (account?: SocialAccount) => {
    setRefreshTarget(account ? signature(account) : null);
    setRefresh((value) => value + 1);
  };
  const updatedLabel = (timestamp: number) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp * 1000));
  const entries = accounts.map((account) => ({ account, ...readings[`${ownerId}:${signature(account)}`] }));
  const ready = entries.filter((entry) => entry.data?.status === "ready");
  const lastUpdated = Math.max(0, ...ready.map((entry) => entry.data?.fetchedAt || 0));
  const measured = ready.reduce((sum, entry) => sum + (entry.data?.measuredPosts || 0), 0);
  const posts = ready.reduce((sum, entry) => sum + (entry.data?.postsRead || 0), 0);
  const available = ready.filter((entry) => entry.data?.total !== null);
  const total = available.length ? available.reduce((sum, entry) => sum + (entry.data?.total || 0), 0) : null;
  const likes = total === null ? null : available.reduce((sum, entry) => sum + (entry.data?.likes || 0), 0);
  const comments = total === null ? null : available.reduce((sum, entry) => sum + (entry.data?.comments || 0), 0);
  const loading = entries.some((entry) => entry.loading !== false);
  const groups = Object.entries(networks).flatMap(([platform, network]) => {
    const matching = entries.filter((entry) => entry.account.platform === platform);
    if (!matching.length) return [];
    const values = matching.filter((entry) => entry.data?.status === "ready" && entry.data.total !== null);
    return [{ platform, network, entries: matching, total: values.length ? values.reduce((sum, entry) => sum + (entry.data?.total || 0), 0) : null }];
  });
  const chartGroups = groups.filter((group) => group.total !== null);
  let offset = 0;
  const radius = 72, circumference = 2 * Math.PI * radius;
  const exact = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en").format(value);

  return <aside className="recent-engagement" aria-labelledby={titleId}>
    <header><div><span className="recent-engagement-eyebrow">Up to 10 posts / account</span><h3 id={titleId}>Recent engagement</h3></div><Sparkles size={15} className="recent-engagement-spark" aria-hidden="true" /></header>
    <div className="recent-engagement-headline"><strong>{format(total)}</strong><span>Likes, reactions & comments</span><small>{available.length} of {accounts.length} accounts reporting</small></div>
    <div className="recent-engagement-orbit">
      <svg viewBox="0 0 240 240" role="img" aria-label={total === null ? "Engagement counts unavailable" : `Engagement across networks: ${exact(total)} interactions`}>
        <defs><filter id={`${titleId}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter><radialGradient id={`${titleId}-ambient`}><stop offset="0" stopColor="#4adea3" stopOpacity=".12" /><stop offset="1" stopColor="#4adea3" stopOpacity="0" /></radialGradient></defs>
        <circle cx="120" cy="120" r="110" fill={`url(#${titleId}-ambient)`} />
        {[44, 72, 98].map((r) => <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="#293831" strokeWidth=".6" />)}
        {Array.from({ length: 12 }, (_, index) => { const angle = index * Math.PI / 6; return <line key={index} x1={120 + Math.cos(angle) * 38} y1={120 + Math.sin(angle) * 38} x2={120 + Math.cos(angle) * 104} y2={120 + Math.sin(angle) * 104} stroke="#25352e" strokeWidth=".6" />; })}
        <circle cx="120" cy="120" r={radius} fill="none" stroke="#20312a" strokeWidth="9" />
        {chartGroups.map((group) => {
          const length = total ? group.total! / total * circumference : 0;
          const start = offset; offset += length;
          if (!length) return null;
          const segment = { strokeDasharray: `${Math.max(0, length - Math.min(4, length * .08))} ${circumference}`, strokeDashoffset: -start };
          return <g key={group.platform} transform="rotate(-90 120 120)"><circle cx="120" cy="120" r={radius} fill="none" stroke={group.network.color} strokeWidth="12" style={segment} filter={`url(#${titleId}-glow)`} opacity=".6" /><circle cx="120" cy="120" r={radius} fill="none" stroke={group.network.color} strokeWidth="4" style={segment}><title>{group.network.name}: {exact(group.total)}</title></circle></g>;
        })}
      </svg>
      <div className="recent-engagement-orbit-center"><strong>{measured}</strong><span>posts measured</span></div>
    </div>
    <div className="recent-engagement-metrics"><div><Heart size={12} /><span>Likes / reactions</span><strong>{format(likes)}</strong></div><div><MessageCircle size={12} /><span>Comments / replies</span><strong>{format(comments)}</strong></div></div>
    <div className="recent-engagement-networks">{groups.map((group) => {
      const Icon = group.network.icon;
      return <details key={group.platform}><summary title="Show account breakdown and access status"><span className="recent-engagement-network-name"><Icon className="h-3 w-3" /><span style={{ color: group.network.color }}>{group.network.name}</span>{group.entries.some((entry) => entry.data?.source === "x-public-profile") && <small className="recent-engagement-source-badge">Public sample</small>}</span><strong>{group.total === null && group.entries.some((entry) => entry.loading !== false) ? "…" : format(group.total)}</strong></summary><div className="recent-engagement-account-details">{group.entries.map((entry) => <div className="recent-engagement-account" key={entry.account.handle}><b>{entry.account.display_name || `@${entry.account.handle}`}</b><span>{entry.data?.status === "ready" ? `${entry.data.measuredPosts ?? 0} of ${entry.data.postsRead ?? 0} ${entry.data.source === "x-public-profile" ? "public" : "recent"} posts measured · ${exact(entry.data.total)} interactions` : entry.loading !== false ? "Loading saved results…" : entry.data?.status === "unsupported" ? "Post analytics not included in this connection." : "No saved results yet. Refresh to fetch recent posts."}</span>
        {entry.data?.source === "x-public-profile" && <span className="recent-engagement-public-source">Public profile sample · latest 10 not guaranteed</span>}
        {entry.data?.fetchedAt ? <time dateTime={new Date(entry.data.fetchedAt * 1000).toISOString()}>{entry.data.source === "x-public-profile" ? "Last retrieved" : "Last updated"} {updatedLabel(entry.data.fetchedAt)}</time> : null}
        {entry.error && <span role="status">{entry.error}{entry.data?.status === "ready" ? " Showing saved results." : ""}</span>}
        {entry.data?.status !== "unsupported" && <button type="button" disabled={loading} onClick={() => requestRefresh(entry.account)} aria-label={`Refresh ${group.network.name} ${entry.account.display_name || entry.account.handle} engagement`}><RefreshCw size={10} />Refresh</button>}
      </div>)}</div></details>;
    })}</div>
    <footer><p className="recent-engagement-updated">{lastUpdated ? <>Latest saved update <time dateTime={new Date(lastUpdated * 1000).toISOString()}>{updatedLabel(lastUpdated)}</time></> : "No saved update yet"}</p><p>{posts ? `${measured} of ${posts} fetched posts have complete counts.` : "Click Refresh to fetch and save recent post counts."} Shares, saves and views aren’t included. Posts can cover different date ranges.</p><details className="recent-engagement-method"><summary>How counts work</summary><p>Up to 10 recent published posts per account. YouTube uses public uploads. X uses visible public-profile posts; the sample may be incomplete or out of date and is not API-verified. A post is measured only when both its like/reaction and comment counts are available. LinkedIn needs separate post-analytics access.</p></details><div><span role="status">{loading ? "Loading…" : "Manual refresh only"}</span><button type="button" disabled={loading} onClick={() => requestRefresh()} aria-label="Refresh all recent engagement" title="Fetch and save recent engagement for all accounts"><RefreshCw size={12} className={loading ? "animate-spin" : ""} />Refresh all</button></div></footer>
  </aside>;
}
