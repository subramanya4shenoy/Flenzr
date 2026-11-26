"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { activityAccepting, activityActions, activityResponseLabel, activityStatusLabel, campaignActivityPath, loadCampaignActivity, type CampaignActivityKind, type CampaignActivityPage, type CampaignAudience, type CampaignActivityRecord, type CampaignResponseAction } from "@/lib/campaign-activity";
import { campaignMoney } from "@/lib/campaign-drafts";
import { campaignStatusLabel } from "@/lib/campaign-lifecycle";
import Link from "next/link";
import { StartCollaboration } from "@/components/collaborations/start-collaboration";
import { EnquiryInbox } from "@/components/enquiries/enquiry-inbox";
import { EnquiryUnreadBadge } from "@/components/enquiries/enquiry-activity";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { CampaignResponseDialog } from "./campaign-response";
import "./campaign-activity.css";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "F";
}

function statusTone(status: string): "good" | "warn" | "muted" {
  if (status === "accepted") return "good";
  if (status === "pending" || status === "invited" || status === "countered") return "warn";
  return "muted";
}

function formatDate(iso: string) {
  const ts = Date.parse(iso);
  return Number.isFinite(ts)
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(ts)
    : "—";
}

type ActivityTab = "direct" | CampaignActivityKind;

export function CampaignActivity({
  audience,
  campaignId,
  campaignTitle,
  onBack,
  initialKind = "applications",
  includeDirectOffers = false,
}: {
  audience: CampaignAudience;
  campaignId?: string;
  campaignTitle?: string;
  onBack?: () => void;
  initialKind?: ActivityTab;
  includeDirectOffers?: boolean;
}) {
  const defaultTab: ActivityTab = includeDirectOffers ? initialKind : (initialKind === "direct" ? "applications" : initialKind);
  const [tab, setTab] = useState<ActivityTab>(defaultTab);
  const [refreshTick, setRefreshTick] = useState(0);

  const tabs: { id: ActivityTab; label: string }[] = includeDirectOffers
    ? [
      { id: "direct", label: "Direct Offers" },
      { id: "applications", label: "Applications" },
      { id: "invitations", label: "Invitations" },
    ]
    : [
      { id: "applications", label: "Applications" },
      { id: "invitations", label: "Invitations" },
    ];

  return <section className="fl-activity" aria-label="Offer applications and invitations">
    <header className="fl-activity-header">
      <div className="fl-activity-header-copy">
        {onBack && (
          <button type="button" className="fl-activity-back" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden="true" /> Offers
          </button>
        )}
        <div>
          <h2>{campaignTitle || (includeDirectOffers ? "Enquiries & Offers" : "Offer activity")}</h2>
          <p>{audience === "brand"
            ? "Review saved applications and invitations for this offer."
            : includeDirectOffers
              ? "Manage direct offers from brands, your submitted applications, and incoming invitations."
              : "Track your submitted offer applications and incoming brand invitations."}</p>
        </div>
      </div>
      <div className="fl-activity-header-actions">
        <Link className="fl-activity-collab-link" href="/dashboard/collaborations">
          Shared collaborations <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="fl-activity-refresh-btn"
          title="Refresh"
          aria-label="Refresh"
          onClick={() => setRefreshTick(v => v + 1)}
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>
    </header>

    <div className="fl-activity-bar">
      <div className="fl-activity-tabs" role="tablist" aria-label="Offer record type">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            data-active={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            <span>{item.label}</span>
            {item.id === "direct" && <EnquiryUnreadBadge view={audience === "brand" ? "sent" : "received"} />}
          </button>
        ))}
      </div>
    </div>

    {tab === "direct"
      ? <EnquiryInbox view={audience === "brand" ? "sent" : "received"} embedded refreshTick={refreshTick} />
      : <ActivityRecords key={`${audience}:${campaignId || "all"}:${tab}`} audience={audience} campaignId={campaignId} kind={tab} refreshTick={refreshTick} />}
  </section>;
}

