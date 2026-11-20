"use client";
import type { DeliveryFields } from "@/lib/deliveries";

import { DeliveryFileDownload, fileSize, type DeliveryFile } from "./delivery-files";

export function DeliveryContents({ value, collaborationId }: { value: Pick<DeliveryFields, "title" | "notes" | "links"> & { files?: DeliveryFile[] }; collaborationId?: string }) {
  return <div className="fl-delivery-contents"><h3>{value.title}</h3>{value.notes && <p className="fl-delivery-notes">{value.notes}</p>}<ul>{value.links.map((link, index) => <li key={index}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a><span>{link.url}</span></li>)}</ul>{Boolean(value.files?.length) && <ul aria-label="Attached files">{value.files?.map(file => <li key={file.id}>{collaborationId ? <DeliveryFileDownload file={file} collaborationId={collaborationId} /> : <><strong>{file.filename}</strong><span>{fileSize(file.size_bytes)} · Private file</span></>}</li>)}</ul>}</div>;
}
