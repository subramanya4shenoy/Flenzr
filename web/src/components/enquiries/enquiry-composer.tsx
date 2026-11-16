"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import type { PublicCreatorProfile, RateCard } from "@/lib/api";
import { Enquiry, enquiryCents, enquiryMoney, enquiryRequest } from "@/lib/enquiries";
import "./enquiries.css";

export function EnquiryComposer({ creator, rateCard, onClose }: { creator: PublicCreatorProfile; rateCard: RateCard | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const [brand, setBrand] = useState("");
  const [brief, setBrief] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Enquiry | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    setError("");
    try {
      const body = { creator_handle: creator.handle, brand_name: brand.trim(), brief: brief.trim(),
        ...(rateCard ? { rate_card_id: rateCard.id } : { deliverable: deliverable.trim(), amount_cents: enquiryCents(budget), currency }) };
      if (body.brand_name.length < 2 || body.brief.length < 20 || (!rateCard && deliverable.trim().length < 2)) throw new Error("Add a brand name, deliverable and a brief of at least 20 characters.");
      const payload = JSON.stringify(body);
      if (!attempt.current || attempt.current.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
      sending.current = true;
      setBusy(true);
      setSent(await enquiryRequest<Enquiry>("", { method: "POST", body: JSON.stringify({ ...body, request_id: attempt.current.id }) }));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send. Please retry."); }
    finally { sending.current = false; setBusy(false); }
  }

  return <dialog ref={dialog} className="fl-enquiry-dialog" aria-labelledby="enquiry-title" onCancel={e => { if (sending.current) e.preventDefault(); else onClose(); }}>
    <button className="fl-enquiry-close" aria-label="Close enquiry" disabled={busy} onClick={onClose}><X size={18} /></button>
    {sent ? <div className="fl-enquiry-success" role="status">
      <CheckCircle2 size={32} /><h2 id="enquiry-title">Enquiry sent</h2>
      <p>Your brief is saved in {creator.display_name}’s Collabs inbox. Track their response in your sent enquiries.</p>
      <p className="fl-enquiry-muted">Reference: {sent.id}</p>
      <p className="fl-enquiry-muted">No payment has been taken or reserved.</p>
      <Link className="fl-enquiry-primary" href="/dashboard/brand/enquiries">View sent enquiries</Link>
    </div> : <form onSubmit={submit} className="fl-enquiry-form">
      <span className="fl-enquiry-eyebrow">Start a collaboration</span>
      <h2 id="enquiry-title">Send {creator.display_name} an enquiry</h2>
      <p>Share your brief and discuss the scope before committing. This sends a request, with no payment.</p>
      {rateCard && <div className="fl-enquiry-package"><strong>{rateCard.title}</strong><span>{enquiryMoney(rateCard.base_price_cents, rateCard.currency)}</span><small>{rateCard.turnaround_days} day turnaround · subject to the creator’s confirmation</small></div>}
      <label>Brand or agency name<input autoFocus required minLength={2} maxLength={160} value={brand} onChange={e => setBrand(e.target.value)} placeholder="Your brand name" disabled={busy} /></label>
      {!rateCard && <>
        <label>Deliverables<input required minLength={2} maxLength={255} value={deliverable} onChange={e => setDeliverable(e.target.value)} placeholder="e.g. 1 Reel and 3 Stories" disabled={busy} /></label>
        <div className="fl-enquiry-fields"><label>Proposed budget (optional)<input inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} placeholder="To discuss" disabled={busy} /></label><label>Currency<select value={currency} onChange={e => setCurrency(e.target.value)} disabled={busy}>{["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD"].map(c => <option key={c}>{c}</option>)}</select></label></div>
      </>}
      <label>Campaign brief<textarea required minLength={20} maxLength={5000} rows={4} value={brief} onChange={e => setBrief(e.target.value)} placeholder="Product, campaign goal, timeline and any usage requirements…" disabled={busy} /></label>
      <p className="fl-enquiry-muted">Sent using your signed-in brand account. The creator can see your account email to identify the sender.</p>
      {error && <p className="fl-enquiry-error" role="alert">{error}</p>}
      <div className="fl-enquiry-actions"><a href="/login" target="_blank" rel="noopener noreferrer">Sign in to a brand account ↗</a><button type="submit" className="fl-enquiry-primary" disabled={busy}>{busy ? "Sending…" : "Send enquiry"}</button></div>
    </form>}
  </dialog>;
}
