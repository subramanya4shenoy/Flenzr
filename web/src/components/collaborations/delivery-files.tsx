"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Download, ExternalLink, FileText, Film, Image as ImageIcon, Maximize2, Music, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { Upload } from "tus-js-client";
import type { components } from "@/types/api";
import { collaborationRequest } from "@/lib/collaborations";
export type DeliveryFile = components["schemas"]["CollaborationFileRead"];
type Ticket = components["schemas"]["FileUploadTicket"];
type Limits = components["schemas"]["FileUploadLimits"];
export const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function fileKind(contentType: string): "image" | "video" | "audio" | "pdf" | "other" {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType === "application/pdf") return "pdf";
  return "other";
}

function fileBadge(contentType: string) {
  const map: Record<string, string> = {
    "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP",
    "video/mp4": "MP4", "video/quicktime": "MOV", "video/webm": "WEBM",
    "audio/mpeg": "MP3", "audio/wav": "WAV", "audio/mp4": "M4A",
    "application/pdf": "PDF",
  };
  return map[contentType] || contentType.split("/")[1]?.toUpperCase() || "FILE";
}

export function DeliveryFilePreview({ file, collaborationId }: { file: DeliveryFile; collaborationId: string }) {
  const kind = fileKind(file.content_type);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const downloadLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<components["schemas"]["FileDownload"]>(
      `/${collaborationId}/files/${file.id}/download?inline=true`,
      { method: "POST", body: "{}", signal: controller.signal },
    )
      .then(data => {
        if (!controller.signal.aborted) {
          setUrl(data.url);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load preview.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [collaborationId, file.id, attempt]);

  function retryPreview() {
    setLoading(true);
    setError("");
    setAttempt(n => n + 1);
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  async function download() {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    try {
      const data = await collaborationRequest<components["schemas"]["FileDownload"]>(
        `/${collaborationId}/files/${file.id}/download`,
        { method: "POST", body: "{}" },
      );
      const anchor = document.createElement("a");
      anchor.href = data.url;
      anchor.rel = "noopener noreferrer";
      anchor.referrerPolicy = "no-referrer";
      anchor.download = file.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download this file.");
    } finally {
      downloadLock.current = false;
      setDownloading(false);
    }
  }

  const KindIcon = kind === "image" ? ImageIcon : kind === "video" ? Film : kind === "audio" ? Music : FileText;

  return <figure className="fl-del-media-card" data-kind={kind}>
    <div className="fl-del-media-stage">
      {loading ? (
        <div className="fl-del-media-placeholder" role="status">
          <KindIcon size={20} aria-hidden="true" />
          <span>Loading preview…</span>
        </div>
      ) : error || !url ? (
        <div className="fl-del-media-placeholder fl-del-media-error">
          <p role="alert">{error || "Preview unavailable."}</p>
          <button type="button" className="fl-del-media-retry" onClick={retryPreview}>
            <RefreshCw size={13} aria-hidden="true" /> Retry preview
          </button>
        </div>
      ) : kind === "image" ? (
        <button type="button" className="fl-del-media-img-btn" onClick={() => setLightbox(true)} aria-label={`Expand ${file.filename}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={file.filename} className="fl-del-media-img" loading="lazy" onError={() => setError("Preview expired or could not be loaded.")} />
        </button>
      ) : kind === "video" ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="fl-del-media-video"
          onError={() => setError("Video preview could not be played.")}
        />
      ) : kind === "audio" ? (
        <div className="fl-del-media-audio-wrap">
          <Music size={20} className="fl-del-media-audio-icon" aria-hidden="true" />
          <audio src={url} controls preload="metadata" className="fl-del-media-audio" />
        </div>
      ) : kind === "pdf" ? (
        <iframe src={url} title={file.filename} className="fl-del-media-pdf" />
      ) : (
        <div className="fl-del-media-placeholder">
          <FileText size={22} aria-hidden="true" />
          <span>Preview not supported for this file type</span>
        </div>
      )}
    </div>

    <figcaption className="fl-del-media-footer">
      <div className="fl-del-media-meta">
        <strong title={file.filename}>{file.filename}</strong>
        <span>{fileSize(file.size_bytes)} · {fileBadge(file.content_type)}</span>
      </div>
      <div className="fl-del-media-actions">
        {kind === "image" && url && !error && (
          <button type="button" className="fl-icon-btn" onClick={() => setLightbox(true)} aria-label={`View ${file.filename} full size`} title="View full size">
            <Maximize2 size={14} aria-hidden="true" />
          </button>
        )}
        {kind === "pdf" && url && !error && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="fl-del-media-link-btn" aria-label={`Open ${file.filename} in new tab`} title="Open in new tab">
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
        <button type="button" className="fl-icon-btn" disabled={downloading} onClick={() => void download()} aria-label={`Download ${file.filename}`} title={downloading ? "Preparing download…" : "Download"}>
          <Download size={14} aria-hidden="true" />
        </button>
      </div>
    </figcaption>

    {lightbox && url && (
      <div className="fl-del-lightbox" role="dialog" aria-modal="true" aria-label={file.filename} onClick={() => setLightbox(false)}>
        <div className="fl-del-lightbox-inner" onClick={e => e.stopPropagation()}>
          <div className="fl-del-lightbox-bar">
            <span>{file.filename} · {fileSize(file.size_bytes)}</span>
            <div className="fl-del-media-actions">
              <button type="button" className="fl-icon-btn" disabled={downloading} onClick={() => void download()} aria-label={`Download ${file.filename}`} title="Download">
                <Download size={15} aria-hidden="true" />
              </button>
              <button type="button" className="fl-icon-btn" onClick={() => setLightbox(false)} aria-label="Close preview" title="Close">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={file.filename} className="fl-del-lightbox-img" />
        </div>
      </div>
    )}
  </figure>;
}

export function DeliveryFileDownload({ file, collaborationId }: { file: DeliveryFile; collaborationId: string }) {
  return <DeliveryFilePreview file={file} collaborationId={collaborationId} />;
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
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  function pickFile(file: File | undefined) {
    if (!file || !limits) return;
    if (busy || Boolean(pendingName) || selected.length >= 10) return;
    if (!file.size || file.size > limits.max_bytes || !limits.content_types.includes(file.type)) {
      setError(`Choose a supported file (MP4, MOV, WEBM, JPG, PNG, WEBP, MP3, WAV, M4A, or PDF) within ${fileSize(limits.max_bytes)}.`);
      return;
    }
    pending.current = { file, id: crypto.randomUUID() };
    setPendingName(file.name);
    setProgress(0);
    void run();
  }
  return <div className="fl-del-picker">
    <div className="fl-del-picker-head">
      <div>
        <strong>Files</strong>
        <span>Video, images, audio, or PDFs{limits ? ` · up to ${fileSize(limits.max_bytes)} each` : ""} · up to 10 files</span>
      </div>
      {selected.length > 0 && <span className="fl-del-picker-count">{selected.length} / 10 selected</span>}
    </div>

    {loading ? (
      <p className="fl-del-picker-status" role="status">Loading draft files…</p>
    ) : !limits ? (
      <button type="button" className="fl-del-btn-neutral" onClick={() => { setLoading(true); setError(""); setAttempt(n => n + 1); }}>
        <RefreshCw size={13} aria-hidden="true" /> Retry private files
      </button>
    ) : <>
      <div
        className="fl-del-dropzone"
        data-dragging={dragging}
        data-disabled={busy || Boolean(pendingName) || selected.length >= 10}
        onDragOver={e => { e.preventDefault(); if (!busy && !pendingName && selected.length < 10) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => { if (!busy && !pendingName && selected.length < 10) inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Add a file"
          accept={limits.content_types.join(",")}
          disabled={busy || Boolean(pendingName) || selected.length >= 10}
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = "";
            pickFile(file);
          }}
        />
        <span className="fl-del-dropzone-icon" aria-hidden="true"><UploadCloud size={20} /></span>
        <div className="fl-del-dropzone-copy">
          <strong>{selected.length >= 10 ? "Maximum 10 files selected" : "Click to upload or drag & drop a file"}</strong>
          <span>MP4, MOV, WEBM, JPG, PNG, WEBP, MP3, WAV, M4A, PDF · unsubmitted files expire in 24h</span>
        </div>
      </div>

      {pendingName && (
        <div className="fl-del-upload-progress" role="status">
          <div className="fl-del-upload-progress-head">
            <strong>{pendingName}</strong>
            <span>{progress === 100 ? "Verifying file…" : `${progress}%`}</span>
          </div>
          <div className="fl-del-progress-track">
            <div className="fl-del-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <progress className="sr-only" max={100} value={progress} aria-label={`Uploading ${pendingName}`} />
          {!busy && (
            <div className="fl-del-upload-retry">
              <button type="button" className="fl-del-btn-neutral" onClick={() => void run()}>Retry upload</button>
              <button type="button" className="fl-del-btn-neutral" onClick={() => void discardFailed()}>Discard upload</button>
            </div>
          )}
        </div>
      )}

      {drafts.length > 0 && (
        <ul className="fl-del-draft-list" aria-label="Uploaded draft files">
          {drafts.map(file => {
            const checked = selected.some(row => row.id === file.id);
            const k = fileKind(file.content_type);
            const Icon = k === "image" ? ImageIcon : k === "video" ? Film : k === "audio" ? Music : FileText;
            return (
              <li key={file.id} className="fl-del-draft-row" data-selected={checked}>
                <label className="fl-del-draft-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy || (!checked && selected.length >= 10)}
                    onChange={event => onChange(event.target.checked ? [...selected, file] : selected.filter(row => row.id !== file.id))}
                  />
                  <span className="fl-del-draft-box" aria-hidden="true">{checked && <Check size={11} />}</span>
                  <span className="fl-del-draft-icon" aria-hidden="true"><Icon size={15} /></span>
                  <span className="fl-del-draft-meta">
                    <strong title={file.filename}>{file.filename}</strong>
                    <small>{fileSize(file.size_bytes)} · {fileBadge(file.content_type)}</small>
                  </span>
                </label>
                <button
                  type="button"
                  className="fl-rev-tool-btn fl-rev-tool-danger"
                  disabled={busy}
                  onClick={() => void remove(file)}
                  title={`Remove ${file.filename}`}
                  aria-label={`Remove ${file.filename}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>}
    {error && <p className="fl-rev-composer-err" role="alert">{error}</p>}
  </div>;
}
