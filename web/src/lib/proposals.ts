import type { components } from "@/types/api";
export type ProposalTerms = components["schemas"]["ProposalTerms"];
export type ProposalWorkspace = components["schemas"]["ProposalWorkspace"];
export type ProposalDraft = components["schemas"]["ProposalDraftRead"];
export type ProposalRevision = components["schemas"]["ProposalRevisionRead"];
export const proposalCurrencies = ["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD"] as const;
export interface ProposalFields { amount: string; currency: ProposalTerms["currency"]; deliverables: string; delivery_date: string; usage_rights: string; note: string; revision_limit: string }
export function proposalFields(terms: ProposalTerms): ProposalFields {
  return { amount: terms.amount_cents == null ? "" : (terms.amount_cents / 100).toFixed(2), currency: terms.currency || "INR",
    deliverables: terms.deliverables || "", delivery_date: terms.delivery_date || "", usage_rights: terms.usage_rights || "", note: terms.note || "", revision_limit: terms.revision_limit == null ? "" : String(terms.revision_limit) };
}
export function proposalPayload(fields: ProposalFields): ProposalTerms {
  const amount = fields.amount.trim();
  if (amount && !/^\d+(?:\.\d{1,2})?$/.test(amount)) throw new Error("Enter a price with up to two decimal places.");
  const [whole, fraction = ""] = amount.split(".");
  const cents = amount ? Number(whole) * 100 + Number(fraction.padEnd(2, "0")) : null;
  if (cents !== null && (!Number.isSafeInteger(cents) || cents < 100 || cents > 1_000_000_000)) throw new Error("Price must be between 1 and 10,000,000.");
  if (!proposalCurrencies.includes(fields.currency || "INR")) throw new Error("Choose a supported currency.");
  if (fields.delivery_date && (!/^\d{4}-\d{2}-\d{2}$/.test(fields.delivery_date) || !Number.isFinite(Date.parse(fields.delivery_date)) || new Date(fields.delivery_date).toISOString().slice(0, 10) !== fields.delivery_date)) throw new Error("Choose a valid delivery date.");
  const allowance = fields.revision_limit.trim();
  if (allowance && (!/^(0|[1-9][0-9]?)$/.test(allowance) || Number(allowance) > 20)) throw new Error("Choose a whole number of revision rounds from 0 to 20, or leave it unspecified.");
  return { ...(allowance ? { revision_limit: Number(allowance) } : {}), amount_cents: cents, currency: fields.currency || "INR", deliverables: fields.deliverables.trim(), delivery_date: fields.delivery_date || null, usage_rights: fields.usage_rights.trim(), note: fields.note.trim() };
}
