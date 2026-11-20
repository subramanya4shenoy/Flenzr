"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import type { Delivery } from "@/lib/deliveries";
import { proofPayload, type ProofFields, type ProofWorkspace, type PublishingProof } from "@/lib/publishing-proof";
import { ProofConfirmationDialog } from "./proof-confirmation";
import { DeliveryContents } from "./delivery-contents";

export function CollaborationProof({ collaborationId, status }: { collaborationId: string; status: Collaboration["status"] }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState<PublishingProof | null>(null);
  const key = `${collaborationId}:${status}:${page}:${attempt}`, path = `/${collaborationId}/publishing-proof`;
  const [state, setState] = useState<{ key: string; data?: ProofWorkspace; error?: string } | null>(null);
  const loading = state?.key !== key, data = loading ? undefined : state?.data;
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<ProofWorkspace>(`${path}?page=${page}&page_size=5`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load publishing proof." }); });
    return () => controller.abort();
  }, [path, page, key]);
  const reload = () => { setPage(1); setAttempt(value => value + 1); };
  const latest = data?.items[0];
  return <section className="fl-publishing-proof" aria-label="Publishing proof" aria-busy={loading}>
    <header><div><h2>Publishing proof</h2><p>Final post links provided by the creator, separate from preview submissions.</p></div><button type="button" disabled={loading || editing || Boolean(confirming)} onClick={() => { setNotice(""); reload(); }}>Refresh publishing proof</button></header>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading publishing proof…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry publishing proof</button></div> : data && <>
      {data.eligible_delivery ? <p>Approved delivery: version {data.eligible_delivery.version} · {data.eligible_delivery.title}. {data.can_publish ? "You can record or update its final post links, including after completion." : "The creator can record its final post links here."}</p> : <p>The latest delivery must be approved before new publishing proof can be recorded. Earlier proof remains in history.</p>}
      {data.can_publish && data.eligible_delivery && !editing && <button type="button" onClick={() => { setPage(1); setNotice(""); setEditing(true); }}>Record publishing proof</button>}
      {editing && data.can_publish && data.eligible_delivery && <ProofEditor key={`${data.latest_proof_version}:${data.eligible_delivery.id}`} path={path} delivery={data.eligible_delivery} version={data.latest_proof_version} initial={page === 1 && latest?.delivery_id === data.eligible_delivery.id ? { notes: latest.notes, links: latest.links.map(link => ({ ...link })) } : { notes: "", links: [{ label: "", url: "" }] }} onClose={() => setEditing(false)} onSaved={receipt => { setEditing(false); setNotice(`Publishing proof version ${receipt.version} saved for delivery version ${receipt.delivery_version}. Both participants can view it.`); reload(); }} />}
      {confirming && <ProofConfirmationDialog path={path} proof={confirming} onClose={() => setConfirming(null)} onSaved={receipt => { setConfirming(null); setNotice(`Proof version ${receipt.proof_version} confirmed. Both participants can view the confirmation.`); reload(); }} />}
      <h3>Proof history</h3><p>{data.total} saved {data.total === 1 ? "version" : "versions"}. Each version preserves the links supplied at that time.</p>
      {!data.items.length && <p>{page > 1 ? "No proof on this page." : "No publishing proof recorded yet."}</p>}
      {data.items.map(row => <details key={row.id} className="fl-proof-version" open={page === 1 && row.version === data.latest_proof_version}><summary>Proof version {row.version} · delivery version {row.delivery_version} · {new Date(row.saved_at).toLocaleString()}</summary><p>Creator-provided links. Open the posts to review the published work.</p><DeliveryContents value={{ title: `Final links · delivery version ${row.delivery_version}`, notes: row.notes, links: row.links }} /><div className="fl-proof-confirmation">{row.confirmation ? <><h3>{row.version === data.latest_proof_version ? "Proof confirmed" : "Confirmed · earlier proof"}</h3><p>Brand / client · {new Date(row.confirmation.confirmed_at).toLocaleString()}</p><p>Applies only to proof version {row.version}, delivery version {row.delivery_version}. New proof does not inherit this confirmation.</p></> : <p>No brand/client confirmation recorded for this proof version.</p>}{data.can_confirm && row.version === data.latest_proof_version && !row.confirmation && <button type="button" onClick={() => setConfirming(row)}>Review &amp; confirm proof {row.version}</button>}</div></details>)}
      <nav aria-label="Publishing proof pages"><button type="button" disabled={editing || Boolean(confirming) || page === 1} onClick={() => setPage(value => value - 1)}>Previous proof</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button type="button" disabled={editing || Boolean(confirming) || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Older proof</button></nav>
    </>}
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
  function link(index: number, key: "label" | "url", value: string) { setFields(old => ({ ...old, links: old.links.map((item, i) => i === index ? { ...item, [key]: value } : item) })); }
  return <form className="fl-proof-editor" onSubmit={event => { event.preventDefault(); setError(""); try { setReview(proofPayload(fields)); } catch (error) { setError(error instanceof Error ? error.message : "Check these links."); } }}>
    <h3>Final post links · delivery version {delivery.version}</h3><p>Enter the full set of published links for this proof version. Corrections are saved as a new version; earlier proof stays available.</p>
    {fields.links.map((item, index) => <fieldset key={index}><legend>Post {index + 1}</legend><label>Post label<input name={`proof-label-${index}`} maxLength={80} value={item.label} onChange={event => link(index, "label", event.target.value)} /></label><label>HTTPS post link<input name={`proof-url-${index}`} inputMode="url" maxLength={2048} value={item.url} onChange={event => link(index, "url", event.target.value)} /></label>{fields.links.length > 1 && <button type="button" onClick={() => setFields(old => ({ ...old, links: old.links.filter((_, i) => i !== index) }))}>Remove post {index + 1} from this version</button>}</fieldset>)}
    <button type="button" disabled={fields.links.length >= 10} onClick={() => setFields(old => ({ ...old, links: [...old.links, { label: "", url: "" }] }))}>Add post link</button>
    <label>Notes (optional)<textarea name="proof-notes" rows={3} maxLength={5000} value={fields.notes} onChange={event => setFields(old => ({ ...old, notes: event.target.value }))} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="fl-shared-actions"><button type="button" onClick={() => { if (!dirty || window.confirm("Discard your unsaved publishing links?")) onClose(); }}>Cancel proof</button><button type="submit">Review publishing proof</button></div>
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
      if (!data.can_publish || data.eligible_delivery?.id !== delivery.id || data.eligible_delivery.review?.id !== delivery.review?.id || data.latest_proof_version !== version) setState({ attempt, error: "The approved delivery or saved proof changed. Close the editor and refresh publishing proof before recording an update." });
      else setState({ attempt, ready: true });
    }).catch(error => { if (!controller.signal.aborted) setState({ attempt, error: error instanceof Error ? error.message : "Could not check current proof." }); });
    return () => controller.abort();
  }, [path, delivery.id, delivery.review?.id, version, attempt]);
  async function save() {
    if (saving.current || !state?.ready || !delivery.review) return;
    saving.current = true; requestId.current ||= crypto.randomUUID(); setBusy(true); setError("");
    try { onSaved(await collaborationRequest<PublishingProof>(path, { method: "POST", body: JSON.stringify({ ...payload, request_id: requestId.current, delivery_id: delivery.id, review_id: delivery.review.id, expected_delivery_version: delivery.version, expected_latest_proof_version: version }) })); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not save publishing proof. Please retry."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="fl-shared-dialog" aria-labelledby="proof-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}><h2 id="proof-title">Save publishing proof version {version + 1}?</h2>
    {loading ? <p role="status">Checking the approved delivery and proof history…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reload proof check</button></div> : <><DeliveryContents value={{ ...payload, title: `Final post links · approved delivery version ${delivery.version}` }} /><p>These creator-provided links and notes will be saved for both participants. Flenzr does not verify or publish the posts, change delivery approval or collect payment.</p></>}
    {error && <p role="alert">{error} Retry the same save, or close and refresh publishing proof to check what was saved.</p>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep editing proof</button>{!loading && state?.ready && <button type="button" disabled={busy} onClick={save}>{busy ? "Saving proof…" : "Save publishing proof"}</button>}</div>
  </dialog>;
}
