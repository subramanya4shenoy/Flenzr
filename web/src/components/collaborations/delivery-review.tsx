"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest } from "@/lib/collaborations";
import { deliveryReviewPayload, type Delivery, type DeliveryReview, type DeliveryReviewAction, type DeliveryWorkspace } from "@/lib/deliveries";
import { RevisionAllowance } from "./revision-allowance";
import { DeliveryContents } from "./delivery-contents";

export function DeliveryReviewDialog({ path, delivery, action, onClose, onSaved }: { path: string; delivery: Delivery; action: DeliveryReviewAction; onClose: () => void; onSaved: (receipt: DeliveryReview) => void }) {
  const ref = useRef<HTMLDialogElement>(null), saving = useRef(false);
  const [attempt, setAttempt] = useState(0), [state, setState] = useState<{ attempt: number; row?: Delivery; allowance?: DeliveryWorkspace["revision_allowance"]; error?: string } | null>(null);
  const [feedback, setFeedback] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const request = useRef<{ request_id: string; expected_latest_version: number; action: DeliveryReviewAction; feedback: string } | null>(null);
  const loading = state?.attempt !== attempt;
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<DeliveryWorkspace>(path + "?page=1&page_size=1", { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        const row = data.items[0];
        if (!data.can_review || !row || row.id !== delivery.id || data.latest_version !== delivery.version || row.review) {
          setState({ attempt, error: "The latest submission or its review has changed. Close this review and refresh deliveries." });
        } else if (action === "request_revision" && !data.can_request_revision) {
          setState({ attempt, error: "The agreed revision allowance has been used. Close this review and refresh deliveries to check the saved scope." });
        } else setState({ attempt, row, allowance: data.revision_allowance });
      }).catch(error => { if (!controller.signal.aborted) setState({ attempt, error: error instanceof Error ? error.message : "Could not load this delivery." }); });
    return () => controller.abort();
  }, [path, delivery.id, delivery.version, attempt, action]);
  async function submit() {
    if (saving.current || !state?.row) return;
    setError("");
    try {
      request.current ||= { ...deliveryReviewPayload(action, feedback), request_id: crypto.randomUUID(), expected_latest_version: state.row.version };
      setLocked(true); saving.current = true; setBusy(true);
      const receipt = await collaborationRequest<DeliveryReview>(path + "/" + state.row.id + "/review", { method: "POST", body: JSON.stringify(request.current) });
      onSaved(receipt);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save review. Please retry."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="delivery-review-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}>
    <h2 id="delivery-review-title">{action === "approve" ? "Approve" : "Request revisions for"} delivery version {delivery.version}?</h2>
    {loading ? <p role="status">Loading the latest submission…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reload review</button></div> : state?.row && <>
      <DeliveryContents value={state.row} />
      <RevisionAllowance value={state.allowance || null} />
      {action === "request_revision" && <p>Confirming this request uses one revision round. Cancelling does not use a round.</p>}
      <label className="fl-delivery-feedback">{action === "request_revision" ? "Describe the requested changes" : "Feedback (optional)"}<textarea name="delivery-review-feedback" rows={4} maxLength={5000} value={feedback} disabled={busy || locked} onChange={event => setFeedback(event.target.value)} /></label>
      <p>This saves a fixed decision for version {delivery.version}. It does not mark the collaboration complete or collect payment. Further work is submitted as a new version.</p>
      {error && <p role="alert">{error} Your decision details are preserved. Retry the same decision, or close and refresh deliveries to check what was saved.</p>}
    </>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep reviewing</button>{!loading && state?.row && <button type="button" disabled={busy} onClick={submit}>{busy ? "Saving review…" : action === "approve" ? "Confirm approval" : "Send revision request"}</button>}</div>
  </dialog>;
}
