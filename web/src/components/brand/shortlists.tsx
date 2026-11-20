"use client";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { shortlistName,shortlistQuery,shortlistRequest,ShortlistError,type Shortlist,type ShortlistPage,type ShortlistMembers } from "@/lib/shortlists";
import { CampaignInvitationDialog } from "./campaign-invitation";
import type { SavedCampaign } from "@/lib/campaign-drafts";
import "./shortlists.css";

export function BrandShortlists({initialId,onManageCampaigns,onViewCampaign}:{initialId?:string;onManageCampaigns:()=>void;onViewCampaign:(campaign:SavedCampaign)=>void}){
  const [selected,setSelected]=useState(initialId||"");
  return <section className="fl-shortlists" aria-label="Private shortlists">{selected?<ShortlistMembersView key={selected} id={selected} onBack={()=>setSelected("")} onManageCampaigns={onManageCampaigns} onViewCampaign={onViewCampaign}/>:<ShortlistGroups onOpen={setSelected}/>}</section>;
}
function ShortlistGroups({onOpen}:{onOpen:(id:string)=>void}){
  const [q,setQ]=useState(""),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[name,setName]=useState("");
  const [result,setResult]=useState<{key:string;data?:ShortlistPage;error?:string}|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const saving=useRef(false),request=useRef<{name:string;id:string}|null>(null),key=shortlistQuery(q,page),current=result?.key===key?result:null;
  useEffect(()=>{const controller=new AbortController(),timer=setTimeout(()=>{
    shortlistRequest<ShortlistPage>(`?${key}`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult({key,data});}).catch(err=>{if(!controller.signal.aborted)setResult({key,error:err.message});});
  },q?200:0);return()=>{clearTimeout(timer);controller.abort();};},[key,attempt,q]);
  function refresh(){setResult(null);setAttempt(v=>v+1);}
  async function create(event:React.FormEvent){event.preventDefault();if(saving.current)return;let clean:string;try{clean=shortlistName(name);}catch(err){setError((err as Error).message);return;}
    if(request.current?.name!==clean)request.current={name:clean,id:crypto.randomUUID()};saving.current=true;setBusy(true);setError("");
    try{const saved=await shortlistRequest<Shortlist>("",{method:"POST",body:JSON.stringify({name:clean,request_id:request.current.id})});onOpen(saved.id);}catch(err){setError(err instanceof Error?err.message:"Could not create shortlist.");}finally{saving.current=false;setBusy(false);}
  }
  return <>
    <header><div><h2>Shortlists</h2><p>Private groups of creators saved by your brand.</p></div><button type="button" disabled={!current} onClick={refresh}>Refresh</button></header>
    <form onSubmit={create} className="fl-shortlist-create"><label>New shortlist<input name="shortlist-name" value={name} maxLength={80} required placeholder="e.g. Launch creators" disabled={busy} onChange={e=>setName(e.target.value)}/></label><button type="submit" disabled={busy}>{busy?"Creating…":"Create shortlist"}</button></form>
    {error&&<p role="alert" className="fl-shortlist-error">{error}</p>}
    <label className="fl-shortlist-search">Find a shortlist<input type="search" name="shortlist-search" maxLength={80} value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></label>
    {!current?<WorkspaceLoader label="Loading shortlists…" />:current.error?<div role="alert"><p>{current.error}</p><button type="button" onClick={refresh}>Retry</button><Link href="/dashboard/brand/profile">Brand profile</Link></div>:current.data&&<>
      <p role="status">{current.data.total} shortlist{current.data.total===1?"":"s"}</p>
      {!current.data.items.length&&<div className="fl-shortlist-empty"><p>{page>1?"No shortlists on this page. Return to the previous page.":q?"No shortlists match this search.":"No shortlists yet. Create a group here or save a creator from discovery."}</p></div>}
      <div className="fl-shortlist-groups">{current.data.items.map(row=><article key={row.id}><h3>{row.name}</h3><p>{row.members_count} saved creator{row.members_count===1?"":"s"}</p><button type="button" onClick={()=>onOpen(row.id)}>Open shortlist</button></article>)}</div>
      {current.data.total>0&&<nav className="fl-shortlist-pages" aria-label="Shortlist pages"><button type="button" disabled={page===1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} of {Math.max(1,Math.ceil(current.data.total/20))}</span><button type="button" disabled={page*20>=current.data.total} onClick={()=>setPage(page+1)}>Next</button></nav>}
    </>}
  </>;
}
function ShortlistMembersView({id,onBack,onManageCampaigns,onViewCampaign}:{id:string;onBack:()=>void;onManageCampaigns:()=>void;onViewCampaign:(campaign:SavedCampaign)=>void}){
  const [page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[result,setResult]=useState<{page:number;data?:ShortlistMembers;error?:string}|null>(null);
  const [busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[deleting,setDeleting]=useState(false),[invite,setInvite]=useState<string|null>(null);
  const saving=useRef(false),current=result?.page===page?result:null,data=current?.data;
  useEffect(()=>{const controller=new AbortController();shortlistRequest<ShortlistMembers>(`/${id}/members?page=${page}&page_size=20`,{signal:controller.signal}).then(rows=>{
    if(controller.signal.aborted)return;const last=Math.max(1,Math.ceil(rows.total/20));if(page>last){setPage(last);return;}setResult({page,data:rows});
  }).catch(err=>{if(!controller.signal.aborted)setResult({page,error:err.message});});return()=>controller.abort();},[id,page,attempt]);
  function refresh(){setResult(null);setAttempt(v=>v+1);}
  async function remove(memberId:string){if(saving.current)return;saving.current=true;setBusy(memberId);setError("");setNotice("");
    try{await shortlistRequest(`/${id}/members/${memberId}`,{method:"DELETE"});setNotice("Creator removed from this shortlist.");refresh();}catch(err){setError(err instanceof Error?err.message:"Could not remove creator. Please retry.");}finally{saving.current=false;setBusy("");}
  }
  return <>
    <header><div><button type="button" onClick={onBack}>← Shortlists</button><h2>{data?.shortlist.name||"Saved creators"}</h2><p>Current public profiles. Your saved groups are private.</p></div>{data&&<div className="fl-shortlist-actions"><button type="button" disabled={Boolean(busy)} onClick={refresh}>Refresh</button><button type="button" disabled={Boolean(busy)} onClick={()=>setDeleting(true)}>Delete shortlist</button></div>}</header>
    {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="fl-shortlist-error">{error}</p>}
    {!current?<p role="status">Loading saved creators…</p>:current.error?<div role="alert"><p>{current.error}</p><button type="button" onClick={refresh}>Retry</button><button type="button" onClick={onBack}>Back to shortlists</button></div>:data&&<>
      <p role="status">{data.total} saved creator{data.total===1?"":"s"}</p>{!data.items.length&&<div className="fl-shortlist-empty"><p>No creators saved here yet. Use Save in Creator Discovery to add one.</p></div>}
      <div className="fl-shortlist-members">{data.items.map(member=><article key={member.id}>
        <div className="fl-shortlist-member-heading"><div><h3>{member.creator?.display_name||"Creator unavailable"}</h3>{member.creator&&<p>@{member.creator.handle}</p>}</div><button type="button" title="Remove from shortlist" aria-label={`Remove ${member.creator?.display_name||"unavailable creator"}`} disabled={Boolean(busy)} onClick={()=>remove(member.id)}><Trash2 size={15}/></button></div>
        {member.creator?<><p>{member.creator.bio||"No bio provided."}</p><small>{member.creator.niche||"Niche not provided"} · {member.creator.location||"Location not provided"}</small><footer><Link href={`/${encodeURIComponent(member.creator.handle)}`} target="_blank" rel="noopener noreferrer">Media kit ↗</Link><button type="button" onClick={()=>setInvite(member.creator!.handle)}>Invite to campaign</button></footer></>:<p>This profile is no longer available. You can remove it from this shortlist.</p>}
      </article>)}</div>
      {data.total>0&&<nav className="fl-shortlist-pages" aria-label="Saved creator pages"><button type="button" disabled={page===1||Boolean(busy)} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} of {Math.max(1,Math.ceil(data.total/20))}</span><button type="button" disabled={page*20>=data.total||Boolean(busy)} onClick={()=>setPage(page+1)}>Next</button></nav>}
    </>}
    {deleting&&data&&<DeleteShortlist group={data.shortlist} onClose={()=>setDeleting(false)} onDeleted={onBack}/>}
    {invite&&<CampaignInvitationDialog handle={invite} onClose={()=>setInvite(null)} onManageCampaigns={onManageCampaigns} onViewCampaign={onViewCampaign}/>}
  </>;
}
function DeleteShortlist({group,onClose,onDeleted}:{group:Shortlist;onClose:()=>void;onDeleted:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),saving=useRef(false);const [busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function confirm(){if(saving.current)return;saving.current=true;setBusy(true);setError("");try{await shortlistRequest(`/${group.id}`,{method:"DELETE"});onDeleted();}catch(err){if(err instanceof ShortlistError&&err.status===404){onDeleted();return;}setError(err instanceof Error?err.message:"Could not delete shortlist. Please retry.");}finally{saving.current=false;setBusy(false);}}
  return <dialog ref={dialog} className="fl-shortlist-dialog" aria-labelledby="delete-shortlist-title" onCancel={event=>{event.preventDefault();if(!saving.current)onClose();}}><h2 id="delete-shortlist-title">Delete shortlist?</h2><p>Delete {group.name} and all its saved memberships? Creator profiles and campaign invitations remain available.</p>{error&&<p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>Keep shortlist</button><button type="button" disabled={busy} onClick={confirm}>{busy?"Deleting…":"Delete shortlist"}</button></footer></dialog>;
}
