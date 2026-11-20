"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { campaignMoney, type SavedCampaign } from "@/lib/campaign-drafts";
import { campaignOpen } from "@/lib/campaign-lifecycle";
import { activityStatusLabel } from "@/lib/campaign-activity";
import { invitationPayload, invitationRequest, InvitationRequestError, type InvitationRecipient, type SavedInvitation } from "@/lib/campaign-invitations";
import "./campaign-invitation.css";

type Review = { campaign: SavedCampaign; payload: ReturnType<typeof invitationPayload> };
export function CampaignInvitationDialog({ handle, onClose, onManageCampaigns, onViewCampaign }: {
  handle: string; onClose: () => void; onManageCampaigns: () => void; onViewCampaign: (campaign: SavedCampaign) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), saving = useRef(false);
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]), [recipient, setRecipient] = useState<InvitationRecipient | null>(null);
  const [campaignId, setCampaignId] = useState(""), [quote, setQuote] = useState(""), [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0), [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookup, setLookup] = useState<{ key: string; record: SavedInvitation | null; error: string } | null>(null);
  const [review, setReview] = useState<Review | null>(null), [saved, setSaved] = useState<SavedInvitation | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([invitationRequest<SavedCampaign[]>("/me", { signal: controller.signal }), invitationRequest<InvitationRecipient>(`/invitation-recipient/${encodeURIComponent(handle)}`, { signal: controller.signal })]).then(([rows, person]) => {
      if (controller.signal.aborted) return;
      setCampaigns(rows); setRecipient(person); setCampaignId(previous => rows.some(row => row.id === previous && campaignOpen(row)) ? previous : rows.find(row => campaignOpen(row))?.id || "");
      setLoading(false); setStale(false); setError("");
    }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [handle, attempt]);
  const lookupKey = `${campaignId}:${recipient?.id || ""}`;
  const currentLookup = lookup?.key === lookupKey ? lookup : null;
  useEffect(() => {
    if (!campaignId || !recipient) return;
    const controller = new AbortController();
    invitationRequest<SavedInvitation | null>(`/${campaignId}/invitation/${recipient.id}`, { signal: controller.signal }).then(record => {
      if (!controller.signal.aborted) setLookup({ key: lookupKey, record, error: "" });
    }).catch(err => { if (!controller.signal.aborted) setLookup({ key: lookupKey, record: null, error: err.message }); });
    return () => controller.abort();
  }, [campaignId, recipient, lookupKey, lookupAttempt]);
  const eligible = campaigns.filter(row => campaignOpen(row));
  const selected = campaigns.find(row => row.id === campaignId);
  const receipt = saved || currentLookup?.record;
  function close() {
    if (saving.current) return;
    if (!receipt && (quote.trim() || message.trim()) && !window.confirm("Discard this unsent invitation?")) return;
    onClose();
  }
  function reload() { setLoading(true); setReview(null); setLookup(null); setAttempt(value => value + 1); }
  async function prepare(event: React.FormEvent) {
    event.preventDefault(); if (!recipient || !selected || !currentLookup || currentLookup.error || receipt || saving.current) return;
    let payload: ReturnType<typeof invitationPayload>;
    try { payload = invitationPayload(recipient, selected, quote, message); }
    catch (err) { setError(err instanceof Error ? err.message : "Check your quote and message."); return; }
    saving.current = true; setBusy(true); setError("");
    try {
      const fresh = await invitationRequest<SavedCampaign>(`/${selected.id}`);
      const existing = await invitationRequest<SavedInvitation | null>(`/${selected.id}/invitation/${recipient.id}`);
      if (existing) { setLookup({ key: lookupKey, record: existing, error: "" }); return; }
      if (!campaignOpen(fresh)) { setStale(true); setError("This campaign is no longer accepting invitations. Reload campaigns to choose an available one."); return; }
      setReview({ campaign: fresh, payload: { ...payload, expected_campaign_revision: fresh.revision } });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not review this invitation."); }
    finally { saving.current = false; setBusy(false); }
  }
  async function send() {
    if (!review || saving.current || stale) return;
    saving.current = true; setBusy(true); setError("");
    try { setSaved(await invitationRequest<SavedInvitation>(`/${review.campaign.id}/invite`, { method: "POST", body: JSON.stringify(review.payload) })); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this invitation. Please retry.");
      if (err instanceof InvitationRequestError && (err.status === 409 || err.status === 422)) setStale(true);
    } finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-invite-dialog" aria-labelledby="invite-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="invite-title">{receipt ? "Saved invitation" : review ? "Review invitation" : "Invite to campaign"}</h2><button type="button" aria-label="Close invitation" disabled={busy} onClick={close}><X size={18} /></button></header>
    {loading ? <p role="status">Loading your campaigns…</p> : !recipient ? <div><p role="alert">{error}</p><button type="button" onClick={reload}>Retry loading</button><Link href="/dashboard/brand/profile">Brand profile</Link></div> : receipt ? <div>
      <p role="status">{saved ? "Invitation saved." : "This creator already has an invitation for this campaign."}</p>
      {!saved && eligible.length > 1 && <label>Campaign<select name="invitation-campaign" value={campaignId} onChange={event => { setCampaignId(event.target.value); setLookup(null); setReview(null); setStale(false); setError(""); }}>{eligible.map(row => <option key={row.id} value={row.id}>{row.title} · {row.currency}</option>)}</select></label>}
      <div className="fl-invite-summary"><h3>{review?.campaign.title || selected?.title}</h3><p>{recipient.display_name} · @{recipient.handle}</p><p>{activityStatusLabel[receipt.status]} · {campaignMoney(receipt.offered_rate_cents, review?.campaign.currency || selected?.currency || "INR")}</p></div>
      <p className="fl-invite-message">{receipt.message || "No message included."}</p><p>One invitation is kept per creator and campaign. Check its status in Applications &amp; invitations.</p>
      <footer><button type="button" onClick={onClose}>Done</button><button type="button" onClick={() => { const campaign = review?.campaign || selected; if (campaign) { onViewCampaign(campaign); onClose(); } }}>View invitation</button></footer>
    </div> : !eligible.length ? <div><p>No published campaigns are available for invitations. Publish a campaign with an end date of today or later, or leave its end date open.</p><button type="button" onClick={() => { onManageCampaigns(); onClose(); }}>Go to campaigns</button></div> : review ? <div>
      <div className="fl-invite-summary"><h3>{review.campaign.title}</h3><p>To {recipient.display_name} · @{recipient.handle}</p><p>Offered quote: <strong>{campaignMoney(review.payload.offered_rate_cents, review.campaign.currency)}</strong></p><p>{review.campaign.deliverable_summary}</p></div>
      <p className="fl-invite-message">{review.payload.message || "No message included."}</p><p>The creator can review this invitation in Collabs. An agreement and payment are arranged separately.</p>
      {error && <p role="alert" className="fl-invite-error">{error}</p>}{stale && <button type="button" onClick={reload}>Reload campaigns</button>}
      <footer><button type="button" disabled={busy} onClick={() => { setReview(null); setError(""); }}>Edit invitation</button><button type="button" disabled={busy || stale} onClick={send}>{busy ? "Sending…" : "Send invitation"}</button></footer>
    </div> : <form onSubmit={prepare}>
      <p>Invite {recipient.display_name} · @{recipient.handle}</p>
      <label>Campaign<select name="invitation-campaign" value={campaignId} disabled={busy} onChange={event => { setCampaignId(event.target.value); setLookup(null); setStale(false); setError(""); }}>{eligible.map(row => <option key={row.id} value={row.id}>{row.title} · {row.currency}</option>)}</select></label>
      <label>Offered quote ({selected?.currency})<input name="invitation-quote" inputMode="decimal" maxLength={20} placeholder="e.g. 1500.00" required value={quote} disabled={busy} onChange={event => setQuote(event.target.value)} /></label>
      <label>Message (optional)<textarea name="invitation-message" rows={4} maxLength={5000} value={message} disabled={busy} onChange={event => setMessage(event.target.value)} /></label>
      {!currentLookup && <p role="status">Checking previous invitations…</p>}{currentLookup?.error && <div role="alert"><p>{currentLookup.error}</p><button type="button" onClick={() => { setLookup(null); setLookupAttempt(value => value + 1); }}>Retry check</button></div>}
      {error && <p role="alert" className="fl-invite-error">{error}</p>}{stale && <button type="button" onClick={reload}>Reload campaigns</button>}
      <footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" disabled={busy || stale || !currentLookup || Boolean(currentLookup.error)}>{busy ? "Checking…" : "Review invitation"}</button></footer>
    </form>}
  </dialog>;
}
