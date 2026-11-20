"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest } from "@/lib/collaborations";
import type { ProofWorkspace, PublishingProof, ProofConfirmation } from "@/lib/publishing-proof";
import { DeliveryContents } from "./delivery-contents";

export function ProofConfirmationDialog({ path, proof, onClose, onSaved }: { path: string; proof: PublishingProof; onClose: () => void; onSaved: (receipt: ProofConfirmation) => void }) {
  const ref = useRef<HTMLDialogElement>(null), saving = useRef(false), requestId = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0), [state, setState] = useState<{ attempt: number; row?: PublishingProof; error?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const loading = state?.attempt !== attempt;
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ProofWorkspace>(path + "?page=1&page_size=1", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      const row = data.items[0];
      if (!data.can_confirm || !row || row.id !== proof.id || data.latest_proof_version !== proof.version || row.confirmation || data.eligible_delivery?.id !== proof.delivery_id) setState({ attempt, error: "The proof, approved delivery or its confirmation changed. Close this review and refresh publishing proof." });
      else setState({ attempt, row });
    }).catch(error => { if (!controller.signal.aborted) setState({ attempt, error: error instanceof Error ? error.message : "Could not load current publishing proof." }); });
    return () => controller.abort();
  }, [path, proof.id, proof.version, proof.delivery_id, attempt]);
  async function confirm() {
    if (saving.current || !state?.row || !confirmed) return;
    saving.current = true; requestId.current ||= crypto.randomUUID(); setBusy(true); setLocked(true); setError("");
    try { onSaved(await collaborationRequest<ProofConfirmation>(path + "/" + proof.id + "/confirm", { method: "POST", body: JSON.stringify({ request_id: requestId.current, expected_proof_version: proof.version, confirmed: true }) })); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not confirm publishing proof. Please retry."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="confirm-proof-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}><h2 id="confirm-proof-title">Review publishing proof version {proof.version}</h2>
    {loading ? <p role="status">Loading the current proof and approved delivery…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reload confirmation</button></div> : state?.row && <>
      <DeliveryContents value={{ title: `Final post links · delivery version ${state.row.delivery_version}`, notes: state.row.notes, links: state.row.links }} />
      <p>Open the supplied links and review the published work against your agreement. If corrections are needed, keep reviewing and ask the creator for a new proof version.</p>
      <label className="fl-agreement-confirm"><input name="confirm-publishing-proof" type="checkbox" checked={confirmed} disabled={busy || locked} onChange={event => setConfirmed(event.target.checked)} />I reviewed proof version {proof.version} and confirm the published work shown in these links.</label>
      <p>This records your confirmation of this exact proof version. It does not verify the posts automatically, change delivery approval or completion, or collect payment. New proof versions need a new confirmation.</p>
      {error && <p role="alert">{error} Retry the same confirmation, or close and refresh publishing proof to check what was saved.</p>}
    </>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep reviewing proof</button>{!loading && state?.row && <button type="button" disabled={busy || !confirmed} onClick={confirm}>{busy ? "Confirming proof…" : "Confirm proof"}</button>}</div>
  </dialog>;
}
