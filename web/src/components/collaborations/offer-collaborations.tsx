"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight, FileSignature, FileText, Link2, MessageSquare, PackageCheck,
  Play, Star, Users,
} from "lucide-react";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import {
  collaborationRequest, type Collaboration, type OfferCollaborationWorkspace,
  type OfferParticipantSummary,
} from "@/lib/collaborations";
import {
  parseRecentCollaborations, recentCollaborationsEvent, recentCollaborationsKey,
  withOpenedRecent, withoutRecent,
} from "@/lib/collaboration-recents";
import { campaignMoney } from "@/lib/campaign-drafts";
import { avatarProxyUrl } from "@/lib/collaboration-messages";
import "@/components/brand/campaign-folders.css";
import "./collaborations.css";
import { CollaborationMessages } from "./messages";
import { CollaborationFeedback } from "./feedback";
import { CollaborationProof } from "./publishing-proof";
import { CollaborationDeliveries } from "./deliveries";
import { CollaborationProposals } from "./proposals";

type StepId = "overview" | "proposals" | "deliveries" | "proof" | "feedback" | "messages";

const WORKFLOW_STEPS: { id: Exclude<StepId, "messages">; label: string; icon: typeof FileText }[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "proposals", label: "Proposals & Agreement", icon: FileSignature },
  { id: "deliveries", label: "Deliveries & Review", icon: PackageCheck },
  { id: "proof", label: "Publishing Proof", icon: Link2 },
  { id: "feedback", label: "Feedback", icon: Star },
];

const ALL_STEP_IDS = new Set<string>([...WORKFLOW_STEPS.map(s => s.id), "messages"]);
function stepFromHash(hash: string): StepId {
  const clean = hash.replace(/^#/, "");
  return ALL_STEP_IDS.has(clean) ? (clean as StepId) : "overview";
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "C";
}

function shortDate(value: string | null | undefined) {
  const parsed = value ? Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value) : NaN;
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", ...(value?.length === 10 ? { timeZone: "UTC" } : {}) }).format(parsed)
    : "To discuss";
}

type Tone = "good" | "warn" | "muted";
function stepBadge(step: Exclude<StepId, "overview">, p: OfferParticipantSummary): { label: string; tone: Tone } {
  if (step === "proposals") {
    switch (p.proposal_status) {
      case "agreed": return { label: "Agreed", tone: "good" };
      case "awaiting_other": return { label: `v${p.proposal_version} · 1/2 accepted`, tone: "warn" };
      case "in_discussion": return { label: `v${p.proposal_version} · In review`, tone: "warn" };
      case "no_proposal": return { label: "No proposal", tone: "muted" };
      default: return { label: "Not started", tone: "muted" };
    }
  }
  if (step === "deliveries") {
    switch (p.delivery_status) {
      case "completed": return { label: "Completed", tone: "good" };
      case "approved": return { label: `v${p.delivery_version} · Approved`, tone: "good" };
      case "awaiting_review": return { label: `v${p.delivery_version} · Needs review`, tone: "warn" };
      case "revisions_requested": return { label: `v${p.delivery_version} · Revisions`, tone: "warn" };
      case "awaiting_submission": return { label: "Awaiting upload", tone: "muted" };
      default: return { label: "Locked · Awaiting agreement", tone: "muted" };
    }
  }
  if (step === "proof") {
    switch (p.proof_status) {
      case "confirmed": return { label: "Confirmed", tone: "good" };
      case "awaiting_confirmation": return { label: `v${p.proof_version} · Confirm`, tone: "warn" };
      case "awaiting_proof": return { label: "Awaiting proof", tone: "muted" };
      default: return { label: "Locked · Awaiting approval", tone: "muted" };
    }
  }
  if (step === "feedback") {
    switch (p.feedback_status) {
      case "both_submitted": return { label: "Both done", tone: "good" };
      case "partial": return { label: p.brand_feedback_submitted ? "You submitted" : "Creator submitted", tone: "warn" };
      case "pending": return { label: "Open", tone: "warn" };
      default: return { label: "Locked · Awaiting completion", tone: "muted" };
    }
  }
  if (!p.collaboration_id) return { label: "Not started", tone: "muted" };
  return { label: p.message_count === 1 ? "1 msg" : `${p.message_count} msgs`, tone: p.message_count > 0 ? "good" : "muted" };
}

