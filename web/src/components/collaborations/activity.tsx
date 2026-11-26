"use client";

import { useEffect, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { collaborationRequest } from "@/lib/collaborations";
import { activityActor, mergeActivity, type ActivityEvent, type ActivityPage, type ActivitySection } from "@/lib/collaboration-activity";
import "./activity.css";

export function CollaborationActivity({ collaborationId, onOpenSection }: {
  collaborationId: string; onOpenSection: (section: ActivitySection) => void;
}) {
  const [before, setBefore] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${collaborationId}:${before || "latest"}:${attempt}`;
  const [state, setState] = useState<{
    key: string; items: ActivityEvent[]; nextCursor: string | null; error?: string;
  } | null>(null);
  const pending = state?.key !== key;
  const items = state?.items || [];

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ limit: "25" });
    if (before) query.set("before", before);
    collaborationRequest<ActivityPage>(`/${collaborationId}/activity?${query}`, { signal: controller.signal })
      .then(page => {
        if (controller.signal.aborted) return;
        setState(previous => ({ key, items: before ? mergeActivity(previous?.items || [], page.items) : page.items, nextCursor: page.next_cursor }));
      })
      .catch(error => {
        if (!controller.signal.aborted) setState(previous => ({
          key, items: previous?.items || [], nextCursor: previous?.nextCursor || null,
          error: error instanceof Error ? error.message : "Could not load activity history.",
        }));
      });
    return () => controller.abort();
  }, [before, collaborationId, key]);

  return <section className="fl-collab-activity" aria-label="Collaboration activity history">
    <header>
      <div><h2>Activity history</h2><p>Saved collaboration actions · newest first</p></div>
      <button type="button" disabled={pending} onClick={() => { setBefore(null); setAttempt(value => value + 1); }}>
        <RefreshCw size={14} aria-hidden="true" /> Refresh activity
      </button>
    </header>
    {!pending && state?.error && <div className="fl-collab-activity-error" role="alert">
      <p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry activity</button>
    </div>}
    {pending && !items.length && <WorkspaceLoader label="Loading activity history…" />}
    {!pending && !state?.error && !items.length && <p>No saved activity yet.</p>}
    <ol aria-label="Saved collaboration actions" aria-busy={pending}>
      {items.map(event => <li key={event.id} data-event-id={event.id}>
        <span className="fl-collab-activity-marker" aria-hidden="true"><Clock3 size={14} /></span>
        <div className="fl-collab-activity-entry">
          <h3>{event.title}</h3><p>{event.description}</p>
          <div className="fl-collab-activity-meta"><span>{activityActor(event)}</span>
            <time dateTime={event.occurred_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}</time>
          </div>
          <button type="button" onClick={() => onOpenSection(event.section)}>
            {event.section === "overview" ? "Open overview" : event.section === "proposals" ? "Open proposals & agreement" : event.section === "deliveries" ? "Open deliveries & review" : "Open publishing proof"}
          </button>
        </div>
      </li>)}
    </ol>
    {state?.nextCursor && !state.error && <button type="button" disabled={pending} onClick={() => setBefore(state.nextCursor)}>{pending ? before ? "Loading older activity…" : "Refreshing activity…" : "Load older activity"}</button>}
    <p className="fl-collab-activity-note">Private drafts, chat and feedback are not included. The starting participant was not recorded.</p>
  </section>;
}
