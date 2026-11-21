"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Copy, FileText, Globe2, LockKeyhole, Users, X } from "lucide-react";
import { offerRequest, type PublicOffer, type OfferWorkspace, type OfferApplication } from "@/lib/offers";
import { campaignMoney, campaignRequest, draftBudgetCents, type SavedCampaign } from "@/lib/campaign-drafts";
import { campaignFolderHref } from "@/lib/campaign-folders";
import { campaignActions, type CampaignAction } from "@/lib/campaign-lifecycle";
import { CampaignLifecycleDialog } from "@/components/brand/campaign-lifecycle";
import { StartCollaboration } from "@/components/collaborations/start-collaboration";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import "./offers.css";

const label: Record<string, string> = { draft: "Draft", active: "Open for applications", paused: "Paused", completed: "Closed", cancelled: "Cancelled", expired: "Expired", pending: "Under review", accepted: "Selected · agreement next", rejected: "Declined", withdrawn: "Withdrawn" };
const date = (value: string | null) => value ? new Date(value.slice(0,10)+"T00:00:00Z").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", timeZone:"UTC" }) : "To discuss";

export function OfferDocument({ offer, children }: { offer: PublicOffer; children?: React.ReactNode }) {
  return <article className="fl-offer-document">
    <header className="fl-offer-hero"><div className="fl-offer-meta"><span><FileText size={13} /> FLENZR OFFER · {offer.id.slice(0,8).toUpperCase()}</span><span className="fl-offer-state" data-state={offer.status}>{label[offer.status]}</span></div><div className="fl-offer-brand"><span>{offer.brand_name.slice(0,1).toUpperCase()}</span><div><small>AN OFFER FROM</small><strong>{offer.brand_name}</strong></div></div><h1>{offer.title}</h1><div className="fl-offer-tags"><span>{offer.visibility === "public" ? <Globe2 size={13} /> : <LockKeyhole size={13} />}{offer.visibility === "public" ? "Public Offer" : "Invitation only"}</span>{offer.niche && <span>{offer.niche}</span>}<span><Users size={13} /> Multiple creators can be selected</span></div></header>
    <div className="fl-offer-terms"><div><small>TOTAL PLANNED BUDGET</small><strong>{campaignMoney(offer.budget_cents,offer.currency)}</strong><span>Individual creator quotes are agreed separately.</span></div><div><small>APPLICATIONS CLOSE</small><strong>{offer.ends_at ? date(offer.ends_at) : "Open-ended"}</strong><span>Planned start: {date(offer.starts_at)}</span></div></div>
    <div className="fl-offer-brief"><section><h2>The opportunity</h2><p>{offer.brief || "The brand is still preparing this brief."}</p></section><section><h2>What you’ll create</h2><p>{offer.deliverables || "Deliverables are being prepared."}</p></section></div>
    <div className="fl-offer-journey" aria-label="Offer journey"><span>01 · Apply</span><i>→</i><span>02 · Negotiate</span><i>→</i><span>03 · Both agree</span><i>→</i><span>04 · Collaborate</span></div>
    <p className="fl-offer-note">Applying doesn’t reserve work or charge anyone. Selection opens a collaboration; both people still confirm a shared agreement. Payments aren’t live yet.</p>
    {children}
  </article>;
}

