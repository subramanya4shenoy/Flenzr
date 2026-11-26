"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, LockKeyhole, Globe2 } from "lucide-react";
import { offerTicketArtwork, offerTicketPattern } from "@/lib/offer-ticket-pattern";
import { Logo } from "@/components/ui/logo";
import "./offer-ticket.css";

type OfferTicketProps = {
  id: string;
  title: string;
  issuer: string;
  niche?: string | null;
  deliverables?: string | null;
  budget: string;
  deadline: string;
  status: string;
  state?: string;
  access?: "public" | "invited" | "draft";
  accessLabel?: string;
  kindLabel?: string;
  budgetLabel?: string;
  deadlineLabel?: string;
  referencePrefix?: string;
  referenceMeta?: string;
  onOpen?: () => void;
  openLabel?: string;
  interest?: {
    count: number;
    people: { id: string; display_name: string; avatar_url?: string | null }[];
    onOpen: () => void;
  };
  children?: ReactNode;
};

/** A listing preview. The detachable stub groups the actual Offer terms and actions. */
export function OfferTicket({
  id,
  title,
  issuer,
  niche,
  deliverables,
  budget,
  deadline,
  status,
  state = "active",
  access,
  accessLabel,
  kindLabel = "OFFER",
  budgetLabel = "Total budget",
  deadlineLabel = "Applications close",
  referencePrefix = "OFR",
  referenceMeta = "Per-creator terms",
  onOpen,
  openLabel = "Open Offer",
  interest,
  children,
}: OfferTicketProps) {
  const pattern = offerTicketPattern(id);
  const resolvedAccessLabel = accessLabel ?? (access === "draft" ? "Private draft" : access === "invited" ? "Invited creators" : "Public Offer");
  return <article className="fl-offer-ticket" data-state={state} data-pattern={pattern} data-artwork={offerTicketArtwork[pattern]}>
    <div className="fl-ticket-face">
      <div className="fl-ticket-topline"><span className="fl-ticket-wordmark"><Logo size={19} variant="monochrome" /> FLENZR<span> / {kindLabel}</span></span><span className="fl-ticket-status">{status}</span></div>
      <p className="fl-ticket-issuer">{issuer}</p>
      <h3>
        {onOpen
          ? <button type="button" className="fl-ticket-title-btn" title={title} onClick={onOpen}>{title}<ArrowUpRight size={20} aria-hidden="true" /></button>
          : <Link href={`/dashboard/offers/${id}`} title={title}>{title}<ArrowUpRight size={20} aria-hidden="true" /></Link>}
      </h3>
      <p className="fl-ticket-deliverables">{deliverables || "Deliverables to discuss"}</p>
      <div className="fl-ticket-tags"><span>{niche || "Open niche"}</span>{(access || accessLabel) && <span>{access === "public" ? <Globe2 size={11} /> : <LockKeyhole size={11} />}{resolvedAccessLabel}</span>}</div>
    </div>
    <div className="fl-ticket-stub">
      <dl className="fl-ticket-facts"><div><dt>{budgetLabel}</dt><dd title={budget}>{budget}</dd></div><div><dt>{deadlineLabel}</dt><dd>{deadline}</dd></div></dl>
      <div className="fl-ticket-reference"><span className="fl-ticket-pattern" aria-hidden="true" /><span>{referencePrefix} / {id.slice(0,8).toUpperCase()}</span><span>{referenceMeta}</span></div>
      <div className="fl-ticket-actions">
        {onOpen
          ? <button type="button" className="fl-ticket-open" onClick={onOpen}>{openLabel} <ArrowUpRight size={14} aria-hidden="true" /></button>
          : <Link className="fl-ticket-open" href={`/dashboard/offers/${id}`}>{openLabel} <ArrowUpRight size={14} aria-hidden="true" /></Link>}
        {children}
      </div>
      {interest && <button type="button" className="fl-ticket-interest" onClick={interest.onOpen}
        aria-label={`${interest.count} ${interest.count === 1 ? "creator has" : "creators have"} applied. View applications and invitations.`}>
        {interest.count > 0 ? <>
          <span className="fl-ticket-interest-people" aria-hidden="true"><span className="fl-ticket-avatar-stack">{interest.people.slice(0,4).map(person => <span className="fl-ticket-avatar" key={person.id} title={person.display_name}>
            <span>{person.display_name.trim().split(/\s+/).slice(0,2).map(word => word[0]).join("").toUpperCase() || "F"}</span>
            {person.avatar_url && <Image src={person.avatar_url.startsWith("/api/proxy-image?") ? person.avatar_url : `/api/proxy-image?${new URLSearchParams({url:person.avatar_url,name:person.display_name})}`} alt="" width={28} height={28} unoptimized loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}
          </span>)}</span>{interest.count > interest.people.slice(0,4).length && <span className="fl-ticket-interest-more">+{interest.count-interest.people.slice(0,4).length} more</span>}</span>
          <span className="fl-ticket-interest-count"><strong>{interest.count}</strong> interested <ArrowUpRight size={12} aria-hidden="true" /></span>
        </> : <><span>No interest yet</span><span className="fl-ticket-interest-empty">View applications <ArrowUpRight size={12} aria-hidden="true" /></span></>}
      </button>}
    </div>
  </article>;
}
