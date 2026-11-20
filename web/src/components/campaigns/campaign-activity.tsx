"use client";

import { useCallback, useEffect, useState } from "react";
import { activityAccepting, activityActions, activityResponseLabel, activityStatusLabel, campaignActivityPath, loadCampaignActivity, type CampaignActivityKind, type CampaignActivityPage, type CampaignAudience, type CampaignActivityRecord, type CampaignResponseAction } from "@/lib/campaign-activity";
import { campaignMoney } from "@/lib/campaign-drafts";
import { campaignStatusLabel } from "@/lib/campaign-lifecycle";
import Link from "next/link";
import { StartCollaboration } from "@/components/collaborations/start-collaboration";
import { CampaignResponseDialog } from "./campaign-response";
import "./campaign-activity.css";

export function CampaignActivity({ audience, campaignId, campaignTitle, onBack, initialKind = "applications" }: { audience: CampaignAudience; campaignId?: string; campaignTitle?: string; onBack?: () => void; initialKind?: CampaignActivityKind }) {
  const [kind, setKind] = useState<CampaignActivityKind>(initialKind);
  return <section className="fl-activity" aria-label="Campaign applications and invitations">
    <header>{onBack && <button type="button" onClick={onBack}>← Campaigns</button>}<div><h2>{campaignTitle || "Campaign activity"}</h2><p>{audience === "brand" ? "Review saved applications and invitations for this campaign." : "Your campaign applications and invitations from brands."}</p></div></header>
    <Link href="/dashboard/collaborations">Shared collaborations →</Link>
    <div className="fl-activity-tabs" role="group" aria-label="Campaign record type">{(["applications", "invitations"] as const).map(value => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{value === "applications" ? "Applications" : "Invitations"}</button>)}</div>
    <ActivityRecords key={`${audience}:${campaignId || "all"}:${kind}`} audience={audience} campaignId={campaignId} kind={kind} />
  </section>;
}

function ActivityRecords({ audience, campaignId, kind }: { audience: CampaignAudience; campaignId?: string; kind: CampaignActivityKind }) {
  const [selected, setSelected] = useState<{ id: string; action: CampaignResponseAction } | null>(null);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data: CampaignActivityPage | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    loadCampaignActivity(campaignActivityPath(audience, kind, page, campaignId), controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: error instanceof Error ? error.message : "Could not load campaign activity." });
    });
    return () => controller.abort();
  }, [audience, campaignId, kind, page, attempt]);
  const recordChanged = useCallback((item: CampaignActivityRecord) => {
    setState(previous => previous.data ? { ...previous, data: { ...previous.data, items: previous.data.items.map(row => row.id === item.id ? item : row) } } : previous);
  }, []);
  const refresh = () => { setNotice(""); setState({ data: null, loading: true, error: "" }); setAttempt(value => value + 1); };
  const move = (next: number) => { setNotice(""); setState({ data: null, loading: true, error: "" }); setPage(next); };
  return <div aria-busy={state.loading}>
    <div className="fl-activity-summary"><p role="status">{state.loading ? "Loading campaign activity…" : state.error ? "Campaign activity unavailable" : `${state.data?.total || 0} ${state.data?.total === 1 ? kind.slice(0, -1) : kind}`}</p><button type="button" onClick={refresh} disabled={state.loading}>Refresh</button></div>
    {notice && <p role="status" className="fl-activity-notice">{notice}</p>}
    {selected && <CampaignResponseDialog key={`${selected.id}:${selected.action}`} audience={audience} kind={kind} recordId={selected.id} action={selected.action} onClose={() => setSelected(null)} onRecord={recordChanged} onSaved={item => { recordChanged(item); setNotice(`Response saved: ${activityStatusLabel[item.status]}.`); }} />}
    {state.error && <div role="alert" className="fl-activity-empty"><p>{state.error}</p><button type="button" onClick={refresh}>Retry</button></div>}
    {!state.loading && !state.error && state.data && <>
      {!state.data.items.length && <p className="fl-activity-empty">{page > 1 ? "No records on this page. Return to the previous page or refresh." : kind === "applications" ? audience === "brand" ? "No applications yet. Saved creator applications will appear here." : "No applications yet. Your submitted campaign applications will appear here." : audience === "brand" ? "No invitations sent yet." : "No invitations yet. Invitations from brands will appear here."}</p>}
      <div className="fl-activity-records">{state.data.items.map(item => <article key={item.id}>
        <div className="fl-activity-record-heading"><div><h3>{audience === "brand" ? item.creator_name : item.campaign_title}</h3><p>{audience === "brand" ? `@${item.creator_handle}` : item.organization_name}</p></div><span className="fl-activity-status">{activityStatusLabel[item.status] || item.status}</span></div>
        <div className="fl-activity-record-meta"><span>Campaign: {campaignStatusLabel[item.campaign_status]}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("en-IN")}</time></div>
        <p className="fl-activity-rate">{kind === "applications" ? "Proposed quote" : "Offered quote"}: <strong>{campaignMoney(item.rate_cents, item.currency)}</strong></p>
        <details><summary>{kind === "applications" ? "View pitch" : "View invitation"}</summary><p className="fl-activity-message">{item.message || "No message included."}</p></details>
        {((audience === "brand" && kind === "applications" && item.status === "pending") || (audience === "creator" && kind === "invitations" && item.status === "invited")) && !activityAccepting(item) && <p>This campaign is not open for acceptance.</p>}
        {item.status === "accepted" && <StartCollaboration sourceKind={kind === "applications" ? "application" : "invitation"} sourceId={item.id} />}
        <div className="fl-activity-response-actions"><Link href={`/dashboard/offers/${item.campaign_id}`}>Offer &amp; counter-offers →</Link>{activityActions(audience, kind, item).map(action => <button type="button" key={action} onClick={() => { setNotice(""); setSelected({ id: item.id, action }); }}>{activityResponseLabel(kind, action)}</button>)}</div>
      </article>)}</div>
      <nav className="fl-activity-pagination" aria-label="Campaign activity pages"><button type="button" disabled={page === 1} onClick={() => move(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(state.data.total / state.data.page_size))}</span><button type="button" disabled={page * state.data.page_size >= state.data.total} onClick={() => move(page + 1)}>Next</button></nav>
    </>}
  </div>;
}
