"use client";
import { useEffect, useRef, useState } from "react";
import { RevisionAllowance } from "./revision-allowance";
import { CompletionDialog } from "./completion";
import { DeliveryContents } from "./delivery-contents";
import { DeliveryReviewDialog } from "./delivery-review";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import { deliveryPayload, emptyDelivery, type Delivery, type DeliveryWorkspace, type DeliveryReviewAction } from "@/lib/deliveries";

export function CollaborationDeliveries({ collaborationId, status, onStatus }: { collaborationId: string; status: Collaboration["status"]; onStatus?: (status: Collaboration["status"]) => void }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [completing, setCompleting] = useState<Delivery | null>(null);
  const [reviewing, setReviewing] = useState<{ delivery: Delivery; action: DeliveryReviewAction } | null>(null);
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
  return <section className="fl-deliveries" aria-label="Delivery submissions" aria-busy={loading}>
    <header><div><h2>Deliveries</h2><p>Share work with your collaborator and keep earlier versions available.</p></div><button type="button" disabled={loading || editing || (Boolean(reviewing) || Boolean(completing))} onClick={() => { setNotice(""); reload(); }}>Refresh deliveries</button></header>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading deliveries…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry deliveries</button></div> : data && <>
      {data.completion && <div className="fl-completion-receipt" role="status"><h3>Collaboration completed</h3><p>Completed by brand / client · {new Date(data.completion.completed_at).toLocaleString()}</p><p>Final approved work: version {data.completion.version}. Submissions and reviews are closed. The agreement and history remain available.</p><a href={`#delivery-${data.completion.delivery_id}`} onClick={() => { setPage(1); }}>View final work ↓</a></div>}
      {completing && <CompletionDialog collaborationId={collaborationId} delivery={completing} onClose={() => setCompleting(null)} onSaved={receipt => { setCompleting(null); setNotice(`Collaboration completed with version ${receipt.version} as the final work.`); reload(); }} />}
      {!data.completion && (!data.agreement_id ? <p>Both participants must accept the same proposal before delivery submissions open.</p> : <p>{data.can_submit ? "Submit links both participants can open. Check the sharing permissions on your files before submitting." : "The creator can submit work here. Use Refresh deliveries to check for updates."}</p>)}
      <RevisionAllowance value={data.revision_allowance} />
      {data.can_submit && !editing && <button type="button" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>{data.latest_version ? "Submit a new version" : "New delivery submission"}</button>}
      {editing && data.can_submit && data.agreement_id && <DeliveryEditor key={`${data.agreement_id}:${data.latest_version}`} path={path} agreementId={data.agreement_id} version={data.latest_version} onClose={() => setEditing(false)} onSubmitted={row => { setEditing(false); setNotice(`Delivery version ${row.version} submitted. Both participants can view it.`); reload(); }} />}
      {reviewing && <DeliveryReviewDialog path={path} delivery={reviewing.delivery} action={reviewing.action} onClose={() => setReviewing(null)} onSaved={receipt => { setReviewing(null); setNotice("Version " + receipt.version + ": " + (receipt.decision === "approved" ? "approved" : "revisions requested") + ". Both participants can view the decision."); reload(); }} />}
      <h3>Submission history</h3><p>{data.total} submitted {data.total === 1 ? "version" : "versions"}. Submission does not mean approval or completion.</p>
      {!data.items.length && <p>{page > 1 ? "No submissions on this page." : "No work submitted yet."}</p>}
      {data.items.map(row => <details id={`delivery-${row.id}`} key={row.id} className="fl-delivery-version" open={page === 1 && row.version === data.latest_version}><summary>Version {row.version} · {row.title} · {new Date(row.submitted_at).toLocaleString()}</summary><DeliveryContents value={row} /><div className="fl-delivery-review">
        {row.review ? <><h3>{row.review.decision === "approved" ? "Approved" : "Revisions requested"}{row.version !== data.latest_version ? " · earlier version" : ""}</h3><p>Brand / client · {new Date(row.review.reviewed_at).toLocaleString()}</p>{row.review.feedback && <p className="fl-delivery-notes">{row.review.feedback}</p>}<p>This decision applies to version {row.version} only.</p>{row.version === data.latest_version && row.review.decision === "revisions_requested" && data.can_submit && <p>Review the requested changes, then submit a new delivery version.</p>}</>
          : <p>{row.version === data.latest_version ? "Awaiting brand/client review." : "Earlier version · no review recorded."}</p>}
        {data.can_complete && row.version === data.latest_version && row.review?.decision === "approved" && <button type="button" onClick={() => setCompleting(row)}>Complete collaboration</button>}
        {data.can_review && row.version === data.latest_version && !row.review && <div className="fl-shared-actions"><button type="button" disabled={!data.can_request_revision} onClick={() => setReviewing({ delivery: row, action: "request_revision" })}>Request revisions for version {row.version}</button><button type="button" onClick={() => setReviewing({ delivery: row, action: "approve" })}>Approve version {row.version}</button></div>}
      </div></details>)}
      <nav aria-label="Delivery history pages"><button type="button" disabled={page === 1 || editing || (Boolean(reviewing) || Boolean(completing))} onClick={() => { setNotice(""); setPage(value => value - 1); }}>Previous deliveries</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button type="button" disabled={editing || (Boolean(reviewing) || Boolean(completing)) || page * data.page_size >= data.total} onClick={() => { setNotice(""); setPage(value => value + 1); }}>Older deliveries</button></nav>
    </>}
  </section>;
}
function DeliveryEditor({ path, agreementId, version, onClose, onSubmitted }: { path: string; agreementId: string; version: number; onClose: () => void; onSubmitted: (row: Delivery) => void }) {
  const [fields, setFields] = useState(emptyDelivery), [error, setError] = useState(""), [review, setReview] = useState<ReturnType<typeof deliveryPayload> | null>(null);
  const dirty = JSON.stringify(fields) !== JSON.stringify(emptyDelivery());
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
  function reviewSubmission(event: React.FormEvent) { event.preventDefault(); setError(""); try { setReview(deliveryPayload(fields)); } catch (error) { setError(error instanceof Error ? error.message : "Check the delivery details."); } }
  return <form className="fl-delivery-editor" onSubmit={reviewSubmission}><h3>Prepare version {version + 1}</h3><p>These details are shared only when you confirm Submit delivery. Submitting a new version preserves earlier submissions.</p>
    <label>Delivery title<input name="delivery-title" maxLength={160} value={fields.title} onChange={event => setFields(old => ({ ...old, title: event.target.value }))} /></label>
    <label>Notes (optional)<textarea name="delivery-notes" rows={3} maxLength={5000} value={fields.notes} onChange={event => setFields(old => ({ ...old, notes: event.target.value }))} /></label>
    {fields.links.map((link, index) => <fieldset key={index}><legend>Link {index + 1}</legend><label>Label<input name={`delivery-label-${index}`} maxLength={80} value={link.label} onChange={event => linkField(index, "label", event.target.value)} /></label><label>HTTPS link<input name={`delivery-url-${index}`} inputMode="url" maxLength={2048} value={link.url} onChange={event => linkField(index, "url", event.target.value)} /></label>{fields.links.length > 1 && <button type="button" onClick={() => setFields(old => ({ ...old, links: old.links.filter((_, i) => i !== index) }))}>Remove link {index + 1}</button>}</fieldset>)}
    <button type="button" disabled={fields.links.length >= 10} onClick={() => setFields(old => ({ ...old, links: [...old.links, { label: "", url: "" }] }))}>Add another link</button>
    {error && <p role="alert">{error}</p>}
    <div className="fl-shared-actions"><button type="button" onClick={() => { if (!dirty || window.confirm("Discard your unsubmitted delivery details?")) onClose(); }}>Cancel submission</button><button type="submit">Review delivery</button></div>
    {review && <SubmissionDialog path={path} agreementId={agreementId} version={version} payload={review} onClose={() => setReview(null)} onSubmitted={onSubmitted} />}
  </form>;
}
function SubmissionDialog({ path, agreementId, version, payload, onClose, onSubmitted }: { path: string; agreementId: string; version: number; payload: ReturnType<typeof deliveryPayload>; onClose: () => void; onSubmitted: (row: Delivery) => void }) {
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
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="submit-delivery-title" onCancel={event => { if (sending.current) event.preventDefault(); else onClose(); }}><h2 id="submit-delivery-title">Submit delivery version {version + 1}?</h2><DeliveryContents value={payload} /><p>These links and notes will be saved for both participants. Send later updates as a new version.</p>{error && <p role="alert">{error} If another version was saved, keep editing, close the editor and refresh deliveries to review it.</p>}<div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep editing</button><button type="button" disabled={busy} onClick={submit}>{busy ? "Submitting delivery…" : "Submit delivery"}</button></div></dialog>;
}
