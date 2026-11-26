"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, CheckCircle2, Clock, Download, ExternalLink, FileText,
  Film, Image as ImageIcon, MessageSquare, Music, RefreshCw, RotateCcw,
  Send, Trash2, Upload, X,
} from "lucide-react";
import { collaborationRequest } from "@/lib/collaborations";
import { formatTimecode, type Delivery, type DeliveryComment, type DeliveryReviewAction } from "@/lib/deliveries";
import { fileSize, type DeliveryFile } from "./delivery-files";
import type { components } from "@/types/api";

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

export function DeliveryReviewStudio({
  collaborationId,
  delivery,
  isLatest,
  canReview,
  canRequestRevision,
  canComplete,
  canSubmit = false,
  viewerRole,
  onBack,
  onStartReview,
  onStartComplete,
  onStartSubmit,
}: {
  collaborationId: string;
  delivery: Delivery;
  isLatest: boolean;
  canReview: boolean;
  canRequestRevision: boolean;
  canComplete: boolean;
  canSubmit?: boolean;
  viewerRole: "brand" | "creator";
  onBack: () => void;
  onStartReview: (action: DeliveryReviewAction, prefillFeedback?: string) => void;
  onStartComplete: () => void;
  onStartSubmit?: () => void;
}) {
  const files = useMemo<DeliveryFile[]>(() => delivery.files ?? [], [delivery.files]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id ?? null);
  const activeFile = useMemo(
    () => files.find(f => f.id === selectedFileId) ?? files[0] ?? null,
    [files, selectedFileId],
  );
  const activeKind = activeFile ? fileKind(activeFile.content_type) : null;
  const isTimeBased = activeKind === "video" || activeKind === "audio";

  // Signed preview URL cache keyed by file.id
  const [urlMap, setUrlMap] = useState<Record<string, { url?: string; error?: string }>>({});
  const [urlAttempt, setUrlAttempt] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Playback state for video/audio
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [pinnedMs, setPinnedMs] = useState<number | null>(null);
  const [useTimestamp, setUseTimestamp] = useState(true);
  const pendingSeekRef = useRef<number | null>(null);

  // Comments state
  const [comments, setComments] = useState<DeliveryComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentFilter, setCommentFilter] = useState<"all" | "open" | "file">("all");
  const [draftBody, setDraftBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const commentsPath = `/${collaborationId}/deliveries/${delivery.id}/comments`;

  // Load comments
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<DeliveryComment[]>(commentsPath, { signal: controller.signal })
      .then(list => {
        if (!controller.signal.aborted) {
          setComments(list);
          setCommentsLoading(false);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setCommentsError(err instanceof Error ? err.message : "Could not load review comments.");
          setCommentsLoading(false);
        }
      });
    return () => controller.abort();
  }, [commentsPath]);

  // Load inline signed URL for active file
  const activeFileId = activeFile?.id ?? "";
  const activeEntry = activeFileId ? urlMap[activeFileId] : undefined;
  useEffect(() => {
    if (!activeFileId) return;
    if (activeEntry?.url && !activeEntry.error) return;
    const controller = new AbortController();
    collaborationRequest<components["schemas"]["FileDownload"]>(
      `/${collaborationId}/files/${activeFileId}/download?inline=true`,
      { method: "POST", body: "{}", signal: controller.signal },
    )
      .then(data => {
        if (!controller.signal.aborted) {
          setUrlMap(prev => ({ ...prev, [activeFileId]: { url: data.url } }));
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setUrlMap(prev => ({ ...prev, [activeFileId]: { error: err instanceof Error ? err.message : "Could not load preview." } }));
        }
      });
    return () => controller.abort();
  }, [collaborationId, activeFileId, activeEntry?.url, activeEntry?.error, urlAttempt]);

  function selectFile(fileId: string) {
    setSelectedFileId(fileId);
    setCurrentMs(0);
    setDurationMs(0);
    setPinnedMs(null);
  }

  function retryPreview() {
    if (!activeFileId) return;
    setUrlMap(prev => {
      const next = { ...prev };
      delete next[activeFileId];
      return next;
    });
    setUrlAttempt(n => n + 1);
  }

  function seekTo(ms: number, targetFileId?: string | null) {
    if (targetFileId && targetFileId !== activeFile?.id && files.some(f => f.id === targetFileId)) {
      pendingSeekRef.current = ms;
      selectFile(targetFileId);
      return;
    }
    const el = mediaRef.current;
    if (el) {
      el.currentTime = ms / 1000;
      el.pause();
      setCurrentMs(ms);
    }
  }

  function pinCurrentTimestamp() {
    const el = mediaRef.current;
    if (el) el.pause();
    const ms = el ? Math.round(el.currentTime * 1000) : currentMs;
    setCurrentMs(ms);
    setPinnedMs(ms);
    setUseTimestamp(true);
    composerRef.current?.focus();
  }

  async function downloadActive() {
    if (!activeFile || downloading) return;
    setDownloading(true);
    try {
      const data = await collaborationRequest<components["schemas"]["FileDownload"]>(
        `/${collaborationId}/files/${activeFile.id}/download`,
        { method: "POST", body: "{}" },
      );
      const anchor = document.createElement("a");
      anchor.href = data.url;
      anchor.rel = "noopener noreferrer";
      anchor.referrerPolicy = "no-referrer";
      anchor.download = activeFile.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setDownloading(false);
    }
  }

  async function submitComment(event?: React.FormEvent) {
    event?.preventDefault();
    const text = draftBody.trim();
    if (!text || posting) return;
    setPosting(true);
    setPostError("");
    const ts = isTimeBased && useTimestamp ? (pinnedMs ?? currentMs) : null;
    try {
      const created = await collaborationRequest<DeliveryComment>(commentsPath, {
        method: "POST",
        body: JSON.stringify({
          file_id: activeFile?.id ?? null,
          timestamp_ms: ts,
          body: text,
        }),
      });
      setComments(prev => [...prev, created]);
      setDraftBody("");
      setPinnedMs(null);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleResolved(comment: DeliveryComment) {
    if (busyCommentId) return;
    setBusyCommentId(comment.id);
    try {
      const updated = await collaborationRequest<DeliveryComment>(`${commentsPath}/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resolved: !comment.resolved }),
      });
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
    } finally {
      setBusyCommentId(null);
    }
  }

  async function deleteComment(comment: DeliveryComment) {
    if (busyCommentId) return;
    setBusyCommentId(comment.id);
    try {
      await collaborationRequest(`${commentsPath}/${comment.id}`, { method: "DELETE" });
      setComments(prev => prev.filter(c => c.id !== comment.id));
    } finally {
      setBusyCommentId(null);
    }
  }

  // Comments for timeline markers on the currently active video/audio file
  const activeTimelineComments = useMemo(
    () => comments.filter(c => c.timestamp_ms !== null && (!c.file_id || c.file_id === activeFile?.id)),
    [comments, activeFile?.id],
  );

  const visibleComments = useMemo(() => {
    let list = comments;
    if (commentFilter === "open") list = list.filter(c => !c.resolved);
    else if (commentFilter === "file" && activeFile) list = list.filter(c => c.file_id === activeFile.id);
    return [...list].sort((a, b) => {
      if (a.timestamp_ms !== null && b.timestamp_ms !== null) return a.timestamp_ms - b.timestamp_ms;
      if (a.timestamp_ms !== null) return -1;
      if (b.timestamp_ms !== null) return 1;
      return Date.parse(a.created_at) - Date.parse(b.created_at);
    });
  }, [comments, commentFilter, activeFile]);

  const openCount = comments.filter(c => !c.resolved).length;
  const resolvedCount = comments.length - openCount;

  // Build a clean summary of open comments to pre-fill the Revision Request dialog if desired
  function buildRevisionSummary() {
    const open = comments.filter(c => !c.resolved);
    if (!open.length) return "";
    return open.map(c => {
      const prefix = c.timestamp_ms !== null ? `[${formatTimecode(c.timestamp_ms)}] ` : "";
      return `• ${prefix}${c.body}`;
    }).join("\n");
  }

  const badge = delivery.review
    ? delivery.review.decision === "approved"
      ? { text: "Approved", tone: "good" }
      : { text: "Revisions requested", tone: "warn" }
    : isLatest
      ? { text: "Awaiting review", tone: "warn" }
      : { text: "Earlier version", tone: "muted" };

  const activeTimestampMs = pinnedMs ?? currentMs;

  return <div className="fl-rev-studio" aria-label={`Review delivery version ${delivery.version}`}>
    {/* Top bar */}
    <header className="fl-rev-topbar">
      <div className="fl-rev-topbar-left">
        <button type="button" className="fl-rev-back-btn" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to versions
        </button>
        <div className="fl-rev-title-wrap">
          <span className="fl-del-version-badge" data-latest={isLatest}>v{delivery.version}</span>
          <h3>{delivery.title}</h3>
          <span className="fl-collab-pill" data-tone={badge.tone}>{badge.text}</span>
        </div>
      </div>

      <div className="fl-rev-topbar-actions">
        {canReview && isLatest && !delivery.review && <>
          <button
            type="button"
            className="fl-del-btn-warn"
            disabled={!canRequestRevision}
            onClick={() => onStartReview("request_revision", buildRevisionSummary())}
          >
            <RotateCcw size={13} aria-hidden="true" /> Request revisions
          </button>
          <button
            type="button"
            className="fl-collab-next-cta"
            onClick={() => onStartReview("approve")}
          >
            <CheckCircle2 size={14} aria-hidden="true" /> Approve v{delivery.version}
          </button>
        </>}
        {canComplete && isLatest && delivery.review?.decision === "approved" && (
          <button type="button" className="fl-collab-next-cta" onClick={onStartComplete}>
            <CheckCircle2 size={14} aria-hidden="true" /> Complete collaboration
          </button>
        )}
        {canSubmit && isLatest && delivery.review?.decision === "revisions_requested" && onStartSubmit && (
          <button type="button" className="fl-collab-next-cta" onClick={onStartSubmit}>
            <Upload size={14} aria-hidden="true" /> Submit version {delivery.version + 1}
          </button>
        )}
      </div>
    </header>

    {/* Main 2-column studio */}
    <div className="fl-rev-grid">
      {/* Left: Media stage */}
      <div className="fl-rev-stage-col">
        {files.length > 1 && (
          <div className="fl-rev-file-tabs" role="tablist" aria-label="Submitted files">
            {files.map(file => {
              const k = fileKind(file.content_type);
              const Icon = k === "image" ? ImageIcon : k === "video" ? Film : k === "audio" ? Music : FileText;
              const count = comments.filter(c => c.file_id === file.id).length;
              return (
                <button
                  key={file.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFile?.id === file.id}
                  className="fl-rev-file-tab"
                  data-active={activeFile?.id === file.id}
                  onClick={() => selectFile(file.id)}
                >
                  <Icon size={13} aria-hidden="true" />
                  <span>{file.filename}</span>
                  {count > 0 && <small>{count}</small>}
                </button>
              );
            })}
          </div>
        )}

        {activeFile ? (
          <div className="fl-rev-player-card">
            <div className="fl-rev-player-stage">
              {!activeEntry ? (
                <div className="fl-del-media-placeholder" role="status">
                  <span>Loading preview…</span>
                </div>
              ) : activeEntry.error || !activeEntry.url ? (
                <div className="fl-del-media-placeholder fl-del-media-error">
                  <p role="alert">{activeEntry.error || "Preview unavailable."}</p>
                  <button type="button" className="fl-del-media-retry" onClick={retryPreview}>
                    <RefreshCw size={13} aria-hidden="true" /> Retry preview
                  </button>
                </div>
              ) : activeKind === "video" ? (
                <video
                  key={activeFile.id}
                  ref={el => { mediaRef.current = el; }}
                  src={activeEntry.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="fl-rev-video"
                  onLoadedMetadata={e => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur)) setDurationMs(Math.round(dur * 1000));
                    if (pendingSeekRef.current !== null) {
                      e.currentTarget.currentTime = pendingSeekRef.current / 1000;
                      setCurrentMs(pendingSeekRef.current);
                      pendingSeekRef.current = null;
                    }
                  }}
                  onTimeUpdate={e => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
                />
              ) : activeKind === "audio" ? (
                <div className="fl-rev-audio-stage">
                  <Music size={28} aria-hidden="true" />
                  <audio
                    key={activeFile.id}
                    ref={el => { mediaRef.current = el; }}
                    src={activeEntry.url}
                    controls
                    preload="metadata"
                    className="fl-del-media-audio"
                    onLoadedMetadata={e => {
                      const dur = e.currentTarget.duration;
                      if (Number.isFinite(dur)) setDurationMs(Math.round(dur * 1000));
                      if (pendingSeekRef.current !== null) {
                        e.currentTarget.currentTime = pendingSeekRef.current / 1000;
                        setCurrentMs(pendingSeekRef.current);
                        pendingSeekRef.current = null;
                      }
                    }}
                    onTimeUpdate={e => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
                  />
                </div>
              ) : activeKind === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={activeEntry.url} alt={activeFile.filename} className="fl-rev-image" />
              ) : activeKind === "pdf" ? (
                <iframe src={activeEntry.url} title={activeFile.filename} className="fl-rev-pdf" />
              ) : (
                <div className="fl-del-media-placeholder">
                  <FileText size={24} aria-hidden="true" />
                  <span>Preview not supported for this file type</span>
                </div>
              )}
            </div>

            {/* Interactive timestamp bar for video & audio */}
            {isTimeBased && activeEntry?.url && (
              <div className="fl-rev-timeline-bar">
                <div className="fl-rev-timeline-head">
                  <span className="fl-rev-timecode">
                    <Clock size={12} aria-hidden="true" />
                    {formatTimecode(currentMs)}{durationMs > 0 ? ` / ${formatTimecode(durationMs)}` : ""}
                  </span>
                  <button type="button" className="fl-rev-pin-btn" onClick={pinCurrentTimestamp}>
                    <MessageSquare size={12} aria-hidden="true" /> Comment at {formatTimecode(currentMs)}
                  </button>
                </div>

                {durationMs > 0 && (
                  <div
                    className="fl-rev-scrubber"
                    role="slider"
                    aria-label="Timeline markers"
                    aria-valuemin={0}
                    aria-valuemax={durationMs}
                    aria-valuenow={currentMs}
                    tabIndex={0}
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      seekTo(Math.round(ratio * durationMs));
                    }}
                  >
                    <div className="fl-rev-scrubber-fill" style={{ width: `${Math.min(100, (currentMs / durationMs) * 100)}%` }} />
                    {activeTimelineComments.map(c => {
                      const pct = Math.min(100, Math.max(0, ((c.timestamp_ms ?? 0) / durationMs) * 100));
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="fl-rev-marker"
                          data-resolved={c.resolved}
                          style={{ left: `${pct}%` }}
                          title={`${formatTimecode(c.timestamp_ms ?? 0)} — ${c.body}`}
                          aria-label={`Jump to ${formatTimecode(c.timestamp_ms ?? 0)}: ${c.body}`}
                          onClick={e => { e.stopPropagation(); seekTo(c.timestamp_ms ?? 0, c.file_id); }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* File metadata footer */}
            <div className="fl-del-media-footer">
              <div className="fl-del-media-meta">
                <strong title={activeFile.filename}>{activeFile.filename}</strong>
                <span>{fileSize(activeFile.size_bytes)} · {fileBadge(activeFile.content_type)}</span>
              </div>
              <div className="fl-del-media-actions">
                {activeKind === "pdf" && activeEntry?.url && (
                  <a href={activeEntry.url} target="_blank" rel="noopener noreferrer" className="fl-del-media-link-btn" title="Open in new tab" aria-label="Open in new tab">
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
                <button type="button" className="fl-icon-btn" disabled={downloading} onClick={() => void downloadActive()} title="Download file" aria-label={`Download ${activeFile.filename}`}>
                  <Download size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Submitted links */}
        {delivery.links.length > 0 && (
          <ul className="fl-del-asset-list" aria-label="Submitted links">
            {delivery.links.map((link, idx) => (
              <li key={idx} className="fl-del-asset-row">
                <ExternalLink size={14} className="fl-del-asset-icon" aria-hidden="true" />
                <div className="fl-del-asset-copy">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
                  <span>{link.url}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Creator notes */}
        {delivery.notes && (
          <div className="fl-rev-notes-box">
            <small>Creator notes</small>
            <p>{delivery.notes}</p>
          </div>
        )}
      </div>

      {/* Right: Comments & change suggestions */}
      <aside className="fl-rev-comments-col" aria-label="Review comments">
        <div className="fl-rev-comments-head">
          <div className="fl-rev-comments-title">
            <h4>Review notes</h4>
            <div className="fl-rev-counts" aria-label={`${resolvedCount} resolved, ${openCount} open`}>
              <span className="fl-rev-count-pill" data-kind="resolved" title={`${resolvedCount} resolved`}>
                <Check size={11} aria-hidden="true" /> {resolvedCount}
              </span>
              <span className="fl-rev-count-pill" data-kind="open" title={`${openCount} unresolved`}>
                <Clock size={11} aria-hidden="true" /> {openCount}
              </span>
            </div>
          </div>
          <div className="fl-rev-filter-pills" role="tablist">
            <button type="button" role="tab" aria-selected={commentFilter === "all"} data-active={commentFilter === "all"} onClick={() => setCommentFilter("all")}>All</button>
            <button type="button" role="tab" aria-selected={commentFilter === "open"} data-active={commentFilter === "open"} onClick={() => setCommentFilter("open")}>Open</button>
            {files.length > 1 && activeFile && (
              <button type="button" role="tab" aria-selected={commentFilter === "file"} data-active={commentFilter === "file"} onClick={() => setCommentFilter("file")}>This file</button>
            )}
          </div>
        </div>

        <div className="fl-rev-comments-list">
          {commentsLoading ? (
            <p className="fl-rev-comments-empty" role="status">Loading comments…</p>
          ) : commentsError ? (
            <p className="fl-rev-comments-empty" role="alert">{commentsError}</p>
          ) : visibleComments.length === 0 ? (
            <div className="fl-rev-comments-empty">
              <MessageSquare size={20} aria-hidden="true" />
              <p>{comments.length === 0
                ? (isTimeBased
                  ? "Play the video and drop timestamped notes or change suggestions below."
                  : "Leave feedback or suggest specific changes below.")
                : "No comments match this filter."}</p>
            </div>
          ) : visibleComments.map(comment => {
            const targetFile = comment.file_id ? files.find(f => f.id === comment.file_id) : null;
            return (
              <article key={comment.id} className="fl-rev-comment" data-resolved={comment.resolved}>
                <div className="fl-rev-comment-top">
                  <div className="fl-rev-comment-author">
                    <strong>{comment.author_name}</strong>
                    <span className="fl-rev-role-tag" data-role={comment.author_role}>
                      {comment.author_role === "brand" ? "Brand" : "Creator"}
                    </span>
                    {comment.timestamp_ms !== null && (
                      <button
                        type="button"
                        className="fl-rev-ts-pill"
                        onClick={() => seekTo(comment.timestamp_ms!, comment.file_id)}
                        title="Jump to timestamp"
                      >
                        <Clock size={11} aria-hidden="true" /> {formatTimecode(comment.timestamp_ms)}
                      </button>
                    )}
                  </div>
                  <div className="fl-rev-comment-tools">
                    <button
                      type="button"
                      className="fl-rev-tool-btn"
                      data-resolved={comment.resolved}
                      disabled={busyCommentId === comment.id}
                      onClick={() => void toggleResolved(comment)}
                      title={comment.resolved ? "Mark unresolved" : "Mark resolved"}
                      aria-label={comment.resolved ? "Mark unresolved" : "Mark resolved"}
                    >
                      <Check size={13} aria-hidden="true" />
                    </button>
                    {comment.author_role === viewerRole && (
                      <button
                        type="button"
                        className="fl-rev-tool-btn fl-rev-tool-danger"
                        disabled={busyCommentId === comment.id}
                        onClick={() => void deleteComment(comment)}
                        title="Delete comment"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="fl-rev-comment-body">{comment.body}</p>
                <div className="fl-rev-comment-meta">
                  {targetFile && files.length > 1 && <span>{targetFile.filename} · </span>}
                  <span>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(Date.parse(comment.created_at))}</span>
                  {comment.resolved && <span className="fl-rev-resolved-tag">· Resolved</span>}
                </div>
              </article>
            );
          })}
        </div>

        {/* Composer */}
        <form className="fl-rev-composer" onSubmit={submitComment}>
          {isTimeBased && (
            <div className="fl-rev-composer-ts">
              {useTimestamp ? (
                <span className="fl-rev-ts-active">
                  <Clock size={12} aria-hidden="true" />
                  At {formatTimecode(activeTimestampMs)}
                  <button
                    type="button"
                    className="fl-rev-ts-clear"
                    onClick={() => { setUseTimestamp(false); setPinnedMs(null); }}
                    aria-label="Remove timestamp"
                    title="Comment without timestamp"
                  >
                    <X size={11} aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="fl-rev-ts-add"
                  onClick={pinCurrentTimestamp}
                >
                  <Clock size={12} aria-hidden="true" /> Attach timestamp ({formatTimecode(currentMs)})
                </button>
              )}
            </div>
          )}
          <textarea
            ref={composerRef}
            rows={3}
            maxLength={2000}
            value={draftBody}
            disabled={posting}
            placeholder={isTimeBased && useTimestamp
              ? `Comment or suggest a change at ${formatTimecode(activeTimestampMs)}…`
              : "Add a review comment or suggest changes…"}
            onFocus={() => {
              if (isTimeBased && useTimestamp && pinnedMs === null) {
                const el = mediaRef.current;
                if (el && !el.paused) {
                  el.pause();
                  setPinnedMs(Math.round(el.currentTime * 1000));
                }
              }
            }}
            onChange={e => setDraftBody(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submitComment();
              }
            }}
          />
          {postError && <p className="fl-rev-composer-err" role="alert">{postError}</p>}
          <div className="fl-rev-composer-foot">
            <small>⌘/Ctrl + Enter to post</small>
            <button type="submit" className="fl-collab-next-cta" disabled={posting || !draftBody.trim()}>
              <Send size={13} aria-hidden="true" /> {posting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  </div>;
}