function stepMetrics(step: Exclude<StepId, "overview">, participants: OfferParticipantSummary[]) {
  const total = participants.length;
  if (step === "proposals") {
    const agreed = participants.filter(p => p.proposal_status === "agreed").length;
    const active = participants.filter(p => p.proposal_status === "in_discussion" || p.proposal_status === "awaiting_other").length;
    const noProp = participants.filter(p => p.proposal_status === "no_proposal").length;
    const notStarted = participants.filter(p => p.proposal_status === "not_started").length;
    return [
      { label: "Agreed", value: `${agreed} / ${total}`, tone: "good" as Tone },
      { label: "In discussion", value: String(active), tone: "warn" as Tone },
      { label: "No proposal yet", value: String(noProp), tone: "muted" as Tone },
      { label: "Not started", value: String(notStarted), tone: "muted" as Tone },
    ];
  }
  if (step === "deliveries") {
    const completed = participants.filter(p => p.delivery_status === "completed").length;
    const approved = participants.filter(p => p.delivery_status === "approved").length;
    const review = participants.filter(p => p.delivery_status === "awaiting_review").length;
    const revisions = participants.filter(p => p.delivery_status === "revisions_requested").length;
    return [
      { label: "Completed", value: `${completed} / ${total}`, tone: "good" as Tone },
      { label: "Approved", value: String(approved), tone: "good" as Tone },
      { label: "Needs review", value: String(review), tone: "warn" as Tone },
      { label: "Revisions requested", value: String(revisions), tone: "warn" as Tone },
    ];
  }
  if (step === "proof") {
    const confirmed = participants.filter(p => p.proof_status === "confirmed").length;
    const confirm = participants.filter(p => p.proof_status === "awaiting_confirmation").length;
    const waiting = participants.filter(p => p.proof_status === "awaiting_proof").length;
    const locked = participants.filter(p => p.proof_status === "locked").length;
    return [
      { label: "Confirmed", value: `${confirmed} / ${total}`, tone: "good" as Tone },
      { label: "Needs confirmation", value: String(confirm), tone: "warn" as Tone },
      { label: "Awaiting proof", value: String(waiting), tone: "muted" as Tone },
      { label: "Locked", value: String(locked), tone: "muted" as Tone },
    ];
  }
  if (step === "feedback") {
    const both = participants.filter(p => p.feedback_status === "both_submitted").length;
    const partial = participants.filter(p => p.feedback_status === "partial").length;
    const pending = participants.filter(p => p.feedback_status === "pending").length;
    const locked = participants.filter(p => p.feedback_status === "locked").length;
    return [
      { label: "Both submitted", value: `${both} / ${total}`, tone: "good" as Tone },
      { label: "Partial (1 of 2)", value: String(partial), tone: "warn" as Tone },
      { label: "Open to review", value: String(pending), tone: "warn" as Tone },
      { label: "Locked", value: String(locked), tone: "muted" as Tone },
    ];
  }
  const withMsgs = participants.filter(p => p.message_count > 0).length;
  const totalMsgs = participants.reduce((sum, p) => sum + p.message_count, 0);
  const started = participants.filter(p => p.collaboration_id !== null).length;
  return [
    { label: "Active threads", value: `${withMsgs} / ${started}`, tone: "good" as Tone },
    { label: "Total messages", value: String(totalMsgs), tone: "muted" as Tone },
    { label: "Influencers opted in", value: String(total), tone: "muted" as Tone },
  ];
}

