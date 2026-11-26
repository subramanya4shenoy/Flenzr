"use client";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, Handshake, MessageSquare, RefreshCw, Users } from "lucide-react";
import { collaborationRequest, type Collaboration, type CollaborationGroupItem, type CollaborationGroupPage } from "@/lib/collaborations";
import { collaborationStatusLabel, parseRecentCollaborations, recentCollaborations, recentCollaborationsEvent, recentCollaborationsKey, recentHref, withOpenedRecent, withoutRecent, type RecentCollaboration } from "@/lib/collaboration-recents";
import { campaignMoney } from "@/lib/campaign-drafts";
import "@/components/brand/campaign-folders.css";
import "./collaborations.css";
import type { ProofWorkspace } from "@/lib/publishing-proof";
import type { FeedbackWorkspace } from "@/lib/collaboration-feedback";
import { CollaborationMessages } from "./messages";
import { CollaborationFeedback } from "./feedback";
import { CollaborationProof } from "./publishing-proof";
import { CollaborationDeliveries } from "./deliveries";
import { CollaborationProposals } from "./proposals";

const pageSize = 10;
const shortDate = (value: string | null | undefined) => {
  const parsed = value ? Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value) : NaN;
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", ...(value?.length === 10 ? { timeZone: "UTC" } : {}) }).format(parsed) : "—";
};
const sourceLabel: Record<CollaborationGroupItem["source_kind"], string> = { offer: "Offer", application: "Offer application", invitation: "Offer invitation", enquiry: "Direct enquiry" };

function subscribeRecents(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(recentCollaborationsEvent, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(recentCollaborationsEvent, notify); };
}
/** Recently opened collaborations, saved on this device for the signed-in account only. */
function useRecentCollaborations(viewerId?: string) {
  const key = viewerId ? recentCollaborationsKey(viewerId) : "";
  const raw = useSyncExternalStore(subscribeRecents, () => {
    if (!key) return "";
    try { return localStorage.getItem(key) || ""; } catch { return ""; }
  }, () => "");
  const write = useCallback((update: (rows: RecentCollaboration[]) => RecentCollaboration[]) => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(update(parseRecentCollaborations(localStorage.getItem(key)))));
      window.dispatchEvent(new Event(recentCollaborationsEvent));
    } catch { /* Recency must never block opening a collaboration. */ }
  }, [key]);
  return { rows: parseRecentCollaborations(raw), write };
}

