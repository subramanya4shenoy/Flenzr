"use client";

import { useCallback, useEffect, useState } from "react";
import { opportunityDate, opportunityQuery, opportunityRequest, type CampaignOpportunity, type OpportunityPage } from "@/lib/campaign-opportunities";
import { campaignMoney } from "@/lib/campaign-drafts";
import { activityStatusLabel } from "@/lib/campaign-activity";
import { CampaignApplicationDialog } from "./campaign-application";
import "./campaign-opportunities.css";

type Result = { key: string; data?: OpportunityPage; error?: string };
export function CampaignOpportunities({ onViewApplications }: { onViewApplications: () => void }) {
  const [q, setQ] = useState(""), [niche, setNiche] = useState(""), [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0), [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const key = opportunityQuery(q, niche, page), current = result?.key === key ? result : null;
  const loading = !current, data = current?.data;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      opportunityRequest<OpportunityPage>(`/opportunities?${key}`, { signal: controller.signal }).then(rows => {
        if (!controller.signal.aborted) setResult({ key, data: rows });
      }).catch(err => { if (!controller.signal.aborted) setResult({ key, error: err.message }); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, attempt]);
  const recordChanged = useCallback((item: CampaignOpportunity) => {
    setResult(previous => previous?.data ? { ...previous, data: { ...previous.data, items: previous.data.items.map(row => row.id === item.id ? item : row) } } : previous);
  }, []);
  function refresh() { setResult(null); setAttempt(value => value + 1); }
  return <section className="fl-opportunities" aria-label="Campaign opportunities">
    <header><div><h2>Campaign opportunities</h2><p>Explore published briefs and propose a collaboration.</p></div><button type="button" onClick={onViewApplications}>My applications</button></header>
    <div className="fl-opportunity-filters"><label>Search campaigns<input name="opportunity-search" type="search" maxLength={255} placeholder="Campaign, brief or brand" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label><label>Niche<input name="opportunity-niche" maxLength={128} placeholder="e.g. Technology" value={niche} onChange={e => { setNiche(e.target.value); setPage(1); }} /></label><button type="button" disabled={!q && !niche} onClick={() => { setQ(""); setNiche(""); setPage(1); }}>Clear filters</button></div>
    <div className="fl-opportunity-count"><p role="status">{loading ? "Loading opportunities…" : current?.error ? "Opportunities unavailable" : `${data?.total || 0} open campaign${data?.total === 1 ? "" : "s"}`}</p><button type="button" disabled={loading} onClick={refresh}>Refresh</button></div>
    <div aria-busy={loading}>
      {current?.error && <div className="fl-opportunity-empty" role="alert"><p>{current.error}</p><button type="button" onClick={refresh}>Retry</button></div>}
      {data && !data.items.length && <div className="fl-opportunity-empty"><h3>{page > 1 ? "No campaigns on this page" : q || niche ? "No campaigns match your search" : "No open campaigns yet"}</h3><p>{page > 1 ? "The board may have changed. Return to the previous page or refresh." : "Try a different search or check back when brands publish new briefs."}</p></div>}
      {data && <div className="fl-opportunity-grid">{data.items.map(item => <article className="fl-opportunity-card" key={item.id}>
        <div className="fl-opportunity-card-heading"><span>{item.target_niche || "Niche not specified"}</span>{item.application && <span className="fl-opportunity-application-status">{activityStatusLabel[item.application.status]}</span>}</div>
        <h3>{item.title}</h3><p className="fl-opportunity-brand">{item.organization_name}</p><p className="fl-opportunity-deliverables">{item.deliverable_summary || "See campaign brief"}</p>
        <div className="fl-opportunity-budget"><small>Campaign budget</small><strong>{campaignMoney(item.budget_total_cents, item.currency)}</strong></div>
        <footer><small>{item.end_date ? `Ends ${opportunityDate(item.end_date)} · UTC` : "Open end date"}</small><button type="button" onClick={() => setSelected(item.id)}>{item.application ? "View application" : "View brief & apply"}</button></footer>
      </article>)}</div>}
    </div>
    {data && data.total > 0 && <nav className="fl-opportunity-pagination" aria-label="Opportunity pages"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><button type="button" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)}>Next</button></nav>}
    {selected && <CampaignApplicationDialog key={selected} campaignId={selected} onClose={() => setSelected(null)} onRecord={recordChanged} onViewApplications={() => { onViewApplications(); setSelected(null); }} />}
  </section>;
}
