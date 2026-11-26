import { campaignMoney } from "@/lib/campaign-drafts";
import type { ProposalTerms } from "@/lib/proposals";
export function Terms({ terms, agreed = false }: { terms: ProposalTerms; agreed?: boolean }) {
  return <dl><div><dt>{agreed ? "Agreed price" : "Proposed price"}</dt><dd>{terms.amount_cents == null ? "Not set" : campaignMoney(terms.amount_cents, terms.currency || "INR")}</dd></div><div><dt>Deliverables</dt><dd>{terms.deliverables || "Not set"}</dd></div><div><dt>Delivery date</dt><dd>{terms.delivery_date || "Not set"}</dd></div><div><dt>Included revision rounds</dt><dd>{terms.revision_limit == null ? "Not specified · written scope still applies" : `${terms.revision_limit} for these terms`}</dd></div><div><dt>Usage rights</dt><dd>{terms.usage_rights || "Not set"}</dd></div>{terms.note && <div><dt>Proposal note</dt><dd>{terms.note}</dd></div>}</dl>;
}
