"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collaborationRequest, type Collaboration, type CollaborationPage } from "@/lib/collaborations";
import { campaignMoney } from "@/lib/campaign-drafts";
import "./collaborations.css";
import { CollaborationMessages } from "./messages";
import { CollaborationFeedback } from "./feedback";
import { CollaborationProof } from "./publishing-proof";
import { CollaborationDeliveries } from "./deliveries";
import { CollaborationProposals } from "./proposals";

export function SharedCollaborations({ id }: { id?: string }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const key = `${id || "list"}:${page}:${attempt}`;
  const [state, setState] = useState<{ key: string; data?: CollaborationPage; row?: Collaboration; error?: string } | null>(null);
  const loading = state?.key !== key;
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const request = id ? collaborationRequest<Collaboration>(`/${id}`, options).then(row => ({ row }))
      : collaborationRequest<CollaborationPage>(`?page=${page}&page_size=12`, options).then(data => ({ data }));
    request.then(result => { if (!controller.signal.aborted) setState({ key, ...result }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Could not load collaborations." }); });
    return () => controller.abort();
  }, [id, page, key]);
  return <section className="fl-shared" aria-label="Shared collaborations" aria-busy={loading}>
    <header><div><h1>{id ? "Collaboration" : "Collaborations"}</h1><p>Shared records for you and your collaborator.</p></div>{!id && <button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Refresh</button>}</header>
    {loading ? <p role="status">Loading collaborations…</p> : state?.error ? <div role="alert"><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : state?.row ? <Detail row={state.row} /> : state?.data && <>
      <p>{state.data.total} saved collaborations</p>
      {!state.data.items.length && <p>No collaborations here yet. Start one from an accepted enquiry, application or invitation.</p>}
      <div className="fl-shared-list">{state.data.items.map(row => <article key={row.id}><span className="fl-shared-status">{row.status === "completed" ? "Completed" : row.status === "agreed" ? "Agreed" : "Discussion"}</span><h2>{row.title}</h2><p>{row.brand_name} · {row.creator_name}</p><p>Source: {row.source_kind}</p><Link href={`/dashboard/collaborations/${row.id}`}>Open collaboration →</Link></article>)}</div>
      <nav aria-label="Collaboration pages"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(state.data.total / state.data.page_size))}</span><button type="button" disabled={page * state.data.page_size >= state.data.total} onClick={() => setPage(value => value + 1)}>Next</button></nav>
    </>}
  </section>;
}
function Detail({ row }: { row: Collaboration }) {
  const [status, setStatus] = useState(row.status);
  return <article className="fl-shared-detail"><span className="fl-shared-status">{status === "completed" ? "Completed" : status === "agreed" ? "Agreed" : "Discussion"}</span><h2>{row.title}</h2><p>{row.brand_name} · {row.creator_name}</p>
    <p>This saved brief and quote provide source context. Review the proposed or agreed terms below for this collaboration.</p>
    <dl><div><dt>Source brief</dt><dd>{row.brief}</dd></div><div><dt>Requested deliverables</dt><dd>{row.deliverable}</dd></div><div><dt>Source quote</dt><dd>{row.quoted_amount_cents === null ? "To discuss" : campaignMoney(row.quoted_amount_cents, row.currency)}</dd></div><div><dt>Requested delivery</dt><dd>{row.requested_delivery_date || "To discuss"} · subject to agreement</dd></div><div><dt>Source reference</dt><dd>{row.source_kind} · {row.source_id}</dd></div><div><dt>Created</dt><dd>{new Date(row.created_at).toLocaleString()}</dd></div></dl>
    <p>No payment or funded booking has been created.</p><CollaborationMessages key={row.id} collaborationId={row.id} /><CollaborationProposals collaboration={row} onStatus={setStatus} /><CollaborationDeliveries collaborationId={row.id} status={status} onStatus={setStatus} /><CollaborationProof collaborationId={row.id} status={status} /><CollaborationFeedback collaborationId={row.id} status={status} onStatus={setStatus} /><Link href="/dashboard/collaborations">← All collaborations</Link></article>;
}
