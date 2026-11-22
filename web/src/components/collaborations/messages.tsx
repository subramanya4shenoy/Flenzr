"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, CheckCheck, Phone, PhoneIncoming, PhoneOff, RefreshCw, Send, Smile, Video,
} from "lucide-react";
import { collaborationRequest } from "@/lib/collaborations";
import {
  avatarProxyUrl, EMOJI_GROUPS, formatDayLabel, formatLastSeen, formatShortTime,
  messageText, QUICK_REACTIONS, type ChatParticipantMeta, type ChatSignalKind,
  type Message, type MessageCreate, type MessagePage, type MessageReactionSummary,
} from "@/lib/collaboration-messages";
import { VideoCallStage, type CallState } from "./video-call";
import "./chat.css";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "U";
}

function ChatAvatar({ name, url, online, size = "md" }: { name: string; url?: string | null; online?: boolean; size?: "sm" | "md" }) {
  const src = avatarProxyUrl(url);
  return <span className={`fl-chat-avatar fl-chat-avatar-${size}`}>
    {src ? <img src={src} alt={name} /> : <span>{initials(name)}</span>}
    {online !== undefined && <i className="fl-chat-online-dot" data-online={online} aria-hidden="true" />}
  </span>;
}

export function CollaborationMessages({ collaborationId, onActivity }: { collaborationId: string; onActivity?: () => void }) {
  const [cursors, setCursors] = useState<number[]>([]), [attempt, setAttempt] = useState(0);
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState<boolean | null>(null);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [peerLastRead, setPeerLastRead] = useState<number>(0);
  const [call, setCall] = useState<CallState>({ phase: "idle" });

  const sending = useRef(false);
  const request = useRef<MessageCreate | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callSignalHandlers = useRef<Set<(kind: string, payload: Record<string, unknown>) => void>>(new Set());

  const before = cursors.at(-1);
  const path = `/${collaborationId}/messages`;
  const key = `${path}:${before || "latest"}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: MessagePage; error?: string } | null>(null);
  const loading = state?.key !== key && !state?.data;
  const data = state?.data;

  const sendSignal = useCallback(async (kind: ChatSignalKind, payload: Record<string, unknown> = {}) => {
    try {
      await collaborationRequest(`/${collaborationId}/chat/signal`, {
        method: "POST",
        body: JSON.stringify({ kind, payload }),
      });
    } catch { /* Ephemeral signals never block chat. */ }
  }, [collaborationId]);

  const markRead = useCallback(async (sequence: number) => {
    if (sequence <= 0) return;
    try {
      await collaborationRequest(`${path}/read`, {
        method: "POST",
        body: JSON.stringify({ last_read_sequence: sequence }),
      });
      onActivity?.();
    } catch { /* Read receipt failure is non-fatal. */ }
  }, [path, onActivity]);

  // Initial / paginated fetch
  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<MessagePage>(`${path}?limit=30${before ? `&before=${before}` : ""}`, { signal: controller.signal })
      .then(page => {
        if (controller.signal.aborted) return;
        setState({ key, data: page });
        if (page.meta) {
          setPeerOnline(page.meta.peer_online);
          setPeerLastSeen(page.meta.peer_last_seen_at);
          setPeerLastRead(page.meta.peer_last_read_sequence);
        }
        if (!before && page.latest_sequence > (page.meta?.my_last_read_sequence || 0)) {
          void markRead(page.latest_sequence);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) setState({ key, error: err instanceof Error ? err.message : "Could not load messages." });
      });
    return () => controller.abort();
  }, [key, path, before, markRead]);

  // Real-time SSE stream for instant messages, typing, presence, read receipts & WebRTC signaling
  useEffect(() => {
    const source = new EventSource(`/api/collaborations/${collaborationId}/live`);

    source.addEventListener("ready", event => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data);
        if (typeof parsed.peer_online === "boolean") setPeerOnline(parsed.peer_online);
      } catch {}
    });

    source.addEventListener("presence", event => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data);
        setPeerOnline(Boolean(parsed.online));
        if (!parsed.online && parsed.at) setPeerLastSeen(parsed.at);
      } catch {}
    });

    source.addEventListener("typing", event => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data);
        const active = Boolean(parsed.payload?.active);
        setPeerTyping(active);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        if (active) {
          typingTimer.current = setTimeout(() => setPeerTyping(false), 4500);
        }
      } catch {}
    });

    source.addEventListener("message", event => {
      try {
        const incoming = JSON.parse((event as MessageEvent).data) as Message;
        setPeerTyping(false);
        setState(prev => {
          if (!prev?.data) return prev;
          if (prev.data.items.some(m => m.id === incoming.id)) return prev;
          return {
            ...prev,
            data: {
              ...prev.data,
              items: [...prev.data.items, incoming],
              latest_sequence: Math.max(prev.data.latest_sequence, incoming.sequence),
            },
          };
        });
        void markRead(incoming.sequence);
        onActivity?.();
      } catch {}
    });

    source.addEventListener("read", event => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data);
        if (typeof parsed.last_read_sequence === "number") {
          setPeerLastRead(prev => Math.max(prev, parsed.last_read_sequence));
        }
      } catch {}
    });

    source.addEventListener("reaction", event => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { message_id: string; reactions: MessageReactionSummary[] };
        setState(prev => {
          if (!prev?.data) return prev;
          return {
            ...prev,
            data: {
              ...prev.data,
              items: prev.data.items.map(m => m.id === parsed.message_id ? { ...m, reactions: parsed.reactions } : m),
            },
          };
        });
      } catch {}
    });

    const forwardCall = (kind: string) => (event: Event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data);
        const payload = (parsed.payload || {}) as Record<string, unknown>;
        const callId = String(payload.call_id || "");
        if (kind === "call_ring" && callId) {
          setCall(prev => prev.phase === "idle" ? { phase: "incoming", callId } : prev);
        } else if (kind === "call_accept" && callId) {
          setCall(prev => prev.phase === "outgoing" && prev.callId === callId
            ? { phase: "active", callId, isCaller: true, connectedAt: Date.now() } : prev);
        } else if (kind === "call_decline" || kind === "call_end") {
          setCall(prev => prev.phase !== "idle" && (!callId || prev.callId === callId) ? { phase: "idle" } : prev);
        }
        callSignalHandlers.current.forEach(fn => fn(kind, payload));
      } catch {}
    };

    for (const kind of ["call_ring", "call_accept", "call_decline", "call_offer", "call_answer", "call_ice", "call_end"]) {
      source.addEventListener(kind, forwardCall(kind));
    }

    const heartbeat = window.setInterval(() => { void sendSignal("heartbeat"); }, 45_000);
    return () => {
      window.clearInterval(heartbeat);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typingThrottle.current) clearTimeout(typingThrottle.current);
      source.close();
    };
  }, [collaborationId, markRead, onActivity, sendSignal]);

  // Auto-scroll to latest message / typing indicator
  const itemCount = data?.items.length || 0;
  useEffect(() => {
    if (list.current && !before) {
      list.current.scrollTop = list.current.scrollHeight;
    }
  }, [itemCount, peerTyping, before]);

  // Unsent text guard
  useEffect(() => {
    if (!text) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [text]);

  function handleTyping(nextValue: string) {
    setText(nextValue);
    if (nextValue.trim()) {
      if (!typingThrottle.current) {
        void sendSignal("typing", { active: true });
        typingThrottle.current = setTimeout(() => { typingThrottle.current = null; }, 2200);
      }
    } else if (typingThrottle.current) {
      clearTimeout(typingThrottle.current);
      typingThrottle.current = null;
      void sendSignal("typing", { active: false });
    }
  }

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) {
      handleTyping(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    handleTyping(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  async function postMessage(content: string, messageType: "text" | "call_event" = "text") {
    const payload: MessageCreate = { request_id: crypto.randomUUID(), text: content, message_type: messageType };
    const saved = await collaborationRequest<Message>(path, { method: "POST", body: JSON.stringify(payload) });
    setState(prev => {
      if (!prev?.data) return prev;
      if (prev.data.items.some(m => m.id === saved.id)) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          items: [...prev.data.items, saved],
          latest_sequence: Math.max(prev.data.latest_sequence, saved.sequence),
        },
      };
    });
    onActivity?.();
    return saved;
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (sending.current || !data || !text.trim()) return;
    setError("");
    try {
      request.current ||= { request_id: crypto.randomUUID(), text: messageText(text), message_type: "text" };
      sending.current = true; setBusy(true); setLocked(true);
      const saved = await collaborationRequest<Message>(path, { method: "POST", body: JSON.stringify(request.current) });
      request.current = null; setLocked(false); setText(""); setEmojiOpen(false);
      if (typingThrottle.current) { clearTimeout(typingThrottle.current); typingThrottle.current = null; }
      void sendSignal("typing", { active: false });
      setState(prev => {
        if (!prev?.data) return prev;
        if (prev.data.items.some(m => m.id === saved.id)) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            items: [...prev.data.items, saved],
            latest_sequence: Math.max(prev.data.latest_sequence, saved.sequence),
          },
        };
      });
      onActivity?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this message. Please retry.");
    } finally {
      sending.current = false; setBusy(false);
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    try {
      const updated = await collaborationRequest<MessageReactionSummary[]>(`${path}/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      setState(prev => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            items: prev.data.items.map(m => m.id === messageId ? { ...m, reactions: updated } : m),
          },
        };
      });
    } catch { /* Non-fatal. */ }
  }

  const registerSignalHandler = useCallback((handler: (kind: string, payload: Record<string, unknown>) => void) => {
    callSignalHandlers.current.add(handler);
    return () => { callSignalHandlers.current.delete(handler); };
  }, []);

  async function startCall() {
    if (call.phase !== "idle") return;
    const callId = crypto.randomUUID();
    setCall({ phase: "outgoing", callId, startedAt: Date.now() });
    await sendSignal("call_ring", { call_id: callId });
  }

  async function acceptCall() {
    if (call.phase !== "incoming") return;
    const callId = call.callId;
    await sendSignal("call_accept", { call_id: callId });
    setCall({ phase: "active", callId, isCaller: false, connectedAt: Date.now() });
  }

  async function declineOrCancelCall() {
    if (call.phase === "idle") return;
    const callId = call.callId;
    const wasOutgoing = call.phase === "outgoing";
    setCall({ phase: "idle" });
    await sendSignal(wasOutgoing ? "call_end" : "call_decline", { call_id: callId });
    if (wasOutgoing) {
      void postMessage("Missed video call", "call_event").catch(() => {});
    }
  }

  async function endActiveCall(durationSeconds: number) {
    if (call.phase !== "active") return;
    const callId = call.callId;
    setCall({ phase: "idle" });
    await sendSignal("call_end", { call_id: callId });
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const summary = mins > 0 ? `Video call · ${mins}m ${secs}s` : `Video call · ${secs}s`;
    void postMessage(summary, "call_event").catch(() => {});
  }

  const meta: ChatParticipantMeta | null | undefined = data?.meta;
  const peerName = meta?.peer_name || "Collaborator";
  const online = peerOnline ?? meta?.peer_online ?? false;
  const statusText = peerTyping ? "Typing…" : formatLastSeen(peerLastSeen ?? meta?.peer_last_seen_at, online);
  const inActiveCall = call.phase === "active";

  return <section id="collaboration-messages" className="fl-chat-container" aria-label="Private collaboration chat">
    <div className="fl-chat-shell" data-in-call={inActiveCall}>
    {/* Active Video Call Split Stage */}
    {call.phase === "active" && <VideoCallStage
      callId={call.callId}
      isCaller={call.isCaller}
      peerName={peerName}
      peerAvatarUrl={meta?.peer_avatar_url || null}
      sendSignal={sendSignal}
      registerSignalHandler={registerSignalHandler}
      onEnd={secs => void endActiveCall(secs)}
    />}

    <div className="fl-chat-pane">
      {/* Chat Header */}
      <header className="fl-chat-header">
        <div className="fl-chat-peer">
          <ChatAvatar name={peerName} url={meta?.peer_avatar_url} online={online} />
          <div className="fl-chat-peer-copy">
            <h2>{peerName}</h2>
            <p className="fl-chat-presence" data-typing={peerTyping} data-online={online}>{statusText}</p>
          </div>
        </div>
        <div className="fl-chat-header-actions">
          <button type="button" className="fl-chat-icon-btn fl-chat-call-btn" disabled={call.phase !== "idle" || loading} onClick={() => void startCall()} title="Start video call" aria-label="Start video call">
            <Video size={16} aria-hidden="true" />
            <span>Video call</span>
          </button>
          <button type="button" className="fl-chat-icon-btn" disabled={loading || busy} onClick={() => { setCursors([]); setAttempt(v => v + 1); }} title="Refresh messages" aria-label="Refresh messages">
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Incoming / Outgoing Ringing Banner */}
      {call.phase === "incoming" && <div className="fl-call-banner" role="alert">
        <div className="fl-call-banner-copy"><PhoneIncoming size={17} aria-hidden="true" /><span><strong>{peerName}</strong> is calling you on video…</span></div>
        <div className="fl-call-banner-actions">
          <button type="button" className="fl-call-accept" onClick={() => void acceptCall()}><Phone size={14} aria-hidden="true" /> Accept</button>
          <button type="button" className="fl-call-decline" onClick={() => void declineOrCancelCall()}><PhoneOff size={14} aria-hidden="true" /> Decline</button>
        </div>
      </div>}

      {call.phase === "outgoing" && <div className="fl-call-banner" role="status">
        <div className="fl-call-banner-copy"><Video size={17} aria-hidden="true" /><span>Calling <strong>{peerName}</strong>… waiting for answer</span></div>
        <div className="fl-call-banner-actions">
          <button type="button" className="fl-call-decline" onClick={() => void declineOrCancelCall()}><PhoneOff size={14} aria-hidden="true" /> Cancel</button>
        </div>
      </div>}

      {/* Message Feed */}
      <div className="fl-chat-body" ref={list} tabIndex={0} role="region" aria-label="Conversation history" aria-busy={loading}>
        {loading ? <p className="fl-chat-empty" role="status">Loading conversation…</p>
          : state?.error && !data ? <div className="fl-chat-empty" role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(v => v + 1)}>Retry</button></div>
          : data && <>
            {data.next_before !== null && <div className="fl-chat-load-more">
              <button type="button" disabled={busy} onClick={() => { const c = data.next_before; if (c !== null) setCursors(old => [...old, c]); }}>Load older messages</button>
            </div>}
            {cursors.length > 0 && <div className="fl-chat-load-more">
              <button type="button" disabled={busy} onClick={() => setCursors([])}>Jump to latest</button>
            </div>}

            {!data.items.length ? <div className="fl-chat-empty">
              <p>Start the conversation with <strong>{peerName}</strong>.</p>
              <small>Messages are private to you and your collaborator. Agreed terms still require a proposal.</small>
            </div> : <ol className="fl-chat-list">
              {data.items.map((message, index) => {
                const prev = data.items[index - 1];
                const day = formatDayLabel(message.sent_at);
                const showDay = !prev || formatDayLabel(prev.sent_at) !== day;
                const isRead = message.is_mine && peerLastRead >= message.sequence;
                const reactions = message.reactions || [];

                return <li key={message.id} className="fl-chat-row-wrap">
                  {showDay && <div className="fl-chat-day"><span>{day}</span></div>}
                  {message.message_type === "call_event" ? (
                    <div className="fl-chat-call-event">
                      <Video size={13} aria-hidden="true" />
                      <span>{message.text}</span>
                      <time dateTime={message.sent_at}>{formatShortTime(message.sent_at)}</time>
                    </div>
                  ) : (
                    <div className="fl-chat-row" data-mine={message.is_mine}>
                      {!message.is_mine && <ChatAvatar name={peerName} url={meta?.peer_avatar_url} size="sm" />}
                      <div className="fl-chat-bubble-col">
                        <div className="fl-chat-bubble-wrap">
                          <div className="fl-chat-bubble" data-mine={message.is_mine}>
                            <p>{message.text}</p>
                            <span className="fl-chat-meta">
                              <time dateTime={message.sent_at}>{formatShortTime(message.sent_at)}</time>
                              {message.is_mine && (isRead
                                ? <CheckCheck size={14} className="fl-chat-tick-read" aria-label="Read" />
                                : <Check size={14} className="fl-chat-tick-sent" aria-label="Sent" />)}
                            </span>
                          </div>
                          <div className="fl-chat-quick-react" aria-label="Quick reactions">
                            {QUICK_REACTIONS.map(emoji => (
                              <button key={emoji} type="button" onClick={() => void toggleReaction(message.id, emoji)} aria-label={`React with ${emoji}`}>{emoji}</button>
                            ))}
                          </div>
                        </div>
                        {reactions.length > 0 && <div className="fl-chat-reactions">
                          {reactions.map(r => (
                            <button key={r.emoji} type="button" data-mine={r.reacted_by_me} onClick={() => void toggleReaction(message.id, r.emoji)}>
                              <span>{r.emoji}</span>{r.count > 1 && <small>{r.count}</small>}
                            </button>
                          ))}
                        </div>}
                      </div>
                      {message.is_mine && <ChatAvatar name="You" url={meta?.my_avatar_url} size="sm" />}
                    </div>
                  )}
                </li>;
              })}
            </ol>}

            {peerTyping && <div className="fl-chat-row" data-mine={false} aria-live="polite">
              <ChatAvatar name={peerName} url={meta?.peer_avatar_url} size="sm" />
              <div className="fl-chat-typing-bubble" aria-label={`${peerName} is typing`}>
                <span /><span /><span />
              </div>
            </div>}
          </>}
      </div>

      {/* Composer + Emoji Picker */}
      <form className="fl-chat-composer" onSubmit={event => void send(event)}>
        {error && <p className="fl-chat-error" role="alert">{error}{locked && " Retry to confirm whether it was sent."}</p>}
        {emojiOpen && <div className="fl-emoji-popover" role="dialog" aria-label="Emoji picker">
          {EMOJI_GROUPS.map(group => (
            <div key={group.label} className="fl-emoji-group">
              <span>{group.label}</span>
              <div>{group.emojis.map(emoji => (
                <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}>{emoji}</button>
              ))}</div>
            </div>
          ))}
        </div>}
        <div className="fl-chat-input-bar">
          <button type="button" className="fl-chat-emoji-btn" onClick={() => setEmojiOpen(v => !v)} aria-expanded={emojiOpen} aria-label="Add emoji" title="Emoji">
            <Smile size={18} aria-hidden="true" />
          </button>
          <textarea
            ref={inputRef}
            id="collaboration-message-text"
            name="message-text"
            rows={1}
            maxLength={8000}
            placeholder={`Message ${peerName}…`}
            value={text}
            disabled={busy || locked}
            onChange={event => handleTyping(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" className="fl-chat-send-btn" disabled={busy || !data || !text.trim()} aria-label="Send message" title="Send (Enter)">
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
    </div>
  </section>;
}
