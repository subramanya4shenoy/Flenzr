"use client";
import { useEffect, useRef, useState } from "react";
import { collaborationRequest } from "@/lib/collaborations";
import { messageText, type Message, type MessageCreate, type MessagePage } from "@/lib/collaboration-messages";

export function CollaborationMessages({ collaborationId }: { collaborationId: string }) {
  const [cursors, setCursors] = useState<number[]>([]), [attempt, setAttempt] = useState(0);
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const sending = useRef(false), request = useRef<MessageCreate | null>(null), list = useRef<HTMLDivElement>(null);
  const before = cursors.at(-1), path = `/${collaborationId}/messages`, key = `${path}:${before || "latest"}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: MessagePage; error?: string } | null>(null);
  const loading = state?.key !== key, data = loading ? undefined : state?.data;
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<MessagePage>(`${path}?limit=20${before ? `&before=${before}` : ""}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load messages." }); });
    return () => controller.abort();
  }, [key, path, before]);
  useEffect(() => { if (data && list.current) list.current.scrollTop = list.current.scrollHeight; }, [data]);
  useEffect(() => {
    if (!text) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey) return;
      if (!window.confirm(locked ? "This send has not been confirmed. Leave and check the conversation later?" : "Discard your unsent message?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [text, locked]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current || !data) return;
    setError(""); setNotice("");
    try {
      request.current ||= { request_id: crypto.randomUUID(), text: messageText(text) };
      sending.current = true; setBusy(true); setLocked(true);
      await collaborationRequest<Message>(path, { method: "POST", body: JSON.stringify(request.current) });
      request.current = null; setLocked(false); setText(""); setNotice("Message sent."); setCursors([]); setAttempt(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send this message. Please retry."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <section id="collaboration-messages" className="fl-collab-messages" aria-label="Private collaboration messages">
    <header><div><h2>Messages</h2><p>Private conversation with your collaborator. Refresh to check for replies.</p></div><button type="button" disabled={loading || busy} onClick={() => { setCursors([]); setAttempt(value => value + 1); }}>Refresh messages</button></header>
    {notice && <p role="status">{notice}</p>}
    <div aria-busy={loading}>
      {loading ? <p role="status">Loading messages…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry messages</button></div> : data && <>
        <nav aria-label="Message history"><button type="button" disabled={data.next_before === null || busy} onClick={() => { const cursor = data.next_before; if (cursor !== null) setCursors(old => [...old, cursor]); }}>Older messages</button><span>{data.items.length ? `${data.items[0].sequence}–${data.items.at(-1)!.sequence} of ${data.latest_sequence}` : "No messages yet"}</span><button type="button" disabled={!cursors.length || busy} onClick={() => setCursors(old => old.slice(0, -1))}>Newer messages</button></nav>
        <div className="fl-message-history" ref={list} tabIndex={0} role="region" aria-label="Conversation history">
          {!data.items.length ? <p>Start the conversation. Only the two saved participants can read these messages.</p> : <ol>{data.items.map(message => <li key={message.id} className={message.is_mine ? "fl-message-mine" : ""}><div><strong>{message.is_mine ? "You" : message.author_role === "brand" ? "Brand / client" : "Creator"}</strong><time dateTime={message.sent_at}>{new Date(message.sent_at).toLocaleString()}</time></div><p>{message.text}</p></li>)}</ol>}
        </div>
      </>}
    </div>
    <form className="fl-message-composer" onSubmit={send}>
      <label htmlFor="collaboration-message-text">Your message</label><textarea id="collaboration-message-text" name="message-text" rows={3} maxLength={8000} value={text} disabled={busy || locked} onChange={event => setText(event.target.value)} aria-describedby="message-help" />
      <p id="message-help">Up to 4,000 characters. Changes to agreed terms still need a proposal.</p>
      {error && <p role="alert">{error}{locked && " Retry this same message to confirm whether it was sent."}</p>}
      <button type="submit" disabled={busy || !data || !text.trim()}>{busy ? "Sending message…" : locked ? "Retry send" : "Send message"}</button>
    </form>
  </section>;
}
