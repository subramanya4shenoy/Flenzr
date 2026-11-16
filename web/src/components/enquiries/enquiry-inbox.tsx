"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Inbox, RefreshCw, X } from "lucide-react";
import { useCreatorAccountId } from "@/components/creator/creator-account-context";
import { Enquiry, enquiryCents, enquiryMoney, enquiryRequest, enquiryStatuses } from "@/lib/enquiries";
import "./enquiries.css";

type Action = "accept" | "decline" | "counter";
const time = (date: string) => new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function ResponseDialog({ enquiry, action, onClose, onSaved }: { enquiry: Enquiry; action: Action; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [note, setNote] = useState("");
  const [budget, setBudget] = useState(enquiry.amount_cents === null ? "" : (enquiry.amount_cents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const label = { accept: "Accept enquiry", decline: "Decline enquiry", counter: "Propose a budget" }[action];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    setError("");
    try {
      const amount = action === "counter" ? enquiryCents(budget) : undefined;
      if (action === "counter" && (amount === null || note.trim().length < 5)) throw new Error("Add a proposed budget and a short explanation.");
      saving.current = true; setBusy(true);
      await enquiryRequest(`/${enquiry.id}/respond`, { method: "POST", body: JSON.stringify({ action, expected_revision: enquiry.revision, note: note.trim(), ...(action === "counter" ? { amount_cents: amount } : {}) }) });
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save your response."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-enquiry-dialog" aria-labelledby="response-title" onCancel={e => { if (saving.current) e.preventDefault(); else onClose(); }}>
    <button type="button" className="fl-enquiry-close" aria-label="Close response" disabled={busy} onClick={onClose}><X size={18} /></button>
    <form onSubmit={submit} className="fl-enquiry-form">
      <h2 id="response-title">{label}</h2>
      <p>{enquiry.deliverable} · {enquiryMoney(enquiry.amount_cents, enquiry.currency)}</p>
      {action === "counter" && <label>Proposed budget ({enquiry.currency})<input autoFocus required inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} disabled={busy} /></label>}
      <label>{action === "counter" ? "Explain your proposal" : "Message (optional)"}<textarea autoFocus={action !== "counter"} rows={3} maxLength={2000} required={action === "counter"} minLength={action === "counter" ? 5 : undefined} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></label>
      <p className="fl-enquiry-muted">Your response is saved for both sides. Accepting expresses interest in these terms; it does not create a funded booking or transfer money.</p>
      {error && <p role="alert" className="fl-enquiry-error">{error}</p>}
      <div className="fl-enquiry-actions"><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="fl-enquiry-primary" disabled={busy}>{busy ? "Saving…" : label}</button></div>
    </form>
  </dialog>;
}

export function EnquiryInbox({ view = "received", ownerId: providedOwner }: { view?: "received" | "sent"; ownerId?: string }) {
  const creatorOwner = useCreatorAccountId();
  const ownerId = providedOwner || creatorOwner;
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}><EnquiryInboxView key={`${ownerId}-${view}`} view={view} ownerId={ownerId} /></QueryClientProvider>;
}

function EnquiryInboxView({ view, ownerId }: { view: "received" | "sent"; ownerId: string | null }) {
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<{ enquiry: Enquiry; action: Action } | null>(null);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["enquiries", ownerId, view, page],
    queryFn: ({ signal }) => enquiryRequest<Enquiry[]>(`/me?view=${view}&limit=30&offset=${page * 30}`, { signal }),
    enabled: Boolean(ownerId), retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false,
  });
  const loading = query.isFetching || query.isPending;
  const error = query.error?.message || "";
  const items = query.data || [];
  const load = () => query.refetch();
  return <section className="fl-enquiries" aria-label={view === "received" ? "Creator enquiry inbox" : "Sent enquiries"}>
    <header className="fl-enquiries-header"><div><h2>{view === "received" ? "Collab enquiries" : "Sent enquiries"}</h2><p>{view === "received" ? "Real requests from brands, saved to your account. Review the brief and respond when you’re ready." : "Follow your requests and respond to creator proposals. Your latest status stays here after a refresh."}</p></div><button onClick={() => { setNotice(""); void load(); }} disabled={loading} aria-label="Refresh enquiries"><RefreshCw size={13} style={{ display: "inline", marginRight: 6 }} />{loading ? "Loading…" : "Refresh"}</button></header>
    <div className="fl-enquiries-toolbar"><span>{loading ? "Loading enquiries…" : `${items.length} ${items.length === 1 ? "enquiry" : "enquiries"} on this page`}</span><span>No payment is taken through an enquiry</span></div>
    {notice && <p role="status" className="fl-enquiry-muted">{notice}</p>}
    {error && <p role="alert" className="fl-enquiry-error">{error} <button onClick={() => { void load(); }}>Retry</button></p>}
    {!loading && !error && items.length === 0 && <div className="fl-enquiries-empty"><Inbox size={27} style={{ margin: "0 auto 10px" }} /><h3>{view === "received" ? "Your next collaboration starts here" : "No enquiries sent yet"}</h3><p>{view === "received" ? "Share your media kit. Requests sent by brands will appear here." : "Visit a creator’s media kit to send a package or custom enquiry."}</p></div>}
    {!loading && !error && <div className="fl-enquiry-list">{items.map(enquiry => <article key={enquiry.id} className="fl-enquiry-card">
      <div className="fl-enquiry-card-head"><div><h3>{view === "received" ? enquiry.brand_name : enquiry.creator_name}</h3><p>{view === "received" ? `${enquiry.sender_email} · brand name supplied by sender` : enquiry.brand_name} · {time(enquiry.created_at)}</p></div><span className="fl-enquiry-status" data-status={enquiry.status}>{enquiryStatuses[enquiry.status]}</span></div>
      <div className="fl-enquiry-terms"><span>{enquiry.deliverable}</span><strong>{enquiryMoney(enquiry.amount_cents, enquiry.currency)}</strong></div>
      <p className="fl-enquiry-brief">{enquiry.brief}</p>
      <div className="fl-enquiry-card-actions">
        {((view === "received" && enquiry.status === "pending") || (view === "sent" && enquiry.status === "countered")) && <><button className="fl-enquiry-primary" onClick={() => setResponse({ enquiry, action: "accept" })}>Accept</button><button onClick={() => setResponse({ enquiry, action: "decline" })}>Decline</button>{view === "received" && <button onClick={() => setResponse({ enquiry, action: "counter" })}>Counter budget</button>}</>}
        {view === "sent" && <Link className="fl-enquiry-muted" href={`/${encodeURIComponent(enquiry.creator_handle)}`}>View media kit ↗</Link>}
      </div>
      <details><summary>Response history · updated {time(enquiry.updated_at)}</summary><ol className="fl-enquiry-history">{enquiry.history.map((event, i) => <li key={i}><strong>{event.actor === "brand" ? "Brand" : "Creator"} · {({ sent: "Enquiry sent", accept: "Accepted", decline: "Declined", counter: "Budget proposed" } as Record<string, string>)[event.action] || event.action}</strong><small> · {time(event.at)}</small><p>{enquiryMoney(event.amount_cents, enquiry.currency)}</p>{event.note && <p>{event.note}</p>}</li>)}</ol></details>
    </article>)}</div>}
    <div className="fl-enquiry-pagination"><button disabled={loading || page === 0} onClick={() => { setPage(p => p - 1); }}>Previous</button><span>Page {page + 1}</span><button disabled={loading || items.length < 30} onClick={() => { setPage(p => p + 1); }}>Next</button></div>
    {response && <ResponseDialog key={`${response.enquiry.id}-${response.action}`} {...response} onClose={() => setResponse(null)} onSaved={() => { setNotice("Response saved. Both sides can see the updated status."); void load(); }} />}
  </section>;
}
