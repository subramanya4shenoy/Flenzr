"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { shortlistName, shortlistQuery, shortlistRequest, type Shortlist, type ShortlistPage, type ShortlistMember } from "@/lib/shortlists";
import "./shortlists.css";

export function ShortlistSaveDialog({ handle, onClose, onView }: { handle: string; onClose: () => void; onView: (group: Shortlist) => void }) {
  const dialog=useRef<HTMLDialogElement>(null),saving=useRef(false),request=useRef<{name:string;id:string}|null>(null);
  const [q,setQ]=useState(""),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[name,setName]=useState("");
  const [result,setResult]=useState<{key:string;data?:ShortlistPage;error?:string}|null>(null),[selected,setSelected]=useState("");
  const [lookup,setLookup]=useState<{key:string;member:ShortlistMember|null;error?:string}|null>(null);
  const [receipt,setReceipt]=useState<Shortlist|null>(null),[created,setCreated]=useState<Shortlist|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const key=shortlistQuery(q,page),current=result?.key===key?result:null,group=current?.data?.items.find(row=>row.id===selected);
  const lookupKey=`${selected}:${handle}`,checked=lookup?.key===lookupKey?lookup:null;
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{
    const controller=new AbortController(),timer=setTimeout(()=>{
      shortlistRequest<ShortlistPage>(`?${key}`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setResult({key,data});setSelected(old=>data.items.some(row=>row.id===old)?old:data.items[0]?.id||"");}}).catch(err=>{if(!controller.signal.aborted)setResult({key,error:err.message});});
    },200);return()=>{clearTimeout(timer);controller.abort();};
  },[key,attempt]);
  useEffect(()=>{
    if(!selected)return;const controller=new AbortController();
    shortlistRequest<ShortlistMember|null>(`/${selected}/creators/${encodeURIComponent(handle)}`,{signal:controller.signal}).then(member=>{if(!controller.signal.aborted)setLookup({key:lookupKey,member});}).catch(err=>{if(!controller.signal.aborted)setLookup({key:lookupKey,member:null,error:err.message});});
    return()=>controller.abort();
  },[selected,handle,lookupKey,attempt]);
  function close(){if(saving.current)return;if(!receipt&&!created&&name.trim()&&!window.confirm("Discard this unsaved shortlist name?"))return;onClose();}
  async function save(target:Shortlist){
    if(saving.current)return;saving.current=true;setBusy(true);setError("");
    try{await shortlistRequest(`/${target.id}/creators/${encodeURIComponent(handle)}`,{method:"PUT"});setReceipt(target);}catch(err){setError(err instanceof Error?err.message:"Could not save creator. Please retry.");}finally{saving.current=false;setBusy(false);}
  }
  async function createAndSave(event:React.FormEvent){
    event.preventDefault();if(saving.current)return;let clean:string;
    try{clean=shortlistName(name);}catch(err){setError((err as Error).message);return;}
    if(request.current?.name!==clean)request.current={name:clean,id:crypto.randomUUID()};
    saving.current=true;setBusy(true);setError("");
    try{
      const target=await shortlistRequest<Shortlist>("",{method:"POST",body:JSON.stringify({name:clean,request_id:request.current.id})});setCreated(target);
      await shortlistRequest(`/${target.id}/creators/${encodeURIComponent(handle)}`,{method:"PUT"});setReceipt(target);
    }catch(err){setError(err instanceof Error?err.message:"Could not create and save. Please retry.");}finally{saving.current=false;setBusy(false);}
  }
  return <dialog ref={dialog} className="fl-shortlist-dialog" aria-labelledby="shortlist-save-title" onCancel={event=>{event.preventDefault();close();}}>
    <header><h2 id="shortlist-save-title">{receipt?"Creator saved":"Save to shortlist"}</h2><button type="button" aria-label="Close shortlist save" disabled={busy} onClick={close}><X size={18}/></button></header>
    <p>@{handle}</p>
    {receipt?<div><p role="status">Saved in {receipt.name}.</p><footer><button type="button" onClick={onClose}>Done</button><button type="button" onClick={()=>{onView(receipt);onClose();}}>View shortlist</button></footer></div>:created?<div><p>{created.name} was created. Save this creator to finish.</p>{error&&<p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={()=>save(created)}>{busy?"Saving…":"Retry save"}</button></div>:<>
      <label>Find a shortlist<input name="save-shortlist-search" maxLength={80} value={q} onChange={e=>{setQ(e.target.value);setPage(1);setSelected("");}}/></label>
      {!current?<p role="status">Loading shortlists…</p>:current.error?<div role="alert"><p>{current.error}</p><button type="button" onClick={()=>{setResult(null);setAttempt(value=>value+1);}}>Retry loading</button><Link href="/dashboard/brand/profile">Brand profile</Link></div>:current.data&&<div>
        {current.data.items.length?<><label>Shortlist<select name="save-shortlist-select" value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setError("");}}>{current.data.items.map(row=><option key={row.id} value={row.id}>{row.name} · {row.members_count} saved</option>)}</select></label>
          {!checked?<p role="status">Checking saved creator…</p>:checked.error?<div role="alert"><p>{checked.error}</p><button type="button" onClick={()=>{setLookup(null);setAttempt(v=>v+1);}}>Retry check</button></div>:checked.member?<div><p role="status">Already saved in this shortlist.</p><button type="button" onClick={()=>{if(group){onView(group);onClose();}}}>View shortlist</button></div>:<button type="button" className="fl-shortlist-primary" disabled={busy||!group} onClick={()=>{if(group)save(group);}}>{busy?"Saving…":"Save creator"}</button>}</>:<p>{q?"No shortlists match this search.":"Create your first shortlist below."}</p>}
        {current.data.total>20&&<nav className="fl-shortlist-pages" aria-label="Shortlist picker pages"><button type="button" disabled={page===1||busy} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page}</span><button type="button" disabled={page*20>=current.data.total||busy} onClick={()=>setPage(page+1)}>Next</button></nav>}
      </div>}
      <form onSubmit={createAndSave} className="fl-shortlist-create"><label>New shortlist name<input name="save-shortlist-name" maxLength={80} required value={name} disabled={busy} placeholder="e.g. Launch creators" onChange={e=>setName(e.target.value)}/></label><button type="submit" disabled={busy||Boolean(current?.error)}>{busy?"Saving…":"Create & save"}</button></form>
      {error&&<p role="alert" className="fl-shortlist-error">{error}</p>}
    </>}
  </dialog>;
}
