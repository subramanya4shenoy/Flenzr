import type { components } from "@/types/api";
export type DeliveryWorkspace = components["schemas"]["DeliveryWorkspace"];
export type Delivery = components["schemas"]["DeliveryRead"];
export type DeliveryReview = components["schemas"]["DeliveryReviewRead"];
export type DeliveryReviewAction = components["schemas"]["DeliveryReviewCreate"]["action"];
export type DeliveryLink = components["schemas"]["DeliveryLink"];
export interface DeliveryFields { title: string; notes: string; links: { label: string; url: string }[] }
export const emptyDelivery = (): DeliveryFields => ({ title: "", notes: "", links: [{ label: "", url: "" }] });
export function deliveryPayload(fields: DeliveryFields, fileIds: string[] = []) {
  const title = fields.title.trim(), notes = fields.notes.trim();
  if (title.length < 3 || title.length > 160) throw new Error("Add a delivery title between 3 and 160 characters.");
  if (notes.length > 5000) throw new Error("Keep delivery notes within 5,000 characters.");
  if ((!fields.links.length && !fileIds.length) || fields.links.length > 10) throw new Error("Add between 1 and 10 delivery links.");
  if (fileIds.length > 10 || new Set(fileIds).size !== fileIds.length || fileIds.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Choose up to 10 distinct uploaded files.");
  const seen = new Set<string>();
  const links = fields.links.map(link => {
    const label = link.label.trim(), raw = link.url.trim();
    if (!label || label.length > 80) throw new Error("Give each link a label of up to 80 characters.");
    if (raw.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(raw)) throw new Error("Use a full HTTPS link without spaces or backslashes.");
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error("Use a full HTTPS link for each delivery."); }
    const authority = raw.match(/^https:\/\/([^/?#]*)/i)?.[1];
    if (!authority || url.protocol !== "https:" || !url.hostname || url.username || url.password || authority.includes("@")) throw new Error("Use an HTTPS link without embedded login details.");
    if (url.href.length > 2048) throw new Error("Keep each delivery link within 2,048 characters.");
    if (seen.has(url.href)) throw new Error("Remove duplicate delivery links.");
    seen.add(url.href);
    return { label, url: url.href };
  });
  return { title, notes, links, ...(fileIds.length ? { file_ids: fileIds } : {}) };
}

export function deliveryReviewPayload(action: DeliveryReviewAction, feedback: string) {
  const text = feedback.trim();
  if (action !== "approve" && action !== "request_revision") throw new Error("Choose a valid delivery review action.");
  if (text.length > 5000) throw new Error("Keep review feedback within 5,000 characters.");
  if (action === "request_revision" && Array.from(text).length < 5) throw new Error("Describe the requested changes in at least five characters.");
  return { action, feedback: text };
}

export type Completion = components["schemas"]["CompletionRead"];
