"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock,
  Link2, LockKeyhole, MessageSquare, Package, Plus, RefreshCw, RotateCcw,
  Trash2, Upload, X,
} from "lucide-react";
import { DeliveryFilePicker, type DeliveryFile } from "./delivery-files";
import { CompletionDialog } from "./completion";
import { DeliveryContents } from "./delivery-contents";
import { DeliveryReviewDialog } from "./delivery-review";
import { DeliveryReviewStudio } from "./delivery-review-studio";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import { deliveryPayload, emptyDelivery, type Delivery, type DeliveryWorkspace, type DeliveryReviewAction } from "@/lib/deliveries";

export function CollaborationDeliveries({ collaborationId, status, viewerRole, onStatus, onOpenProposals, onFocusModeChange }: { collaborationId: string; status: Collaboration["status"]; viewerRole?: "brand" | "creator"; onStatus?: (status: Collaboration["status"]) => void; onOpenProposals?: () => void; onFocusModeChange?: (focused: boolean) => void }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [completing, setCompleting] = useState<Delivery | null>(null);
  const [reviewing, setReviewing] = useState<{ delivery: Delivery; action: DeliveryReviewAction; initialFeedback?: string } | null>(null);
  const [reviewMenuId, setReviewMenuId] = useState<string | null>(null);
  useEffect(() => {
    onFocusModeChange?.(Boolean(reviewMenuId));
    return () => { onFocusModeChange?.(false); };
  }, [reviewMenuId, onFocusModeChange]);
  const key = `${collaborationId}:${status}:${page}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: DeliveryWorkspace; error?: string } | null>(null);
  const loading = state?.key !== key, data = loading ? undefined : state?.data;
  const path = `/${collaborationId}/deliveries`;
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<DeliveryWorkspace>(`${path}?page=${page}&page_size=5`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setState({ key, data }); onStatus?.(data.collaboration_status); } })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load deliveries." }); });
    return () => controller.abort();
  }, [key, page, path, onStatus]);
  const reload = () => { setPage(1); setAttempt(value => value + 1); };
  const isBrand = (viewerRole || data?.viewer_role) === "brand" || Boolean(data?.can_review || data?.can_complete);
  const isCreator = (viewerRole || data?.viewer_role) === "creator" || Boolean(data?.can_submit);
  const subtitle = isBrand
    ? "Review submitted deliverables, request revisions, or approve final work."
    : isCreator
      ? "Submit your deliverables for brand review and keep earlier versions available."
      : "Submit and review versioned deliverables for this collaboration.";
  const latestRow = data?.items.find(row => row.version === data.latest_version);
  const currentStageLabel = data?.completion
    ? "Completed"
    : latestRow && latestRow.agreement_id !== data?.agreement_id
      ? "Fresh delivery required for current scope"
    : !data?.items.length
      ? "Awaiting submission"
      : !latestRow?.review
        ? "Awaiting review"
        : latestRow.review.decision === "approved"
          ? "Approved · ready to complete"
          : "Revisions requested";
  const rev = data?.revision_allowance;

  return <section className="fl-deliveries fl-collab-flat-section" aria-label="Delivery submissions" aria-busy={loading}>
    <header className="fl-collab-sec-head">
      <div><h2>Deliveries</h2><p>{subtitle}</p></div>
      <div className="fl-del-head-actions">
        {data?.can_submit && !editing && data.agreement_id && <button type="button" className="fl-collab-next-cta" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>
          <Upload size={14} aria-hidden="true" /> {data.latest_version ? `Submit version ${data.latest_version + 1}` : "New submission"}
        </button>}
        <button type="button" className="fl-refresh-icon-btn" title="Refresh deliveries" aria-label="Refresh deliveries" disabled={loading || editing || (Boolean(reviewing) || Boolean(completing))} onClick={() => { setNotice(""); reload(); }}><RefreshCw size={15} aria-hidden="true" /></button>
      </div>
    </header>
    {notice && <p className="fl-del-notice" role="status">{notice}</p>}
    {latestRow && latestRow.agreement_id !== data?.agreement_id && <p className="fl-del-notice" role="status">The scope changed. Earlier deliveries and approvals remain historical; submit and review fresh work against the current agreement.</p>}
    {loading ? <p role="status">Loading deliveries…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry deliveries</button></div> : data && (!data.agreement_id ? (
      <div className="fl-step-locked" role="status">
        <span className="fl-step-locked-icon" aria-hidden="true"><LockKeyhole size={20} /></span>
        <h3>Deliveries &amp; Review is locked</h3>
        <p>Both participants must review and accept the same proposal version before the creator can submit deliverables or the brand can review them.</p>
        {onOpenProposals && <button type="button" className="fl-collab-next-cta" onClick={onOpenProposals}>Go to Proposals &amp; Agreement <ArrowRight size={14} aria-hidden="true" /></button>}
      </div>
    ) : <div className="fl-del-body">
      {/* Compact 3-stat summary strip */}
      {!reviewMenuId && <div className="fl-collab-facts-strip fl-del-strip">
        <div>
          <small>Versions</small>
          <strong>{data.total} {data.total === 1 ? "submission" : "submissions"}</strong>
          <span>Earlier versions stay preserved</span>
        </div>
        <div>
          <small>Revision rounds</small>
          <strong>{!rev ? "Not set" : rev.limit === null ? `${rev.used} requested` : `${rev.used} of ${rev.limit} used`}</strong>
          <span>{!rev ? "Per agreed scope" : rev.limit === null ? "No fixed cap · written scope applies" : rev.remaining === 0 ? "Allowance used · approval still open" : `${rev.remaining} remaining`}</span>
        </div>
        <div>
          <small>Current status</small>
          <strong>{currentStageLabel}</strong>
          <span>{data.completion ? `Completed ${new Date(data.completion.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Review applies per version"}</span>
        </div>
      </div>}

      {data.completion && <div className="fl-del-completed-banner" role="status">
        <CheckCircle2 size={18} aria-hidden="true" />
        <div>
          <strong>Collaboration completed · Final work v{data.completion.version}</strong>
          <p>Completed by brand on {new Date(data.completion.completed_at).toLocaleString()}. Submissions and reviews are now closed.</p>
        </div>
      </div>}

      {/* Creator action callout when brand requested revisions on the latest version */}
      {!reviewMenuId && !editing && data.can_submit && latestRow?.review?.decision === "revisions_requested" && (
        <div className="fl-del-revision-callout" role="status">
          <div className="fl-del-revision-callout-copy">
            <div className="fl-del-revision-callout-head">
              <RotateCcw size={15} aria-hidden="true" />
              <strong>Revisions requested on v{latestRow.version}</strong>
            </div>
            {latestRow.review.feedback && <p>{latestRow.review.feedback}</p>}
          </div>
          <div className="fl-del-review-actions">
            <button type="button" className="fl-del-btn-neutral" onClick={() => setReviewMenuId(latestRow.id)}>
              <MessageSquare size={13} aria-hidden="true" /> View review notes
            </button>
            <button type="button" className="fl-collab-next-cta" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>
              <Upload size={14} aria-hidden="true" /> Submit version {latestRow.version + 1}
            </button>
          </div>
        </div>
      )}

      {completing && <CompletionDialog collaborationId={collaborationId} delivery={completing} onClose={() => setCompleting(null)} onSaved={receipt => { setCompleting(null); setNotice(`Collaboration completed with version ${receipt.version} as the final work.`); reload(); }} />}
      {reviewing && <DeliveryReviewDialog path={path} delivery={reviewing.delivery} action={reviewing.action} initialFeedback={reviewing.initialFeedback} onClose={() => setReviewing(null)} onSaved={receipt => { setReviewing(null); setNotice("Version " + receipt.version + ": " + (receipt.decision === "approved" ? "approved" : "revisions requested") + ". Both participants can view the decision."); reload(); }} />}

      {(() => {
        const activeReviewRow = reviewMenuId ? data.items.find(item => item.id === reviewMenuId) : null;
        if (activeReviewRow) {
          return <DeliveryReviewStudio
            collaborationId={collaborationId}
            delivery={activeReviewRow}
            isLatest={activeReviewRow.version === data.latest_version}
            canReview={data.can_review}
            canRequestRevision={data.can_request_revision}
            canComplete={data.can_complete}
            canSubmit={data.can_submit}
            viewerRole={isBrand ? "brand" : "creator"}
            onBack={() => setReviewMenuId(null)}
            onStartReview={(action, prefillFeedback) => setReviewing({ delivery: activeReviewRow, action, initialFeedback: prefillFeedback })}
            onStartComplete={() => setCompleting(activeReviewRow)}
            onStartSubmit={() => { setReviewMenuId(null); setPage(1); setNotice(""); setEditing(true); }}
          />;
        }
        const showEditor = editing && data.can_submit && Boolean(data.agreement_id);
        if (!data.items.length && !showEditor) {
          return <div className="fl-step-locked">
            <span className="fl-step-locked-icon" aria-hidden="true"><Package size={20} /></span>
            <h3>{page > 1 ? "No submissions on this page" : "No deliverables submitted yet"}</h3>
            <p>{data.can_submit
              ? "Upload private files or share preview HTTPS links for your brand to review."
              : "Once the creator submits files or preview links, each version will appear here for your review."}</p>
            {data.can_submit && <button type="button" className="fl-collab-next-cta" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>
              <Upload size={14} aria-hidden="true" /> Submit version 1
            </button>}
          </div>;
        }

        return <div className="fl-del-timeline" aria-label="Delivery version timeline">
          {showEditor && data.agreement_id && (
            <div className="fl-del-tl-item" data-tone="draft" data-last={data.items.length === 0}>
              <div className="fl-del-tl-rail" aria-hidden="true">
                <span className="fl-del-tl-node" data-tone="draft">v{data.latest_version + 1}</span>
                {data.items.length > 0 && <span className="fl-del-tl-line" />}
              </div>
              <div className="fl-del-tl-content">
                <DeliveryEditor
                  key={`${data.agreement_id}:${data.latest_version}`}
                  path={path}
                  agreementId={data.agreement_id}
                  version={data.latest_version}
                  onClose={() => setEditing(false)}
                  onSubmitted={row => { setEditing(false); setNotice(`Delivery version ${row.version} submitted. Both participants can view it.`); reload(); }}
                />
              </div>
            </div>
          )}

          {data.items.map((row, idx) => {
            const isLatest = row.version === data.latest_version;
            const isLast = idx === data.items.length - 1;
            const minimal = showEditor || !isLatest;
            const badge = row.review
              ? row.review.decision === "approved"
                ? { text: "Approved", tone: "good" as const }
                : { text: "Revisions requested", tone: "warn" as const }
              : isLatest
                ? { text: "Awaiting review", tone: "warn" as const }
                : { text: "Earlier version", tone: "muted" as const };
            const nodeTone = row.review
              ? row.review.decision === "approved" ? "good" : "warn"
              : isLatest ? "active" : "muted";
            const fileCount = row.files?.length ?? 0;
            const linkCount = row.links?.length ?? 0;
            const assetHint = [
              fileCount ? `${fileCount} ${fileCount === 1 ? "file" : "files"}` : "",
              linkCount ? `${linkCount} ${linkCount === 1 ? "link" : "links"}` : "",
            ].filter(Boolean).join(" · ");

            return <div key={`${row.id}:${showEditor ? "min" : "std"}`} className="fl-del-tl-item" data-tone={nodeTone} data-last={isLast}>
              <div className="fl-del-tl-rail" aria-hidden="true">
                <span className="fl-del-tl-node" data-tone={nodeTone} data-latest={isLatest && !showEditor}>v{row.version}</span>
                {!isLast && <span className="fl-del-tl-line" />}
              </div>
              <div className="fl-del-tl-content">
                <details id={`delivery-${row.id}`} className="fl-del-card" data-minimal={minimal} open={!showEditor && page === 1 && isLatest}>
                  <summary className="fl-del-card-summary">
                    <span className="fl-del-card-title">
                      <strong>{row.title}</strong>
                      <small>
                        {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(Date.parse(row.submitted_at))}
                        {assetHint ? ` · ${assetHint}` : ""}
                      </small>
                    </span>
                    <span className="fl-collab-pill" data-tone={badge.tone}>{badge.text}</span>
                    <ChevronDown size={15} className="fl-del-chevron" aria-hidden="true" />
                  </summary>

                  <div className="fl-del-card-body">
                    <DeliveryContents value={row} collaborationId={collaborationId} hideTitle />

                    <div className="fl-del-review-box" data-decision={row.review?.decision || "pending"}>
                      {row.review ? (
                        <div className="fl-del-review-decision">
                          <div className="fl-del-review-decision-head">
                            {row.review.decision === "approved"
                              ? <CheckCircle2 size={15} aria-hidden="true" />
                              : <RotateCcw size={15} aria-hidden="true" />}
                            <strong>{row.review.decision === "approved" ? "Approved by brand" : "Revisions requested"}</strong>
                            <span>· {new Date(row.review.reviewed_at).toLocaleString()}</span>
                          </div>
                          {row.review.feedback && <p className="fl-delivery-notes">{row.review.feedback}</p>}
                          {isLatest && row.review.decision === "revisions_requested" && data.can_submit && (
                            <p className="fl-del-review-hint">Address the requested changes above, then submit version {row.version + 1}.</p>
                          )}
                        </div>
                      ) : (
                        <div className="fl-del-review-pending">
                          <Clock size={14} aria-hidden="true" />
                          <span>{isLatest ? "Awaiting brand review for this version." : "Earlier version · no review recorded."}</span>
                        </div>
                      )}

                      <div className="fl-del-review-actions">
                        <button
                          type="button"
                          className={data.can_review && isLatest && !row.review ? "fl-collab-next-cta" : "fl-del-btn-neutral"}
                          onClick={() => setReviewMenuId(row.id)}
                        >
                          <MessageSquare size={13} aria-hidden="true" />
                          {data.can_review && isLatest && !row.review ? `Review v${row.version}` : "Review notes"}
                        </button>

                        {data.can_complete && isLatest && row.review?.decision === "approved" && (
                          <button type="button" className="fl-collab-next-cta" onClick={() => setCompleting(row)}>
                            <CheckCircle2 size={14} aria-hidden="true" /> Complete collaboration
                          </button>
                        )}

                        {data.can_review && isLatest && !row.review && (
                          <>
                            <button type="button" className="fl-del-btn-warn" disabled={!data.can_request_revision} onClick={() => setReviewing({ delivery: row, action: "request_revision" })}>
                              <RotateCcw size={13} aria-hidden="true" /> Request revisions
                            </button>
                            <button type="button" className="fl-del-btn-neutral" onClick={() => setReviewing({ delivery: row, action: "approve" })}>
                              <CheckCircle2 size={14} aria-hidden="true" /> Approve v{row.version}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>;
          })}
        </div>;
      })()}

      {!reviewMenuId && data.total > data.page_size && <nav className="fl-collab-pagination" aria-label="Delivery history pages">
        <button type="button" disabled={page === 1 || editing || Boolean(reviewing) || Boolean(completing)} onClick={() => { setNotice(""); setPage(value => value - 1); }}>
          <ChevronLeft size={14} aria-hidden="true" /> Previous
        </button>
        <span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span>
        <button type="button" disabled={editing || Boolean(reviewing) || Boolean(completing) || page * data.page_size >= data.total} onClick={() => { setNotice(""); setPage(value => value + 1); }}>
          Next <ChevronRight size={14} aria-hidden="true" />
        </button>
      </nav>}
    </div>)}
  </section>;
}
function DeliveryEditor({ path, agreementId, version, onClose, onSubmitted }: { path: string; agreementId: string; version: number; onClose: () => void; onSubmitted: (row: Delivery) => void }) {
  const [fields, setFields] = useState<{ title: string; notes: string; links: { label: string; url: string }[] }>(() => ({
    ...emptyDelivery(),
    links: [],
  }));
  const [error, setError] = useState(""), [review, setReview] = useState<ReturnType<typeof deliveryPayload> | null>(null);
  const [files, setFiles] = useState<DeliveryFile[]>([]), [uploadBusy, setUploadBusy] = useState(false);
  const dirty = files.length > 0 || uploadBusy || Boolean(fields.title.trim() || fields.notes.trim() || fields.links.some(l => l.label.trim() || l.url.trim()));
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey) return;
      if (!window.confirm("Discard your unsubmitted delivery details?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  function linkField(index: number, key: "label" | "url", value: string) { setFields(old => ({ ...old, links: old.links.map((link, i) => i === index ? { ...link, [key]: value } : link) })); }
  function reviewSubmission(event: React.FormEvent) { event.preventDefault(); setError(""); try { setReview(deliveryPayload({ ...fields, links: fields.links.filter(link => link.label.trim() || link.url.trim()) }, files.map(file => file.id))); } catch (error) { setError(error instanceof Error ? error.message : "Check the delivery details."); } }

  return <form className="fl-del-editor" onSubmit={reviewSubmission}>
    <header className="fl-del-editor-head">
      <div>
        <div className="fl-del-editor-title">
          <span className="fl-del-version-badge" data-latest="true">v{version + 1}</span>
          <h3>Prepare version {version + 1}</h3>
        </div>
        <p>Nothing is shared until you confirm submission. Earlier versions remain preserved.</p>
      </div>
      <button
        type="button"
        className="fl-icon-btn"
        disabled={uploadBusy}
        title="Close editor"
        aria-label="Close editor"
        onClick={() => { if (!dirty || window.confirm("Discard your unsubmitted delivery details?")) onClose(); }}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </header>

    <div className="fl-del-editor-fields">
      <label className="fl-del-field">
        <span>Delivery title</span>
        <input
          name="delivery-title"
          maxLength={160}
          placeholder={version === 0 ? "e.g. Launch Reel — First Cut" : `e.g. Revised Cut — v${version + 1}`}
          value={fields.title}
          onChange={event => setFields(old => ({ ...old, title: event.target.value }))}
        />
      </label>

      <label className="fl-del-field">
        <span>Notes for brand <small>(optional)</small></span>
        <textarea
          name="delivery-notes"
          rows={3}
          maxLength={5000}
          placeholder={version === 0 ? "Share context, music credits, caption ideas, or anything the brand should know…" : "Summarize what changed in this version…"}
          value={fields.notes}
          onChange={event => setFields(old => ({ ...old, notes: event.target.value }))}
        />
      </label>

      <DeliveryFilePicker collaborationId={path.split("/")[1]} agreementId={agreementId} selected={files} onChange={setFiles} onBusy={setUploadBusy} />

      <div className="fl-del-links-sec">
        <div className="fl-del-picker-head">
          <div>
            <strong>External links <small>(optional)</small></strong>
            <span>Share Google Drive, Dropbox, Frame.io, or preview HTTPS links alongside or instead of uploaded files.</span>
          </div>
          <button
            type="button"
            className="fl-del-btn-neutral"
            disabled={fields.links.length >= 10}
            onClick={() => setFields(old => ({ ...old, links: [...old.links, { label: "", url: "" }] }))}
          >
            <Plus size={13} aria-hidden="true" /> Add link
          </button>
        </div>

        {fields.links.length > 0 && (
          <div className="fl-del-links-list">
            {fields.links.map((link, index) => (
              <div key={index} className="fl-del-link-row">
                <Link2 size={14} className="fl-del-link-icon" aria-hidden="true" />
                <input
                  name={`delivery-label-${index}`}
                  aria-label={`Link ${index + 1} label`}
                  placeholder="Label (e.g. Raw 4K folder)"
                  maxLength={80}
                  value={link.label}
                  onChange={event => linkField(index, "label", event.target.value)}
                />
                <input
                  name={`delivery-url-${index}`}
                  aria-label={`Link ${index + 1} HTTPS URL`}
                  inputMode="url"
                  placeholder="https://…"
                  maxLength={2048}
                  value={link.url}
                  onChange={event => linkField(index, "url", event.target.value)}
                />
                <button
                  type="button"
                  className="fl-rev-tool-btn fl-rev-tool-danger"
                  title={`Remove link ${index + 1}`}
                  aria-label={`Remove link ${index + 1}`}
                  onClick={() => setFields(old => ({ ...old, links: old.links.filter((_, i) => i !== index) }))}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {error && <p className="fl-rev-composer-err" role="alert">{error}</p>}

    <footer className="fl-del-editor-foot">
      <button
        type="button"
        className="fl-del-btn-neutral"
        disabled={uploadBusy}
        onClick={() => { if (!dirty || window.confirm("Discard your unsubmitted delivery details?")) onClose(); }}
      >
        Cancel
      </button>
      <button type="submit" className="fl-collab-next-cta" disabled={uploadBusy}>
        <Upload size={14} aria-hidden="true" /> Review &amp; submit v{version + 1}
      </button>
    </footer>

    {review && <SubmissionDialog path={path} agreementId={agreementId} version={version} files={files} payload={review} onClose={() => setReview(null)} onSubmitted={onSubmitted} />}
  </form>;
}
function SubmissionDialog({ path, agreementId, version, files, payload, onClose, onSubmitted }: { path: string; agreementId: string; version: number; files: DeliveryFile[]; payload: ReturnType<typeof deliveryPayload>; onClose: () => void; onSubmitted: (row: Delivery) => void }) {
  const ref = useRef<HTMLDialogElement>(null), sending = useRef(false), requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  async function submit() {
    if (sending.current) return; sending.current = true; requestId.current ||= crypto.randomUUID(); setBusy(true); setError("");
    try {
      const row = await collaborationRequest<Delivery>(path, { method: "POST", body: JSON.stringify({ ...payload, agreement_id: agreementId, expected_latest_version: version, request_id: requestId.current }) });
      onSubmitted(row);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not submit delivery. Please retry."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog fl-del-submit-dialog" aria-labelledby="submit-delivery-title" onCancel={event => { if (sending.current) event.preventDefault(); else onClose(); }}>
    <div className="fl-del-dialog-head">
      <div>
        <h2 id="submit-delivery-title">Submit delivery version {version + 1}?</h2>
        <p>These files, links, and notes will be shared with the brand for review.</p>
      </div>
      <button type="button" className="fl-icon-btn" disabled={busy} onClick={onClose} aria-label="Close">
        <X size={15} aria-hidden="true" />
      </button>
    </div>
    <div className="fl-del-dialog-preview">
      <DeliveryContents value={{ ...payload, files }} />
    </div>
    {error && <p className="fl-rev-composer-err" role="alert">{error} If another version was saved, keep editing, close the editor and refresh deliveries to review it.</p>}
    <div className="fl-del-dialog-foot">
      <button type="button" className="fl-del-btn-neutral" disabled={busy} onClick={onClose}>Keep editing</button>
      <button type="button" className="fl-collab-next-cta" disabled={busy} onClick={submit}>
        <Upload size={14} aria-hidden="true" /> {busy ? "Submitting…" : `Submit version ${version + 1}`}
      </button>
    </div>
  </dialog>;
}
