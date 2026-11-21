// Keep this order and hash stable: an offer's ID permanently determines its artwork.
export const offerTicketPatterns = ["flow", "shift", "radiance", "balance", "cycle", "echo"] as const;
export type OfferTicketPattern = typeof offerTicketPatterns[number];

export function offerTicketPattern(id: string): OfferTicketPattern {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  }
  return offerTicketPatterns[(hash >>> 0) % offerTicketPatterns.length];
}

// Preserve the original six assignment slots while replacing their artwork with the new references.
export const offerTicketArtwork: Record<OfferTicketPattern, string> = {
  flow: "horizons",
  shift: "neon-peak",
  radiance: "pastel-mesh",
  balance: "iridescent-silk",
  cycle: "black",
  echo: "iridescent-silk",
};