export function SharedCollaborations({ id, viewerId }: { id?: string; viewerId?: string }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const key = `${id || "list"}:${page}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: CollaborationGroupPage; row?: Collaboration; error?: string; missing?: boolean } | null>(null);
  const loading = state?.key !== key;
  const recents = useRecentCollaborations(viewerId);
  const { write } = recents;
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const request = id ? collaborationRequest<Collaboration>(`/${id}`, options).then(row => ({ row }))
      : collaborationRequest<CollaborationGroupPage>(`/groups?page=${page}&page_size=${pageSize}`, options).then(data => ({ data }));
    request.then(result => { if (!controller.signal.aborted) setState({ key, ...result }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load collaborations.", missing: error instanceof Error && error.message.startsWith("This record is unavailable") }); });
    return () => controller.abort();
  }, [id, page, key]);
  // Record openings; drop shortcuts the viewer can no longer access.
  useEffect(() => {
    if (!id || !state || state.key !== key) return;
    if (state.row) {
      const r = state.row;
      write(rows => withOpenedRecent(rows, { kind: "collaboration", id: r.id, title: r.title, subtitle: `${r.brand_name} · ${r.creator_name}`, status: r.status }));
    } else if (state.missing) write(rows => withoutRecent(rows, "collaboration", id));
  }, [id, key, state, write]);
  const pages = state?.data ? Math.max(1, Math.ceil(state.data.total / state.data.page_size)) : 1;
  return <section className="fl-shared" aria-label="Shared collaborations" aria-busy={loading}>
    {!id && <header><div><h1>Collaborations</h1><p>Shared records for you and your collaborator.</p></div><button type="button" className="fl-refresh-icon-btn" title="Refresh collaborations" aria-label="Refresh collaborations" disabled={loading} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} aria-hidden="true" /></button></header>}
    {id && !state?.row && <nav className="fl-collab-breadcrumb" aria-label="Breadcrumb"><ol><li><Link href="/dashboard/collaborations">Collaborations</Link></li><li aria-current="page">Collaboration</li></ol></nav>}
    {loading ? <WorkspaceLoader label="Loading collaborations…" /> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : state?.row ? <Detail row={state.row} /> : state?.data && <CollaborationLibrary data={state.data} page={page} pages={pages} recent={recentCollaborations(recents.rows, state.data.items)} onPage={setPage} />}
  </section>;
}

function CollaborationLibrary({ data, page, pages, recent, onPage }: { data: CollaborationGroupPage; page: number; pages: number; recent: RecentCollaboration[]; onPage: (page: number) => void }) {
  const router = useRouter();
  const href = (row: Pick<CollaborationGroupItem, "kind" | "id">) => recentHref(row);
  if (!data.total) return <div className="fl-campaign-folder-empty"><Handshake size={36} aria-hidden="true" /><h2>No collaborations yet</h2><p>Start one from an accepted enquiry, application or invitation.</p></div>;
  return <div className="fl-campaign-library fl-collab-library">
    <section aria-labelledby="recent-collaborations-title">
      <div className="fl-campaign-library-heading"><div><h2 id="recent-collaborations-title">Recently opened</h2><p>Pick up where you left off.</p></div><span>Most recently opened first</span></div>
      <div className="fl-campaign-folder-grid">{recent.map(item => <Link className="fl-campaign-folder" key={`${item.kind}:${item.id}`} href={recentHref(item)} title={item.title}>
        <span className="fl-campaign-folder-back" aria-hidden="true" />
        <span className="fl-campaign-folder-copy">
          <span className="fl-campaign-folder-name">{item.title}</span>
          <span className="fl-collab-folder-people">{item.subtitle}</span>
          <span className="fl-campaign-folder-date"><Clock3 size={11} aria-hidden="true" /><span>Opened {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(Date.parse(item.opened_at))}</span></span>
        </span>
      </Link>)}</div>
      {!recent.length && <p className="fl-campaign-recent-empty">Open a collaboration from the table below. It will appear here for quick access next time.</p>}
    </section>
    <section aria-labelledby="all-collaborations-title">
      <div className="fl-campaign-library-heading fl-campaign-library-table-heading"><div><h2 id="all-collaborations-title">All collaborations <span>{data.total}</span></h2><p>Every shared collaboration, newest first.</p></div></div>
      <div className="fl-campaign-table-wrap" role="region" aria-label="All collaborations" tabIndex={0}><table className="fl-campaign-table fl-collab-table"><thead><tr>
        <th scope="col">Collaboration</th><th scope="col">Brand</th><th scope="col">Influencers</th><th scope="col">Status</th><th scope="col">Budget / Quote</th><th scope="col">Target date</th><th scope="col">Last updated</th><th scope="col"><span className="fl-campaign-visually-hidden">Open collaboration</span></th>
      </tr></thead><tbody>{data.items.map(row => <tr key={`${row.kind}:${row.id}`} onClick={event => { if (!(event.target as HTMLElement).closest("a")) router.push(href(row)); }}>
        <td><Link className="fl-campaign-table-name" href={href(row)}><span className="fl-campaign-table-icon">{row.kind === "offer" ? <Users size={18} aria-hidden="true" /> : <Handshake size={18} aria-hidden="true" />}</span><span><strong>{row.title}</strong><small>{sourceLabel[row.source_kind]}</small></span></Link></td>
        <td>{row.brand_name}</td>
        <td>{row.kind === "offer" ? <span className="fl-collab-count-cell"><strong>{row.creator_count} {row.creator_count === 1 ? "influencer" : "influencers"}</strong><small>{row.agreed_count} agreed · {row.completed_count} done</small></span> : row.creator_name}</td>
        <td><span className="fl-campaign-folder-status" data-active={row.status !== "completed"} data-state={row.status}>{collaborationStatusLabel(row.status)}</span></td>
        <td className="fl-campaign-table-budget">{row.quoted_amount_cents === null ? <span className="fl-campaign-table-muted">To discuss</span> : campaignMoney(row.quoted_amount_cents, row.currency)}</td>
        <td className="fl-campaign-table-date">{row.requested_delivery_date ? shortDate(row.requested_delivery_date) : <span className="fl-campaign-table-muted">To discuss</span>}</td>
        <td className="fl-campaign-table-date">{shortDate(row.updated_at)}</td>
        <td><ArrowUpRight size={15} aria-hidden="true" /></td>
      </tr>)}</tbody></table></div>
      <nav className="fl-collab-pagination" aria-label="Collaboration pages">
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} aria-hidden="true" /> Previous</button>
        <span aria-current="page">Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">Next <ChevronRight size={14} aria-hidden="true" /></button>
      </nav>
    </section>
  </div>;
}

type CollaborationStep = "overview" | "proposals" | "deliveries" | "proof" | "feedback" | "messages";
const workflowSteps: { id: Exclude<CollaborationStep, "messages">; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "proposals", label: "Proposals & Agreement" },
  { id: "deliveries", label: "Deliveries & Review" },
  { id: "proof", label: "Publishing Proof" },
  { id: "feedback", label: "Feedback" },
];
const stepIds = new Set<string>([...workflowSteps.map(step => step.id), "messages"]);
function stepFromHash(hash: string): CollaborationStep {
  const clean = hash.replace(/^#/, "");
  if (clean === "collaboration-feedback") return "feedback";
  return stepIds.has(clean) ? (clean as CollaborationStep) : "overview";
}

function Detail({ row }: { row: Collaboration }) {
  const [status, setStatus] = useState(row.status);
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [step, setStep] = useState<CollaborationStep>(() => (typeof window !== "undefined" ? stepFromHash(window.location.hash) : "overview"));

  useEffect(() => {
    const sync = () => setStep(stepFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);

  useEffect(() => {
    if (status === "discussion") return;
    const controller = new AbortController();
    collaborationRequest<ProofWorkspace>(`/${row.id}/publishing-proof?page=1&page_size=1`, { signal: controller.signal })
      .then(res => {
        if (!controller.signal.aborted) {
          const latestItem = res.items.find(item => item.version === res.latest_proof_version) ?? res.items[0];
          setProofConfirmed(Boolean(res.latest_proof_version > 0 && latestItem?.version === res.latest_proof_version && latestItem?.confirmation));
        }
      })
      .catch(() => { /* Step badge check is best-effort. */ });
    if (status === "completed") {
      collaborationRequest<FeedbackWorkspace>(`/${row.id}/feedback`, { signal: controller.signal })
        .then(res => {
          if (!controller.signal.aborted) setFeedbackSubmitted(res.items.some(item => item.is_mine));
        })
        .catch(() => { /* Step badge check is best-effort. */ });
    }
    return () => controller.abort();
  }, [row.id, status]);

  function selectStep(next: CollaborationStep) {
    setStep(next);
    const hash = next === "overview" ? "" : `#${next}`;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  }

  const isDone = (id: CollaborationStep) =>
    (id === "overview" && status !== "discussion")
    || (id === "proposals" && (status === "agreed" || status === "completed"))
    || (id === "deliveries" && status === "completed")
    || (id === "proof" && proofConfirmed)
    || (id === "feedback" && feedbackSubmitted);

  const nextWorkflowStep = workflowSteps[workflowSteps.findIndex(item => item.id === step) + 1];
  const prevWorkflowStep = workflowSteps[workflowSteps.findIndex(item => item.id === step) - 1];
  const currentStepLabel = step === "messages" ? "Messages" : workflowSteps.find(item => item.id === step)?.label || "Overview";

  return <div className="fl-collab-detail">
    <aside className="fl-collab-sidebar" aria-label="Collaboration steps">
      <div className="fl-collab-sidebar-group">
        <span className="fl-collab-sidebar-label">Workflow</span>
        <div className="fl-collab-sidebar-list" role="tablist" aria-orientation="vertical" aria-label="Collaboration workflow steps">
          {workflowSteps.map(item => {
            const active = step === item.id;
            const done = isDone(item.id);
            return <button key={item.id} type="button" role="tab" aria-selected={active} className="fl-collab-step" data-active={active} data-done={done} onClick={() => selectStep(item.id)}>
              <span>{item.label}</span>
              {done && <Check size={14} className="fl-collab-step-check" aria-hidden="true" />}
            </button>;
          })}
        </div>
      </div>
      <div className="fl-collab-sidebar-group fl-collab-sidebar-divider">
        <span className="fl-collab-sidebar-label">Communication</span>
        <div className="fl-collab-sidebar-list">
          <button type="button" role="tab" aria-selected={step === "messages"} className="fl-collab-step" data-active={step === "messages"} onClick={() => selectStep("messages")}>
            <MessageSquare size={14} aria-hidden="true" />
            <span>Messages</span>
          </button>
        </div>
      </div>
    </aside>

    <div className="fl-collab-main" data-chat-mode={step === "messages"}>
      <nav className="fl-collab-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><Link href="/dashboard/collaborations">Collaborations</Link></li>
          <li aria-hidden="true"><ChevronRight size={13} /></li>
          <li>{step === "overview" ? <span>{row.title}</span> : <button type="button" onClick={() => selectStep("overview")}>{row.title}</button>}</li>
          <li aria-hidden="true"><ChevronRight size={13} /></li>
          <li aria-current="page">{currentStepLabel}</li>
        </ol>
      </nav>

      <div className="fl-collab-detail-head">
        <div className="fl-collab-detail-title">
          <div className="fl-collab-detail-title-row">
            <h1>{row.title}</h1>
            <span className="fl-campaign-folder-status" data-active={status !== "completed"} data-state={status}>{collaborationStatusLabel(status)}</span>
          </div>
          <p>{row.brand_name} · {row.creator_name}</p>
        </div>
      </div>

      {step === "overview" ? <div className="fl-collab-overview-flat" role="tabpanel" aria-label="Overview">
        <div className="fl-collab-facts-strip">
          <div>
            <small>Source quote</small>
            <strong>{row.quoted_amount_cents === null ? "To discuss" : campaignMoney(row.quoted_amount_cents, row.currency)}</strong>
            <span>Initial agreed or proposed rate</span>
          </div>
          <div>
            <small>Requested delivery</small>
            <strong>{row.requested_delivery_date ? shortDate(row.requested_delivery_date) : "To discuss"}</strong>
            <span>Subject to mutual agreement</span>
          </div>
          <div>
            <small>Source</small>
            <strong>{sourceLabel[row.source_kind]}</strong>
            <span>Started {shortDate(row.created_at)}</span>
          </div>
        </div>

        <div className="fl-collab-brief-grid">
          <section>
            <h2>Brief</h2>
            <p>{row.brief || "No brief details added."}</p>
          </section>
          <section>
            <h2>Requested deliverables</h2>
            <p>{row.deliverable || "Deliverables to discuss."}</p>
          </section>
        </div>

        <div className="fl-collab-overview-foot">
          <p>Source context only · confirm final scope, price, rights, and dates in Proposals &amp; Agreement. Payments aren’t live yet.</p>
          <button type="button" className="fl-collab-next-cta" onClick={() => selectStep("proposals")}>Proposals &amp; Agreement <ChevronRight size={14} aria-hidden="true" /></button>
        </div>
      </div> : <div className="fl-collab-step-flat" role="tabpanel" aria-label={currentStepLabel}>
        {step === "proposals" && <CollaborationProposals collaboration={row} onStatus={setStatus} />}
        {step === "deliveries" && <CollaborationDeliveries collaborationId={row.id} status={status} onStatus={setStatus} onOpenProposals={() => selectStep("proposals")} />}
        {step === "proof" && <CollaborationProof collaborationId={row.id} status={status} onConfirmedChange={setProofConfirmed} />}
        {step === "feedback" && <CollaborationFeedback collaborationId={row.id} status={status} onStatus={setStatus} onSubmittedChange={setFeedbackSubmitted} />}
        {step === "messages" && <CollaborationMessages key={row.id} collaborationId={row.id} />}

        {step !== "messages" && step !== "proposals" && <div className="fl-collab-step-footer">
          {prevWorkflowStep ? <button type="button" onClick={() => selectStep(prevWorkflowStep.id)}><ChevronLeft size={14} aria-hidden="true" /> {prevWorkflowStep.label}</button> : <span />}
          {nextWorkflowStep && <button type="button" onClick={() => selectStep(nextWorkflowStep.id)}>Next: {nextWorkflowStep.label} <ChevronRight size={14} aria-hidden="true" /></button>}
        </div>}
      </div>}
    </div>
  </div>;
}
