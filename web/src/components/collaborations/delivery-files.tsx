"use client";
import { useEffect, useRef, useState } from "react";
import { Upload } from "tus-js-client";
import type { components } from "@/types/api";
import { collaborationRequest } from "@/lib/collaborations";
export type DeliveryFile = components["schemas"]["CollaborationFileRead"];
type Ticket = components["schemas"]["FileUploadTicket"];
type Limits = components["schemas"]["FileUploadLimits"];
export const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function DeliveryFileDownload({ file, collaborationId }: { file: DeliveryFile; collaborationId: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  async function download() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const data = await collaborationRequest<components["schemas"]["FileDownload"]>(`/${collaborationId}/files/${file.id}/download`, { method: "POST", body: "{}" });
      const anchor = document.createElement("a"); anchor.href = data.url; anchor.rel = "noopener noreferrer"; anchor.referrerPolicy = "no-referrer"; anchor.download = file.filename; document.body.append(anchor); anchor.click(); anchor.remove();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not open this file. Please retry."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <><button type="button" disabled={busy} onClick={download}>{busy ? "Preparing download…" : `Download ${file.filename}`}</button><span>{fileSize(file.size_bytes)} · Private file</span>{error && <p role="alert">{error}</p>}</>;
}

export function DeliveryFilePicker({ collaborationId, agreementId, selected, onChange, onBusy }: { collaborationId: string; agreementId: string; selected: DeliveryFile[]; onChange: (files: DeliveryFile[]) => void; onBusy: (busy: boolean) => void }) {
  const path = `/${collaborationId}/files`;
  const [drafts, setDrafts] = useState<DeliveryFile[]>([]), [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [pendingName, setPendingName] = useState("");
  const pending = useRef<{ file: File; id: string; ticket?: Ticket; uploaded?: boolean; upload?: Upload } | null>(null);
  const mounted = useRef(true), working = useRef(false), selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; void pending.current?.upload?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([collaborationRequest<DeliveryFile[]>(path, { signal: controller.signal }), collaborationRequest<Limits>(path + "/limits", { signal: controller.signal })])
      .then(([files, rules]) => { if (!controller.signal.aborted) { setDrafts(files); setLimits(rules); setLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) { setError("Could not load private files. Retry before uploading."); setLoading(false); } });
    return () => controller.abort();
  }, [path, attempt]);
  async function run() {
    if (working.current || !pending.current) return;
    working.current = true; setBusy(true); onBusy(true); setError("");
    const job = pending.current;
    try {
      job.ticket ||= await collaborationRequest<Ticket>(path, { method: "POST", body: JSON.stringify({ request_id: job.id, agreement_id: agreementId, filename: job.file.name, content_type: job.file.type, size_bytes: job.file.size }) });
      if (!mounted.current) return;
      if (!job.uploaded) {
        await new Promise<void>((resolve, reject) => {
          if (!job.upload) job.upload = new Upload(job.file, {
            endpoint: job.ticket!.endpoint, headers: { "x-signature": job.ticket!.token },
            metadata: { bucketName: job.ticket!.bucket, objectName: job.ticket!.object_name, contentType: job.file.type, cacheControl: "0" },
            chunkSize: 6 * 1024 * 1024, retryDelays: [0, 1500, 3000, 5000],
            uploadDataDuringCreation: true, storeFingerprintForResuming: false,
            onProgress: (sent, total) => { if (mounted.current) setProgress(Math.round(sent / total * 100)); },
          });
          job.upload.options.onError = () => reject(new Error("Upload interrupted. Retry to continue sending this file."));
          job.upload.options.onSuccess = () => { job.uploaded = true; resolve(); };
          job.upload.start();
        });
      }
      const file = await collaborationRequest<DeliveryFile>(path + "/" + job.ticket.file.id + "/finish", { method: "POST", body: "{}" });
      if (!mounted.current) return;
      setDrafts(old => [...old.filter(row => row.id !== file.id), file]);
      onChange([...selectedRef.current.filter(row => row.id !== file.id), file]);
      pending.current = null; setPendingName(""); setProgress(0);
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : "Upload failed. Please retry."); }
    finally { working.current = false; if (mounted.current) { setBusy(false); onBusy(false); } }
  }
  async function remove(file: DeliveryFile) {
    if (working.current) return;
    working.current = true; setBusy(true); onBusy(true); setError("");
    try {
      await collaborationRequest(path + "/" + file.id, { method: "DELETE" });
      setDrafts(old => old.filter(row => row.id !== file.id)); onChange(selectedRef.current.filter(row => row.id !== file.id));
    } catch (error) { setError(error instanceof Error ? error.message : "Could not remove file. Please retry."); }
    finally { working.current = false; setBusy(false); onBusy(false); }
  }
  async function discardFailed() {
    if (working.current) return;
    const job = pending.current;
    setBusy(true); onBusy(true); working.current = true;
    try {
      await job?.upload?.abort();
      if (job?.ticket) await collaborationRequest(path + "/" + job.ticket.file.id, { method: "DELETE" });
      pending.current = null; setPendingName(""); setError(""); setProgress(0);
    } catch { setError("Could not discard the upload. Please retry."); }
    finally { working.current = false; setBusy(false); onBusy(false); }
  }
  return <fieldset className="fl-delivery-files"><legend>Private files</legend>
    <p>Video, images, audio or PDFs{limits ? ` · up to ${fileSize(limits.max_bytes)} each` : ""}. Select up to 10 files for this version. Unsubmitted files expire after 24 hours.</p>
    {loading ? <p role="status">Loading draft files…</p> : !limits ? <button type="button" onClick={() => { setLoading(true); setError(""); setAttempt(n => n + 1); }}>Retry private files</button> : <>
      <label>Add a file<input type="file" accept={limits.content_types.join(",")} disabled={busy || Boolean(pendingName) || selected.length >= 10} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        if (!file.size || file.size > limits.max_bytes || !limits.content_types.includes(file.type)) { setError(`Choose a supported file within ${fileSize(limits.max_bytes)}.`); return; }
        pending.current = { file, id: crypto.randomUUID() }; setPendingName(file.name); setProgress(0); void run();
      }} /></label>
      {pendingName && <div role="status"><p>{pendingName} · {progress}%{progress === 100 ? " · verifying file" : ""}</p><progress max={100} value={progress} aria-label={`Uploading ${pendingName}`} />{!busy && <div className="fl-shared-actions"><button type="button" onClick={() => void run()}>Retry upload</button><button type="button" onClick={() => void discardFailed()}>Discard upload</button></div>}</div>}
      {drafts.length > 0 && <ul>{drafts.map(file => <li key={file.id}><label><input type="checkbox" checked={selected.some(row => row.id === file.id)} disabled={busy || (!selected.some(row => row.id === file.id) && selected.length >= 10)} onChange={event => onChange(event.target.checked ? [...selected, file] : selected.filter(row => row.id !== file.id))} /><span>{file.filename}<small>{fileSize(file.size_bytes)}</small></span></label><button type="button" disabled={busy} onClick={() => void remove(file)}>Remove<span className="sr-only"> {file.filename}</span></button></li>)}</ul>}
    </>}{error && <p role="alert">{error}</p>}
  </fieldset>;
}
