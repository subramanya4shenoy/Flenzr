"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import { feedbackPayload, feedbackRatings, feedbackStatus, type Feedback, type FeedbackCreate, type FeedbackWorkspace } from "@/lib/collaboration-feedback";

const roleLabel = (role: "brand" | "creator") => role === "brand" ? "Brand / client" : "Creator";

export function CollaborationFeedback({ collaborationId, status, onStatus, onSubmittedChange }: { collaborationId: string; status: Collaboration["status"]; onStatus?: (status: Collaboration["status"]) => void; onSubmittedChange?: (submitted: boolean) => void }) {
  const [attempt, setAttempt] = useState(0), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const key = `${collaborationId}:${status}:${attempt}`, path = `/${collaborationId}/feedback`;
  const [state, setState] = useState<{ key: string; data?: FeedbackWorkspace; error?: string } | null>(null);
  const loading = state?.key !== key, data = loading ? undefined : state?.data;
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<FeedbackWorkspace>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) {
        setState({ key, data });
        onStatus?.(data.collaboration_status);
        onSubmittedChange?.(data.items.some(row => row.is_mine));
      }
    }).catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load collaboration feedback." }); });
    return () => controller.abort();
  }, [key, path, onStatus, onSubmittedChange]);
  const reload = () => setAttempt(value => value + 1);
  return <section id="collaboration-feedback" className="fl-collab-feedback fl-collab-flat-section" aria-label="Collaboration feedback" aria-busy={loading}>
    <header className="fl-collab-sec-head"><div><h2>Collaboration feedback</h2><p>Share your experience after the collaboration is completed.</p></div><button type="button" className="fl-refresh-icon-btn" title="Refresh feedback" aria-label="Refresh feedback" disabled={loading || editing} onClick={() => { setNotice(""); reload(); }}><RefreshCw size={15} aria-hidden="true" /></button></header>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading feedback…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={reload}>Retry feedback</button></div> : data && <>
      <span className="fl-feedback-state">{feedbackStatus(data)}</span>
      {!data.completion_id ? <p>Feedback opens after the brand/client completes the approved delivery.</p> : <>
        <p>Visible only to you and your collaborator as soon as submitted. Feedback is final and does not appear on public profiles or affect public ratings.</p>
        <div className="fl-feedback-progress"><p>Your feedback: <strong>{data.items.some(row => row.is_mine) ? "Submitted" : "Not submitted"}</strong></p><p>{roleLabel(data.recipient_role)} feedback: <strong>{data.items.some(row => !row.is_mine) ? "Submitted" : "Awaiting feedback"}</strong></p></div>
        {data.can_submit && !editing && <button type="button" onClick={() => { setNotice(""); setEditing(true); }}>Leave feedback</button>}
        {editing && data.can_submit && <FeedbackEditor path={path} workspace={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice("Your feedback is saved and visible to your collaborator."); reload(); }} />}
        <div className="fl-feedback-list">{data.items.map(row => <FeedbackCard key={row.id} row={row} recipientName={row.is_mine ? data.recipient_name : "you"} />)}</div>
      </>}
    </>}
  </section>;
}

function FeedbackCard({ row, recipientName }: { row: Feedback; recipientName: string }) {
  return <article className="fl-feedback-card"><header><h3>{row.is_mine ? "Your feedback" : `${roleLabel(row.author_role)} feedback`}</h3><strong aria-label={`Rated ${row.rating} out of 5`}>{row.rating} / 5 · {feedbackRatings[row.rating - 1]}</strong></header><p>About {recipientName} · <time dateTime={row.submitted_at}>{new Date(row.submitted_at).toLocaleString()}</time></p><p className="fl-feedback-comment">{row.comment}</p></article>;
}