export function OfferWorkspacePage({ id }: { id: string }) {
  const router = useRouter();
  const [offer,setOffer] = useState<OfferWorkspace | null>(null), [error,setError] = useState(""), [notice,setNotice] = useState("");
  const [page,setPage] = useState(1), [refreshing,setRefreshing] = useState(false);
  const [action,setAction] = useState<CampaignAction | null>(null), [response,setResponse] = useState<{ application:OfferApplication; action:string } | null>(null);
  const [quote,setQuote] = useState(""), [pitch,setPitch] = useState(""), [handle,setHandle] = useState(""), [invitationQuote,setInvitationQuote] = useState("");
  const [busy,setBusy] = useState(false), [share,setShare] = useState("");
  const saving = useRef(false);
  const reload = useCallback(async () => {
    setRefreshing(true);
    try { setOffer(await offerRequest<OfferWorkspace>(`/${id}?page=${page}`)); setError(""); } catch(e) { setError(e instanceof Error ? e.message : "Could not load Offer."); }
    finally { setRefreshing(false); }
  },[id,page]);
  useEffect(() => {
    const controller = new AbortController();
    offerRequest<OfferWorkspace>(`/${id}?page=${page}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setOffer(data); setError(""); }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load Offer."); });
    return () => controller.abort();
  },[id,page]);
  async function apply(event:React.FormEvent) {
    event.preventDefault(); if(saving.current || !offer) return;
    saving.current=true;setBusy(true);setError("");
    try { const amount=draftBudgetCents(quote);if(amount<100)throw Error("Enter a quote of at least 1 in the Offer’s currency.");await campaignRequest(`/${id}/apply`,{method:"POST",body:JSON.stringify({proposed_rate_cents:amount,pitch_message:pitch.trim()||null,expected_campaign_revision:offer.revision})});setNotice("Application saved. Your pitch and quote are private to you and this brand.");await reload(); }
    catch(e){setError(e instanceof Error?e.message:"Application failed.");}finally{saving.current=false;setBusy(false);}
  }
  async function invite(event:React.FormEvent) {
    event.preventDefault();if(saving.current||!offer)return;saving.current=true;setBusy(true);setError("");
    try{const recipient=await campaignRequest<{id:string}>(`/invitation-recipient/${encodeURIComponent(handle.trim().replace(/^@/,""))}`);const amount=draftBudgetCents(invitationQuote);if(amount<100)throw Error("Enter the quote for this creator.");await campaignRequest(`/${id}/invite`,{method:"POST",body:JSON.stringify({creator_id:recipient.id,offered_rate_cents:amount,message:"You’re invited to this Offer. Open the Offer page to review the brief and apply with your quote.",expected_campaign_revision:offer.revision})});setNotice(`@${handle.replace(/^@/,"")} can now open and apply to this Offer. Send them its share link.`);setHandle("");setInvitationQuote("");}
    catch(e){setError(e instanceof Error?e.message:"Invitation failed.");}finally{saving.current=false;setBusy(false);}
  }
  async function copyShare() {const url=window.location.origin+`/offers/${id}`;setShare(url);try{await navigator.clipboard.writeText(url);setNotice(offer?.visibility==="invited"?"Link copied. Only invited creators can open this Offer.":"Public Offer link copied.");}catch{setNotice("Select and copy the share link below.");}}
  if(!offer)return <div className="fl-offer-page">{error?<div role="alert"><p>{error}</p><button type="button" onClick={()=>void reload()}>Retry Offer</button></div>:<WorkspaceLoader label="Opening Offer…" />}</div>;
  const owned=offer.viewer_role==="brand";
  return <main className="fl-offer-page"><div className="fl-offer-page-actions"><Link href={owned ? campaignFolderHref(offer.parent_campaign_id || "unassigned") : "/dashboard/creator#opportunities"}>← {owned ? offer.parent_campaign_title || "Unassigned offers" : "All Offers"}</Link><div><button type="button" onClick={()=>void copyShare()}><Copy size={13} /> Share Offer</button><button type="button" disabled={refreshing} onClick={()=>void reload()}>{refreshing?"Refreshing…":"Refresh Offer"}</button></div></div>
    {error&&<p className="fl-offer-error" role="alert">{error}</p>}{notice&&<p className="fl-offer-notice" role="status"><Check size={14}/>{notice}</p>}{share&&<label className="fl-offer-share">{offer.visibility==="invited"?"Private link · invited creators still need to sign in":"Public share link"}<input readOnly value={share} onFocus={e=>e.target.select()} /></label>}
    <OfferDocument offer={offer} />
    {owned&&<section className="fl-offer-panel"><div className="fl-offer-panel-heading"><div><span className="fl-offer-eyebrow">BRAND CONTROLS</span><h2>Manage this Offer</h2></div><div className="fl-offer-controls">{offer.status==="draft"&&<Link href={campaignFolderHref(offer.parent_campaign_id || "unassigned")}>Edit saved draft <ArrowUpRight size={13}/></Link>}{campaignActions((offer.status === "expired" ? "active" : offer.status) as SavedCampaign["status"]).map(a=><button key={a} type="button" onClick={()=>setAction(a)}>{a==="close"?"Close applications":a==="publish"?"Publish Offer":a==="cancel"?"Cancel Offer":a==="pause"?"Pause Offer":"Resume Offer"}</button>)}</div></div><p>Closing applications stops new selection and counter-offers. Existing collaborations keep their own agreements and delivery progress.</p>
      {offer.accepting&&<form className="fl-offer-inline-form" onSubmit={invite}><label>Invite a creator<input name="offer-invite-handle" placeholder="Creator’s Flenzr handle" required value={handle} onChange={e=>setHandle(e.target.value)} /></label><label>Quote for this creator · {offer.currency}<input name="offer-invite-quote" inputMode="decimal" required value={invitationQuote} onChange={e=>setInvitationQuote(e.target.value)} /></label><button type="submit" disabled={busy}>{busy?"Saving…":"Invite creator"}</button></form>}
    </section>}
    {!owned&&!offer.applications.length&&<section className="fl-offer-panel"><span className="fl-offer-eyebrow">YOUR APPLICATION</span><h2>{offer.accepting?"Bring your perspective to this Offer":"Applications aren’t open"}</h2>{offer.invited&&<p>You’ve been invited by the brand. Apply with your pitch and proposed quote.</p>}{offer.accepting&&<form onSubmit={apply}><label>Your proposed quote · {offer.currency}<input name="offer-quote" inputMode="decimal" required value={quote} onChange={e=>setQuote(e.target.value)} /></label><label>Why you’re a fit<textarea name="offer-pitch" rows={4} maxLength={5000} value={pitch} onChange={e=>setPitch(e.target.value)} placeholder="Your idea, approach and what you can deliver." /></label><button type="submit" className="fl-offer-primary" disabled={busy}>{busy?"Saving application…":"Apply for Offer"}</button></form>}</section>}
    {(owned||offer.applications.length>0)&&<section className="fl-offer-panel"><span className="fl-offer-eyebrow">PRIVATE TO EACH CREATOR AND THE BRAND</span><h2>{owned?`Applications · ${offer.total_applications}`:"Your application"}</h2>{owned&&<p>You can select more than one creator. Negotiation and selection happen independently for each application.</p>}{!offer.applications.length&&<p>No applications yet. Share your Offer or invite creators.</p>}
      <div className="fl-offer-applications">{offer.applications.map(app=><article key={app.id} className="fl-offer-application"><div className="fl-offer-panel-heading"><div><h3>{app.creator_name}</h3><span>@{app.creator_handle}</span></div><span className="fl-offer-state">{app.claimed ? "Claimed · agreement saved" : label[app.status]}</span></div><div className="fl-offer-quote"><strong>{campaignMoney(app.amount_cents,offer.currency)}</strong><span>{app.revision?`Latest terms from the ${app.proposed_by}`:"Creator’s initial quote"}</span></div>{app.pitch&&<p>{app.pitch}</p>}
        {app.history.length>0&&<details><summary>Negotiation history · {app.history.length} updates</summary><ol>{app.history.map((event,i)=><li key={i}><strong>{event.author} · {event.action} · {campaignMoney(event.amount_cents,offer.currency)}</strong><time>{new Date(event.at).toLocaleString()}</time><p>{event.message}</p></li>)}</ol></details>}
        {app.status==="pending"&&<div className="fl-offer-controls">{offer.accepting&&<>{app.proposed_by!==offer.viewer_role&&<button className="fl-offer-primary" type="button" onClick={()=>setResponse({application:app,action:"accept"})}>{owned?"Select creator at this quote":"Accept brand’s counter-offer"}</button>}<button type="button" onClick={()=>setResponse({application:app,action:"counter"})}>Make counter-offer</button></>}<button type="button" onClick={()=>setResponse({application:app,action:owned?"reject":"withdraw"})}>{owned?"Decline application":"Withdraw application"}</button></div>}
        {app.status==="accepted"&&<div className="fl-offer-selection"><p>{app.claimed ? "Both participants accepted the agreement. Continue in your shared collaboration for deliveries, reviews and publishing proof." : "Selected. Open the collaboration to confirm scope, price, rights and dates together. The Offer is claimed only after both accept the same agreement."}</p>{app.collaboration_id ? <Link href={`/dashboard/collaborations/${app.collaboration_id}`}>Open collaboration →</Link> : <StartCollaboration sourceKind="application" sourceId={app.id}/>}</div>}
      </article>)}</div>
      {owned&&offer.total_applications>20&&<div className="fl-offer-controls"><button type="button" disabled={page===1||refreshing} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {Math.ceil(offer.total_applications/20)}</span><button type="button" disabled={page*20>=offer.total_applications||refreshing} onClick={()=>setPage(p=>p+1)}>Next</button></div>}
    </section>}
    {response&&<OfferResponseDialog offer={offer} application={response.application} action={response.action} onClose={()=>setResponse(null)} onSaved={()=>{setResponse(null);setNotice("Response saved. Your collaborator can review the latest terms.");void reload();}} />}
    {action&&<CampaignLifecycleDialog campaignId={id} action={action} onClose={()=>setAction(null)} onReloaded={()=>void reload()} onEdit={()=>router.push(campaignFolderHref(offer.parent_campaign_id || "unassigned"))} onSaved={()=>{setAction(null);void reload();}} />}
  </main>;
}

function OfferResponseDialog({offer,application,action,onClose,onSaved}:{offer:OfferWorkspace;application:OfferApplication;action:string;onClose:()=>void;onSaved:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null),request=useRef(crypto.randomUUID()),saving=useRef(false);
  const [amount,setAmount]=useState((application.amount_cents/100).toFixed(2)),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{ref.current?.showModal();},[]);
  async function submit(event:React.FormEvent){event.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError("");try{await offerRequest(`/${offer.id}/applications/${application.id}/negotiate`,{method:"POST",body:JSON.stringify({action,request_id:request.current,expected_revision:application.revision,expected_offer_revision:offer.revision,amount_cents:action==="counter"?draftBudgetCents(amount):null,message})});onSaved();}catch(e){setError(e instanceof Error?e.message:"Response failed.");}finally{saving.current=false;setBusy(false);}}
  return <dialog ref={ref} className="fl-offer-dialog" aria-labelledby="offer-response-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><div className="fl-offer-panel-heading"><h2 id="offer-response-title">{action==="counter"?"Make a counter-offer":action==="accept"?"Accept these terms?":action==="reject"?"Decline this application?":"Withdraw your application?"}</h2><button type="button" aria-label="Close response" disabled={busy} onClick={onClose}><X size={17}/></button></div><p>Current quote: <strong>{campaignMoney(application.amount_cents,offer.currency)}</strong>. This action does not charge or pay anyone.</p><form onSubmit={submit}>{action==="counter"&&<label>Proposed quote · {offer.currency}<input name="offer-counter-quote" inputMode="decimal" required value={amount} onChange={e=>{setAmount(e.target.value);request.current=crypto.randomUUID();}} /></label>}<label>Message · optional<textarea name="offer-response-message" rows={3} maxLength={5000} value={message} onChange={e=>{setMessage(e.target.value);request.current=crypto.randomUUID();}} /></label>{error&&<p role="alert" className="fl-offer-error">{error} Close this dialog and Refresh Offer to review newer terms.</p>}<div className="fl-offer-controls"><button type="button" disabled={busy} onClick={onClose}>Keep reviewing</button><button className="fl-offer-primary" type="submit" disabled={busy}>{busy?"Saving…":action==="counter"?"Send counter-offer":action==="accept"?"Confirm selection":action==="reject"?"Confirm decline":"Confirm withdrawal"}</button></div></form></dialog>;
}
