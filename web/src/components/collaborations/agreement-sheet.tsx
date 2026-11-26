"use client";
import { CheckCircle2, Clock, Download, Printer } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { campaignMoney } from "@/lib/campaign-drafts";
import type { Collaboration } from "@/lib/collaborations";
import type { ProposalTerms, ProposalWorkspace } from "@/lib/proposals";

interface AgreementSheetProps {
  collaboration: Collaboration;
  terms: ProposalTerms;
  mode: "agreed" | "proposal" | "draft";
  version?: number;
  agreementId?: string;
  agreementRevision?: number;
  agreedAt?: string;
  acceptance?: ProposalWorkspace["acceptance"];
  onDownload?: () => void;
  downloading?: boolean;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "To be confirmed";
  const parsed = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(value.length === 10 ? { timeZone: "UTC" } : {}),
  }).format(parsed);
}

export function AgreementSheet({
  collaboration, terms, mode, version, agreementId, agreementRevision = 1, agreedAt, acceptance, onDownload, downloading,
}: AgreementSheetProps) {
  const amount = terms.amount_cents == null ? "To be confirmed" : campaignMoney(terms.amount_cents, terms.currency || "INR");
  const docTitle = mode === "agreed" ? "Collaboration Agreement" : mode === "draft" ? "Collaboration Proposal (Draft)" : `Collaboration Proposal — Version ${version || 1}`;
  const docRef = `FLZ-${(agreementId || collaboration.id).slice(0, 8).toUpperCase()}`;

  return <div className="fl-doc-wrap">
    <div className="fl-doc-paper" aria-label="A4 Agreement document">
      {/* Letterhead */}
      <header className="fl-a4-letterhead">
        <div className="fl-a4-brand">
          <div className="fl-a4-logo" aria-hidden="true"><Logo size={22} variant="duotone-light" /></div>
          <div>
            <span className="fl-a4-eyebrow">FLENZR · CREATOR COLLABORATION RECORD</span>
            <h3>{docTitle}</h3>
          </div>
        </div>
        <div className="fl-a4-meta">
          <span className="fl-a4-stamp" data-mode={mode}>
            {mode === "agreed" ? "EXECUTED" : mode === "draft" ? "DRAFT" : `PROPOSAL V${version || 1}`}
          </span>
          <dl>
            <div><dt>Reference</dt><dd>{docRef}</dd></div>
            {mode === "agreed" && <div><dt>Agreement revision</dt><dd>{agreementRevision}</dd></div>}
            <div><dt>{mode === "agreed" ? "Agreed on" : "Date"}</dt><dd>{mode === "agreed" && agreedAt ? formatDate(agreedAt) : formatDate(new Date().toISOString())}</dd></div>
          </dl>
        </div>
      </header>

      <p className="fl-a4-preamble">
        This agreement records the collaboration terms between <strong>{collaboration.brand_name}</strong> (“Brand”) and <strong>{collaboration.creator_name}</strong> (“Creator”) for the project <strong>{collaboration.title}</strong>.
      </p>

      {/* Section 1: Parties & Schedule */}
      <section className="fl-a4-section">
        <h4>1. Parties &amp; Key Dates</h4>
        <div className="fl-a4-parties">
          <div>
            <small>Brand / Client</small>
            <strong>{collaboration.brand_name}</strong>
          </div>
          <div>
            <small>Creator</small>
            <strong>{collaboration.creator_name}</strong>
          </div>
          <div>
            <small>Target Delivery Date</small>
            <strong>{formatDate(terms.delivery_date)}</strong>
          </div>
          <div>
            <small>Revision Allowance</small>
            <strong>{terms.revision_limit == null ? "Per written scope" : `${terms.revision_limit} included ${terms.revision_limit === 1 ? "round" : "rounds"}`}</strong>
          </div>
        </div>
      </section>

      {/* Section 2: Scope & Compensation */}
      <section className="fl-a4-section">
        <h4>2. Scope of Work &amp; Compensation</h4>
        <table className="fl-a4-table">
          <thead>
            <tr>
              <th>Deliverables &amp; Scope</th>
              <th>Revisions</th>
              <th>Fee ({terms.currency || "INR"})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{collaboration.title}</strong>
                <p>{terms.deliverables || "Deliverables not specified yet."}</p>
              </td>
              <td>{terms.revision_limit == null ? "As written" : `${terms.revision_limit}`}</td>
              <td>{amount}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{mode === "agreed" ? "Total Agreed Compensation" : "Total Proposed Compensation"}</td>
              <td>{amount}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Section 3: Usage Rights */}
      <section className="fl-a4-section">
        <h4>3. Usage Rights &amp; Licensing</h4>
        <p className="fl-a4-clause">{terms.usage_rights || "Not specified yet (usage rights are required before sending a proposal)."}</p>
      </section>

      {/* Section 4: Additional Notes */}
      {terms.note && <section className="fl-a4-section">
        <h4>4. Additional Notes</h4>
        <p className="fl-a4-clause">{terms.note}</p>
      </section>}

      {/* Signatures block anchored near bottom of A4 sheet */}
      <section className="fl-a4-signatures">
        <h4>{terms.note ? "5." : "4."} Mutual Acceptance &amp; Signatures</h4>
        <p className="fl-a4-sig-note">
          By accepting this exact version, both parties confirm the deliverables, fee, delivery date, revision allowance, and usage rights above. No payment or escrow is collected by Flenzr.
        </p>
        <div className="fl-a4-sig-grid">
          <div className="fl-a4-sig-box" data-signed={Boolean(acceptance?.brand_accepted_at)}>
            <div className="fl-a4-sig-line">
              {acceptance?.brand_accepted_at
                ? <span className="fl-a4-sig-script">{collaboration.brand_name}</span>
                : <span className="fl-a4-sig-pending">Awaiting acceptance</span>}
            </div>
            <div className="fl-a4-sig-meta">
              <strong>{collaboration.brand_name}</strong>
              <small>Brand / Client</small>
              <span>
                {acceptance?.brand_accepted_at
                  ? <><CheckCircle2 size={12} aria-hidden="true" /> Accepted {formatDate(acceptance.brand_accepted_at)}</>
                  : <><Clock size={12} aria-hidden="true" /> Not yet signed</>}
              </span>
            </div>
          </div>

          <div className="fl-a4-sig-box" data-signed={Boolean(acceptance?.creator_accepted_at)}>
            <div className="fl-a4-sig-line">
              {acceptance?.creator_accepted_at
                ? <span className="fl-a4-sig-script">{collaboration.creator_name}</span>
                : <span className="fl-a4-sig-pending">Awaiting acceptance</span>}
            </div>
            <div className="fl-a4-sig-meta">
              <strong>{collaboration.creator_name}</strong>
              <small>Creator</small>
              <span>
                {acceptance?.creator_accepted_at
                  ? <><CheckCircle2 size={12} aria-hidden="true" /> Accepted {formatDate(acceptance.creator_accepted_at)}</>
                  : <><Clock size={12} aria-hidden="true" /> Not yet signed</>}
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="fl-a4-footer">
        <span>FLENZR AGREEMENT RECORD · {docRef}</span>
        <span>PAGE 1 OF 1</span>
      </footer>
    </div>

    {mode === "agreed" && <div className="fl-doc-floating-bar">
      <span>{docRef} · {amount}</span>
      <div>
        <button type="button" onClick={() => window.print()}><Printer size={13} aria-hidden="true" /> Print / PDF</button>
        {onDownload && <button type="button" disabled={downloading} onClick={onDownload}><Download size={13} aria-hidden="true" /> {downloading ? "Downloading…" : "JSON"}</button>}
      </div>
    </div>}
  </div>;
}