function FeedbackEditor({ path, workspace, onClose, onSaved }: { path: string; workspace: FeedbackWorkspace; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(0), [comment, setComment] = useState(""), [error, setError] = useState("");
  const [review, setReview] = useState<ReturnType<typeof feedbackPayload> | null>(null);
  const dirty = rating !== 0 || comment !== "";
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey) return;
      if (!window.confirm("Discard your unsubmitted feedback?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  function preview(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try { setReview(feedbackPayload(rating, comment)); }
    catch (error) { setError(error instanceof Error ? error.message : "Check your feedback."); }
  }
  return <form className="fl-feedback-editor" onSubmit={preview}><h3>Feedback about {workspace.recipient_name}</h3>
    <fieldset><legend>How was the collaboration?</legend><div className="fl-feedback-ratings">{feedbackRatings.map((label, index) => <label key={label}><input type="radio" name="feedback-rating" value={index + 1} checked={rating === index + 1} onChange={() => setRating(index + 1)} /><span><strong>{index + 1}</strong>{label}</span></label>)}</div></fieldset>
    <label className="fl-feedback-text">Your experience<textarea name="feedback-comment" rows={4} maxLength={4000} value={comment} onChange={event => setComment(event.target.value)} aria-describedby="feedback-comment-help" /></label><p id="feedback-comment-help">10–2,000 characters. Focus on the collaboration; avoid sharing private contact or account details.</p>
    {error && <p role="alert">{error}</p>}
    <div className="fl-shared-actions"><button type="button" onClick={() => { if (!dirty || window.confirm("Discard your unsubmitted feedback?")) onClose(); }}>Cancel feedback</button><button type="submit">Review feedback</button></div>
    {review && workspace.completion_id && <FeedbackDialog path={path} completionId={workspace.completion_id} payload={review} onClose={() => setReview(null)} onSaved={onSaved} />}
  </form>;
}

function FeedbackDialog({ path, completionId, payload, onClose, onSaved }: { path: string; completionId: string; payload: ReturnType<typeof feedbackPayload>; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), sending = useRef(false), request = useRef<FeedbackCreate | null>(null);
  const [attempt, setAttempt] = useState(0), [state, setState] = useState<{ attempt: number; data?: FeedbackWorkspace; error?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState("");
  const loading = state?.attempt !== attempt;
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<FeedbackWorkspace>(path, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (!data.can_submit || data.completion_id !== completionId) setState({ attempt, error: "The collaboration or your feedback has changed. Close this confirmation, cancel the draft and refresh feedback to see what is saved." });
      else setState({ attempt, data });
    }).catch(error => { if (!controller.signal.aborted) setState({ attempt, error: error instanceof Error ? error.message : "Could not check feedback eligibility." }); });
    return () => controller.abort();
  }, [path, completionId, attempt]);
  async function submit() {
    if (sending.current || !confirmed || !state?.data) return;
    sending.current = true; setBusy(true); setLocked(true); setError("");
    request.current ||= { ...payload, completion_id: completionId, request_id: crypto.randomUUID(), confirmed: true };
    try { await collaborationRequest<Feedback>(path, { method: "POST", body: JSON.stringify(request.current) }); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not submit feedback. Please retry."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="fl-shared-dialog" aria-labelledby="feedback-confirm-title" onCancel={event => { if (sending.current) event.preventDefault(); else onClose(); }}>
    <h2 id="feedback-confirm-title">Submit your feedback?</h2>
    {loading ? <p role="status">Checking the completed collaboration…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reload feedback check</button></div> : state?.data && <>
      <h3>About {state.data.recipient_name}</h3><p><strong>{payload.rating} / 5 · {feedbackRatings[payload.rating - 1]}</strong></p><p className="fl-feedback-comment">{payload.comment}</p>
      <p>Your collaborator can read this immediately. You can submit once, and cannot edit or replace it afterward. This feedback stays private to this collaboration.</p>
      <label className="fl-agreement-confirm"><input type="checkbox" name="confirm-feedback" checked={confirmed} disabled={busy || locked} onChange={event => setConfirmed(event.target.checked)} />I reviewed my rating and comment and want to share them with my collaborator.</label>
      {error && <p role="alert">{error} Your feedback details are preserved. Retry the same submission, or close and refresh feedback to check what was saved.</p>}
    </>}
    <div className="fl-shared-actions"><button type="button" disabled={busy} onClick={onClose}>Keep editing feedback</button>{!loading && state?.data && <button type="button" disabled={busy || !confirmed} onClick={submit}>{busy ? "Submitting feedback…" : "Submit feedback"}</button>}</div>
  </dialog>;
}
