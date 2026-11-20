"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookmarkPlus, CheckCircle, Send } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon, XTwitterIcon, LinkedInIcon } from "@/components/ui/social-network-icons";
import { audienceSavedDate, discoveryNetworks, discoveryTotalAudience, type DiscoveryCreator, type DiscoveryNetwork } from "@/lib/creator-discovery";
import "./creator-discovery-table.css";

const icons = { instagram: InstagramIcon, youtube: YoutubeIcon, facebook: FacebookIcon, x: XTwitterIcon, linkedin: LinkedInIcon };
const compact = (count: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(count);
const full = (count: number) => count.toLocaleString("en-IN");

function AudienceTip({ label, children, detail, className = "" }: { label: string; children: ReactNode; detail: ReactNode; className?: string }) {
  const id = useId(), button = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{left:number;top:number;above:boolean} | null>(null);
  function show() {
    const rect = button.current?.getBoundingClientRect(); if (!rect) return;
    const width = Math.min(224, window.innerWidth - 24);
    setPosition({left:Math.max(12, Math.min(rect.left+rect.width/2-width/2, window.innerWidth-width-12)),top:rect.top > 150 ? rect.top-9 : rect.bottom+9,above:rect.top > 150});
  }
  useEffect(() => {
    if (!position) return;
    const hide = () => setPosition(null);
    const scroll = (event: Event) => { if (event.target === document || event.target === window || (event.target instanceof Element && event.target.contains(button.current))) hide(); };
    window.addEventListener("scroll", scroll, true);window.addEventListener("resize", hide);
    return () => {window.removeEventListener("scroll", scroll, true);window.removeEventListener("resize", hide);};
  }, [position]);
  return <><button ref={button} type="button" className={className} aria-label={label} aria-describedby={position ? id : undefined}
    onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)} onClick={show}
    onKeyDown={event => {if(event.key === "Escape"){event.stopPropagation();setPosition(null);}}}>{children}</button>
    {position && createPortal(<div id={id} role="tooltip" className="fl-discovery-tooltip" style={{left:position.left,top:position.top,transform:position.above ? "translateY(-100%)" : undefined}}>{detail}</div>,document.body)}</>;
}

function CreatorAvatar({ creator }: {creator: DiscoveryCreator}) {
  const [failed, setFailed] = useState<string | null>(null);
  const photo = creator.avatar_url ? (creator.avatar_url.startsWith("/api/proxy-image?") ? creator.avatar_url : `/api/proxy-image?${new URLSearchParams({url:creator.avatar_url,name:creator.display_name})}`) : null;
  return <span className="fl-discovery-table-avatar" aria-hidden="true"><span>{creator.display_name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join("").toUpperCase() || "F"}</span>{photo && failed !== photo && <Image src={photo} width={34} height={34} unoptimized alt="" loading="lazy" onError={()=>setFailed(photo)} />}</span>;
}

export function CreatorDiscoveryTable({ creators, network, onSave, onInvite }: {creators:DiscoveryCreator[];network?:DiscoveryNetwork | "";onSave:(handle:string)=>void;onInvite:(handle:string)=>void}) {
  const router = useRouter();
  return <div className="fl-discovery-table-wrap"><table className="fl-discovery-table"><caption className="sr-only">Creators and their saved network audiences. Select a creator to open their media kit.</caption>
    <thead><tr><th scope="col">Creator</th><th scope="col">Networks</th><th scope="col" className="fl-discovery-total-heading">Total audience</th><th scope="col"><span className="sr-only">Creator actions</span></th><th scope="col" className="fl-discovery-kit-heading">Media kit</th></tr></thead>
    <tbody>{creators.map(creator => {
      const href = `/${encodeURIComponent(creator.handle)}`, total = discoveryTotalAudience(creator);
      const totalLabel = total.count === null ? "Audience unavailable" : `${full(total.count)} total saved audience${total.partial ? ", partial total" : ""}`;
      return <tr key={creator.handle} tabIndex={0} aria-label={`${creator.display_name}. Open media kit.`}
        onClick={event => { if(event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.target instanceof Element && event.target.closest("a,button,input,select,textarea")))return;router.push(href); }}
        onKeyDown={event => {if(event.target === event.currentTarget && event.key === "Enter"){event.preventDefault();router.push(href);}}}>
        <td><Link href={href} className="fl-discovery-person" title={creator.display_name}><CreatorAvatar creator={creator} /><span><strong><span>{creator.display_name}</span>{creator.is_verified && <CheckCircle size={13} aria-label="Verified creator" />}</strong><small>@{creator.handle}{creator.niche && <span> · {creator.niche}</span>}</small></span></Link></td>
        <td><div className="fl-discovery-network-icons">{(creator.connected_networks || []).map(value => {
          const Icon = icons[value], name = discoveryNetworks.find(item => item.value === value)?.label || value;
          const audience = creator.audiences?.find(item=>item.network === value), count = audience?.count;
          return <AudienceTip key={value} className="fl-discovery-network-button" label={`${name}: ${count == null ? "audience unavailable" : `${full(count)} ${audience?.metric}`}`} detail={<><strong>{name}</strong><b>{count == null ? "Audience unavailable" : `${full(count)} ${audience?.metric}`}</b>{count != null && <small>{audienceSavedDate(audience?.updated_at || null)} · {audience?.source}</small>}<small>Largest saved connected account</small></>}><span data-network={value} data-selected={value === network}>{Icon ? <Icon className="fl-discovery-network-icon" /> : name}</span></AudienceTip>;
        })}{!creator.connected_networks?.length && <span className="fl-discovery-table-muted">None linked</span>}</div></td>
        <td className="fl-discovery-total-cell"><AudienceTip className="fl-discovery-total-button" label={totalLabel} detail={<><strong>{totalLabel}</strong><small>Combined followers and subscribers from the largest saved account on each connected network. Not unique people.</small>{total.partial && <small>{total.networks-total.known} network count{total.networks-total.known === 1 ? " is" : "s are"} unavailable and excluded.</small>}</>}>{total.count === null ? "—" : `${compact(total.count)}${total.partial ? "+" : ""}`}</AudienceTip></td>
        <td><div className="fl-discovery-row-actions"><button type="button" className="fl-discovery-row-invite" onClick={()=>onInvite(creator.handle)}><Send size={12} aria-hidden="true" /> Invite to Offer</button><button type="button" className="fl-discovery-row-save" title="Save to shortlist" aria-label={`Save ${creator.display_name} to shortlist`} onClick={()=>onSave(creator.handle)}><BookmarkPlus size={15} aria-hidden="true" /></button></div></td>
        <td className="fl-discovery-kit-cell"><Link href={href} className="fl-discovery-kit-link" aria-label={`Open ${creator.display_name}’s media kit`}>Media kit <ArrowUpRight size={13} aria-hidden="true" /></Link></td>
      </tr>;
    })}</tbody>
  </table></div>;
}
