"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, FileEdit, RefreshCw, Send, X } from "lucide-react";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import { campaignMoney } from "@/lib/campaign-drafts";
import { AcceptanceDialog } from "./agreement";
import { AgreementSheet } from "./agreement-sheet";
import { proposalCurrencies, proposalFields, proposalPayload, type ProposalDraft, type ProposalFields, type ProposalRevision, type ProposalTerms, type ProposalWorkspace } from "@/lib/proposals";
import type { components } from "@/types/api";
import "./agreement.css";

type Agreement = components["schemas"]["AgreementRead"];

export function CollaborationProposals({ collaboration, onStatus }: { collaboration: Collaboration; onStatus?: (status: Collaboration["status"]) => void }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<"agreement" | "history">("agreement");
  const [editing, setEditing] = useState(false), [review, setReview] = useState(false), [accepting, setAccepting] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [liveDraftTerms, setLiveDraftTerms] = useState<ProposalTerms | null>(null);
  const [downloading, setDownloading] = useState(false), [downloadError, setDownloadError] = useState("");
  const [notice, setNotice] = useState("");

  const key = `${collaboration.id}:${page}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: ProposalWorkspace; error?: string } | null>(null);
  const loading = state?.key !== key && !state?.data;
  const data = state?.data;
  const path = `/${collaboration.id}/proposals`;

  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ProposalWorkspace>(`${path}?page=${page}&page_size=5`, { signal: controller.signal })
      .then(ws => { if (!controller.signal.aborted) { setState({ key, data: ws }); onStatus?.(ws.collaboration_status); } })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load proposals." }); });
    return () => controller.abort();
  }, [key, page, path, onStatus]);

  const reload = () => { setPage(1); setAttempt(value => value + 1); };
  function saved(message: string) { setEditing(false); setReview(false); setLiveDraftTerms(null); setNotice(message); reload(); }

  async function downloadAgreement() {
    setDownloading(true); setDownloadError("");
    try {
      const record = await collaborationRequest<Agreement>(`/${collaboration.id}/agreement`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2) + "\n"], { type: "application/json;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `flenzr-agreement-${record.id}.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Could not download agreement. Please retry.");
    } finally { setDownloading(false); }
  }

  const sourceTerms: ProposalTerms = {
    amount_cents: proposalCurrencies.includes(collaboration.currency as typeof proposalCurrencies[number]) ? collaboration.quoted_amount_cents : null,
    currency: proposalCurrencies.includes(collaboration.currency as typeof proposalCurrencies[number]) ? collaboration.currency as typeof proposalCurrencies[number] : "INR",
    deliverables: collaboration.deliverable,
    delivery_date: collaboration.requested_delivery_date,
    usage_rights: "",
    note: "",
  };

  const latest = data?.items.find(row => row.version === data.latest_version);
  const selectedHistoryRow = previewVersion != null ? data?.items.find(row => row.version === previewVersion) : undefined;
  const agreement = data?.agreement;
  const acceptance = data?.acceptance;

  // Determine which terms appear on the live right-hand paper sheet
  const sheetMode: "agreed" | "proposal" | "draft" = editing
    ? "draft"
    : selectedHistoryRow
      ? (agreement && agreement.snapshot.proposal_version === selectedHistoryRow.version ? "agreed" : "proposal")
      : agreement
        ? "agreed"
        : latest
          ? "proposal"
          : "draft";

  const sheetTerms: ProposalTerms = editing && liveDraftTerms
    ? liveDraftTerms
    : selectedHistoryRow
      ? selectedHistoryRow.terms
      : agreement
        ? agreement.snapshot.terms
        : latest
          ? latest.terms
          : data?.draft?.terms || sourceTerms;

  const sheetVersion = selectedHistoryRow?.version ?? agreement?.snapshot.proposal_version ?? latest?.version;

  return <section className="fl-prop-studio" aria-label="Collaboration proposals and agreement" aria-busy={loading}>
    <div className="fl-prop-topbar">
      <div className="fl-prop-tabs" role="tablist" aria-label="Agreement views">
        <button type="button" role="tab" aria-selected={tab === "agreement"} className="fl-prop-tab" data-active={tab === "agreement"} onClick={() => { setTab("agreement"); setPreviewVersion(null); }}>
          Agreement
        </button>
        <button type="button" role="tab" aria-selected={tab === "history"} className="fl-prop-tab" data-active={tab === "history"} onClick={() => { setTab("history"); setEditing(false); }}>
          History {data && <span className="fl-prop-tab-count">{data.total}</span>}
        </button>
      </div>
      <div className="fl-prop-top-actions">
        {data && !editing && !agreement && <button type="button" className="fl-prop-btn-secondary" onClick={() => { setNotice(""); setTab("agreement"); setPage(1); setEditing(true); }}>
          <FileEdit size={13} aria-hidden="true" /> {data.draft ? "Edit draft" : data.latest_version ? "Draft a revision" : "Draft proposal"}
        </button>}
        {data && !editing && !agreement && data.draft && <button type="button" className="fl-prop-btn-primary" disabled={data.draft.base_version !== data.latest_version} onClick={() => setReview(true)}>
          <Send size={13} aria-hidden="true" /> Review &amp; send
        </button>}
        <button type="button" className="fl-refresh-icon-btn" disabled={loading || editing || review} onClick={reload} title="Refresh proposals" aria-label="Refresh proposals">
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>
    </div>

    {notice && <p className="fl-prop-notice" role="status">{notice}</p>}
    {downloadError && <p role="alert">{downloadError}</p>}

    {loading ? <p role="status">Loading proposals…</p> : state?.error && !data ? <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry proposals</button></div> : data && (
      <div className="fl-prop-stack">
        <AgreementSheet
          collaboration={collaboration}
          terms={sheetTerms}
          mode={sheetMode}
          version={sheetVersion}
          agreementId={agreement?.id}
          agreedAt={agreement?.snapshot.agreed_at}
          acceptance={acceptance}
          onDownload={agreement ? () => void downloadAgreement() : undefined}
          downloading={downloading}
        />

        {tab === "agreement" && editing && !agreement && (
          <DraftEditor
            key={`${data.draft?.revision || 0}:${data.latest_version}`}
            path={path}
            draft={data.draft}
            version={data.latest_version}
            lockedCurrency={sourceTerms.currency}
            initial={{ ...(data.draft?.terms || data.items[0]?.terms || sourceTerms), currency: sourceTerms.currency }}
            onPreview={setLiveDraftTerms}
            onClose={() => { setEditing(false); setLiveDraftTerms(null); }}
            onSaved={() => saved("Private draft saved.")}
          />
        )}

        {tab === "agreement" && !editing && <>
          {(acceptance || agreement) ? (
            <section className="fl-prop-acceptance-card" data-agreed={Boolean(agreement)} aria-label="Proposal acceptance and agreement">
              <div className="fl-prop-acceptance-head">
                <h3>{agreement ? `Agreement confirmed · Version ${agreement.snapshot.proposal_version}` : `Mutual acceptance · Version ${acceptance?.version}`}</h3>
              </div>
              <p>{agreement
                ? "Both participants accepted these exact terms. Proposal editing is now locked, and deliveries are open."
                : "Both participants must explicitly accept the same version. Sending a proposal alone does not count as acceptance."}</p>
              <div className="fl-prop-signers">
                <div className="fl-prop-signer" data-signed={Boolean(acceptance?.brand_accepted_at)}>
                  {acceptance?.brand_accepted_at ? <CheckCircle2 size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
                  <div>
                    <strong>{collaboration.brand_name}</strong>
                    <span>{acceptance?.brand_accepted_at ? `Accepted ${new Date(acceptance.brand_accepted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Pending acceptance"}</span>
                  </div>
                </div>
                <div className="fl-prop-signer" data-signed={Boolean(acceptance?.creator_accepted_at)}>
                  {acceptance?.creator_accepted_at ? <CheckCircle2 size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
                  <div>
                    <strong>{collaboration.creator_name}</strong>
                    <span>{acceptance?.creator_accepted_at ? `Accepted ${new Date(acceptance.creator_accepted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Pending acceptance"}</span>
                  </div>
                </div>
              </div>
              {!agreement && (
                acceptance?.you_accepted
                  ? <p role="status">Your acceptance is saved. Waiting for the other participant to accept this version.</p>
                  : acceptance?.can_accept
                    ? <div className="fl-prop-acceptance-actions">
                      {latest
                        ? <button type="button" className="fl-prop-btn-primary" disabled={editing || review} onClick={() => setAccepting(true)}>Review &amp; accept version {latest.version}</button>
                        : <button type="button" className="fl-prop-btn-primary" disabled={editing || review} onClick={reload}>Review latest proposal</button>}
                    </div>
                    : <p role="status">The proposed delivery date has passed. Draft and send a revised proposal before accepting.</p>
              )}
            </section>
          ) : (
            <section className="fl-prop-acceptance-card">
              <h3>No proposal sent yet</h3>
              <p>Draft your proposed price, deliverables, delivery date, and usage rights, then send version 1 so both participants can review and accept.</p>
              <div><button type="button" className="fl-prop-btn-primary" onClick={() => { setNotice(""); setEditing(true); }}><FileEdit size={13} aria-hidden="true" /> Draft proposal</button></div>
            </section>
          )}

          {data.draft && !agreement && <div className="fl-prop-draft-banner">
            <div>
              <strong>Private draft saved</strong>
              <span>Only you can see this draft · updated {new Date(data.draft.updated_at).toLocaleString()}</span>
              {data.draft.base_version !== data.latest_version && <span role="status">A newer proposal was sent—review it, then update your draft before sending.</span>}
            </div>
            <div className="fl-prop-draft-banner-actions">
              <button type="button" className="fl-prop-btn-secondary" onClick={() => setEditing(true)}>Edit draft</button>
              <button type="button" className="fl-prop-btn-primary" disabled={data.draft.base_version !== data.latest_version} onClick={() => setReview(true)}>Review &amp; send</button>
            </div>
          </div>}
        </>}

        {tab === "history" && <div className="fl-prop-history-section">
          {!data.items.length ? <p>No sent proposal versions yet.</p> : <div className="fl-prop-history-list">
            {data.items.map(row => {
              const active = sheetVersion === row.version;
              return <button key={row.id} type="button" className="fl-prop-history-item" data-active={active} onClick={() => setPreviewVersion(row.version)}>
                <div>
                  <strong>Version {row.version} · {row.author_role === "brand" ? "Brand / client" : "Creator"}{row.is_mine ? " (you)" : ""}</strong>
                  <small>{new Date(row.created_at).toLocaleString()}</small>
                </div>
                <span className="fl-prop-history-amt">{row.terms.amount_cents == null ? "Not set" : campaignMoney(row.terms.amount_cents, row.terms.currency || "INR")}</span>
              </button>;
            })}
          </div>}
          {data.total > data.page_size && <nav className="fl-prop-history-pager" aria-label="Proposal history pages">
            <button type="button" disabled={page === 1} onClick={() => setPage(v => v - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span>
            <button type="button" disabled={page * data.page_size >= data.total} onClick={() => setPage(v => v + 1)}>Older</button>
          </nav>}
        </div>}
      </div>
    )}

    {review && !agreement && data?.draft && <SendDialog collaboration={collaboration} path={path} draft={data.draft} version={data.latest_version} onClose={() => setReview(false)} onSent={row => saved(`Proposal version ${row.version} sent. Both participants can review it.`)} />}
    {accepting && latest && <AcceptanceDialog collaboration={collaboration} collaborationId={collaboration.id} proposal={latest} onClose={() => setAccepting(false)} onAccepted={next => { setAccepting(false); onStatus?.(next.collaboration_status); saved(next.agreement ? "Both acceptances saved. Your shared agreement is ready." : "Your acceptance is saved. Waiting for the other participant."); }} />}
  </section>;
}

function DraftEditor({ path, draft, version, lockedCurrency, initial, onPreview, onClose, onSaved }: { path: string; draft: ProposalDraft | null; version: number; lockedCurrency: ProposalFields["currency"]; initial: ProposalTerms; onPreview: (terms: ProposalTerms) => void; onClose: () => void; onSaved: () => void }) {
  const [fields, setFields] = useState(() => ({ ...proposalFields(initial), currency: lockedCurrency })), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const saving = useRef(false);
  const dirty = JSON.stringify(fields) !== JSON.stringify({ ...proposalFields(initial), currency: lockedCurrency });

  useEffect(() => {
    try { onPreview(proposalPayload({ ...fields, currency: lockedCurrency })); } catch { /* Partial/typing input; keep previous valid preview. */ }
  }, [fields, lockedCurrency, onPreview]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function field<K extends keyof ProposalFields>(key: K, value: ProposalFields[K]) { setFields(previous => ({ ...previous, [key]: value })); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving.current) return;
    setError("");
    try {
      const terms = proposalPayload({ ...fields, currency: lockedCurrency }); saving.current = true; setBusy(true);
      await collaborationRequest(`${path}/draft`, { method: "PUT", body: JSON.stringify({ expected_revision: draft?.revision || 0, expected_latest_version: version, terms }) });
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save draft."); }
    finally { saving.current = false; setBusy(false); }
  }

  return <form className="fl-prop-form" onSubmit={save}>
    <h3>{draft ? "Edit private draft" : version ? "Draft a revised proposal" : "Draft proposal"}</h3>
    <p>Changes update the A4 agreement sheet above live. Save your draft, then review &amp; send.</p>
    <div className="fl-prop-form-row">
      <label>Price ({lockedCurrency}) *<input name="proposal-price" inputMode="decimal" placeholder="e.g. 15000" value={fields.amount} disabled={busy} onChange={e => field("amount", e.target.value)} /></label>
      <label>Currency<span>Locked by brand</span><input name="proposal-currency" value={lockedCurrency} readOnly disabled aria-label="Locked currency" /></label>
    </div>
    <div className="fl-prop-form-row">
      <label>Delivery date *<input name="proposal-date" type="date" value={fields.delivery_date} disabled={busy} onChange={e => field("delivery_date", e.target.value)} /></label>
      <label>Included revision rounds<input name="proposal-revision-limit" inputMode="numeric" maxLength={2} placeholder="0–20 (optional)" value={fields.revision_limit} disabled={busy} onChange={e => field("revision_limit", e.target.value)} /></label>
    </div>
    <label>Deliverables *<span>At least 5 characters required to send.</span><textarea name="proposal-deliverables" rows={3} maxLength={5000} value={fields.deliverables} disabled={busy} onChange={e => field("deliverables", e.target.value)} /></label>
    <label>Usage rights *<span>Required to send (min 5 chars) — where, how long, organic or paid use.</span><textarea name="proposal-rights" rows={3} maxLength={5000} placeholder="e.g. Organic social media use for 12 months" value={fields.usage_rights} disabled={busy} onChange={e => field("usage_rights", e.target.value)} /></label>
    <label>Proposal note (optional)<textarea name="proposal-note" rows={2} maxLength={2000} value={fields.note} disabled={busy} onChange={e => field("note", e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="fl-prop-form-foot">
      <button type="button" className="fl-prop-btn-secondary" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard your unsaved proposal edits?")) onClose(); }}>Cancel</button>
      <button type="submit" className="fl-prop-btn-primary" disabled={busy}>{busy ? "Saving draft…" : "Save private draft"}</button>
    </div>
  </form>;
}

function SendDialog({ collaboration, path, draft, version, onClose, onSent }: { collaboration: Collaboration; path: string; draft: ProposalDraft; version: number; onClose: () => void; onSent: (row: ProposalRevision) => void }) {
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
  return <dialog ref={ref} className="fl-doc-review-dialog" aria-labelledby="send-proposal-title" onCancel={event => { if (sending.current) event.preventDefault(); else onClose(); }}>
    <div className="fl-doc-review-head">
      <div>
        <h2 id="send-proposal-title">Review &amp; send proposal version {version + 1}</h2>
        <p>Both participants will see this exact document. Further edits will be saved as a new version.</p>
      </div>
      <button type="button" className="fl-doc-review-close" disabled={busy} aria-label="Close review" onClick={onClose}><X size={16} /></button>
    </div>
    <div className="fl-doc-review-body">
      <AgreementSheet collaboration={collaboration} terms={draft.terms} mode="proposal" version={version + 1} />
    </div>
    <div className="fl-doc-review-foot">
      {error ? <p role="alert" className="fl-doc-review-error">{error}</p> : <p>This sends proposed terms for review. Agreement and payment come later.</p>}
      <div className="fl-shared-actions">
        <button type="button" disabled={busy} onClick={onClose}>Keep draft</button>
        <button type="button" className="fl-prop-btn-primary" disabled={busy} onClick={send}>{busy ? "Sending proposal…" : `Send version ${version + 1}`}</button>
      </div>
    </div>
  </dialog>;
}
