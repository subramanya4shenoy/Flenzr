"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collaborationRequest, type Collaboration, type CollaborationSource } from "@/lib/collaborations";
import "./collaborations.css";

export function StartCollaboration({ sourceKind, sourceId }: { sourceKind: CollaborationSource; sourceId: string }) {
  const [open, setOpen] = useState(false);
  return <><button className="fl-shared-start" type="button" onClick={() => setOpen(true)}>Start collaboration</button>{open && <StartDialog sourceKind={sourceKind} sourceId={sourceId} onClose={() => setOpen(false)} />}</>;
}
function StartDialog({ sourceKind, sourceId, onClose }: { sourceKind: CollaborationSource; sourceId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), saving = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => { ref.current?.showModal(); }, []);
  async function start() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const row = await collaborationRequest<Collaboration>("", { method: "POST", body: JSON.stringify({ source_kind: sourceKind, source_id: sourceId }) });
      router.push(`/dashboard/collaborations/${row.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not start collaboration."); saving.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="start-collaboration-title" onCancel={e => { if (saving.current) e.preventDefault(); else onClose(); }}>
    <h2 id="start-collaboration-title">Start a shared collaboration?</h2>
    <p>Both participants will see this record with a copy of the source brief and quote. You can return to it from Collaborations.</p>
    <p>The collaboration starts in Discussion. Scope, price and dates still need a proposal and mutual agreement. No payment is taken.</p>
    <p>If this source already has a collaboration, we’ll open it.</p>
    {error && <p role="alert">{error}</p>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start collaboration"}</button></div>
  </dialog>;
}
