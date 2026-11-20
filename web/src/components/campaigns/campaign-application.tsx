"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { applicationPayload, opportunityDate, opportunityRequest, OpportunityRequestError, type CampaignOpportunity, type SavedApplication } from "@/lib/campaign-opportunities";
import { campaignMoney } from "@/lib/campaign-drafts";
import { activityStatusLabel } from "@/lib/campaign-activity";

type Review = { campaign: CampaignOpportunity; payload: ReturnType<typeof applicationPayload> };
export function CampaignApplicationDialog({ campaignId, onClose, onRecord, onViewApplications }: {
  campaignId: string; onClose: () => void; onRecord: (item: CampaignOpportunity) => void; onViewApplications: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), saving = useRef(false);
  const [campaign, setCampaign] = useState<CampaignOpportunity | null>(null), [review, setReview] = useState<Review | null>(null);
  const [quote, setQuote] = useState(""), [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [stale, setStale] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    opportunityRequest<CampaignOpportunity>(`/opportunities/${campaignId}`, { signal: controller.signal }).then(item => {
      if (controller.signal.aborted) return;
      setCampaign(item); setLoading(false); setError(""); setStale(false); onRecord(item);
    }).catch(err => { if (!controller.signal.aborted) { setCampaign(null); setLoading(false); setError(err.message); } });
    return () => controller.abort();
  }, [campaignId, attempt, onRecord]);
  const receipt = campaign?.application;
  function mayLeave() { return !saving.current && (Boolean(receipt) || (!quote.trim() && !pitch.trim()) || window.confirm("Discard this unsent application?")); }
  function close() { if (mayLeave()) onClose(); }
  function viewApplications() { if (mayLeave()) onViewApplications(); }
  function reload() { setLoading(true); setReview(null); setAttempt(value => value + 1); }
  async function prepare(event: React.FormEvent) {
    event.preventDefault(); if (!campaign || receipt || saving.current) return;
    let payload: ReturnType<typeof applicationPayload>;
    try { payload = applicationPayload(campaign, quote, pitch); }
    catch (err) { setError(err instanceof Error ? err.message : "Check your quote and pitch."); return; }
    saving.current = true; setBusy(true); setError("");
    try {
      const fresh = await opportunityRequest<CampaignOpportunity>(`/opportunities/${campaignId}`);
      setCampaign(fresh); onRecord(fresh);
      if (!fresh.application) setReview({ campaign: fresh, payload: { ...payload, expected_campaign_revision: fresh.revision } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not review this application.");
      if (err instanceof OpportunityRequestError && err.status === 404) setStale(true);
    } finally { saving.current = false; setBusy(false); }
  }
  async function submit() {
    if (!review || saving.current || stale) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const saved = await opportunityRequest<SavedApplication>(`/${campaignId}/apply`, { method: "POST", body: JSON.stringify(review.payload) });
      const item = { ...review.campaign, application: saved }; setCampaign(item); setReview(null); onRecord(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit this application. Please retry.");
      if (err instanceof OpportunityRequestError && [404,409,422].includes(err.status)) setStale(true);
    } finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-application-dialog" aria-labelledby="application-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="application-title">{receipt ? "Saved application" : review ? "Review application" : "Campaign brief"}</h2><button type="button" aria-label="Close application" disabled={busy} onClick={close}><X size={18} /></button></header>
    {loading ? <p role="status">Loading current brief…</p> : !campaign ? <div><p role="alert">{error}</p><footer><button type="button" onClick={reload}>Retry loading</button><button type="button" onClick={viewApplications}>My applications</button></footer></div> : receipt ? <div>
      <p role="status">You have a saved application for this campaign.</p><div className="fl-application-summary"><h3>{campaign.title}</h3><p>{campaign.organization_name}</p><p>{activityStatusLabel[receipt.status]} · Proposed quote: <strong>{campaignMoney(receipt.proposed_rate_cents, campaign.currency)}</strong></p></div>
      <p className="fl-application-message">{receipt.pitch_message || "No pitch included."}</p><p>One application is kept per creator and campaign. Track its status in Collabs.</p><footer><button type="button" onClick={onClose}>Done</button><button type="button" onClick={onViewApplications}>View in Collabs</button></footer>
    </div> : review ? <div>
      <div className="fl-application-summary"><h3>{review.campaign.title}</h3><p>{review.campaign.organization_name}</p><p>Proposed quote: <strong>{campaignMoney(review.payload.proposed_rate_cents, review.campaign.currency)}</strong></p><p>{review.campaign.deliverable_summary}</p></div>
      <p className="fl-application-message">{review.payload.pitch_message || "No pitch included."}</p><p>The brand can review your proposal. An agreement and payment are arranged separately.</p>
      {error && <p role="alert" className="fl-application-error">{error}</p>}{stale && <button type="button" onClick={reload}>Reload brief</button>}
      <footer><button type="button" disabled={busy} onClick={() => { setReview(null); setError(""); }}>Edit application</button><button type="button" disabled={busy || stale} onClick={submit}>{busy ? "Submitting…" : "Submit application"}</button></footer>
    </div> : <form onSubmit={prepare}>
      <div className="fl-application-summary"><h3>{campaign.title}</h3><p>{campaign.organization_name} · {campaign.target_niche || "Niche not specified"}</p><p>Campaign budget: {campaignMoney(campaign.budget_total_cents, campaign.currency)}</p><p>{campaign.start_date ? `Starts ${opportunityDate(campaign.start_date)} · ` : ""}{campaign.end_date ? `Ends ${opportunityDate(campaign.end_date)} · UTC` : "Open end date"}</p></div>
      <h3 className="fl-application-section-title">Brief</h3><p className="fl-application-brief">{campaign.brief}</p><h3>Deliverables</h3><p>{campaign.deliverable_summary || "See brief"}</p>
      <label>Your proposed quote ({campaign.currency})<input name="application-quote" required inputMode="decimal" maxLength={20} placeholder="e.g. 1500.00" value={quote} disabled={busy} onChange={event => setQuote(event.target.value)} /></label>
      <label>Your pitch (optional)<textarea name="application-pitch" rows={4} maxLength={5000} value={pitch} disabled={busy} onChange={event => setPitch(event.target.value)} /></label>
      {error && <p role="alert" className="fl-application-error">{error}</p>}{stale && <button type="button" onClick={reload}>Reload brief</button>}
      <footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" disabled={busy || stale}>{busy ? "Checking…" : "Review application"}</button></footer>
    </form>}
  </dialog>;
}
