import type { DeliveryFields } from "@/lib/deliveries";

export function DeliveryContents({ value }: { value: Pick<DeliveryFields, "title" | "notes" | "links"> }) {
  return <div className="fl-delivery-contents"><h3>{value.title}</h3>{value.notes && <p className="fl-delivery-notes">{value.notes}</p>}<ul>{value.links.map((link, index) => <li key={index}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a><span>{link.url}</span></li>)}</ul></div>;
}
