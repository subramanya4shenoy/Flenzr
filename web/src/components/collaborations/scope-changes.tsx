"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest } from "@/lib/collaborations";
import { proposalFields, proposalPayload, type ProposalFields } from "@/lib/proposals";
import { scopeStatus, type ScopeWorkspace, type ScopeChange, type ScopeCreate, type ScopeDecision, type AgreementRevision } from "@/lib/scope-changes";
import { Terms } from "./proposal-terms";
import "./scope-changes.css";

const impact = "Accepting saves a new agreement revision and requires a fresh delivery and review. Earlier agreements, files, approvals and used revisions stay in history. No payment is taken.";

export function ScopeChangesPanel({ collaborationId, agreementId, onChanged }: { collaborationId: string; agreementId: string; onChanged: () => void }) {
  const [attempt, setAttempt] = useState(0), [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false), [action, setAction] = useState<ScopeDecision["action"] | null>(null);
  const [notice, setNotice] = useState("");
  const key = `${collaborationId}:${agreementId}:${page}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: ScopeWorkspace; error?: string } | null>(null);
  const pending = state?.key !== key;
  const ws = state?.data;
  const path = `/${collaborationId}/scope-changes`;
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ScopeWorkspace>(`${path}?page=${page}&page_size=10`, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        if (data.current_agreement?.id && data.current_agreement.id !== agreementId) { onChanged(); return; }
        setState({ key, data });
      })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load scope changes." }); });
    return () => controller.abort();
  }, [key, page, path, agreementId, onChanged]);
  function reload() { setAttempt(value => value + 1); }
  function saved(message: string) { setEditing(false); setAction(null); setNotice(message); setPage(1); reload(); onChanged(); }
  return <section id="collaboration-scope-changes" tabIndex={-1} className="fl-scope" aria-label="Scope changes" aria-busy={pending}>
    <header><div><h3>Scope changes</h3><p>Updated terms need explicit approval from both participants.</p></div><button type="button" disabled={pending || editing || Boolean(action)} onClick={reload}>Refresh scope changes</button></header>
    {notice && <p role="status">{notice}</p>}
    {pending && <p role="status">Loading scope changes…</p>}
    {!pending && state?.error && <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry scope changes</button></div>}
    {!pending && ws && <>
      <p className="fl-scope-impact">{impact}</p>
      {ws.can_propose && !editing && <button type="button" className="fl-prop-btn-secondary" onClick={() => { setNotice(""); setEditing(true); }}>Propose scope change</button>}
      {!ws.current_agreement && <p>Agree a proposal before requesting scope changes.</p>}
      {ws.current_agreement && !ws.can_propose && !ws.pending && <p>Completed collaborations retain their history; scope changes cannot reopen them.</p>}
      {editing && ws.current_agreement && <ScopeEditor key={ws.current_agreement.id} workspace={ws} path={path} onClose={() => setEditing(false)} onSaved={() => saved("Scope request shared. The current agreement stays in force until the other participant accepts.")} />}
      {ws.pending && <article className="fl-scope-pending">
        <h4>Scope request {ws.pending.version} · {scopeStatus(ws.pending)}</h4>
        <p>{ws.pending.is_mine ? "You proposed these terms." : `${ws.pending.author_role === "brand" ? "Brand/client" : "Creator"} proposed these terms.`} Sent {new Date(ws.pending.proposed_at).toLocaleString("en-IN")}</p>
        <p>{ws.pending.reason}</p>
        <div className="fl-scope-compare"><div><h5>Current agreement · Revision {ws.current_agreement?.revision}</h5>{ws.current_agreement && <Terms terms={ws.current_agreement.snapshot.terms} agreed />}</div><div><h5>Requested terms</h5><Terms terms={ws.pending.terms} /></div></div>
        {ws.pending.stale && <p role="status">Work or the agreement changed after this request. It cannot be accepted. Decline or withdraw it, then review a fresh request.</p>}
        {!ws.pending.stale && !ws.pending.can_accept && !ws.pending.is_mine && <p>The requested date is no longer eligible. Decline this request and review an updated one.</p>}
        <div className="fl-shared-actions">
          {ws.pending.can_accept && <button type="button" className="fl-prop-btn-primary" onClick={() => setAction("accept")}>Review &amp; accept scope</button>}
          {ws.pending.can_decline && <button type="button" onClick={() => setAction("decline")}>Decline scope request</button>}
          {ws.pending.can_withdraw && <button type="button" onClick={() => setAction("withdraw")}>Withdraw scope request</button>}
        </div>
      </article>}
      {ws.items.filter(row => row.id !== ws.pending?.id).map(row => <details className="fl-scope-history" key={row.id}>
        <summary>Scope request {row.version} · {scopeStatus(row)}</summary><p>{row.reason}</p><Terms terms={row.terms} />
        <p>Proposed by {row.author_role === "brand" ? "Brand/client" : "Creator"} · {new Date(row.proposed_at).toLocaleString("en-IN")}</p>
        {row.decision && <p>{scopeStatus(row)} by {row.decision.actor_role === "brand" ? "Brand/client" : "Creator"} · {new Date(row.decision.decided_at).toLocaleString("en-IN")}{row.decision.note ? ` · ${row.decision.note}` : ""}</p>}
        {row.agreement && <p>Saved agreement revision {row.agreement.revision}</p>}
      </details>)}
      {ws.total === 0 && !editing && <p>No scope changes requested yet.</p>}
      {ws.total > 10 && <nav aria-label="Scope history pages"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous scope requests</button><span>Page {page}</span><button type="button" disabled={page * 10 >= ws.total} onClick={() => setPage(value => value + 1)}>Next scope requests</button></nav>}
      <AgreementRevisions collaborationId={collaborationId} revision={ws.current_agreement?.revision || 1} />
      {action && ws.pending && <ScopeDecisionDialog row={ws.pending} action={action} path={path} onClose={() => setAction(null)} onSaved={() => saved(action === "accept" ? "New agreement revision saved. Submit and review fresh work against the revised scope." : "Scope request closed. The current agreement is unchanged.")} />}
    </>}
  </section>;
}

function ScopeEditor({ workspace, path, onClose, onSaved }: { workspace: ScopeWorkspace; path: string; onClose: () => void; onSaved: () => void }) {
  const agreement = workspace.current_agreement!;
  const [fields, setFields] = useState<ProposalFields>(() => proposalFields(agreement.snapshot.terms));
  const [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const request = useRef<ScopeCreate | null>(null), saving = useRef(false);
  function field(name: keyof ProposalFields, value: string) { setFields(previous => ({ ...previous, [name]: value })); }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!confirmed || saving.current) return;
    setError("");
    try {
      const terms = proposalPayload(fields);
      if (terms.revision_limit == null) throw new Error("Set the revision allowance for the new terms.");
      request.current ||= { request_id: crypto.randomUUID(), expected_agreement_id: agreement.id, expected_work_state: workspace.work_state, terms, reason, confirmed: true };
      saving.current = true; setBusy(true); setLocked(true);
      await collaborationRequest(path, { method: "POST", body: JSON.stringify(request.current) });
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send the scope request. Retry the same request."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <form className="fl-scope-form" onSubmit={send} aria-label="Propose scope change">
    <h4>Propose updated terms</h4><p>Based on agreement revision {agreement.revision}. The existing agreement remains active while this request is pending.</p>
    <fieldset disabled={busy || locked}>
      <div className="fl-scope-fields"><label>Price ({fields.currency})<input name="scope-price" autoFocus inputMode="decimal" required value={fields.amount} onChange={event => field("amount", event.target.value)} /></label>
        <label>Delivery date<input name="scope-date" type="date" required value={fields.delivery_date} onChange={event => field("delivery_date", event.target.value)} /></label>
        <label>Included revision rounds<input name="scope-revision-limit" type="number" min="0" max="20" required value={fields.revision_limit} onChange={event => field("revision_limit", event.target.value)} /></label></div>
      <label>Deliverables<textarea name="scope-deliverables" minLength={5} maxLength={5000} required value={fields.deliverables} onChange={event => field("deliverables", event.target.value)} /></label>
      <label>Usage rights<textarea name="scope-rights" minLength={5} maxLength={5000} required value={fields.usage_rights} onChange={event => field("usage_rights", event.target.value)} /></label>
      <label>Additional terms<textarea name="scope-note" maxLength={2000} value={fields.note} onChange={event => field("note", event.target.value)} /></label>
      <label>Why are you changing the scope?<textarea name="scope-reason" minLength={5} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} /></label>
      <label className="fl-scope-check"><input name="confirm-scope-proposal" type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I approve these updated terms. They take effect only if the other participant explicitly accepts. I understand that fresh delivery and review are required.</label>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel scope editor</button>
      {locked && !busy && <button type="button" onClick={() => { request.current = null; setLocked(false); }}>Edit request</button>}
      <button type="submit" disabled={busy || !confirmed}>{busy ? "Sending…" : locked ? "Retry scope request" : "Send scope request"}</button></div>
  </form>;
}

function ScopeDecisionDialog({ row, action, path, onClose, onSaved }: { row: ScopeChange; action: ScopeDecision["action"]; path: string; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), request = useRef<ScopeDecision | null>(null), saving = useRef(false);
  const [confirmed, setConfirmed] = useState(false), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const verb = action === "accept" ? "Accept" : action === "decline" ? "Decline" : "Withdraw";
  useEffect(() => { ref.current?.showModal(); ref.current?.querySelector<HTMLElement>("#scope-decision-title")?.focus(); }, []);
  async function decide(event: React.FormEvent) {
    event.preventDefault(); if (!confirmed || saving.current) return;
    saving.current = true; setBusy(true); setLocked(true); setError("");
    request.current ||= { request_id: crypto.randomUUID(), action, note, confirmed: true };
    try { await collaborationRequest(`${path}/${row.id}/decide`, { method: "POST", body: JSON.stringify(request.current) }); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not save this decision. Please retry."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog fl-scope-dialog" aria-labelledby="scope-decision-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}>
    <form onSubmit={decide}><h2 id="scope-decision-title" tabIndex={-1}>{verb} scope request {row.version}?</h2>
      <p>{action === "accept" ? impact : "This closes the request and keeps the current agreement unchanged."}</p><p>{row.reason}</p><Terms terms={row.terms} />
      <label>Decision note (optional)<textarea name="scope-decision-note" disabled={busy || locked} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label>
      <label className="fl-scope-check"><input name="confirm-scope-decision" type="checkbox" checked={confirmed} disabled={busy || locked} onChange={event => setConfirmed(event.target.checked)} />I explicitly {action} this exact scope request{action === "accept" ? " and approve the updated terms and fresh delivery requirement" : ""}.</label>
      {error && <p role="alert">{error}</p>}<div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep reviewing scope</button><button type="submit" disabled={busy || !confirmed}>{busy ? "Saving…" : `${verb} scope request`}</button></div>
    </form>
  </dialog>;
}

function AgreementRevisions({ collaborationId, revision }: { collaborationId: string; revision: number }) {
  const [open, setOpen] = useState(false), [page, setPage] = useState(0), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; items?: AgreementRevision[]; error?: string } | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const key = `${collaborationId}:${revision}:${page}:${attempt}`;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    collaborationRequest<AgreementRevision[]>(`/${collaborationId}/agreements?limit=10&offset=${page * 10}`, { signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setState({ key, items }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load agreement revisions." }); });
    return () => controller.abort();
  }, [open, key, collaborationId, page]);
  async function download(row: AgreementRevision) {
    setDownloadError("");
    try {
      const saved = await collaborationRequest<AgreementRevision>(`/${collaborationId}/agreements/${row.id}`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2) + "\n"], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `flenzr-agreement-revision-${row.revision}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setDownloadError("Could not download this agreement revision. Please retry."); }
  }
  return <details className="fl-scope-archive" onToggle={event => setOpen(event.currentTarget.open)}><summary>Saved agreement revisions</summary>
    {open && (state?.key !== key ? <p role="status">Loading agreement revisions…</p> : state.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry agreement revisions</button></div> : <>
      {state.items?.map(row => <article key={row.id}><h4>Agreement revision {row.revision}{row.revision === revision ? " · Current" : " · Historical"}</h4><Terms terms={row.snapshot.terms} agreed /><button type="button" onClick={() => void download(row)}>Download revision {row.revision}</button></article>)}
      {downloadError && <p role="alert">{downloadError}</p>}<nav aria-label="Agreement revision pages"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Newer revisions</button><button type="button" disabled={(state.items?.length || 0) < 10} onClick={() => setPage(value => value + 1)}>Older revisions</button></nav>
    </>)}
  </details>;
}
