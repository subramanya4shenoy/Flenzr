"use client";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StartCollaboration } from "@/components/collaborations/start-collaboration";
import { OfferTicket } from "@/components/offers/offer-ticket";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, RefreshCw, X } from "lucide-react";
import { useCreatorAccountId } from "@/components/creator/creator-account-context";
import { Enquiry, enquiryCents, enquiryDeliveryDate, enquiryMoney, enquiryRequest, enquiryStatuses, mergeEnquiryRead } from "@/lib/enquiries";
import { EnquiryUnreadBadge, useEnquiryActivity } from "./enquiry-activity";
import "./enquiries.css";
import "@/components/offers/offers.css";

type Action = "accept" | "decline" | "counter" | "withdraw";
const time = (date: string) => new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const ticketState = (status: Enquiry["status"]) =>
  status === "countered" ? "paused" : status === "declined" || status === "withdrawn" ? "cancelled" : "active";

function DirectOfferDetailDialog({
  enquiry,
  view,
  readingThis,
  readError,
  onMarkRead,
  onRespond,
  onClose,
}: {
  enquiry: Enquiry;
  view: "received" | "sent";
  readingThis: boolean;
  readError: string | null;
  onMarkRead: () => void;
  onRespond: (action: Action) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const canRespond = (view === "received" && enquiry.status === "pending") || (view === "sent" && enquiry.status === "countered");
  const canWithdraw = view === "sent" && (enquiry.status === "pending" || enquiry.status === "countered");

  return <dialog ref={dialog} className="fl-enquiry-dialog fl-enquiry-detail-dialog" aria-labelledby="direct-offer-detail-title" onCancel={onClose}>
    <button type="button" className="fl-enquiry-close" aria-label="Close direct offer" onClick={onClose}><X size={18} /></button>
    <div className="fl-enquiry-detail-body">
      <div className="fl-enquiry-offer-id">
        <span>DIRECT OFFER · {enquiry.id.slice(0, 8).toUpperCase()}</span>
        <span>PRIVATE · BRAND &amp; CREATOR ONLY</span>
      </div>

      <div className="fl-enquiry-card-head">
        <div>
          <h2 id="direct-offer-detail-title">{view === "received" ? enquiry.brand_name : enquiry.creator_name} {enquiry.is_unread && <span className="fl-enquiry-unread-label">Unread</span>}</h2>
          <p>{view === "received" ? `${enquiry.sender_email} · brand name supplied by sender` : enquiry.brand_name} · {time(enquiry.created_at)}</p>
        </div>
        <span className="fl-enquiry-status" data-status={enquiry.status}>{enquiryStatuses[enquiry.status]}</span>
      </div>

      <div className="fl-enquiry-terms">
        <span>{enquiry.deliverable}</span>
        <strong>{enquiryMoney(enquiry.amount_cents, enquiry.currency)}</strong>
      </div>

      <p className="fl-enquiry-delivery">
        Preferred delivery: {enquiry.preferred_delivery_date ? <time dateTime={enquiry.preferred_delivery_date}>{enquiryDeliveryDate(enquiry.preferred_delivery_date)}</time> : "To discuss"}
        {enquiry.preferred_delivery_date && <span>Requested date · subject to agreement</span>}
      </p>

      {readingThis && <p role="status" className="fl-enquiry-muted">Marking as read…</p>}
      {readError && <p className="fl-enquiry-error" role="alert">{readError}</p>}
      {enquiry.is_unread && !readingThis && <button type="button" onClick={onMarkRead}>Mark as read</button>}

      <p className="fl-enquiry-brief">{enquiry.brief}</p>

      {enquiry.status === "accepted" && <StartCollaboration sourceKind="enquiry" sourceId={enquiry.id} />}

      <div className="fl-enquiry-card-actions">
        {canRespond && <>
          <button type="button" className="fl-enquiry-primary" onClick={() => onRespond("accept")}>Accept</button>
          <button type="button" onClick={() => onRespond("decline")}>Decline</button>
          {view === "received" && <button type="button" onClick={() => onRespond("counter")}>Counter budget</button>}
        </>}
        {canWithdraw && <button type="button" onClick={() => onRespond("withdraw")}>Withdraw enquiry</button>}
        {view === "sent" && <Link className="fl-enquiry-muted" href={`/${encodeURIComponent(enquiry.creator_handle)}`}>View media kit ↗</Link>}
      </div>

      <details open>
        <summary>Response history · updated {time(enquiry.updated_at)}</summary>
        <ol className="fl-enquiry-history">
          {enquiry.history.map((event, i) => (
            <li key={i}>
              <strong>{event.actor === "brand" ? "Brand" : "Creator"} · {({ sent: "Enquiry sent", accept: "Accepted", decline: "Declined", counter: "Budget proposed", withdraw: "Withdrawn" } as Record<string, string>)[event.action] || event.action}</strong>
              <small> · {time(event.at)}</small>
              <p>{enquiryMoney(event.amount_cents, enquiry.currency)}</p>
              {event.preferred_delivery_date && <p>Preferred delivery requested: {enquiryDeliveryDate(event.preferred_delivery_date)}</p>}
              {event.note && <p>{event.note}</p>}
            </li>
          ))}
        </ol>
      </details>
    </div>
  </dialog>;
}

function ResponseDialog({ enquiry, action, onClose, onSaved }: { enquiry: Enquiry; action: Action; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [note, setNote] = useState("");
  const [budget, setBudget] = useState(enquiry.amount_cents === null ? "" : (enquiry.amount_cents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const label = { accept: "Accept enquiry", decline: "Decline enquiry", counter: "Propose a budget", withdraw: "Withdraw enquiry" }[action];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    setError("");
    try {
      const amount = action === "counter" ? enquiryCents(budget) : undefined;
      if (action === "counter" && (amount === null || note.trim().length < 5)) throw new Error("Add a proposed budget and a short explanation.");
      saving.current = true; setBusy(true);
      await enquiryRequest(`/${enquiry.id}/${action === "withdraw" ? "withdraw" : "respond"}`, { method: "POST", body: JSON.stringify({ ...(action === "withdraw" ? {} : { action }), expected_revision: enquiry.revision, note: note.trim(), ...(action === "counter" ? { amount_cents: amount } : {}) }) });
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save your response."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-enquiry-dialog" aria-labelledby="response-title" onCancel={e => { if (saving.current) e.preventDefault(); else onClose(); }}>
    <button type="button" className="fl-enquiry-close" aria-label="Close response" disabled={busy} onClick={onClose}><X size={18} /></button>
    <form onSubmit={submit} className="fl-enquiry-form">
      <h2 id="response-title">{label}</h2>
      <p>{enquiry.deliverable} · {enquiryMoney(enquiry.amount_cents, enquiry.currency)}</p>
      <p className="fl-enquiry-delivery">Preferred delivery: {enquiryDeliveryDate(enquiry.preferred_delivery_date)}{enquiry.preferred_delivery_date && <span>Requested date · subject to agreement</span>}</p>
      {action === "withdraw" && <p>This closes your open request. The creator will see it as withdrawn, and both sides will keep its history. You cannot reopen it.</p>}
      {action === "counter" && <label>Proposed budget ({enquiry.currency})<input autoFocus required inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} disabled={busy} /></label>}
      <label>{action === "counter" ? "Explain your proposal" : action === "withdraw" ? "Reason (optional)" : "Message (optional)"}<textarea autoFocus={action !== "counter"} rows={3} maxLength={2000} required={action === "counter"} minLength={action === "counter" ? 5 : undefined} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></label>
      {action !== "withdraw" && <p className="fl-enquiry-muted">Your response is saved for both sides. Accepting expresses interest in these terms; it does not create a funded booking or transfer money.</p>}
      {error && <p role="alert" className="fl-enquiry-error">{error}</p>}
      <div className="fl-enquiry-actions"><button type="button" onClick={onClose} disabled={busy}>{action === "withdraw" ? "Keep enquiry" : "Cancel"}</button><button type="submit" className="fl-enquiry-primary" disabled={busy}>{busy ? "Saving…" : label}</button></div>
    </form>
  </dialog>;
}

export function EnquiryInbox({ view = "received", ownerId: providedOwner, enquiryId, embedded = false, refreshTick = 0 }: { view?: "received" | "sent"; ownerId?: string; enquiryId?: string; embedded?: boolean; refreshTick?: number }) {
  const creatorOwner = useCreatorAccountId();
  const activity = useEnquiryActivity();
  const ownerId = providedOwner || creatorOwner || activity?.ownerId || null;
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}><EnquiryInboxView key={`${ownerId}-${view}-${enquiryId || "list"}`} view={view} ownerId={ownerId} enquiryId={enquiryId} embedded={embedded} refreshTick={refreshTick} /></QueryClientProvider>;
}

function EnquiryInboxView({ view, ownerId, enquiryId, embedded, refreshTick }: { view: "received" | "sent"; ownerId: string | null; enquiryId?: string; embedded: boolean; refreshTick: number }) {
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<{ enquiry: Enquiry; action: Action } | null>(null);
  const [notice, setNotice] = useState("");
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [readError, setReadError] = useState<{ id: string; message: string } | null>(null);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const readRequests = useRef(new Set<string>());
  const activity = useEnquiryActivity();
  const client = useQueryClient();
  const queryKey = ["enquiries", ownerId, view, page, enquiryId];
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => enquiryId ? [await enquiryRequest<Enquiry>(`/${enquiryId}`, { signal })] : enquiryRequest<Enquiry[]>(`/me?view=${view}&limit=30&offset=${page * 30}`, { signal }),
    enabled: Boolean(ownerId), retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: true,
    refetchInterval: activity?.live ? false : 30_000, refetchIntervalInBackground: false,
  });
  const changeVersion = activity?.changeVersion ?? 0;
  useEffect(() => {
    if (changeVersion > 0 || refreshTick > 0) void client.invalidateQueries({ queryKey: ["enquiries", ownerId] });
  }, [client, ownerId, changeVersion, refreshTick]);
  const loading = query.isPending;
  const refreshing = query.isFetching;
  const error = query.error?.message || "";
  const items = query.data || [];
  function load() {
    activity?.refresh();
    return query.refetch();
  }
  async function markRead(enquiry: Enquiry) {
    if (!enquiry.is_unread || readRequests.current.has(enquiry.id)) return;
    readRequests.current.add(enquiry.id);
    setReading(new Set(readRequests.current));
    setReadError(null);
    try {
      await client.cancelQueries({ queryKey, exact: true });
      const acknowledged = await enquiryRequest<Enquiry>(`/${enquiry.id}/read`, {
        method: "POST", body: JSON.stringify({ seen_revision: enquiry.revision }),
      });
      client.setQueryData<Enquiry[]>(queryKey, old => old?.map(item => item.id === enquiry.id ? mergeEnquiryRead(item, acknowledged) : item));
      activity?.refresh();
      // A newer reply can arrive while this older revision is being acknowledged.
      if (acknowledged.is_unread) setReadError({ id: enquiry.id, message: "A newer update arrived. Review it, then mark it as read." });
    } catch (err) {
      setReadError({ id: enquiry.id, message: err instanceof Error ? err.message : "Could not mark this enquiry as read. Please retry." });
    } finally {
      readRequests.current.delete(enquiry.id);
      setReading(new Set(readRequests.current));
    }
  }
  function toggleEnquiry(enquiry: Enquiry) {
    if (openedId === enquiry.id) { setOpenedId(null); return; }
    setOpenedId(enquiry.id);
    void markRead(enquiry);
  }
  const openedEnquiry = openedId ? items.find(item => item.id === openedId) || null : null;

  return <section className="fl-enquiries" aria-label={view === "received" ? "Creator enquiry inbox" : "Sent enquiries"}>
    {!embedded && <header className="fl-enquiries-header"><div>
      <h2>{view === "received" ? "Direct Offers" : "Sent direct Offers"} <EnquiryUnreadBadge view={view} /></h2>
      <p>{view === "received" ? "Real requests from brands, saved to your account. Open a direct offer to review its brief and respond." : "Follow your direct offers and respond to creator proposals. Open a direct offer to review its latest update."}</p>
    </div><button type="button" className="fl-enquiries-refresh-btn" onClick={() => { setNotice(""); void load(); }} disabled={refreshing} aria-label="Refresh direct offers" title="Refresh direct offers"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" /></button></header>}
    <div className="fl-enquiries-toolbar"><span>{loading ? "Loading direct offers…" : `${items.length} ${items.length === 1 ? "direct offer" : "direct offers"} on this page`}{activity?.counts && ` · ${activity.counts[view]} unread across all pages`}</span><span>No payment is taken through an enquiry</span></div>
    {loading && <WorkspaceLoader label="Loading direct offers…" />}
    {notice && <p role="status" className="fl-enquiry-muted">{notice}</p>}
    {error && <p role="alert" className="fl-enquiry-error">{error} <button onClick={() => { void load(); }}>Retry</button></p>}
    {!loading && !error && items.length === 0 && <div className="fl-enquiries-empty"><Inbox size={27} style={{ margin: "0 auto 10px" }} /><h3>{view === "received" ? "Your next collaboration starts here" : "No enquiries sent yet"}</h3><p>{view === "received" ? "Share your media kit. Requests sent by brands will appear here." : "Visit a creator’s media kit to send a package or custom enquiry."}</p></div>}
    {!loading && query.data && items.length > 0 && <div className="fl-ticket-grid">{items.map(enquiry => {
      const counterpart = view === "received" ? enquiry.brand_name : enquiry.creator_name;
      const issuerLine = view === "received"
        ? `${enquiry.sender_email} · ${time(enquiry.created_at)}`
        : `${enquiry.brand_name} · ${time(enquiry.created_at)}`;
      return <OfferTicket
        key={enquiry.id}
        id={enquiry.id}
        title={counterpart}
        issuer={issuerLine}
        niche={enquiry.is_unread ? "Unread" : "Direct · 1-on-1"}
        deliverables={enquiry.deliverable}
        budget={enquiryMoney(enquiry.amount_cents, enquiry.currency)}
        deadline={enquiry.preferred_delivery_date ? enquiryDeliveryDate(enquiry.preferred_delivery_date) : "To discuss"}
        status={enquiryStatuses[enquiry.status]}
        state={ticketState(enquiry.status)}
        access="draft"
        accessLabel="Private · Direct"
        kindLabel="DIRECT OFFER"
        budgetLabel="Proposed budget"
        deadlineLabel="Preferred delivery"
        referencePrefix="DIR"
        referenceMeta={enquiry.is_unread ? "Unread update" : "Private terms"}
        onOpen={() => toggleEnquiry(enquiry)}
        openLabel="Open Offer"
      >
        {enquiry.status === "accepted" && <StartCollaboration sourceKind="enquiry" sourceId={enquiry.id} />}
      </OfferTicket>;
    })}</div>}
    {!enquiryId && items.length > 0 && (page > 0 || items.length >= 30) && <div className="fl-enquiry-pagination"><button disabled={loading || page === 0} onClick={() => { setOpenedId(null); setPage(p => p - 1); }}>Previous</button><span>Page {page + 1}</span><button disabled={loading || items.length < 30} onClick={() => { setOpenedId(null); setPage(p => p + 1); }}>Next</button></div>}
    {openedEnquiry && !response && <DirectOfferDetailDialog
      enquiry={openedEnquiry}
      view={view}
      readingThis={reading.has(openedEnquiry.id)}
      readError={readError?.id === openedEnquiry.id ? readError.message : null}
      onMarkRead={() => void markRead(openedEnquiry)}
      onRespond={action => setResponse({ enquiry: openedEnquiry, action })}
      onClose={() => setOpenedId(null)}
    />}
    {response && <ResponseDialog key={`${response.enquiry.id}-${response.action}`} {...response} onClose={() => setResponse(null)} onSaved={() => { setReadError(null); setNotice(response.action === "withdraw" ? "Direct offer withdrawn. Both sides can still view its history." : "Response saved. Both sides can see the updated status."); void load(); }} />}
  </section>;
}
