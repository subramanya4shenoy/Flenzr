"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, Folder, FolderOpen, Search, X } from "lucide-react";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { campaignRequest, type SavedCampaign } from "@/lib/campaign-drafts";
import { campaignFolderSummary, campaignLastActivity, recentCampaigns, offersInCampaign, unassignedCampaign, type CampaignFolder } from "@/lib/campaign-folders";
import "./campaign-folders.css";
import "./campaign-drafts.css";

const folderHistoryEvent = "flenzr-folder-history";
function subscribeFolderHistory(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(folderHistoryEvent, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(folderHistoryEvent, notify); };
}
const unassignedVisits = new Map<string, string>();
export function useCampaignFolders(organizationId?: string) {
  const historyKey = organizationId ? `flenzr_campaign_unassigned_opened_${organizationId}` : "";
  const unassignedLastOpenedAt = useSyncExternalStore(subscribeFolderHistory, () => {
    if (!historyKey) return "";
    try { return localStorage.getItem(historyKey) || unassignedVisits.get(historyKey) || ""; }
    catch { return unassignedVisits.get(historyKey) || ""; }
  }, () => "");
  const [folders, setFolders] = useState<CampaignFolder[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const retry = useCallback(() => { setLoading(true); setAttempt(value => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    campaignRequest<CampaignFolder[]>("/folders", { signal: controller.signal }).then(rows => {
      if (!controller.signal.aborted) { setFolders(rows); setError(""); setLoading(false); }
    }).catch(reason => {
      if (!controller.signal.aborted) { setFolders(null); setError(reason instanceof Error ? reason.message : "Could not load campaigns."); setLoading(false); }
    });
    return () => controller.abort();
  }, [attempt]);
  const recordOpen = useCallback((id: string) => {
    const openedAt = new Date().toISOString();
    if (id === unassignedCampaign) {
      if (historyKey) {
        unassignedVisits.set(historyKey, openedAt);
        try { localStorage.setItem(historyKey, openedAt); } catch { /* Keep the current visit if storage is blocked. */ }
        window.dispatchEvent(new Event(folderHistoryEvent));
      }
      return;
    }
    setFolders(current => current?.map(folder => folder.id === id ? { ...folder, last_opened_at: openedAt } : folder) || null);
    void campaignRequest<CampaignFolder>(`/folders/${id}/open`, { method: "POST" }).then(saved => {
      setFolders(current => current?.map(folder => folder.id === id
        ? { ...folder, last_opened_at: saved.last_opened_at } : folder) || null);
    }).catch(() => { /* Recency must never prevent opening a campaign. */ });
  }, [historyKey]);
  return { folders, loading, error, retry, recordOpen, unassignedLastOpenedAt };
}

function activityDate(timestamp: number) {
  return timestamp ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(timestamp) : "—";
}

export function CampaignFolderGrid({ folders, offers, onOpen, onCreate, unassignedLastOpenedAt }: {
  unassignedLastOpenedAt?: string; folders: CampaignFolder[]; offers: SavedCampaign[]; onOpen: (id: string) => void; onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const unassigned = offersInCampaign(offers, unassignedCampaign);
  const entries = [...[...folders].sort((a, b) => campaignLastActivity(b, offers) - campaignLastActivity(a, offers)), ...(unassigned.length ? [{ id: unassignedCampaign, title: "Unassigned offers", objective: "Existing offers ready to organise into a campaign.", created_at: "", updated_at: "", revision: 0, last_opened_at: unassignedLastOpenedAt }] : [])];
  const recent = recentCampaigns(entries);
  const filtered = entries.filter(folder => `${folder.title} ${folder.objective}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  if (!entries.length) return <div className="fl-campaign-folder-empty"><FolderOpen size={36} aria-hidden="true" /><h2>Your next campaign starts here</h2><p>Create a campaign, then add offers for each platform, brief or group of creators.</p><button type="button" onClick={onCreate}>Create your first campaign</button></div>;
  return <div className="fl-campaign-library">
    <section aria-labelledby="recent-campaigns-title">
      <div className="fl-campaign-library-heading"><div><h2 id="recent-campaigns-title">Recently opened</h2><p>Pick up where you left off.</p></div><span>Most recently opened first</span></div>
      <div className="fl-campaign-folder-grid">{recent.map(folder => <button type="button" className="fl-campaign-folder" key={folder.id} onClick={() => onOpen(folder.id)}>
          <span className="fl-campaign-folder-back" aria-hidden="true" />
          <span className="fl-campaign-folder-copy">
            <span className="fl-campaign-folder-name">{folder.title}</span>
            <span className="fl-campaign-folder-date"><Clock3 size={11} aria-hidden="true" /><span>Opened {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(Date.parse(folder.last_opened_at!))}</span></span>
          </span>
        </button>
      )}</div>
      {!recent.length && <p className="fl-campaign-recent-empty">Open a folder from the table below. It will appear here for quick access next time.</p>}
    </section>
    <section aria-labelledby="all-campaigns-title">
      <div className="fl-campaign-library-heading fl-campaign-library-table-heading"><div><h2 id="all-campaigns-title">All campaigns <span>{entries.length}</span></h2><p>Every campaign, together in one place.</p></div><label className="fl-campaign-library-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search campaigns" placeholder="Search campaigns…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      <div className="fl-campaign-table-wrap" role="region" aria-label="All campaigns" tabIndex={0}><table className="fl-campaign-table"><thead><tr><th scope="col">Campaign name</th><th scope="col">Status</th><th scope="col">Offers</th><th scope="col">Planned budgets</th><th scope="col">Last activity</th><th scope="col"><span className="fl-campaign-visually-hidden">Open campaign</span></th></tr></thead><tbody>{filtered.map(folder => {
        const summary = campaignFolderSummary(offersInCampaign(offers, folder.id));
        return <tr key={folder.id} onClick={event => { if (!(event.target as HTMLElement).closest("a")) onOpen(folder.id); }}>
          <td><a className="fl-campaign-table-name" href={`/dashboard/brand#campaigns/${folder.id}`} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpen(folder.id); } }}><span className="fl-campaign-table-icon"><Folder size={18} aria-hidden="true" /></span><span><strong>{folder.title}</strong><small>{folder.objective || "No objective added"}</small></span></a></td>
          <td><span className="fl-campaign-folder-status" data-active={summary.active > 0}>{folder.id === unassignedCampaign ? "Needs organising" : summary.status}</span></td><td className="fl-campaign-table-count">{summary.count}<small>{summary.active} active</small></td><td className="fl-campaign-table-budget">{summary.budgets.length ? summary.budgets.map(budget => <span key={budget}>{budget}</span>) : <span className="fl-campaign-table-muted">Not set</span>}</td><td className="fl-campaign-table-date">{folder.id === unassignedCampaign ? "—" : activityDate(campaignLastActivity(folder, offers))}</td><td><ArrowUpRight size={15} aria-hidden="true" /></td>
        </tr>;
      })}</tbody></table>{!filtered.length && <p className="fl-campaign-table-empty" role="status">No campaigns match “{search}”.</p>}</div>
    </section>
  </div>;
}

export function CampaignFolderOverview({ folder, offers, onBack, onEdit }: {
  folder: { id: string; title: string; objective: string }; offers: SavedCampaign[]; onBack: () => void; onEdit?: () => void;
}) {
  const summary = campaignFolderSummary(offers);
  return <section className="fl-campaign-folder-overview">
    <div className="fl-campaign-folder-toolbar"><button type="button" onClick={onBack}><ArrowLeft size={14} /> All campaigns</button>{onEdit && <button type="button" onClick={onEdit}>Edit campaign</button>}</div>
    {folder.objective && <p>{folder.objective}</p>}
    <dl><div><dt>Offers</dt><dd>{summary.count}</dd></div><div><dt>Active offers</dt><dd>{summary.active}</dd></div><div><dt>Draft offers</dt><dd>{summary.drafts}</dd></div><div><dt>Planned offer budgets</dt><dd>{summary.budgets.join(" + ") || "Not set"}</dd></div></dl>
  </section>;
}

export function CampaignFolderDialog({ folder, onClose, onSaved }: { folder?: CampaignFolder; onClose: () => void; onSaved: (folder: CampaignFolder) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef<string | null>(null);
  const saving = useRef(false);
  const [title, setTitle] = useState(folder?.title || "");
  const [objective, setObjective] = useState(folder?.objective || "");
  const [baseline, setBaseline] = useState(folder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = title !== (baseline?.title || "") || objective !== (baseline?.objective || "");
  const [conflict, setConflict] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  function close() { if (saving.current) return; if (dirty) setDiscarding(true); else onClose(); }
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (saving.current || conflict) return;
    saving.current = true; setBusy(true); setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const saved = await campaignRequest<CampaignFolder>(folder ? `/folders/${folder.id}` : "/folders", {
        method: folder ? "PATCH" : "POST", body: JSON.stringify({ title: title.trim(), objective: objective.trim(),
          ...(baseline ? { expected_revision: baseline.revision } : { request_id: requestId.current }) }),
      });
      onSaved(saved);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save campaign."); setConflict(reason instanceof Error && "status" in reason && reason.status === 409); }
    finally { saving.current = false; setBusy(false); }
  }
  async function reload() {
    if (!folder || saving.current) return;
    saving.current = true; setBusy(true);
    try {
      const saved = await campaignRequest<CampaignFolder>(`/folders/${folder.id}`);
      setBaseline(saved); setTitle(saved.title); setObjective(saved.objective); setConflict(false); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not reload campaign."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-campaign-dialog" aria-labelledby="campaign-folder-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="fl-campaign-dialog-heading"><div><h2 id="campaign-folder-title">{folder ? "Edit campaign" : "New campaign"}</h2><p>Group related offers under one objective. Only your brand can see this campaign folder.</p></div><button type="button" onClick={close} disabled={busy} aria-label="Close campaign"><X size={18} /></button></div>
    <form onSubmit={event => void submit(event)}><fieldset disabled={busy || discarding}><div className="fl-campaign-form-grid"><label className="fl-campaign-wide"><span>Campaign name</span><input autoFocus required minLength={3} maxLength={255} value={title} placeholder="e.g. Summer product launch" onChange={event => setTitle(event.target.value)} /></label><label className="fl-campaign-wide"><span>Objective · optional</span><textarea rows={4} maxLength={5000} value={objective} placeholder="What do you want this campaign to achieve?" onChange={event => setObjective(event.target.value)} /></label></div></fieldset>
      {error && <p className="fl-campaign-error" role="alert">{error}</p>}
      {conflict && folder && <p><button type="button" disabled={busy} onClick={() => void reload()}>Reload saved campaign</button><small>Reloading replaces your unsaved changes with the saved version.</small></p>}
      {discarding ? <div className="fl-campaign-discard"><p>Discard your unsaved changes?</p><button type="button" onClick={() => setDiscarding(false)}>Keep editing</button><button type="button" onClick={onClose}>Discard changes</button></div> : <footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" disabled={busy || conflict || title.trim().length < 3} className="theme-on-accent">{busy ? "Saving…" : folder ? "Save campaign" : "Create campaign"}</button></footer>}
    </form>
  </dialog>;
}

export function MoveOfferDialog({ offer, folders, onClose, onSaved }: { offer: SavedCampaign; folders: CampaignFolder[]; onClose: () => void; onSaved: (offer: SavedCampaign) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [target, setTarget] = useState(folders.find(folder => folder.id !== offer.parent_campaign_id)?.id || "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!target || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const saved = await campaignRequest<SavedCampaign>(`/${offer.id}/folder`, { method: "PATCH", body: JSON.stringify({ parent_campaign_id: target, expected_revision: offer.revision }) });
      onSaved(saved);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not move offer."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-campaign-dialog" aria-labelledby="move-offer-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}>
    <div className="fl-campaign-dialog-heading"><div><h2 id="move-offer-title">Move offer to campaign</h2><p>{offer.title}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button></div>
    {folders.some(folder => folder.id !== offer.parent_campaign_id) ? <form onSubmit={event => void submit(event)}><label><span>Destination campaign</span><select value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>{folders.filter(folder => folder.id !== offer.parent_campaign_id).map(folder => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></label><p>Applications, invitations and collaborations stay with this offer.</p>{error && <p className="fl-campaign-error" role="alert">{error}</p>}<footer><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" disabled={busy || !target} className="theme-on-accent">{busy ? "Moving…" : "Move offer"}</button></footer></form> : <p>Create another campaign first, then move this offer into it.</p>}
  </dialog>;
}

export function CampaignFoldersLoading({ loading, error, missingOrganization, retry }: { loading: boolean; error: string; missingOrganization: boolean; retry: () => void }) {
  if (loading) return <WorkspaceLoader label="Loading campaigns…" />;
  return <div className="fl-campaign-state" role={missingOrganization ? undefined : "alert"}><p>{missingOrganization ? "Set up your brand profile before creating campaigns." : error}</p>{missingOrganization ? <Link href="/dashboard/brand/profile">Open brand profile</Link> : <button type="button" onClick={retry}>Retry campaigns</button>}</div>;
}
