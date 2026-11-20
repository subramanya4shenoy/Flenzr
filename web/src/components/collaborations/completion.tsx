"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest } from "@/lib/collaborations";
import type { Delivery, DeliveryWorkspace, Completion } from "@/lib/deliveries";
import { DeliveryContents } from "./delivery-contents";

export function CompletionDialog({ collaborationId, delivery, onClose, onSaved }: { collaborationId: string; delivery: Delivery; onClose: () => void; onSaved: (receipt: Completion) => void }) {
  const ref = useRef<HTMLDialogElement>(null), sending = useRef(false);
  const request = useRef<{ request_id: string; delivery_id: string; review_id: string; expected_latest_version: number; confirmed: true } | null>(null);
  const [attempt, setAttempt] = useState(0), [state, setState] = useState<{ attempt: number; row?: Delivery; error?: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const loading = state?.attempt !== attempt;
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<DeliveryWorkspace>(`/${collaborationId}/deliveries?page=1&page_size=1`, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        const row = data.items[0];
        if (!data.can_complete || !row || row.id !== delivery.id || data.latest_version !== delivery.version || row.review?.decision !== "approved") {
          setState({ attempt, error: "The latest work or collaboration status has changed. Close this confirmation and refresh deliveries." });
        } else setState({ attempt, row });
      }).catch(error => { if (!controller.signal.aborted) setState({ attempt, error: error instanceof Error ? error.message : "Could not load final work." }); });
    return () => controller.abort();
  }, [collaborationId, delivery.id, delivery.version, attempt]);
  async function complete() {
    if (sending.current || !state?.row?.review) return;
    sending.current = true; setBusy(true); setError("");
    request.current ||= { request_id: crypto.randomUUID(), delivery_id: state.row.id, review_id: state.row.review.id, expected_latest_version: state.row.version, confirmed: true };
    try { onSaved(await collaborationRequest<Completion>(`/${collaborationId}/complete`, { method: "POST", body: JSON.stringify(request.current) })); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not complete collaboration. Please retry."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="completion-title" onCancel={event => { if (sending.current) event.preventDefault(); else onClose(); }}>
    <h2 id="completion-title">Complete this collaboration?</h2>
    {loading ? <p role="status">Checking the final approved work…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reload final work</button></div> : state?.row && <>
      <h3>Final work · version {state.row.version}</h3><DeliveryContents value={state.row} collaborationId={collaborationId} />
      <p>Confirm that this approved version fulfils the collaboration. Completion is final and closes further submissions and reviews. Your agreement and delivery history remain available.</p>
      <p>This does not collect or release payment.</p>
      {error && <p role="alert">{error} Retry this confirmation, or close and refresh deliveries to check whether completion was saved.</p>}
    </>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep collaboration open</button>{!loading && state?.row && <button type="button" disabled={busy} onClick={complete}>{busy ? "Completing…" : "Confirm completion"}</button>}</div>
  </dialog>;
}