export function OfferCollaborations({ offerId, viewerId }: { offerId: string; viewerId?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; data?: OfferCollaborationWorkspace; error?: string; missing?: boolean } | null>(null);
  const [step, setStep] = useState<StepId>(() => (typeof window !== "undefined" ? stepFromHash(window.location.hash) : "overview"));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [startError, setStartError] = useState("");
  const [reviewFocus, setReviewFocus] = useState(false);

  const key = `${offerId}:${attempt}`;
  const loading = state?.key !== key && !state?.data;

  useEffect(() => {
    const controller = new AbortController();
    collaborationRequest<OfferCollaborationWorkspace>(`/offers/${offerId}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({
            key,
            error: error instanceof Error ? error.message : "Could not load offer collaborations.",
            missing: error instanceof Error && error.message.startsWith("This record is unavailable"),
          });
        }
      });
    return () => controller.abort();
  }, [offerId, key]);

  // Save to recently opened collaborations for this brand account.
  useEffect(() => {
    if (!viewerId || !state || state.key !== key) return;
    const storageKey = recentCollaborationsKey(viewerId);
    try {
      const current = parseRecentCollaborations(localStorage.getItem(storageKey));
      if (state.data) {
        const total = state.data.participants.length;
        const agreed = state.data.participants.filter(p => p.proposal_status === "agreed").length;
        const completed = state.data.participants.filter(p => p.delivery_status === "completed").length;
        const status: Collaboration["status"] = total > 0 && completed === total ? "completed" : agreed > 0 ? "agreed" : "discussion";
        const next = withOpenedRecent(current, {
          kind: "offer",
          id: offerId,
          title: state.data.title,
          subtitle: `${total} ${total === 1 ? "influencer" : "influencers"} · ${agreed} agreed`,
          status,
        });
        localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new Event(recentCollaborationsEvent));
      } else if (state.missing) {
        localStorage.setItem(storageKey, JSON.stringify(withoutRecent(current, "offer", offerId)));
        window.dispatchEvent(new Event(recentCollaborationsEvent));
      }
    } catch { /* Recency must never block opening. */ }
  }, [offerId, viewerId, key, state]);

  useEffect(() => {
    const sync = () => setStep(stepFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);

  const refresh = useCallback(() => setAttempt(v => v + 1), []);

  function selectStep(next: StepId, keepInfluencer = false) {
    setStep(next);
    setStartError("");
    setReviewFocus(false);
    if (next === "overview" || !keepInfluencer) setSelectedKey(null);
    const hash = next === "overview" ? "" : `#${next}`;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  }

  async function startCollaboration(participant: OfferParticipantSummary) {
    if (startingKey) return;
    setStartingKey(participant.key);
    setStartError("");
    try {
      const created = await collaborationRequest<Collaboration>("", {
        method: "POST",
        body: JSON.stringify({ source_kind: participant.source_kind, source_id: participant.source_id }),
      });
      setSelectedKey(created.id);
      refresh();
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Could not start collaboration.");
    } finally {
      setStartingKey(null);
    }
  }

  if (loading) {
    return <section className="fl-shared" aria-label="Offer collaborations" aria-busy="true">
      <nav className="fl-collab-breadcrumb" aria-label="Breadcrumb"><ol><li><Link href="/dashboard/collaborations">Collaborations</Link></li><li aria-hidden="true"><ChevronRight size={13} /></li><li aria-current="page">Offer</li></ol></nav>
      <WorkspaceLoader label="Loading offer collaborations…" />
    </section>;
  }

  if (state?.error || !state?.data) {
    return <section className="fl-shared" aria-label="Offer collaborations">
      <nav className="fl-collab-breadcrumb" aria-label="Breadcrumb"><ol><li><Link href="/dashboard/collaborations">Collaborations</Link></li><li aria-hidden="true"><ChevronRight size={13} /></li><li aria-current="page">Offer</li></ol></nav>
      <div role="alert"><p>{state?.error || "Offer not found."}</p><button type="button" onClick={refresh}>Retry</button></div>
    </section>;
  }

  const data = state.data;
  const isPerInfluencerStep = step !== "overview";
  const selectedParticipant = isPerInfluencerStep && selectedKey
    ? data.participants.find(p => p.key === selectedKey || p.collaboration_id === selectedKey) || null
    : null;
  const currentStepLabel = step === "messages" ? "Messages" : WORKFLOW_STEPS.find(s => s.id === step)?.label || "Overview";

  const startedCount = data.participants.filter(p => p.collaboration_id !== null).length;
  const agreedCount = data.participants.filter(p => p.proposal_status === "agreed").length;
  const completedCount = data.participants.filter(p => p.delivery_status === "completed").length;

  const showPeopleRail = isPerInfluencerStep && !reviewFocus;

  return <section className="fl-shared" aria-label="Offer collaborations">
    <div className="fl-collab-detail" data-three-level={isPerInfluencerStep} data-rail-collapsed={isPerInfluencerStep && reviewFocus}>
      {/* Level 2: Workflow navigation — full width on Overview, icon-only when a per-influencer step is active */}
      <aside className="fl-collab-sidebar" data-collapsed={isPerInfluencerStep} aria-label="Collaboration workflow">
        <div className="fl-collab-sidebar-group">
          {!isPerInfluencerStep && <span className="fl-collab-sidebar-label">Workflow</span>}
          <div className="fl-collab-sidebar-list" role="tablist" aria-orientation="vertical" aria-label="Collaboration workflow steps">
            {WORKFLOW_STEPS.map(item => {
              const Icon = item.icon;
              const active = step === item.id;
              return <button key={item.id} type="button" role="tab" aria-selected={active} aria-label={item.label} title={item.label} className="fl-collab-step" data-active={active} onClick={() => selectStep(item.id, false)}>
                <Icon size={16} className="fl-collab-step-icon" aria-hidden="true" />
                {!isPerInfluencerStep && <span>{item.label}</span>}
              </button>;
            })}
          </div>
        </div>
        <div className="fl-collab-sidebar-group fl-collab-sidebar-divider">
          {!isPerInfluencerStep && <span className="fl-collab-sidebar-label">Communication</span>}
          <div className="fl-collab-sidebar-list">
            <button type="button" role="tab" aria-selected={step === "messages"} aria-label="Messages" title="Messages" className="fl-collab-step" data-active={step === "messages"} onClick={() => selectStep("messages", false)}>
              <MessageSquare size={16} className="fl-collab-step-icon" aria-hidden="true" />
              {!isPerInfluencerStep && <span>Messages</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Level 3: Influencer list rail — collapses automatically while inside Review Studio */}
      {showPeopleRail && <aside className="fl-collab-people-rail" aria-label="Opted-in influencers">
        <div className="fl-collab-people-head">
          <strong>{currentStepLabel}</strong>
          <span>{data.participants.length} {data.participants.length === 1 ? "influencer" : "influencers"}</span>
        </div>
        <div className="fl-collab-people-list" role="listbox" aria-label="Select influencer or summary">
          <button type="button" role="option" aria-selected={selectedParticipant === null} className="fl-collab-person" data-active={selectedParticipant === null} onClick={() => setSelectedKey(null)}>
            <span className="fl-collab-person-avatar fl-collab-person-summary-icon" aria-hidden="true"><Users size={13} /></span>
            <span className="fl-collab-person-copy">
              <strong>Summary</strong>
              <small>All {data.participants.length} opted in</small>
            </span>
          </button>
          {data.participants.map(p => {
            const active = selectedParticipant?.key === p.key;
            const badge = stepBadge(step, p);
            const avatar = avatarProxyUrl(p.creator_avatar_url);
            const unread = step === "messages" ? (p.unread_count || 0) : 0;
            const preview = step === "messages" && p.last_message_preview ? p.last_message_preview : badge.label;
            return <button key={p.key} type="button" role="option" aria-selected={active} className="fl-collab-person" data-active={active} onClick={() => { setStartError(""); setSelectedKey(p.key); }}>
              <span className="fl-collab-person-avatar-wrap">
                <span className="fl-collab-person-avatar" aria-hidden="true">{avatar ? <img src={avatar} alt={p.creator_name} /> : initials(p.creator_name)}</span>
                <i className="fl-chat-online-dot" data-online={Boolean(p.is_online)} aria-hidden="true" />
              </span>
              <span className="fl-collab-person-copy">
                <strong>{p.creator_name}</strong>
                <small className="fl-collab-person-status" data-tone={step === "messages" && p.last_message_preview ? "muted" : badge.tone}>{preview}</small>
              </span>
              {unread > 0 && <span className="fl-collab-unread-badge" aria-label={`${unread} unread`}>{unread}</span>}
            </button>;
          })}
        </div>
      </aside>}

      {/* Right Content Pane */}
      <div className="fl-collab-main" data-chat-mode={step === "messages" && Boolean(selectedParticipant?.collaboration)}>
        <nav className="fl-collab-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link href="/dashboard/collaborations">Collaborations</Link></li>
            <li aria-hidden="true"><ChevronRight size={13} /></li>
            <li>{step === "overview" ? <span>{data.title}</span> : <button type="button" onClick={() => selectStep("overview")}>{data.title}</button>}</li>
            <li aria-hidden="true"><ChevronRight size={13} /></li>
            {selectedParticipant ? <>
              <li><button type="button" onClick={() => setSelectedKey(null)}>{currentStepLabel}</button></li>
              <li aria-hidden="true"><ChevronRight size={13} /></li>
              <li aria-current="page">{selectedParticipant.creator_name}</li>
            </> : <li aria-current="page">{currentStepLabel}</li>}
          </ol>
        </nav>

        <div className="fl-collab-detail-head">
          <div className="fl-collab-detail-title">
            <div className="fl-collab-detail-title-row">
              <h1>{selectedParticipant ? selectedParticipant.creator_name : data.title}</h1>
              {selectedParticipant && isPerInfluencerStep
                ? <span className="fl-collab-pill" data-tone={stepBadge(step, selectedParticipant).tone}>{stepBadge(step, selectedParticipant).label}</span>
                : <span className="fl-campaign-folder-status" data-active={completedCount < data.participants.length}>{data.participants.length} {data.participants.length === 1 ? "influencer" : "influencers"}</span>}
            </div>
            <p>{selectedParticipant
              ? `${data.title}${selectedParticipant.creator_handle ? ` · @${selectedParticipant.creator_handle}` : ""}`
              : `${data.brand_name} · Common offer workspace`}</p>
          </div>
        </div>

        {startError && <p role="alert">{startError}</p>}

        {/* Overview (Common to the Offer) */}
        {step === "overview" && <div className="fl-collab-overview-flat" role="tabpanel" aria-label="Overview">
          <div className="fl-collab-summary-grid">
            <div className="fl-collab-metric"><span>Opted in</span><strong>{data.participants.length}</strong></div>
            <div className="fl-collab-metric"><span>Started</span><strong>{startedCount} / {data.participants.length}</strong></div>
            <div className="fl-collab-metric" data-tone="good"><span>Agreed</span><strong>{agreedCount} / {data.participants.length}</strong></div>
            <div className="fl-collab-metric" data-tone="good"><span>Completed</span><strong>{completedCount} / {data.participants.length}</strong></div>
          </div>

          <div className="fl-collab-facts-strip">
            <div>
              <small>Total planned budget</small>
              <strong>{data.budget_total_cents === null ? "To discuss" : campaignMoney(data.budget_total_cents, data.currency)}</strong>
              <span>Individual creator quotes agreed separately</span>
            </div>
            <div>
              <small>Applications close</small>
              <strong>{shortDate(data.requested_delivery_date)}</strong>
              <span>Offer intake deadline</span>
            </div>
            <div>
              <small>Created</small>
              <strong>{shortDate(data.created_at)}</strong>
              <span>Shared across all opted-in influencers</span>
            </div>
          </div>

          <div className="fl-collab-brief-grid">
            <section>
              <h2>Offer brief</h2>
              <p>{data.brief || "No brief details added."}</p>
            </section>
            <section>
              <h2>Deliverables</h2>
              <p>{data.deliverable || "Deliverables to discuss."}</p>
            </section>
          </div>

          <div className="fl-collab-overview-foot">
            <p>Choose any workflow step on the left to review summary progress and manage individual influencers.</p>
            <button type="button" className="fl-collab-next-cta" onClick={() => selectStep("proposals")}>Proposals &amp; Agreement <ChevronRight size={14} aria-hidden="true" /></button>
          </div>
        </div>}

        {/* Step Summary (when a per-influencer step is active and no single influencer is picked) */}
        {isPerInfluencerStep && !selectedParticipant && <div className="fl-collab-overview-stack">
          <div className="fl-collab-summary-grid">
            {stepMetrics(step, data.participants).map(metric => (
              <div key={metric.label} className="fl-collab-metric" data-tone={metric.tone}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className="fl-campaign-table-wrap" role="region" aria-label={`${currentStepLabel} summary`} tabIndex={0}>
            <table className="fl-campaign-table fl-collab-summary-table">
              <thead><tr>
                <th scope="col">Influencer</th>
                <th scope="col">Status</th>
                <th scope="col">Quote</th>
                <th scope="col">Last updated</th>
                <th scope="col"><span className="fl-campaign-visually-hidden">Action</span></th>
              </tr></thead>
              <tbody>
                {data.participants.map(p => {
                  const badge = stepBadge(step, p);
                  return <tr key={p.key} onClick={event => { if (!(event.target as HTMLElement).closest("button")) setSelectedKey(p.key); }}>
                    <td>
                      <div className="fl-collab-table-person">
                        <span className="fl-collab-person-avatar" aria-hidden="true">{initials(p.creator_name)}</span>
                        <span><strong>{p.creator_name}</strong>{p.creator_handle && <small>@{p.creator_handle}</small>}</span>
                      </div>
                    </td>
                    <td><span className="fl-collab-pill" data-tone={badge.tone}>{badge.label}</span></td>
                    <td className="fl-campaign-table-budget">{p.quoted_amount_cents === null ? <span className="fl-campaign-table-muted">To discuss</span> : campaignMoney(p.quoted_amount_cents, p.currency)}</td>
                    <td className="fl-campaign-table-date">{shortDate(p.updated_at)}</td>
                    <td className="fl-collab-table-action">
                      {p.collaboration_id
                        ? <button type="button" onClick={() => setSelectedKey(p.key)}>Open</button>
                        : <button type="button" disabled={startingKey === p.key} onClick={() => void startCollaboration(p)}><Play size={12} aria-hidden="true" /> {startingKey === p.key ? "Starting…" : "Start"}</button>}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!data.participants.length && <p className="fl-campaign-table-empty">No influencers have opted into this offer yet.</p>}
          </div>
        </div>}

        {/* Specific Influencer Workspace for the active step */}
        {isPerInfluencerStep && selectedParticipant && (
          <div className="fl-collab-step-flat" role="tabpanel" aria-label={`${selectedParticipant.creator_name} · ${currentStepLabel}`}>
            {!selectedParticipant.collaboration ? <div className="fl-step-locked">
              <h3>Collaboration not started yet</h3>
              <p>{selectedParticipant.creator_name} has an accepted {selectedParticipant.source_kind} on this offer ({selectedParticipant.quoted_amount_cents === null ? "quote to discuss" : campaignMoney(selectedParticipant.quoted_amount_cents, selectedParticipant.currency)}). Start the collaboration to draft proposals, track deliveries, and exchange messages.</p>
              <button type="button" className="fl-collab-next-cta" disabled={startingKey === selectedParticipant.key} onClick={() => void startCollaboration(selectedParticipant)}>
                <Play size={14} aria-hidden="true" /> {startingKey === selectedParticipant.key ? "Starting collaboration…" : `Start collaboration with ${selectedParticipant.creator_name}`}
              </button>
            </div> : <>
              {step === "proposals" && <CollaborationProposals key={selectedParticipant.collaboration.id} collaboration={selectedParticipant.collaboration} onStatus={refresh} />}
              {step === "deliveries" && <CollaborationDeliveries key={selectedParticipant.collaboration.id} collaborationId={selectedParticipant.collaboration.id} status={selectedParticipant.collaboration.status} viewerRole="brand" onStatus={refresh} onOpenProposals={() => selectStep("proposals", true)} onFocusModeChange={setReviewFocus} />}
              {step === "proof" && <CollaborationProof key={selectedParticipant.collaboration.id} collaborationId={selectedParticipant.collaboration.id} status={selectedParticipant.collaboration.status} />}
              {step === "feedback" && <CollaborationFeedback key={selectedParticipant.collaboration.id} collaborationId={selectedParticipant.collaboration.id} status={selectedParticipant.collaboration.status} onStatus={refresh} />}
              {step === "messages" && <CollaborationMessages key={selectedParticipant.collaboration.id} collaborationId={selectedParticipant.collaboration.id} onActivity={refresh} />}
            </>}
          </div>
        )}
      </div>
    </div>
  </section>;
}

