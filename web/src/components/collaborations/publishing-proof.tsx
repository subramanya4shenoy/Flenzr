"use client";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock,
  Link2, LockKeyhole, Plus, RefreshCw, Trash2, Upload, X,
} from "lucide-react";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import type { Delivery } from "@/lib/deliveries";
import { proofPayload, type ProofFields, type ProofWorkspace, type PublishingProof } from "@/lib/publishing-proof";
import { ProofConfirmationDialog } from "./proof-confirmation";
import { DeliveryContents } from "./delivery-contents";

export function CollaborationProof({ collaborationId, status, onConfirmedChange }: { collaborationId: string; status: Collaboration["status"]; onConfirmedChange?: (confirmed: boolean) => void }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState<PublishingProof | null>(null);
  const key = `${collaborationId}:${status}:${page}:${attempt}`, path = `/${collaborationId}/publishing-proof`;
  const [state, setState] = useState<{ key: string; data?: ProofWorkspace; error?: string } | null>(null);
  const loading = state?.key !== key, data = loading ? undefined : state?.data;

  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ProofWorkspace>(`${path}?page=${page}&page_size=5`, { signal: controller.signal })
      .then(res => {
        if (!controller.signal.aborted) {
          setState({ key, data: res });
          const latestItem = res.items.find(row => row.version === res.latest_proof_version) ?? res.items[0];
          onConfirmedChange?.(Boolean(res.latest_proof_version > 0 && latestItem?.version === res.latest_proof_version && latestItem?.agreement_id === res.current_agreement_id && latestItem?.delivery_id === res.eligible_delivery?.id && latestItem?.confirmation));
        }
      })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load publishing proof." }); });
    return () => controller.abort();
  }, [path, page, key, onConfirmedChange]);

  const reload = () => { setPage(1); setAttempt(value => value + 1); };
  const latest = data?.items.find(row => row.version === data.latest_proof_version) ?? data?.items[0];
  const subtitle = data?.can_publish
    ? "Record live post links for your approved deliverables."
    : data?.can_confirm
      ? "Review and confirm the creator’s live published post links."
      : "Final post links provided by the creator, separate from preview submissions.";
  const confirmationLabel = latest && (latest.agreement_id !== data?.current_agreement_id || latest.delivery_id !== data?.eligible_delivery?.id) ? "Historical proof" : !data?.items.length
    ? "Not recorded yet"
    : latest?.confirmation
      ? "Confirmed by brand"
      : "Awaiting confirmation";

  return <section className="fl-publishing-proof fl-collab-flat-section" aria-label="Publishing proof" aria-busy={loading}>
    <header className="fl-collab-sec-head">
      <div><h2>Publishing proof</h2><p>{subtitle}</p></div>
      <div className="fl-del-head-actions">
        {data?.can_publish && data.eligible_delivery && !editing && (
          <button type="button" className="fl-collab-next-cta" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>
            <Upload size={14} aria-hidden="true" /> {data.latest_proof_version ? `Update proof (v${data.latest_proof_version + 1})` : "Record proof"}
          </button>
        )}
        <button
          type="button"
          className="fl-refresh-icon-btn"
          title="Refresh publishing proof"
          aria-label="Refresh publishing proof"
          disabled={loading || editing || Boolean(confirming)}
          onClick={() => { setNotice(""); reload(); }}
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>
    </header>

    {notice && <p className="fl-del-notice" role="status">{notice}</p>}

    {loading ? (
      <p role="status">Loading publishing proof…</p>
    ) : state?.error ? (
      <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry publishing proof</button></div>
    ) : data && (!data.eligible_delivery && !data.items.length ? (
      <div className="fl-step-locked" role="status">
        <span className="fl-step-locked-icon" aria-hidden="true"><LockKeyhole size={20} /></span>
        <h3>Publishing Proof is locked</h3>
        <p>The latest delivery version must be approved by the brand before live post links can be recorded here.</p>
      </div>
    ) : <div className="fl-del-body">
      {/* Compact 3-stat summary strip */}
      <div className="fl-collab-facts-strip fl-del-strip">
        <div>
          <small>Approved delivery</small>
          <strong>{data.eligible_delivery ? `v${data.eligible_delivery.version} · ${data.eligible_delivery.title}` : "Awaiting approval"}</strong>
          <span>{data.eligible_delivery ? "Eligible for live post links" : "Approve latest delivery to record new proof"}</span>
        </div>
        <div>
          <small>Proof versions</small>
          <strong>{data.total} {data.total === 1 ? "version" : "versions"}</strong>
          <span>Earlier proof links stay preserved</span>
        </div>
        <div>
          <small>Confirmation</small>
          <strong>{confirmationLabel}</strong>
          <span>{latest?.confirmation ? `Confirmed ${new Date(latest.confirmation.confirmed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Applies to latest proof version"}</span>
        </div>
      </div>

      {confirming && (
        <ProofConfirmationDialog
          path={path}
          proof={confirming}
          onClose={() => setConfirming(null)}
          onSaved={receipt => {
            setConfirming(null);
            setNotice(`Proof version ${receipt.proof_version} confirmed. Both participants can view the confirmation.`);
            reload();
          }}
        />
      )}

      {(() => {
        const showEditor = editing && data.can_publish && Boolean(data.eligible_delivery);
        if (!data.items.length && !showEditor) {
          return <div className="fl-step-locked">
            <span className="fl-step-locked-icon" aria-hidden="true"><Link2 size={20} /></span>
            <h3>{page > 1 ? "No proof on this page" : "No publishing proof recorded yet"}</h3>
            <p>{data.can_publish
              ? "Add the live HTTPS URLs of your published posts so the brand can verify and confirm them."
              : "Once the creator publishes the approved work and records live post links, they will appear here for confirmation."}</p>
            {data.can_publish && data.eligible_delivery && (
              <button type="button" className="fl-collab-next-cta" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>
                <Upload size={14} aria-hidden="true" /> Record publishing proof
              </button>
            )}
          </div>;
        }

        return <div className="fl-del-timeline" aria-label="Publishing proof timeline">
          {showEditor && data.eligible_delivery && (
            <div className="fl-del-tl-item" data-tone="draft" data-last={data.items.length === 0}>
              <div className="fl-del-tl-rail" aria-hidden="true">
                <span className="fl-del-tl-node" data-tone="draft">p{data.latest_proof_version + 1}</span>
                {data.items.length > 0 && <span className="fl-del-tl-line" />}
              </div>
              <div className="fl-del-tl-content">
                <ProofEditor
                  key={`${data.latest_proof_version}:${data.eligible_delivery.id}`}
                  path={path}
                  delivery={data.eligible_delivery}
                  version={data.latest_proof_version}
                  initial={page === 1 && latest?.delivery_id === data.eligible_delivery.id
                    ? { notes: latest.notes, links: latest.links.map(link => ({ ...link })) }
                    : { notes: "", links: [{ label: "", url: "" }] }}
                  onClose={() => setEditing(false)}
                  onSaved={receipt => {
                    setEditing(false);
                    setNotice(`Publishing proof version ${receipt.version} saved for delivery version ${receipt.delivery_version}. Both participants can view it.`);
                    reload();
                  }}
                />
              </div>
            </div>
          )}

          {data.items.map((row, idx) => {
            const isLatest = row.version === data.latest_proof_version && row.agreement_id === data.current_agreement_id && row.delivery_id === data.eligible_delivery?.id;
            const isLast = idx === data.items.length - 1;
            const minimal = showEditor || !isLatest;
            const badge = row.confirmation
              ? { text: isLatest ? "Confirmed" : "Confirmed · earlier", tone: "good" as const }
              : isLatest
                ? { text: "Awaiting confirmation", tone: "warn" as const }
                : { text: "Earlier proof", tone: "muted" as const };
            const nodeTone = row.confirmation ? "good" : isLatest ? "active" : "muted";
            const linkCount = row.links.length;

            return <div key={`${row.id}:${showEditor ? "min" : "std"}`} className="fl-del-tl-item" data-tone={nodeTone} data-last={isLast}>
              <div className="fl-del-tl-rail" aria-hidden="true">
                <span className="fl-del-tl-node" data-tone={nodeTone} data-latest={isLatest && !showEditor}>p{row.version}</span>
                {!isLast && <span className="fl-del-tl-line" />}
              </div>
              <div className="fl-del-tl-content">
                <details className="fl-del-card" data-minimal={minimal} open={!showEditor && page === 1 && isLatest}>
                  <summary className="fl-del-card-summary">
                    <span className="fl-del-card-title">
                      <strong>Live post links · for delivery v{row.delivery_version}</strong>
                      <small>
                        {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(Date.parse(row.saved_at))}
                        {` · ${linkCount} ${linkCount === 1 ? "link" : "links"}`}
                      </small>
                    </span>
                    <span className="fl-collab-pill" data-tone={badge.tone}>{badge.text}</span>
                    <ChevronDown size={15} className="fl-del-chevron" aria-hidden="true" />
                  </summary>

                  <div className="fl-del-card-body">
                    <DeliveryContents value={{ title: `Final links · delivery version ${row.delivery_version}`, notes: row.notes, links: row.links }} hideTitle />

                    <div className="fl-del-review-box" data-decision={row.confirmation ? "approved" : "pending"}>
                      {row.confirmation ? (
                        <div className="fl-del-review-decision">
                          <div className="fl-del-review-decision-head">
                            <CheckCircle2 size={15} aria-hidden="true" />
                            <strong>{isLatest ? "Proof confirmed by brand" : "Confirmed · earlier proof"}</strong>
                            <span>· {new Date(row.confirmation.confirmed_at).toLocaleString()}</span>
                          </div>
                          <p className="fl-del-review-hint">Applies to proof v{row.version} for delivery v{row.delivery_version}.</p>
                        </div>
                      ) : (
                        <div className="fl-del-review-pending">
                          <Clock size={14} aria-hidden="true" />
                          <span>{isLatest ? "Awaiting brand confirmation for these live links." : "Earlier proof · no confirmation recorded."}</span>
                        </div>
                      )}

                      {data.can_confirm && isLatest && !row.confirmation && (
                        <div className="fl-del-review-actions">
                          <button type="button" className="fl-collab-next-cta" onClick={() => setConfirming(row)}>
                            <CheckCircle2 size={14} aria-hidden="true" /> Review &amp; confirm proof v{row.version}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            </div>;
          })}
        </div>;
      })()}

      {!editing && data.total > data.page_size && (
        <nav className="fl-collab-pagination" aria-label="Publishing proof pages">
          <button type="button" disabled={Boolean(confirming) || page === 1} onClick={() => setPage(value => value - 1)}>
            <ChevronLeft size={14} aria-hidden="true" /> Previous
          </button>
          <span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span>
          <button type="button" disabled={Boolean(confirming) || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>
            Next <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>)}
  </section>;
}

function ProofEditor({ path, delivery, version, initial, onClose, onSaved }: { path: string; delivery: Delivery; version: number; initial: ProofFields; onClose: () => void; onSaved: (row: PublishingProof) => void }) {
  const [fields, setFields] = useState(initial), [error, setError] = useState(""), [review, setReview] = useState<ReturnType<typeof proofPayload> | null>(null);
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey) return;
      if (!window.confirm("Discard your unsaved publishing links?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);

  function link(index: number, key: "label" | "url", value: string) {
    setFields(old => ({ ...old, links: old.links.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }

  return <form
    className="fl-del-editor"
    onSubmit={event => {
      event.preventDefault();
      setError("");
      try { setReview(proofPayload(fields)); }
      catch (err) { setError(err instanceof Error ? err.message : "Check these links."); }
    }}
  >
    <header className="fl-del-editor-head">
      <div>
        <div className="fl-del-editor-title">
          <span className="fl-del-version-badge" data-latest="true">p{version + 1}</span>
          <h3>Final post links · delivery v{delivery.version}</h3>
        </div>
        <p>Add the live HTTPS URLs for your published posts. Updates are saved as a new proof version.</p>
      </div>
      <button
        type="button"
        className="fl-icon-btn"
        title="Close editor"
        aria-label="Close editor"
        onClick={() => { if (!dirty || window.confirm("Discard your unsaved publishing links?")) onClose(); }}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </header>

    <div className="fl-del-editor-fields">
      <div className="fl-del-links-sec">
        <div className="fl-del-picker-head">
          <div>
            <strong>Published post links</strong>
            <span>Include Instagram Reels, YouTube videos, Stories, TikToks, or blog post URLs (up to 10).</span>
          </div>
          <button
            type="button"
            className="fl-del-btn-neutral"
            disabled={fields.links.length >= 10}
            onClick={() => setFields(old => ({ ...old, links: [...old.links, { label: "", url: "" }] }))}
          >
            <Plus size={13} aria-hidden="true" /> Add post link
          </button>
        </div>

        <div className="fl-del-links-list">
          {fields.links.map((item, index) => (
            <div key={index} className="fl-del-link-row">
              <Link2 size={14} className="fl-del-link-icon" aria-hidden="true" />
              <input
                name={`proof-label-${index}`}
                aria-label={`Post ${index + 1} label`}
                placeholder="Label (e.g. Instagram Reel)"
                maxLength={80}
                value={item.label}
                onChange={event => link(index, "label", event.target.value)}
              />
              <input
                name={`proof-url-${index}`}
                aria-label={`Post ${index + 1} HTTPS URL`}
                inputMode="url"
                placeholder="https://instagram.com/reel/…"
                maxLength={2048}
                value={item.url}
                onChange={event => link(index, "url", event.target.value)}
              />
              {fields.links.length > 1 && (
                <button
                  type="button"
                  className="fl-rev-tool-btn fl-rev-tool-danger"
                  title={`Remove post ${index + 1}`}
                  aria-label={`Remove post ${index + 1}`}
                  onClick={() => setFields(old => ({ ...old, links: old.links.filter((_, i) => i !== index) }))}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <label className="fl-del-field">
        <span>Notes <small>(optional)</small></span>
        <textarea
          name="proof-notes"
          rows={3}
          maxLength={5000}
          placeholder="Add publishing time, campaign hashtags used, or any context for the brand…"
          value={fields.notes}
          onChange={event => setFields(old => ({ ...old, notes: event.target.value }))}
        />
      </label>
    </div>

    {error && <p className="fl-rev-composer-err" role="alert">{error}</p>}

    <footer className="fl-del-editor-foot">
      <button
        type="button"
        className="fl-del-btn-neutral"
        onClick={() => { if (!dirty || window.confirm("Discard your unsaved publishing links?")) onClose(); }}
      >
        Cancel
      </button>
      <button type="submit" className="fl-collab-next-cta">
        <Upload size={14} aria-hidden="true" /> Review &amp; save proof v{version + 1}
      </button>
    </footer>

    {review && <ProofDialog path={path} delivery={delivery} version={version} payload={review} onClose={() => setReview(null)} onSaved={onSaved} />}
  </form>;
}

function ProofDialog({ path, delivery, version, payload, onClose, onSaved }: { path: string; delivery: Delivery; version: number; payload: ReturnType<typeof proofPayload>; onClose: () => void; onSaved: (row: PublishingProof) => void }) {
  const ref = useRef<HTMLDialogElement>(null), saving = useRef(false), requestId = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0), [state, setState] = useState<{ attempt: number; ready?: boolean; error?: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const loading = state?.attempt !== attempt;

  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ProofWorkspace>(path + "?page=1&page_size=1", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (!data.can_publish || data.eligible_delivery?.id !== delivery.id || data.eligible_delivery.review?.id !== delivery.review?.id || data.latest_proof_version !== version) {
        setState({ attempt, error: "The approved delivery or saved proof changed. Close the editor and refresh publishing proof before recording an update." });
      } else {
        setState({ attempt, ready: true });
      }
    }).catch(err => {
      if (!controller.signal.aborted) setState({ attempt, error: err instanceof Error ? err.message : "Could not check current proof." });
    });
    return () => controller.abort();
  }, [path, delivery.id, delivery.review?.id, version, attempt]);

  async function save() {
    if (saving.current || !state?.ready || !delivery.review) return;
    saving.current = true; requestId.current ||= crypto.randomUUID(); setBusy(true); setError("");
    try {
      onSaved(await collaborationRequest<PublishingProof>(path, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          request_id: requestId.current,
          delivery_id: delivery.id,
          review_id: delivery.review.id,
          expected_delivery_version: delivery.version,
          expected_latest_proof_version: version,
        }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save publishing proof. Please retry.");
    } finally {
      saving.current = false; setBusy(false);
    }
  }

  return <dialog ref={ref} className="fl-shared-dialog fl-del-submit-dialog" aria-labelledby="proof-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}>
    <div className="fl-del-dialog-head">
      <div>
        <h2 id="proof-title">Save publishing proof v{version + 1}?</h2>
        <p>Live post links for approved delivery v{delivery.version} will be shared with the brand.</p>
      </div>
      <button type="button" className="fl-icon-btn" disabled={busy} onClick={onClose} aria-label="Close">
        <X size={15} aria-hidden="true" />
      </button>
    </div>

    <div className="fl-del-dialog-preview">
      {loading ? (
        <p role="status">Checking the approved delivery and proof history…</p>
      ) : state?.error ? (
        <div role="alert">
          <p className="fl-rev-composer-err">{state.error}</p>
          <button type="button" className="fl-del-btn-neutral" onClick={() => setAttempt(value => value + 1)}>Reload proof check</button>
        </div>
      ) : (
        <DeliveryContents value={{ ...payload, title: `Final post links · approved delivery v${delivery.version}` }} hideTitle />
      )}
      {error && <p className="fl-rev-composer-err" role="alert">{error}</p>}
    </div>

    <div className="fl-del-dialog-foot">
      <button type="button" className="fl-del-btn-neutral" disabled={busy} onClick={onClose}>Keep editing</button>
      {!loading && state?.ready && (
        <button type="button" className="fl-collab-next-cta" disabled={busy} onClick={save}>
          <Upload size={14} aria-hidden="true" /> {busy ? "Saving…" : `Save proof v${version + 1}`}
        </button>
      )}
    </div>
  </dialog>;
}
