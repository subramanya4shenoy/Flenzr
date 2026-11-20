"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import { Terms } from "./proposal-terms";
import { AgreementPanel } from "./agreement";
import { proposalCurrencies, proposalFields, proposalPayload, type ProposalDraft, type ProposalFields, type ProposalRevision, type ProposalTerms, type ProposalWorkspace } from "@/lib/proposals";

export function CollaborationProposals({ collaboration, onStatus }: { collaboration: Collaboration; onStatus?: (status: Collaboration["status"]) => void }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [editing, setEditing] = useState(false), [review, setReview] = useState(false), [notice, setNotice] = useState("");
  const key = `${collaboration.id}:${page}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: ProposalWorkspace; error?: string } | null>(null);
  const loading = state?.key !== key, data = !loading ? state?.data : undefined;
  const path = `/${collaboration.id}/proposals`;
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ProposalWorkspace>(`${path}?page=${page}&page_size=5`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setState({ key, data }); onStatus?.(data.collaboration_status); } })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load proposals." }); });
    return () => controller.abort();
  }, [key, page, path, onStatus]);
  const reload = () => { setPage(1); setAttempt(value => value + 1); };
  function saved(message: string) { setEditing(false); setReview(false); setNotice(message); reload(); }
  const sourceTerms: ProposalTerms = { amount_cents: proposalCurrencies.includes(collaboration.currency as typeof proposalCurrencies[number]) ? collaboration.quoted_amount_cents : null, currency: proposalCurrencies.includes(collaboration.currency as typeof proposalCurrencies[number]) ? collaboration.currency as typeof proposalCurrencies[number] : "INR", deliverables: collaboration.deliverable, delivery_date: collaboration.requested_delivery_date, usage_rights: "", note: "" };
  return <section className="fl-proposals" aria-label="Collaboration proposals" aria-busy={loading}>
    <header><div><h2>Proposals</h2><p>Save a private draft, then send a version for both participants to review.</p></div><button type="button" disabled={loading || editing || review} onClick={reload}>Refresh proposals</button></header>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading proposals…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry proposals</button></div> : data && <>
      <p>{data.latest_version ? `Latest sent version: ${data.latest_version}` : "No proposals sent yet."} Acceptance is recorded separately for each participant. No payment is taken.</p>
      <AgreementPanel collaborationId={collaboration.id} workspace={data} latest={data.items.find(row => row.version === data.latest_version)} disabled={editing || review} onLatest={reload} onAccepted={state => { onStatus?.(state.collaboration_status); saved(state.agreement ? "Both acceptances saved. Your shared agreement is ready." : "Your acceptance is saved. Waiting for the other participant."); }} />
      {data.draft && <div className="fl-proposal-draft"><h3>{data.agreement ? "Your private draft (editing closed)" : "Your private draft"}</h3><p>Only you can see this draft. Saved {new Date(data.draft.updated_at).toLocaleString()}.</p><Terms terms={data.draft.terms} />
        {data.draft.base_version !== data.latest_version && <p role="status">A newer proposal is available. Review it, then edit and save your draft before sending.</p>}
      </div>}
      {!editing && !data.agreement && <div className="fl-shared-actions"><button type="button" onClick={() => { setNotice(""); setPage(1); setEditing(true); }}>{data.draft ? "Edit draft" : data.latest_version ? "Draft a revision" : "Draft proposal"}</button>{data.draft && <button type="button" disabled={data.draft.base_version !== data.latest_version} onClick={() => setReview(true)}>Review & send</button>}</div>}
      {editing && !data.agreement && <DraftEditor key={`${data.draft?.revision || 0}:${data.latest_version}`} path={path} draft={data.draft} version={data.latest_version} initial={data.draft?.terms || data.items[0]?.terms || sourceTerms} onClose={() => setEditing(false)} onSaved={() => saved("Private draft saved.")} />}
      {review && !data.agreement && data.draft && <SendDialog path={path} draft={data.draft} version={data.latest_version} onClose={() => setReview(false)} onSent={row => saved(`Proposal version ${row.version} sent. Both participants can review it.`)} />}
      <h3>Sent version history</h3>
      {!data.items.length && <p>No sent versions on this page.</p>}
      {data.items.map(row => <details key={row.id} className="fl-proposal-version" open={page === 1 && row.version === data.latest_version}><summary>Version {row.version} · {row.author_role === "brand" ? "Brand / client" : "Creator"}{row.is_mine ? " (you)" : ""} · {new Date(row.created_at).toLocaleString()}</summary><Terms terms={row.terms} /></details>)}
      <nav aria-label="Proposal history pages"><button type="button" disabled={page === 1 || editing || review} onClick={() => setPage(value => value - 1)}>Previous versions</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button type="button" disabled={page * data.page_size >= data.total || editing || review} onClick={() => setPage(value => value + 1)}>Older versions</button></nav>
    </>}
  </section>;
}

function DraftEditor({ path, draft, version, initial, onClose, onSaved }: { path: string; draft: ProposalDraft | null; version: number; initial: ProposalTerms; onClose: () => void; onSaved: () => void }) {
  const [fields, setFields] = useState(() => proposalFields(initial)), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const saving = useRef(false);
  const dirty = JSON.stringify(fields) !== JSON.stringify(proposalFields(initial));
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a[href]")) return;
      if (!window.confirm("Discard your unsaved proposal edits?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", handler); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", handler); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  function field<K extends keyof ProposalFields>(key: K, value: ProposalFields[K]) { setFields(previous => ({ ...previous, [key]: value })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving.current) return;
    setError("");
    try {
      const terms = proposalPayload(fields); saving.current = true; setBusy(true);
      await collaborationRequest(`${path}/draft`, { method: "PUT", body: JSON.stringify({ expected_revision: draft?.revision || 0, expected_latest_version: version, terms }) });
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save draft."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <form className="fl-proposal-editor" onSubmit={save}><h3>Edit your private draft</h3><p>You can save an incomplete draft. Review the latest sent version before proposing changes.</p>
    <div className="fl-proposal-fields"><label>Price<input name="proposal-price" inputMode="decimal" value={fields.amount} disabled={busy} onChange={e => field("amount", e.target.value)} /></label><label>Currency<select name="proposal-currency" value={fields.currency} disabled={busy} onChange={e => field("currency", e.target.value as ProposalFields["currency"])}>{proposalCurrencies.map(value => <option key={value}>{value}</option>)}</select></label></div>
    <label>Deliverables<textarea name="proposal-deliverables" rows={3} maxLength={5000} value={fields.deliverables} disabled={busy} onChange={e => field("deliverables", e.target.value)} /></label>
    <label>Delivery date<input name="proposal-date" type="date" value={fields.delivery_date} disabled={busy} onChange={e => field("delivery_date", e.target.value)} /></label>
    <label>Included revision rounds (optional)<input name="proposal-revision-limit" inputMode="numeric" maxLength={2} placeholder="Not specified" value={fields.revision_limit} disabled={busy} onChange={e => field("revision_limit", e.target.value)} /><span>0–20 rounds across this collaboration. Each saved revision request uses one round. Leave blank if no structured limit is agreed; written scope still applies.</span></label>
    <label>Usage rights<textarea name="proposal-rights" rows={3} maxLength={5000} placeholder="Where, how long, organic or paid use, and any limits" value={fields.usage_rights} disabled={busy} onChange={e => field("usage_rights", e.target.value)} /></label>
    <label>Proposal note (optional)<textarea name="proposal-note" rows={2} maxLength={2000} value={fields.note} disabled={busy} onChange={e => field("note", e.target.value)} /></label>
    {error && <p role="alert">{error} Your inputs are preserved. Close this editor and refresh to review the saved version if needed.</p>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard your unsaved proposal edits?")) onClose(); }}>Cancel editing</button><button type="submit" disabled={busy}>{busy ? "Saving draft…" : "Save private draft"}</button></div>
  </form>;
}

function SendDialog({ path, draft, version, onClose, onSent }: { path: string; draft: ProposalDraft; version: number; onClose: () => void; onSent: (row: ProposalRevision) => void }) {
  const ref = useRef<HTMLDialogElement>(null), sending = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  async function send() {
    if (sending.current) return;
    requestId.current ||= crypto.randomUUID(); sending.current = true; setBusy(true); setError("");
    try {
      const row = await collaborationRequest<ProposalRevision>(`${path}/send`, { method: "POST", body: JSON.stringify({ request_id: requestId.current, expected_draft_revision: draft.revision, expected_latest_version: version }) });
      onSent(row);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send proposal."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="send-proposal-title" onCancel={event => { if (sending.current) event.preventDefault(); else onClose(); }}><h2 id="send-proposal-title">Send proposal version {version + 1}?</h2><p>Both participants will see this version. Further changes will be saved as a new version.</p><Terms terms={draft.terms} /><p>This sends proposed terms for review. Agreement and payment come later.</p>{error && <p role="alert">{error}</p>}<div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep draft</button><button type="button" disabled={busy} onClick={send}>{busy ? "Sending proposal…" : "Send proposal"}</button></div></dialog>;
}
