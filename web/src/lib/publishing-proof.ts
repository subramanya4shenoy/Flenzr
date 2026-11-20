import type { components } from "@/types/api";
import { deliveryPayload, type DeliveryFields } from "./deliveries";
export type ProofWorkspace = components["schemas"]["PublishingProofWorkspace"];
export type PublishingProof = components["schemas"]["PublishingProofRead"];
export type ProofFields = Omit<DeliveryFields, "title">;
export function proofPayload(fields: ProofFields) {
  const { notes, links } = deliveryPayload({ ...fields, title: "Publishing proof" });
  return { notes, links };
}

export type ProofConfirmation = components["schemas"]["ProofConfirmationRead"];
