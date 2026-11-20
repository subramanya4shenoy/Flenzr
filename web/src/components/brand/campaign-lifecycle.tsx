"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CampaignRequestError, campaignMoney, campaignRequest, type SavedCampaign } from "@/lib/campaign-drafts";
import { campaignActionInfo, campaignActions, campaignPublishIssues, campaignStatusLabel, type CampaignAction } from "@/lib/campaign-lifecycle";
import "./campaign-drafts.css";

export function CampaignLifecycleDialog({ campaignId, action, onClose, onSaved, onReloaded, onEdit }: {
  campaignId: string; action: CampaignAction; onClose: () => void; onSaved: (campaign: SavedCampaign) => void;
  onReloaded: () => void; onEdit: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [campaign, setCampaign] = useState<SavedCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const info = campaignActionInfo[action];
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    campaignRequest<SavedCampaign>(`/${campaignId}`, { signal: controller.signal }).then((row) => {
      if (controller.signal.aborted) return;
      setCampaign(row); setLoading(false); setError(""); setStale(false); onReloaded();
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [campaignId, attempt, onReloaded]);
  const available = campaign && campaignActions(campaign.status).includes(action);
  const issues = campaign && (action === "publish" || action === "resume") ? campaignPublishIssues(campaign) : [];
  async function confirm(event: React.FormEvent) {
    event.preventDefault(); if (!campaign || !available || issues.length || stale || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const saved = await campaignRequest<SavedCampaign>(`/${campaign.id}/transition`, { method: "POST", body: JSON.stringify({ action, expected_revision: campaign.revision, expected_status: campaign.status }) });
      onSaved(saved); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update this campaign. Please retry."); setStale(err instanceof CampaignRequestError && err.status === 409); }
    finally { saving.current = false; setBusy(false); }
  }
  function reload() { setLoading(true); setAttempt(attempt + 1); }
  return <dialog ref={dialog} className="fl-campaign-dialog fl-campaign-transition" aria-labelledby="campaign-action-title" onCancel={(event) => { event.preventDefault(); if (!saving.current) onClose(); }}>
    <div className="fl-campaign-dialog-heading"><h2 id="campaign-action-title">{info.label}</h2><button type="button" disabled={busy} aria-label="Close campaign action" onClick={onClose}><X size={18} /></button></div>
    {loading ? <p role="status">Loading current campaign…</p> : !campaign ? <div role="alert"><p>{error}</p><button type="button" onClick={reload}>Retry loading</button></div> : <form onSubmit={confirm}>
      <div className="fl-campaign-action-summary"><h3>{campaign.title}</h3><p>{campaignStatusLabel[campaign.status]} · {campaign.budget_total_cents ? campaignMoney(campaign.budget_total_cents, campaign.currency) : "Budget to discuss"}</p></div>
      <p>{info.description}</p>
      <p><strong>Audience:</strong> {campaign.visibility === "invited" ? "Private · only invited creators can view and apply. A copied link does not grant access." : "Public · the published brief can be shared with anyone."}</p>
      {!available && <p className="fl-campaign-error" role="status">This action is no longer available. Current status: {campaignStatusLabel[campaign.status]}.</p>}
      {issues.length > 0 && <div className="fl-campaign-requirements"><h3>Before you {action}</h3><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>{campaign.status === "draft" && <button type="button" onClick={() => onEdit(campaign.id)}>Edit draft</button>}</div>}
      {error && <p className="fl-campaign-error" role="alert">{error}</p>}
      {stale && <button type="button" onClick={reload}>Reload campaign</button>}
      <footer><button type="button" disabled={busy} onClick={onClose}>{available ? "Keep current status" : "Done"}</button>{available && <button type="submit" disabled={busy || Boolean(issues.length) || stale}>{busy ? "Updating…" : info.label}</button>}</footer>
    </form>}
  </dialog>;
}
