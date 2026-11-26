import type { components } from "@/types/api";
export type ScopeWorkspace = components["schemas"]["ScopeWorkspace"];
export type ScopeChange = components["schemas"]["ScopeChangeRead"];
export type ScopeCreate = components["schemas"]["ScopeChangeCreate"];
export type ScopeDecision = components["schemas"]["ScopeDecisionCreate"];
export type AgreementRevision = components["schemas"]["AgreementRead"];

export function scopeStatus(row: ScopeChange): string {
  if (!row.decision) return row.stale ? "Needs a fresh request" : "Awaiting response";
  return row.decision.action === "accept" ? "Agreed" : row.decision.action === "decline" ? "Declined" : "Withdrawn";
}
