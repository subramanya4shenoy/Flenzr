"use client";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { CreatorDiscoveryTable } from "./creator-discovery-table";
import { discoverCreators, discoveryPageSize, discoveryQuery, discoveryNetworks, validateAudienceFilters, type DiscoveryNetwork, type DiscoveryFilters, type DiscoveryPage } from "@/lib/creator-discovery";
import "./creator-discovery.css";
import { CampaignInvitationDialog } from "./campaign-invitation";
import { ShortlistSaveDialog } from "./shortlist-save";
import type { Shortlist } from "@/lib/shortlists";
import type { SavedCampaign } from "@/lib/campaign-drafts";

const emptyFilters: DiscoveryFilters = { q: "", niche: "", location: "", network: "", min_audience: "", max_audience: "", updated_within_days: "" };
type Result = { key: string; status: "loading" | "ready" | "error"; page?: DiscoveryPage; error?: string };
export function CreatorDiscovery({ onManageCampaigns, onViewCampaign, onViewShortlist }: { onManageCampaigns: () => void; onViewCampaign: (campaign: SavedCampaign) => void; onViewShortlist: (group: Shortlist) => void }) {
  const [saveHandle, setSaveHandle] = useState<string | null>(null);
  const [inviteHandle, setInviteHandle] = useState<string | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = discoveryQuery(filters, offset);
  const validationError = validateAudienceFilters(filters);
  useEffect(() => {
    if (validationError) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResult({ key, status: "loading" });
      try {
        const page = await discoverCreators(filters, offset, controller.signal);
        if (!controller.signal.aborted) setResult({ key, status: "ready", page });
      } catch (err) {
        if (!controller.signal.aborted) setResult({ key, status: "error", error: err instanceof Error ? err.message : "Could not load creators. Please retry." });
      }
    }, filters.q || filters.niche || filters.location ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, filters, offset, attempt, validationError]);
  const current = result?.key === key ? result : null;
  const loading = !validationError && (!current || current.status === "loading");
  const page = !validationError && current?.status === "ready" ? current.page : undefined;
  const filtered = Boolean(filters.q || filters.niche || filters.location || filters.network);
  function update<K extends keyof DiscoveryFilters>(field: K, value: DiscoveryFilters[K]) {
    setFilters((previous) => ({ ...previous, [field]: value, ...(field === "network" && !value ? { min_audience: "", max_audience: "", updated_within_days: "" } : {}) })); setOffset(0);
  }
  function clear() { setFilters(emptyFilters); setOffset(0); }
  return <section className="fl-discovery" aria-label="Creator discovery">
    {saveHandle && <ShortlistSaveDialog key={saveHandle} handle={saveHandle} onClose={() => setSaveHandle(null)} onView={onViewShortlist} />}
    {inviteHandle && <CampaignInvitationDialog key={inviteHandle} handle={inviteHandle} onClose={() => setInviteHandle(null)} onManageCampaigns={onManageCampaigns} onViewCampaign={onViewCampaign} />}
    <div className="fl-discovery-filters">
      <label><span>Search creators</span><div className="fl-discovery-search"><Search size={16} aria-hidden="true" /><input type="search" name="creator-search" placeholder="Name, handle or bio" maxLength={255} value={filters.q} onChange={(event) => update("q", event.target.value)} /></div></label>
      <label><span>Niche</span><input name="creator-niche" placeholder="e.g. Technology" maxLength={128} value={filters.niche} onChange={(event) => update("niche", event.target.value)} /></label>
      <label><span>Location</span><input name="creator-location" placeholder="e.g. Mumbai" maxLength={128} value={filters.location} onChange={(event) => update("location", event.target.value)} /></label>
      <label><span>Connected network</span><select name="creator-network" value={filters.network || ""} onChange={(event) => update("network", event.target.value as DiscoveryNetwork | "")}><option value="">All networks</option>{discoveryNetworks.map((network) => <option key={network.value} value={network.value}>{network.label}</option>)}</select></label>
      <button type="button" disabled={!filtered} onClick={clear}>Clear filters</button>
    </div>
    <fieldset className="fl-discovery-audience-filters" disabled={!filters.network}>
      <legend>Saved audience{filters.network === "youtube" ? " · subscribers" : filters.network ? " · followers" : " · choose a network"}</legend>
      <div><label><span>Minimum</span><input name="creator-min-audience" inputMode="numeric" maxLength={13} placeholder="Any" value={filters.min_audience || ""} aria-invalid={Boolean(validationError)} onChange={(event) => update("min_audience", event.target.value)} /></label>
      <label><span>Maximum</span><input name="creator-max-audience" inputMode="numeric" maxLength={13} placeholder="Any" value={filters.max_audience || ""} aria-invalid={Boolean(validationError)} onChange={(event) => update("max_audience", event.target.value)} /></label>
      <label><span>Last saved</span><select name="creator-audience-freshness" value={filters.updated_within_days || ""} onChange={(event) => update("updated_within_days", event.target.value)}><option value="">Any date</option><option value="7">Past 7 days</option><option value="30">Past 30 days</option><option value="90">Past 90 days</option></select></label></div>
    </fieldset>
    <p className="fl-discovery-audience-help">{filters.network ? "Uses the largest connected account on this network. Missing counts are excluded when an audience filter is applied." : "Select a network to filter saved follower or subscriber counts."}</p>
    {validationError && <p className="fl-discovery-validation" role="alert">{validationError}</p>}
    <div className="fl-discovery-count" role="status" aria-live="polite">{validationError ? "Check audience filters" : loading ? "Searching creators…" : page ? `${page.total.toLocaleString()} creator${page.total === 1 ? "" : "s"} found${page.items.length ? ` · ${offset + 1}–${offset + page.items.length}` : ""}` : "Search unavailable"}</div>
    <div aria-busy={loading}>
      {loading && <WorkspaceLoader label="Finding creators…" compact />}
      {loading && <div className="fl-discovery-row-skeletons" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} />)}</div>}
      {!validationError && current?.status === "error" && <div className="fl-discovery-empty" role="alert"><p>{current.error}</p><button type="button" onClick={() => { setResult(null); setAttempt(attempt + 1); }}>Retry search</button></div>}
      {page && page.items.length === 0 && <div className="fl-discovery-empty"><h3>{offset ? "No creators on this page" : filtered ? "No creators match your search" : "No creators yet"}</h3><p>{offset ? "The directory may have changed. Return to the first page." : filtered ? "Try a broader niche or location, or clear your filters." : "Creator profiles will appear here as people join Flenzr."}</p>{offset ? <button type="button" onClick={() => setOffset(0)}>First page</button> : filtered ? <button type="button" onClick={clear}>Clear filters</button> : null}</div>}
      {page && page.items.length > 0 && <CreatorDiscoveryTable creators={page.items} network={filters.network} onSave={setSaveHandle} onInvite={setInviteHandle} />}
    </div>
    {page && page.total > 0 && <nav className="fl-discovery-pagination" aria-label="Creator result pages"><button type="button" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - discoveryPageSize))}>Previous</button><span>Page {Math.floor(offset / discoveryPageSize) + 1} of {Math.max(1, Math.ceil(page.total / discoveryPageSize))}</span><button type="button" disabled={loading || offset + discoveryPageSize >= page.total} onClick={() => setOffset(offset + discoveryPageSize)}>Next</button></nav>}
  </section>;
}
