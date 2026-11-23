"use client";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { OfferTicket } from "@/components/offers/offer-ticket";
import { opportunityDate } from "@/lib/campaign-opportunities";
import { CampaignRequestError, campaignDraftFields, campaignDraftPayload, campaignMoney, campaignRequest, emptyCampaignDraft, type CampaignDraftFields, type SavedCampaign } from "@/lib/campaign-drafts";
import { campaignOpen, campaignStatusLabel, type CampaignAction } from "@/lib/campaign-lifecycle";
import "./campaign-drafts.css";

export function useBrandCampaigns() {
  const generation = useRef(0);
  const [campaigns, setCampaigns] = useState<SavedCampaign[] | null>(null);
  const [error, setError] = useState("");
  const [missingOrganization, setMissingOrganization] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    campaignRequest<SavedCampaign[]>("/me", { signal: controller.signal }).then((rows) => {
      if (!controller.signal.aborted && generation.current === version) { setCampaigns(rows); setError(""); setMissingOrganization(false); setLoading(false); }
    }).catch((err) => {
      if (!controller.signal.aborted && generation.current === version) { setError(err.message); setMissingOrganization(err instanceof CampaignRequestError && err.status === 404); setLoading(false); }
    });
    return () => controller.abort();
  }, [attempt]);
  const retry = useCallback(() => { setLoading(true); setError(""); setAttempt((value) => value + 1); }, []);
  return { campaigns, loading, error, missingOrganization, retry,
    saved: (campaign: SavedCampaign) => { generation.current += 1; setLoading(false); setAttempt((value) => value + 1); setCampaigns((previous) => [campaign, ...(previous || []).filter((row) => row.id !== campaign.id)]); setError(""); setMissingOrganization(false); } };
}

