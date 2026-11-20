"use client";

import { useEffect, useState } from "react";
import { campaignMoney, campaignRequest, CampaignRequestError } from "@/lib/campaign-drafts";
import type { components } from "@/types/api";

type Summary = components["schemas"]["CampaignPipelineSummary"];

export function CampaignPipeline({ revision }: { revision: number }) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${revision}:${attempt}`;
  const [result, setResult] = useState<{ key: string; data: Summary | null; error: string } | null>(null);
  const loading = result?.key !== requestKey;
  const data = result?.data;
  const error = loading ? "" : result?.error;
  useEffect(() => {
    const controller = new AbortController();
    campaignRequest<Summary>("/me/summary", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data, error: "" }); })
      .catch(reason => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: reason instanceof CampaignRequestError && reason.status === 404
          ? "Set up your brand profile to see campaign totals."
          : reason instanceof Error ? reason.message : "Could not load campaign totals." });
      });
    return () => controller.abort();
  }, [requestKey]);

  return <section aria-label="Campaign pipeline" aria-busy={loading} className="rounded-2xl border border-[color:var(--ui-line-neutral-800)] bg-[color:var(--ui-paint-121215)] p-5 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Campaign pipeline</h2><p className="text-xs text-[color:var(--ui-ink-neutral-400)] mt-1">All your campaigns, including drafts and closed campaigns.</p></div>
      <button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)} className="rounded-lg border border-[color:var(--ui-line-neutral-700)] px-3 py-2 text-xs disabled:opacity-50">{loading ? "Loading totals…" : "Refresh totals"}</button>
    </div>
    {error && <p role="alert" className="text-sm text-[color:var(--ui-ink-red-300)]">{error} Use Refresh totals to retry.</p>}
    {data && !error && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><p className="text-xs text-[color:var(--ui-ink-neutral-400)]">Active campaigns</p><p className="text-2xl font-bold mt-1">{data.active_campaign_count}</p><p className="text-xs text-[color:var(--ui-ink-neutral-500)]">{data.campaign_count} campaigns in total</p></div>
        <div><p className="text-xs text-[color:var(--ui-ink-neutral-400)]">Planned campaign budgets</p><div className="text-xl font-bold mt-1">{data.planned_budgets.length ? data.planned_budgets.map(item => <p key={item.currency}>{campaignMoney(item.cents, item.currency)}</p>) : "Not set"}</div><p className="text-xs text-[color:var(--ui-ink-neutral-500)]">Declared budgets · actual spending is not tracked yet</p></div>
        <div><p className="text-xs text-[color:var(--ui-ink-neutral-400)]">Applications / invitations</p><p className="text-2xl font-bold mt-1">{data.applications.total} / {data.invitations.total}</p><p className="text-xs text-[color:var(--ui-ink-neutral-500)]">Separate records, not unique creators or deals</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-[color:var(--ui-line-neutral-800)] pt-4">
        <StatusCounts title="Applications" counts={data.applications} labels={{ pending: "Pending", accepted: "Accepted", rejected: "Rejected", withdrawn: "Withdrawn" }} />
        <StatusCounts title="Invitations" counts={data.invitations} labels={{ invited: "Invited", accepted: "Accepted", declined: "Declined" }} />
      </div>
      {data.campaign_count === 0 && <p className="text-sm text-[color:var(--ui-ink-neutral-400)]">Create your first campaign to start building your pipeline.</p>}
      <p className="text-xs text-[color:var(--ui-ink-neutral-500)]" role="status">{loading ? "Updating saved totals…" : `Updated ${new Date(data.updated_at).toLocaleString()}. Refresh to check for new responses.`}</p>
    </>}
  </section>;
}

function StatusCounts({ title, counts, labels }: { title: string; counts: Record<string, number>; labels: Record<string, string> }) {
  return <div><h3 className="text-sm font-medium mb-3">{title}</h3><dl className="flex flex-wrap gap-x-6 gap-y-3">{Object.entries(labels).map(([key, label]) => <div key={key}><dt className="text-xs text-[color:var(--ui-ink-neutral-400)]">{label}</dt><dd className="text-lg font-semibold">{counts[key]}</dd></div>)}</dl></div>;
}
