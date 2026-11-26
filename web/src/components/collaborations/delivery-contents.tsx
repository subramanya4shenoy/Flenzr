"use client";
import { ExternalLink, FileText } from "lucide-react";
import type { DeliveryFields } from "@/lib/deliveries";
import { DeliveryFilePreview, fileSize, type DeliveryFile } from "./delivery-files";

export function DeliveryContents({ value, collaborationId, hideTitle = false }: {
  value: Pick<DeliveryFields, "title" | "notes" | "links"> & { files?: DeliveryFile[] };
  collaborationId?: string;
  hideTitle?: boolean;
}) {
  const files = value.files ?? [];
  return <div className="fl-delivery-contents">
    {!hideTitle && <h3>{value.title}</h3>}
    {value.notes && <p className="fl-delivery-notes">{value.notes}</p>}
    {files.length > 0 && (collaborationId ? (
      <div className="fl-del-media-grid" data-count={files.length === 1 ? "single" : "multi"} aria-label="Attached files">
        {files.map(file => <DeliveryFilePreview key={file.id} file={file} collaborationId={collaborationId} />)}
      </div>
    ) : (
      <ul className="fl-del-asset-list" aria-label="Attached files">
        {files.map(file => (
          <li key={file.id} className="fl-del-asset-row">
            <FileText size={14} className="fl-del-asset-icon" aria-hidden="true" />
            <div className="fl-del-asset-copy">
              <strong>{file.filename}</strong>
              <span>{fileSize(file.size_bytes)} · Private file</span>
            </div>
          </li>
        ))}
      </ul>
    ))}
    {value.links.length > 0 && <ul className="fl-del-asset-list" aria-label="Submitted links">
      {value.links.map((link, index) => (
        <li key={index} className="fl-del-asset-row">
          <ExternalLink size={14} className="fl-del-asset-icon" aria-hidden="true" />
          <div className="fl-del-asset-copy">
            <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
            <span>{link.url}</span>
          </div>
        </li>
      ))}
    </ul>}
  </div>;
}
