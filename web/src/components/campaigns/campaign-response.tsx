"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { activityAccepting, activityActions, activityResponseLabel, activityStatusLabel, campaignRecordPath, CampaignActivityError, loadCampaignRecord, respondCampaignActivity, type CampaignActivityKind, type CampaignActivityRecord, type CampaignAudience, type CampaignResponseAction } from "@/lib/campaign-activity";
import { campaignMoney } from "@/lib/campaign-drafts";
import { campaignStatusLabel } from "@/lib/campaign-lifecycle";

export function CampaignResponseDialog({ audience, kind, recordId, action, onClose, onRecord, onSaved }: {
  audience: CampaignAudience; kind: CampaignActivityKind; recordId: string; action: CampaignResponseAction;
  onClose: () => void; onRecord: (item: CampaignActivityRecord) => void; onSaved: (item: CampaignActivityRecord) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), saving = useRef(false);
  const [item, setItem] = useState<CampaignActivityRecord | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [stale, setStale] = useState(false), [attempt, setAttempt] = useState(0);
  const path = campaignRecordPath(audience, kind, recordId), label = activityResponseLabel(kind, action);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadCampaignRecord(path, controller.signal).then(saved => {
      if (controller.signal.aborted) return;
      setItem(saved); setLoading(false); setError(""); setStale(false); onRecord(saved);
    }).catch(err => { if (!controller.signal.aborted) { setLoading(false); setError(err.message); } });
    return () => controller.abort();
  }, [path, attempt, onRecord]);
  const available = item && activityActions(audience, kind, item).includes(action);
  async function confirm(event: React.FormEvent) {
    event.preventDefault(); if (!item || !available || stale || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try { const saved = await respondCampaignActivity(path, item, action); onSaved(saved); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save this response. Please retry."); setStale(err instanceof CampaignActivityError && err.status === 409); }
    finally { saving.current = false; setBusy(false); }
  }
  function reload() { setLoading(true); setAttempt(value => value + 1); }
  return <dialog ref={dialog} className="fl-response-dialog" aria-labelledby="campaign-response-title" onCancel={event => { event.preventDefault(); if (!saving.current) onClose(); }}>
    <div className="fl-response-heading"><h2 id="campaign-response-title">{label}</h2><button type="button" aria-label="Close response" disabled={busy} onClick={onClose}><X size={18} /></button></div>
    {loading ? <p role="status">Loading current response…</p> : !item ? <div role="alert"><p>{error}</p><button type="button" onClick={reload}>Retry loading</button></div> : <form onSubmit={confirm}>
      <div className="fl-response-summary"><h3>{item.campaign_title}</h3><p>{audience === "brand" ? item.creator_name : item.organization_name} · {campaignMoney(item.rate_cents, item.currency)}</p><p>{activityStatusLabel[item.status]} · Campaign: {campaignStatusLabel[item.campaign_status]}</p></div>
      <p className="fl-response-message">{item.message || "No message included."}</p>
      <p>{action === "accept" ? "Accept this quoted collaboration? You cannot undo this response. An agreement and payment are arranged separately." : action === "withdraw" ? "Withdraw your pending application? You cannot undo this response or reapply to this campaign." : action === "reject" ? "Reject this application? You cannot undo this response." : "Decline this invitation? You cannot undo this response."}</p>
      {!available && <p role="status">{action === "accept" && !activityAccepting(item) ? "This campaign is not open for acceptance." : "This action is no longer available. Review the current status above."}</p>}
      {error && <p role="alert" className="fl-response-error">{error}</p>}
      {stale && <button type="button" onClick={reload}>Reload response</button>}
      <footer><button type="button" disabled={busy} onClick={onClose}>{available ? "Keep current status" : "Done"}</button>{available && <button type="submit" disabled={busy || stale}>{busy ? "Saving…" : label}</button>}</footer>
    </form>}
  </dialog>;
}
