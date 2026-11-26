"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { collaborationRequest, type Collaboration } from "@/lib/collaborations";
import type { components } from "@/types/api";
import type { ProposalRevision, ProposalWorkspace } from "@/lib/proposals";
import { Terms } from "./proposal-terms";
import { AgreementSheet } from "./agreement-sheet";
type Agreement = components["schemas"]["AgreementRead"];
type Status = components["schemas"]["AgreementStatus"];

export function AgreementPanel({ collaborationId, workspace, latest, disabled, onLatest, onAccepted }: {
  collaborationId: string; workspace: ProposalWorkspace; latest?: ProposalRevision; disabled: boolean; onLatest: () => void; onAccepted: (state: Status) => void;
}) {
  const [review, setReview] = useState(false), [downloading, setDownloading] = useState(false), [error, setError] = useState("");
  const agreement = workspace.agreement, acceptance = workspace.acceptance;
  async function download() {
    setDownloading(true); setError("");
    try {
      const saved = await collaborationRequest<Agreement>(`/${collaborationId}/agreement`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2) + "\n"], { type: "application/json;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `flenzr-agreement-${saved.id}.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not download agreement. Please retry."); }
    finally { setDownloading(false); }
  }
  if (!acceptance && !agreement) return null;
  return <section className="fl-agreement" aria-label="Proposal acceptance and agreement">
    <h3>{agreement ? `Agreement saved · Revision ${agreement.revision}` : `Acceptance · Version ${acceptance?.version}`}</h3>
    <p>Both participants must explicitly accept the same version. Sending a proposal alone does not count as acceptance.</p>
    <dl className="fl-agreement-acceptances"><div><dt>Brand / client</dt><dd>{acceptance?.brand_accepted_at ? `Accepted ${new Date(acceptance.brand_accepted_at).toLocaleString()}` : "Not accepted"}</dd></div><div><dt>Creator</dt><dd>{acceptance?.creator_accepted_at ? `Accepted ${new Date(acceptance.creator_accepted_at).toLocaleString()}` : "Not accepted"}</dd></div></dl>
    {agreement ? <>
      <p>Both participants accepted these terms. This agreement revision is fixed. Updated scope requires a separate mutually accepted request. No payment has been collected.</p>
      <Terms terms={agreement.snapshot.terms} agreed />
      <p className="fl-agreement-reference">Agreement {agreement.id}<br />Saved {new Date(agreement.snapshot.agreed_at).toLocaleString()}</p>
      <button type="button" disabled={downloading} onClick={download}>{downloading ? "Downloading…" : "Download agreement (JSON)"}</button>
      {error && <p role="alert">{error}</p>}
    </> : acceptance?.you_accepted ? <p role="status">Your acceptance is saved. Waiting for the other participant to accept this version. A newer proposal will require fresh acceptance.</p>
      : acceptance?.can_accept ? latest ? <button type="button" disabled={disabled} onClick={() => setReview(true)}>Review & accept version {latest.version}</button>
        : <button type="button" disabled={disabled} onClick={onLatest}>Review latest proposal</button>
        : <p role="status">The proposed delivery date has passed. Send and review a revised proposal before accepting.</p>}
    {review && latest && <AcceptanceDialog collaborationId={collaborationId} proposal={latest} onClose={() => setReview(false)} onAccepted={state => { setReview(false); onAccepted(state); }} />}
  </section>;
}

export function AcceptanceDialog({ collaboration, collaborationId, proposal, onClose, onAccepted }: { collaboration?: Collaboration; collaborationId: string; proposal: ProposalRevision; onClose: () => void; onAccepted: (state: Status) => void }) {
  const ref = useRef<HTMLDialogElement>(null), saving = useRef(false);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  async function accept() {
    if (!confirmed || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const state = await collaborationRequest<Status>(`/${collaborationId}/proposals/accept`, { method: "POST", body: JSON.stringify({ proposal_id: proposal.id, expected_version: proposal.version, confirmed: true }) });
      onAccepted(state);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save acceptance. Please retry."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className={collaboration ? "fl-doc-review-dialog" : "fl-shared-dialog"} aria-labelledby="accept-proposal-title" onCancel={event => { if (saving.current) event.preventDefault(); else onClose(); }}>
    <div className="fl-doc-review-head">
      <div>
        <h2 id="accept-proposal-title">Accept proposal version {proposal.version}?</h2>
        <p>Once both participants accept this exact version, it becomes your fixed shared agreement. No payment is taken.</p>
      </div>
      <button type="button" className="fl-doc-review-close" disabled={busy} aria-label="Close acceptance review" onClick={onClose}><X size={16} /></button>
    </div>
    <div className="fl-doc-review-body">
      {collaboration ? <AgreementSheet collaboration={collaboration} terms={proposal.terms} mode="proposal" version={proposal.version} /> : <Terms terms={proposal.terms} />}
    </div>
    <div className="fl-doc-review-foot">
      <label className="fl-agreement-confirm"><input name="confirm-proposal-acceptance" type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I accept version {proposal.version} with the price, scope, revision allowance, date and usage rights shown above.</label>
      {error && <p role="alert" className="fl-doc-review-error">{error}</p>}
      <div className="fl-shared-actions">
        <button type="button" disabled={busy} onClick={onClose}>Keep reviewing</button>
        <button type="button" className="fl-prop-btn-primary" disabled={busy || !confirmed} onClick={accept}>{busy ? "Saving acceptance…" : `Accept version ${proposal.version}`}</button>
      </div>
    </div>
  </dialog>;
}