export function CampaignDraftDialog({ campaignId, parentCampaignId, onClose, onSaved, onReloaded }: { campaignId: string | null; parentCampaignId?: string; onClose: () => void; onReloaded: () => void; onSaved: (campaign: SavedCampaign) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const requestId = useRef<string | null>(null);
  const [campaign, setCampaign] = useState<SavedCampaign | null>(null);
  const [fields, setFields] = useState<CampaignDraftFields>(emptyCampaignDraft);
  const [baseline, setBaseline] = useState(emptyCampaignDraft);
  const [loading, setLoading] = useState(Boolean(campaignId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dirty = JSON.stringify(fields) !== JSON.stringify(baseline);
  const readOnly = Boolean(campaign && campaign.status !== "draft");
  useEffect(() => { dialog.current?.showModal(); }, []);
  // Keep the latest parent callback without making it a load dependency:
  // an unstable callback would refetch and overwrite the fields being typed.
  const reloaded = useRef(onReloaded);
  useEffect(() => { reloaded.current = onReloaded; }, [onReloaded]);
  useEffect(() => {
    if (!campaignId && !requestId.current) return;
    const controller = new AbortController();
    campaignRequest<SavedCampaign>(`/${campaignId || requestId.current}`, { signal: controller.signal }).then((saved) => {
      if (controller.signal.aborted) return;
      setCampaign(saved); const restored = campaignDraftFields(saved);
      setFields(restored); setBaseline(restored); setLoading(false); setError(""); setConflict(false); reloaded.current();
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [campaignId, attempt]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (saving.current) return;
    if (dirty) setDiscarding(true); else onClose();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (saving.current || readOnly || conflict) return;
    setError("");
    try {
      const payload = campaignDraftPayload(fields);
      saving.current = true; setBusy(true);
      requestId.current ||= crypto.randomUUID();
      const saved = await campaignRequest<SavedCampaign>(campaign ? `/${campaign.id}/draft` : "/drafts", {
        method: campaign ? "PATCH" : "POST", body: JSON.stringify({ ...payload, ...(campaign ? { expected_revision: campaign.revision } : { request_id: requestId.current, ...(parentCampaignId ? { parent_campaign_id: parentCampaignId } : {}) }) }),
      });
      onSaved(saved); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this draft. Please retry.");
      setConflict(err instanceof CampaignRequestError && err.status === 409);
    } finally { saving.current = false; setBusy(false); }
  }
  function input(key: keyof CampaignDraftFields, label: string, maxLength: number, type = "text") {
    return <label key={key}><span>{label}</span><input name={`campaign-${key}`} type={type} maxLength={maxLength}
      required={key === "title"} minLength={key === "title" ? 3 : undefined} inputMode={key === "budget" ? "decimal" : undefined}
      placeholder={key === "budget" ? "To discuss" : undefined} value={fields[key]}
      onChange={(event) => setFields({ ...fields, [key]: event.target.value })} /></label>;
  }
  return <dialog ref={dialog} className="fl-campaign-dialog" onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="campaign-dialog-title">
    <div className="fl-campaign-dialog-heading"><div><h2 id="campaign-dialog-title">{readOnly ? "Offer brief" : campaign || campaignId ? "Edit Offer draft" : "New Offer draft"}</h2><p>{readOnly ? "Saved offer details" : "Only your brand can see this draft."}</p></div><button type="button" aria-label="Close offer editor" onClick={close} disabled={busy}><X size={18} /></button></div>
    {loading ? <WorkspaceLoader label="Loading saved brief…" compact /> : campaignId && !campaign ? <div role="alert"><p>{error}</p><button onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Retry loading</button></div> : <form onSubmit={submit}>
      <fieldset disabled={busy || readOnly || discarding || conflict}><legend className="fl-campaign-visually-hidden">Offer details</legend><div className="fl-campaign-form-grid">
        {input("title", "Offer title", 255)}
        <label><span>Who can see and apply?</span><select name="campaign-visibility" value={fields.visibility || "public"} onChange={event => setFields({ ...fields, visibility: event.target.value as "public" | "invited" })}><option value="invited">Private · invited creators only</option><option value="public">Public · shareable Offer page</option></select></label>{input("target_niche", "Target niche · optional", 128)}
        <label className="fl-campaign-wide"><span>Brief · optional while drafting</span><textarea name="campaign-brief" rows={4} maxLength={20000} value={fields.brief} onChange={(event) => setFields({ ...fields, brief: event.target.value })} /></label>
        <div className="fl-campaign-wide">{input("deliverable_summary", "Deliverables · optional", 512)}</div>
        {input("budget", "Planned budget · optional", 16)}<label><span>Currency</span><select name="campaign-currency" value={fields.currency} onChange={(event) => setFields({ ...fields, currency: event.target.value })}>{[...new Set(["INR", "USD", "EUR", "GBP", fields.currency])].map((currency) => <option key={currency}>{currency}</option>)}</select></label>
        {input("start_date", "Planned start · optional", 10, "date")}{input("end_date", "Planned end · optional", 10, "date")}
      </div></fieldset>
      {error && <p className="fl-campaign-error" role="alert">{error}</p>}
      {conflict && <p><button type="button" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reload saved draft</button><small>Reloading replaces your unsaved edits with the saved version.</small></p>}
      {discarding ? <div className="fl-campaign-discard" role="alert"><p>Discard your unsaved changes?</p><button type="button" onClick={() => setDiscarding(false)}>Keep editing</button><button type="button" onClick={onClose}>Discard changes</button></div> : <footer><button type="button" disabled={busy} onClick={close}>{readOnly ? "Close" : "Cancel"}</button>{!readOnly && <button type="submit" disabled={busy || conflict}>{busy ? "Saving…" : "Save draft"}</button>}</footer>}
    </form>}
  </dialog>;
}

export function CampaignList({ campaigns, loading, error, missingOrganization, retry, onActivity }: ReturnType<typeof useBrandCampaigns> & { onOpen?: (id: string) => void; onActivity: (campaign: SavedCampaign) => void; onAction?: (campaign: SavedCampaign, action: CampaignAction) => void; onMove?: (offer: SavedCampaign) => void }) {
  if (loading) return <WorkspaceLoader label="Loading Offers…" />;
  if (missingOrganization) return <div className="fl-campaign-state"><h2>Set up your brand first</h2><p>Add your company details before saving an offer draft.</p><Link href="/dashboard/brand/profile">Open brand profile</Link></div>;
  if (error) return <div className="fl-campaign-state" role="alert"><p>{error}</p><button type="button" onClick={retry}>Retry offers</button></div>;
  if (!campaigns?.length) return <div className="fl-campaign-state"><h2>No Offers yet</h2><p>Create your first Offer and shape the brief.</p></div>;
  return <section className="fl-ticket-grid" aria-label="Saved Offers">{campaigns.map((campaign) => {
    const expired = campaign.status === "active" && !campaignOpen(campaign);
    return <OfferTicket key={campaign.id} id={campaign.id} title={campaign.title} issuer="Created by you"
      niche={campaign.target_niche} deliverables={campaign.deliverable_summary}
      budget={campaign.budget_total_cents ? campaignMoney(campaign.budget_total_cents, campaign.currency) : "To discuss"}
      deadline={campaign.end_date ? opportunityDate(campaign.end_date) : "Open-ended"}
      status={expired ? "Applications closed" : campaignStatusLabel[campaign.status]}
      interest={{ count: campaign.applicants_count, people: campaign.applicant_preview || [], onOpen: () => onActivity(campaign) }}
      state={expired ? "expired" : campaign.status}
      access={campaign.status === "draft" ? "draft" : campaign.visibility === "invited" ? "invited" : "public"}>
      <Link className="fl-ticket-manage" href={`/dashboard/offers/${campaign.id}#manage`}>Manage Offer</Link>
    </OfferTicket>;
  })}</section>;
}