function ActivityRecords({ audience, campaignId, kind, refreshTick }: { audience: CampaignAudience; campaignId?: string; kind: CampaignActivityKind; refreshTick: number }) {
  const [selected, setSelected] = useState<{ id: string; action: CampaignResponseAction } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data: CampaignActivityPage | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    loadCampaignActivity(campaignActivityPath(audience, kind, page, campaignId), controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: error instanceof Error ? error.message : "Could not load offer activity." });
    });
    return () => controller.abort();
  }, [audience, campaignId, kind, page, attempt, refreshTick]);

  const recordChanged = useCallback((item: CampaignActivityRecord) => {
    setState(previous => previous.data ? { ...previous, data: { ...previous.data, items: previous.data.items.map(row => row.id === item.id ? item : row) } } : previous);
  }, []);

  const refresh = () => { setNotice(""); setState({ data: null, loading: true, error: "" }); setAttempt(value => value + 1); };
  const move = (next: number) => { setNotice(""); setExpandedId(null); setState({ data: null, loading: true, error: "" }); setPage(next); };

  return <div className="fl-activity-body" aria-busy={state.loading}>
    {notice && <p role="status" className="fl-activity-notice">{notice}</p>}
    {selected && <CampaignResponseDialog key={`${selected.id}:${selected.action}`} audience={audience} kind={kind} recordId={selected.id} action={selected.action} onClose={() => setSelected(null)} onRecord={recordChanged} onSaved={item => { recordChanged(item); setNotice(`Response saved: ${activityStatusLabel[item.status]}.`); }} />}

    {state.loading ? (
      <WorkspaceLoader label="Loading offer activity…" />
    ) : state.error ? (
      <div role="alert" className="fl-activity-empty">
        <p>{state.error}</p>
        <button type="button" onClick={refresh}>Retry</button>
      </div>
    ) : state.data && <>
      <div className="fl-activity-meta-line">
        <span role="status">{state.data.total} {state.data.total === 1 ? kind.slice(0, -1) : kind}</span>
        <span>Click any row to view message and actions</span>
      </div>

      {!state.data.items.length ? (
        <div className="fl-activity-empty">
          <span className="fl-activity-empty-icon" aria-hidden="true"><Inbox size={20} /></span>
          <h3>{kind === "applications" ? "No applications yet" : "No invitations yet"}</h3>
          <p>{page > 1
            ? "No records on this page. Return to the previous page or refresh."
            : kind === "applications"
              ? audience === "brand"
                ? "Saved creator applications for this offer will appear here."
                : "Your submitted offer applications will appear here."
              : audience === "brand"
                ? "Creators you invite to this offer will appear here."
                : "Offer invitations from brands will appear here."}</p>
        </div>
      ) : (
        <div className="fl-activity-table-wrap">
          <table className="fl-activity-table">
            <thead>
              <tr>
                <th scope="col">{audience === "brand" ? "Creator" : "Offer"}</th>
                <th scope="col">Status</th>
                <th scope="col">{kind === "applications" ? "Proposed quote" : "Offered quote"}</th>
                <th scope="col">Offer status</th>
                <th scope="col">Date</th>
                <th scope="col"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody>
              {state.data.items.map(item => {
                const open = expandedId === item.id;
                const primaryName = audience === "brand" ? item.creator_name : item.campaign_title;
                const secondaryName = audience === "brand" ? `@${item.creator_handle}` : item.organization_name;
                const actions = activityActions(audience, kind, item);
                const closedForAcceptance = ((audience === "brand" && kind === "applications" && item.status === "pending") || (audience === "creator" && kind === "invitations" && item.status === "invited")) && !activityAccepting(item);

                return <Fragment key={item.id}>
                  <tr
                    className="fl-activity-row"
                    data-expanded={open}
                    onClick={event => {
                      if ((event.target as HTMLElement).closest("a, button")) return;
                      setExpandedId(open ? null : item.id);
                    }}
                  >
                    <td>
                      <div className="fl-activity-person">
                        <span className="fl-activity-avatar" aria-hidden="true">{initials(primaryName)}</span>
                        <div className="fl-activity-person-copy">
                          <strong>{primaryName}</strong>
                          <small>{secondaryName}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="fl-activity-pill" data-tone={statusTone(item.status)}>
                        {activityStatusLabel[item.status] || item.status}
                      </span>
                    </td>
                    <td className="fl-activity-quote">{campaignMoney(item.rate_cents, item.currency)}</td>
                    <td className="fl-activity-muted-cell">{campaignStatusLabel[item.campaign_status]}</td>
                    <td className="fl-activity-muted-cell">
                      <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                    </td>
                    <td className="fl-activity-chevron-cell">
                      <button
                        type="button"
                        className="fl-activity-expand-btn"
                        aria-expanded={open}
                        aria-label={open ? "Hide details" : "Show details"}
                        onClick={() => setExpandedId(open ? null : item.id)}
                      >
                        <ChevronDown size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>

                  {open && (
                    <tr className="fl-activity-detail-row">
                      <td colSpan={6}>
                        <div className="fl-activity-detail-panel">
                          <div className="fl-activity-detail-msg">
                            <small>{kind === "applications" ? "Creator pitch" : "Invitation note"}</small>
                            <p>{item.message || "No message included."}</p>
                          </div>

                          {closedForAcceptance && (
                            <p className="fl-activity-closed-note">This offer is not currently open for acceptance.</p>
                          )}

                          <div className="fl-activity-detail-actions">
                            <Link className="fl-activity-offer-link" href={`/dashboard/offers/${item.campaign_id}`}>
                              View Offer &amp; counter-offers <ArrowUpRight size={13} aria-hidden="true" />
                            </Link>
                            <div className="fl-activity-action-group">
                              {item.status === "accepted" && (
                                <StartCollaboration sourceKind={kind === "applications" ? "application" : "invitation"} sourceId={item.id} />
                              )}
                              {actions.map(action => (
                                <button
                                  type="button"
                                  key={action}
                                  className={action === "accept" ? "fl-activity-btn-primary" : "fl-activity-btn-neutral"}
                                  onClick={() => { setNotice(""); setSelected({ id: item.id, action }); }}
                                >
                                  {activityResponseLabel(kind, action)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>;
              })}
            </tbody>
          </table>
        </div>
      )}

      {state.data.total > state.data.page_size && (
        <nav className="fl-activity-pagination" aria-label="Offer activity pages">
          <button type="button" disabled={page === 1} onClick={() => move(page - 1)}>
            <ChevronLeft size={14} aria-hidden="true" /> Previous
          </button>
          <span>Page {page} of {Math.max(1, Math.ceil(state.data.total / state.data.page_size))}</span>
          <button type="button" disabled={page * state.data.page_size >= state.data.total} onClick={() => move(page + 1)}>
            Next <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
    </>}
  </div>;
}
