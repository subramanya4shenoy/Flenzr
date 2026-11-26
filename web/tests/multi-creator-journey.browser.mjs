/** Step 32: isolated current-UI journey. Setup and boundaries: docs/COLLABORATION-JOURNEY.md. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const WEB='http://localhost:3232', API='http://127.0.0.1:8332/api/v1';
const fixturePath='/tmp/flenzr-multi-creator-fixture.json';
const fixture=JSON.parse(await fs.readFile(fixturePath,'utf8'));
const version=await fetch('http://127.0.0.1:9362/json/version').then(r=>r.json());
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map(),contexts=[],errors=[],faults=new Map();
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'){errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);}else if(m.method==='Fetch.requestPaused'){void(async()=>{const fault=faults.get(m.sessionId);if(fault&&m.params.request.method===(fault.method||'POST')&&(!fault.match||m.params.request.postData?.includes(fault.match))){if(!fault.repeat)faults.delete(m.sessionId);await call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({error:{message:'Simulated request failure'}})).toString('base64')},m.sessionId);if(!fault.repeat)await call('Fetch.disable',{},m.sessionId);}else await call('Fetch.continueRequest',{requestId:m.params.requestId},m.sessionId);})().catch(e=>errors.push(e.message));}};
async function api(role,path,body,method=body?'POST':'GET'){const r=await fetch(API+path,{method,headers:{...(role?{Authorization:'Bearer '+fixture[role].token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();return {status:r.status,data};}
async function must(role,path,body,method){const r=await api(role,path,body,method);assert.ok(r.status>=200&&r.status<300,`${method||'request'} ${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;}
async function save(){await fs.writeFile(fixturePath,JSON.stringify(fixture),{mode:0o600});}
function pass(text){console.log('PASS '+text);}
async function browser(role){
 const {browserContextId}=await call('Target.createBrowserContext');contexts.push(browserContextId);
 const {targetId}=await call('Target.createTarget',{url:'about:blank',browserContextId});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const send=(method,params={})=>call(method,params,sessionId);await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__journeyReady=0;const NativeEventSource=window.EventSource;window.EventSource=class extends NativeEventSource{constructor(...args){super(...args);this.addEventListener('ready',()=>window.__journeyReady++);}};`});await send('Runtime.enable');await send('Network.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 if(role)await send('Network.setCookie',{name:'flenzr_access',value:fixture[role].token,url:WEB,httpOnly:true,sameSite:'Lax',path:'/'});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async(expression,label=expression)=>{const end=Date.now()+45000;while(Date.now()<end){if(await ev(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,120));}throw Error(`${role}: timed out ${label}; `+await ev('document.body.innerText.slice(-1800)'));};
 const click=async(selector)=>{await until(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e&&!e.disabled&&Object.keys(e).some(k=>k.startsWith('__reactProps'))})()`);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);};
 const text=async value=>{await until(`(()=>{const scope=document.querySelector('dialog[open]')||document;return [...scope.querySelectorAll('button')].some(e=>e.textContent.trim()===${JSON.stringify(value)}&&!e.disabled&&Object.keys(e).some(k=>k.startsWith('__reactProps')))})()`);await ev(`(()=>{const scope=document.querySelector('dialog[open]')||document;[...scope.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(value)}&&!e.disabled).click()})()`);};
 const fill=async(selector,value)=>{await until(`document.querySelector(${JSON.stringify(selector)})`);await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
 const go=async path=>{const url=new URL(WEB+path);url.searchParams.set('__journey',randomUUID());await send('Page.navigate',{url:url.href});};
 const shot=async name=>{const {data}=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/flenzr-multi-'+name+'.png',Buffer.from(data,'base64'));};
 const fail=async(pattern,match,method='POST',repeat=false)=>{faults.set(sessionId,{match,method,repeat});await send('Fetch.enable',{patterns:[{urlPattern:pattern,requestStage:'Request'}]});};
 const clearFailure=async()=>{faults.delete(sessionId);await send('Fetch.disable');};
 return {role,send,ev,until,click,text,fill,go,shot,fail,clearFailure,browserContextId};
}
try {
 const brand=await browser('brand'),creator=await browser('creator'),creator2=await browser('creator2'),outsider=await browser('outsider');
 const [offer,publicOffer]=fixture.offers;const offerPath='/dashboard/offers/'+offer.id;
 if(!fixture.acquisition){
  await brand.go('/dashboard/brand#campaigns/'+fixture.folder.id);await brand.until(`document.querySelectorAll('.fl-offer-ticket').length===2`);
  for(const o of fixture.offers){if((await must('brand','/offers/'+o.id)).status!=='draft')continue;await brand.go('/dashboard/offers/'+o.id+'#manage');await brand.text('Publish Offer');await brand.until(`document.querySelector('dialog[open]')`);await brand.text('Publish offer');await brand.until(`!document.querySelector('dialog[open]')&&document.querySelector('[name="offer-invite-search"]')`);}
  assert.equal((await api(null,'/offers/'+offer.id+'/public')).status,404);
  assert.equal((await api(null,'/offers/'+publicOffer.id+'/public')).status,200);
  assert.equal((await api('outsider','/offers/'+offer.id)).status,404);
  await brand.go(offerPath+'#manage');await brand.until(`document.querySelector('[name="offer-invite-search"]')`);
  for(const role of ['creator','creator2']){await brand.fill('[name="offer-invite-search"]',fixture[role].profile.handle);await brand.until(`document.querySelector('.fl-creator-option:not(.fl-creator-option-manual) small')?.textContent.includes(${JSON.stringify('@'+fixture[role].profile.handle)})`);await brand.click('.fl-creator-option:not(.fl-creator-option-manual)');}
  await brand.fill('[name="offer-invite-quote"]','1000');
  await brand.fail('*/api/account/campaigns/*/invite',fixture.creator2.profile.id);await brand.text('Invite 2 creators');
  await brand.until(`document.querySelectorAll('.fl-creator-chip').length===1&&document.querySelector('.fl-offer-error')`);
  assert.ok(await brand.ev(`document.querySelector('.fl-creator-chip').textContent.includes(${JSON.stringify(fixture.creator2.profile.handle)})`));
  await brand.text('Invite creator');await brand.until(`document.querySelectorAll('.fl-creator-chip').length===0`);
  for(const b of [creator,creator2]){if((await must(b.role,'/offers/'+offer.id)).applications.length)continue;await b.go(offerPath);await b.fill('[name="offer-quote"]',b.role==='creator'?'1000':'1500');await b.fill('[name="offer-pitch"]','Original independent creator launch concept.');await b.text('Apply for Offer');await b.until(`document.querySelector('.fl-applicant-row')`);}
  const workspace=await must('brand','/offers/'+offer.id);assert.equal(workspace.total_applications,2);
  fixture.applications={};fixture.collaborations={};
  for(const b of [creator,creator2]){
   await b.go(offerPath);await b.until(`document.querySelector('.fl-applicant-row')`);const own=await must(b.role,'/offers/'+offer.id);assert.equal(own.applications.length,1);fixture.applications[b.role]=own.applications[0];
   await brand.go(offerPath+'#applicants');await brand.text('Refresh Offer');await brand.until(`document.querySelectorAll('.fl-offer-applicant-link').length===3`);
   const idx=workspace.applications.findIndex(a=>a.id===own.applications[0].id)+2;await brand.click(`.fl-offer-applicant-link:nth-child(${idx})`);
   if(b===creator){await brand.text('Make counter-offer');await brand.fill('[name="offer-counter-quote"]','1200');await brand.text('Send counter-offer');await brand.until(`!document.querySelector('dialog')`);await b.text('Refresh Offer');await b.text('Accept brand’s counter-offer');await b.text('Confirm selection');await b.until(`document.querySelector('.fl-applicant-selection')`);}
   else {await brand.text('Select creator at this quote');await brand.text('Confirm selection');await brand.until(`!document.querySelector('dialog')&&document.querySelector('.fl-applicant-selection')`);}
   await b.text('Refresh Offer');await b.text('Start collaboration');await b.until(`document.querySelector('dialog[open]')`);await b.text('Start collaboration');await b.until(`location.pathname.startsWith('/dashboard/collaborations/')`);fixture.collaborations[b.role]=(await b.ev('location.pathname')).split('/').at(-1);
  }
  assert.notEqual(fixture.collaborations.creator,fixture.collaborations.creator2);
  const selected=await must('brand','/offers/'+offer.id);assert.equal(selected.status,'active');assert.ok(selected.applications.every(a=>!a.claimed));
  fixture.acquisition=true;await save();pass('campaign → two offers → publication/private access → batch invitation partial failure/retry → two private applications → counter/selection → independent collaborations; selection is not agreement');
 }
 async function openWork(b,role,step){
  if(b.role==='brand'){
   await b.go(`/dashboard/collaborations/offer/${offer.id}#${step}`);
   const name=fixture[role].profile.display_name;
   await b.until(`[...document.querySelectorAll('.fl-collab-person')].some(e=>e.querySelector('.fl-collab-person-copy strong')?.textContent===${JSON.stringify(name)})`);
   await b.ev(`[...document.querySelectorAll('.fl-collab-person')].find(e=>e.querySelector('.fl-collab-person-copy strong')?.textContent===${JSON.stringify(name)}).click()`);
  }else await b.go(`/dashboard/collaborations/${fixture.collaborations[role]}#${step}`);
  await b.until(`document.querySelector('.fl-collab-main [aria-busy="false"]')`);
 }
 if(!fixture.proposals){
  fixture.agreements={};
  for(const b of [creator,creator2]){
   const base='/collaborations/'+fixture.collaborations[b.role];
   if((await must('brand',base+'/proposals')).agreement){fixture.agreements[b.role]=(await must('brand',base+'/proposals')).agreement;continue;}
   let existing=await must('brand',base+'/proposals');
   if(existing.latest_version===0){await openWork(brand,b.role,'proposals');await brand.text('Draft proposal');
   await brand.fill('[name="proposal-price"]',b===creator?'1200':'1500');await brand.fill('[name="proposal-deliverables"]','One original launch review video with captions');await brand.fill('[name="proposal-date"]',fixture.delivery_date);await brand.fill('[name="proposal-revision-limit"]','1');await brand.fill('[name="proposal-rights"]','Organic reposting for thirty days, no paid advertising.');
   await brand.text('Save private draft');await brand.text('Review & send');await brand.text('Send version 1');await brand.until(`document.querySelector('.fl-prop-acceptance-card')?.textContent.includes('Version 1')&&!document.querySelector('dialog[open]')`);
   }
   let current=await must('brand',base+'/proposals');assert.equal(current.acceptance.brand_accepted_at,null);
   if(b===creator&&current.latest_version===1){
    await openWork(b,b.role,'proposals');await b.text('Draft a revision');await b.fill('[name="proposal-price"]','1250');await b.text('Save private draft');await b.text('Review & send');await b.text('Send version 2');await b.until(`document.querySelector('.fl-prop-acceptance-card')?.textContent.includes('Version 2')&&!document.querySelector('dialog[open]')`);
    const stale=await api('brand',base+'/proposals/accept',{proposal_id:current.items[0].id,expected_version:1,confirmed:true});assert.equal(stale.status,409);
   }
   current=await must('brand',base+'/proposals');const v=current.latest_version;
   for(const person of [brand,b]){
    await openWork(person,b.role,'proposals');await person.text('Review & accept version '+v);await person.click('[name="confirm-proposal-acceptance"]');await person.text('Accept version '+v);await person.until(`!document.querySelector('dialog[open]')`);
   }
   fixture.agreements[b.role]=await must('brand',base+'/agreement');
   assert.equal(fixture.agreements[b.role].snapshot.terms.amount_cents,b===creator?125000:150000);
   await openWork(brand,b.role,'proposals');await brand.until(`document.querySelector('.fl-doc-paper')`);assert.ok(await brand.ev(`document.querySelector('.fl-doc-paper').textContent.includes('Collaboration Agreement')`));
   await save();
  }
  const ws=await must('brand','/collaborations/offers/'+offer.id);assert.equal(ws.participants.filter(p=>p.proposal_status==='agreed').length,2);
  assert.equal((await api('creator2','/collaborations/'+fixture.collaborations.creator)).status,404);assert.equal((await api('outsider','/collaborations/offers/'+offer.id)).status,404);assert.equal((await api('creator','/collaborations/offers/'+offer.id)).status,404);
  assert.ok((await must('brand','/offers/'+offer.id)).applications.every(a=>a.claimed));
  fixture.proposals=true;await save();pass('grouped step → creator navigation, creator counterproposal, stale acceptance conflict, two separate mutual agreements, printable sheets, claimed flags and role isolation');
 }

 const base='/collaborations/'+fixture.collaborations.creator;
 if(!fixture.firstDelivery){
  await openWork(creator,'creator','deliveries');await creator.text('Submit version 1');await creator.fill('[name="delivery-title"]','Journey private video first cut');
  await creator.until(`document.querySelector('input[type="file"]')&&!document.querySelector('input[type="file"]').disabled`);
  await creator.ev(`(async()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.fillStyle='#c1121f';ctx.fillRect(0,0,160,90);const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});const chunks=[];const blob=await new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));recorder.start();let i=0;const timer=setInterval(()=>{ctx.fillStyle=i++%2?'#c1121f':'#3333cc';ctx.fillRect(0,0,160,90);},100);setTimeout(()=>{clearInterval(timer);recorder.stop();stream.getTracks().forEach(t=>t.stop());},2000)});const dt=new DataTransfer();dt.items.add(new File([blob],'journey-review.webm',{type:'video/webm'}));const input=document.querySelector('input[type="file"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await creator.until(`document.querySelector('.fl-del-draft-row[data-selected="true"]')`,'real private video upload');
  const ready=await must('creator',base+'/files');assert.equal((await api('brand',base+'/files/'+ready[0].id+'/download',{})).status,404);
  await creator.text('Review & submit v1');await creator.text('Submit version 1');await creator.until(`!document.querySelector('dialog[open]')&&!document.querySelector('[name="delivery-title"]')&&document.querySelector('.fl-del-timeline')?.textContent.includes('Journey private video first cut')`);
  fixture.firstDelivery=(await must('creator',base+'/deliveries')).items[0];assert.ok(fixture.firstDelivery?.files.length);await save();
  pass('real private Supabase video upload and delivery; brand cannot access an unsubmitted draft file');
 }
 if(!fixture.comments){
  await openWork(brand,'creator','deliveries');await brand.text('Review v1');await brand.until(`document.querySelector('.fl-rev-composer textarea')&&document.querySelector('.fl-rev-player-stage video')?.readyState>=1`);
  await brand.ev(`document.querySelector('.fl-rev-player-stage video').currentTime=.25`);await new Promise(r=>setTimeout(r,200));await brand.fill('.fl-rev-composer textarea','Please enlarge captions at this timestamp.');await brand.text('Post comment');await brand.until(`document.querySelector('.fl-rev-comments-list')?.textContent.includes('enlarge captions')||document.querySelector('.fl-rev-comments')?.textContent.includes('enlarge captions')`);
  const cp=base+'/deliveries/'+fixture.firstDelivery.id+'/comments';let comments=await must('brand',cp);assert.ok(comments[0].timestamp_ms>=200);assert.equal(comments[0].file_id,fixture.firstDelivery.files[0].id);
  assert.equal((await api('outsider',cp)).status,404);assert.equal((await api('creator',cp+'/'+comments[0].id,undefined,'DELETE')).status,403);
  await openWork(creator,'creator','deliveries');await creator.text('Review notes');await creator.until(`document.querySelector('.fl-rev-composer textarea')`);await creator.click('[aria-label="Mark resolved"]');await creator.click('[aria-label="Remove timestamp"]');await creator.fill('.fl-rev-composer textarea','General note: I will adjust the captions.');await creator.text('Post comment');
  await creator.until(`document.querySelector('[aria-label="Delete comment"]')`);await creator.click('[aria-label="Delete comment"]');await creator.until(`!document.querySelector('[aria-label="Delete comment"]')`);
  comments=await must('brand',cp);assert.equal(comments.length,1);assert.equal(comments[0].resolved,true);
  assert.equal((await must('brand',base+'/deliveries')).items[0].review,null);
  fixture.comments=true;await save();pass('private video preview, file/timestamp comment, resolve, general reply, own deletion and outsider denial; comments do not approve work');
 }
 let delivery=(await must('brand',base+'/deliveries')).items[0];
 if(delivery.version===1&&!delivery.review){
  await openWork(brand,'creator','deliveries');await brand.text('Request revisions');await brand.fill('[name="delivery-review-feedback"]','Please enlarge captions for the final video.');await brand.text('Send revision request');await brand.until(`!document.querySelector('dialog[open]')&&document.querySelector('.fl-deliveries').textContent.includes('Revisions requested')`);
 }
 if((await must('creator',base+'/deliveries')).latest_version===1){
  await openWork(creator,'creator','deliveries');await creator.text('Submit version 2');await creator.fill('[name="delivery-title"]','Journey revised final video');await creator.text('Add link');await creator.fill('[name="delivery-label-0"]','Final review');await creator.fill('[name="delivery-url-0"]','https://example.com/journey-final-review');await creator.text('Review & submit v2');await creator.text('Submit version 2');await creator.until(`!document.querySelector('dialog[open]')&&!document.querySelector('[name="delivery-title"]')&&document.querySelector('.fl-del-timeline')?.textContent.includes('Journey revised final video')`);
 }
 if(!(await must('brand',base+'/deliveries')).items[0].review){
  await openWork(brand,'creator','deliveries');assert.ok(await brand.ev(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Request revisions')?.disabled`));await brand.text('Approve v2');await brand.text('Confirm approval');await brand.until(`!document.querySelector('dialog[open]')&&document.querySelector('.fl-deliveries').textContent.includes('Approved')`);
 }
 if(!fixture.proof){
  await openWork(creator,'creator','proof');await creator.text('Record proof');await creator.fill('[name="proof-label-0"]','Published review');await creator.fill('[name="proof-url-0"]','https://example.com/journey-published-review');await creator.text('Review & save proof v1');await creator.text('Save proof v1');await creator.until(`!document.querySelector('dialog[open]')&&document.querySelector('.fl-collab-main').textContent.includes('Published review')`);
  await openWork(brand,'creator','proof');await brand.text('Review & confirm proof v1');await brand.click('[name="confirm-publishing-proof"]');await brand.text('Confirm proof');await brand.until(`!document.querySelector('dialog[open]')`);fixture.proof=true;await save();
 }
 if(!fixture.deliveries){
  const second='/collaborations/'+fixture.collaborations.creator2;
  if((await must('creator2',second+'/deliveries')).latest_version===0){await openWork(creator2,'creator2','deliveries');await creator2.text('Submit version 1');await creator2.fill('[name="delivery-title"]','Second creator independent review');await creator2.text('Add link');await creator2.fill('[name="delivery-label-0"]','Independent review');await creator2.fill('[name="delivery-url-0"]','https://example.com/creator-two-review');await creator2.text('Review & submit v1');await creator2.text('Submit version 1');await creator2.until(`!document.querySelector('dialog[open]')&&!document.querySelector('[name="delivery-title"]')&&document.querySelector('.fl-del-timeline')`);}
  if(!(await must('brand',second+'/deliveries')).items[0].review){await openWork(brand,'creator2','deliveries');await brand.text('Approve v1');await brand.text('Confirm approval');await brand.until(`!document.querySelector('dialog[open]')&&document.querySelector('.fl-deliveries').textContent.includes('Approved')`);}
  for(const b of [creator,creator2]){
   const cb='/collaborations/'+fixture.collaborations[b.role];if(!(await must('brand',cb+'/deliveries')).completion){await openWork(brand,b.role,'deliveries');await brand.text('Complete collaboration');await brand.text('Confirm completion');await brand.until(`!document.querySelector('dialog[open]')&&document.querySelector('.fl-deliveries').textContent.includes('Collaboration completed')`);}
   for(const person of [brand,b]){await openWork(person,b.role,'feedback');const fw=await must(person.role,cb+'/feedback');if(fw.can_submit){await person.text('Leave feedback');await person.click('[name="feedback-rating"][value="5"]');await person.fill('[name="feedback-comment"]','Clear communication and careful review throughout the work.');await person.text('Review feedback');await person.click('[name="confirm-feedback"]');await person.text('Submit feedback');await person.until(`!document.querySelector('dialog[open]')&&document.querySelector('.fl-feedback-card')`);}}
   assert.equal((await must('brand',cb+'/agreement')).snapshot_hash,fixture.agreements[b.role].snapshot_hash);
  }
  const final=await must('brand',base+'/deliveries');assert.equal(final.total,2);assert.equal(final.items[1].files[0].id,fixture.firstDelivery.files[0].id);assert.equal(final.completion.version,2);
  assert.equal((await must('brand',second+'/publishing-proof')).total,0);
  fixture.deliveries=true;await save();pass('revision limit, two approved versions/history, proof confirmation, independent completion and both private reviews; second creator completes approved work without an invented proof prerequisite');
 }

 if(!fixture.chat){
  await openWork(brand,'creator','messages');await brand.until(`document.querySelector('.fl-chat-body')&&document.querySelector('[name="message-text"]')`);
  await openWork(creator,'creator','messages');await creator.until(`document.querySelector('.fl-chat-body')&&document.querySelector('[name="message-text"]')`);
  await brand.until(`window.__journeyReady>0`);await creator.until(`window.__journeyReady>0`);
  const message='Live journey message '+Date.now();await brand.fill('[name="message-text"]',message);await creator.until(`document.querySelector('.fl-chat-presence')?.dataset.typing==='true'`);await brand.click('[aria-label="Send message"]');await creator.until(`document.querySelector('.fl-chat-body')?.textContent.includes(${JSON.stringify(message)})`);
  await creator.click('.fl-chat-row[data-mine="false"] button[aria-label="React with 👍"]');
  await brand.until(`document.querySelector('.fl-chat-reactions')?.textContent.includes('👍')`);
  await brand.until(`document.querySelector('.fl-chat-tick-read')`);const read=await must('brand',base+'/messages');assert.ok(read.meta.peer_last_read_sequence>=read.items.at(-1).sequence);
  await creator.fill('[name="message-text"]','Unsent draft survives reconnect');
  const ready=await creator.ev('window.__journeyReady');
  await creator.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  // Drop the actual isolated worker, not a mocked EventSource, while the creator is offline.
  assert.ok(Number.isInteger(fixture.api_pid)&&fixture.api_pid>0,'Fixture must identify the explicitly started isolated QA API worker');
  process.kill(fixture.api_pid,'SIGKILL');
  const log=await fs.open('/tmp/flenzr-multi-restarted-api.log','a');
  const worker=spawn('.venv/bin/uvicorn',['app.main:app','--host','127.0.0.1','--port','8332'],{cwd:fileURLToPath(new URL('../../backend/',import.meta.url)),env:{...process.env,DEBUG:'false',DATABASE_URL:'sqlite+aiosqlite:///'+(fixture.database_path||'/tmp/flenzr-multi-creator-20261126.sqlite'),SUPABASE_JWT_SECRET:'multi-creator-regression-signing-secret-not-real',SUPABASE_JWKS_URL:'',CORS_ORIGINS:'["http://localhost:3232"]'},detached:true,stdio:['ignore',log.fd,log.fd]});worker.unref();await log.close();fixture.api_pid=worker.pid;await save();
  for(let i=0;i<100;i++){try{const health=await fetch(API.replace('/api/v1','')+'/health');if(health.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const missed='Offline recovery message '+Date.now();await brand.fill('[name="message-text"]',missed);await brand.click('[aria-label="Send message"]');await brand.until(`document.querySelector('.fl-chat-body')?.textContent.includes(${JSON.stringify(missed)})`);
  await creator.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await creator.until(`window.__journeyReady>${ready}`);
  await new Promise(r=>setTimeout(r,1500));assert.ok(await creator.ev(`document.querySelector('.fl-chat-body')?.textContent.includes(${JSON.stringify(missed)})`),'Reconnected chat must reconcile messages missed while offline');assert.equal(await creator.ev(`document.querySelector('[name="message-text"]').value`),'Unsent draft survives reconnect');
  const replay={request_id:randomUUID(),text:'Retry-safe committed message'};const first=await must('brand',base+'/messages',replay);assert.equal((await must('brand',base+'/messages',replay)).id,first.id);
  assert.equal((await api('outsider',base+'/messages')).status,404);assert.equal((await api('outsider',base+'/chat/signal',{kind:'typing',payload:{active:true}})).status,404);assert.equal((await api('creator2',base+'/messages')).status,404);
  await creator.fill('[name="message-text"]','');fixture.chat=true;await save();pass('real SSE text/typing/reactions/read receipts, offline catch-up preserving draft, exact retry safety and outsider/cross-creator isolation');
 }
 if(!fixture.calls){
  await openWork(brand,'creator','messages');await openWork(creator,'creator','messages');await creator.until(`window.__journeyReady>0`);await brand.until(`window.__journeyReady>0`);
  await brand.click('[aria-label="Start video call"]');await creator.text('Decline');await brand.until(`!document.querySelector('.fl-call-banner')`);
  await brand.click('[aria-label="Start video call"]');await creator.until(`document.querySelector('.fl-call-banner')`);await brand.text('Cancel');await creator.until(`!document.querySelector('.fl-call-banner')`);
  for(const b of [brand,creator])await call('Browser.grantPermissions',{permissions:['audioCapture','videoCapture'],origin:WEB,browserContextId:b.browserContextId});
  await brand.click('[aria-label="Start video call"]');await creator.text('Accept');
  for(const b of [brand,creator])await b.until(`[...document.querySelectorAll('.fl-call-stage video')].some(v=>v.srcObject&&v.srcObject.getVideoTracks().length>0&&v.readyState>=2)`,'video media attached');
  await brand.until(`[...document.querySelectorAll('.fl-call-stage video')].filter(v=>v.srcObject&&v.readyState>=2).length===2`,'local and remote video received');
  await brand.click('[aria-label="End call"]');await creator.until(`!document.querySelector('.fl-call-stage')`);
  await call('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin:WEB,browserContextId:creator.browserContextId});await call('Browser.setPermission',{permission:{name:'microphone'},setting:'denied',origin:WEB,browserContextId:creator.browserContextId});
  await brand.click('[aria-label="Start video call"]');await creator.text('Accept');await creator.until(`document.querySelector('.fl-call-stage [role="alert"]')&&document.querySelector('.fl-call-remote-video')?.readyState>=2`,'denied local permission remains visible with remote media');await creator.click('[aria-label="End call"]');await brand.until(`!document.querySelector('.fl-call-stage')`);
  fixture.calls=true;await save();pass('video invite/decline/cancel, accepted WebRTC local+remote media with synthetic devices, end-call propagation and denied camera/microphone handling; same-host network only');
 }
 for(const b of [brand,creator,creator2]){
  await b.go('/dashboard/calendar');await b.until(`document.querySelector('.fl-calendar')||document.querySelector('[aria-label*="calendar"]')`);await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,250));assert.ok(await b.ev('document.documentElement.scrollWidth<=innerWidth'),'calendar mobile width');
 }
 await openWork(brand,'creator','proof');await brand.until(`document.querySelector('.fl-proof')||document.querySelector('[aria-label="Publishing proof"]')`);assert.ok(await brand.ev('document.documentElement.scrollWidth<=innerWidth'),'proof mobile width');await brand.shot('proof-mobile');
 await brand.go('/dashboard/brand#campaigns/'+fixture.folder.id);await brand.until(`document.querySelectorAll('.fl-offer-ticket').length===2`);assert.ok(await brand.ev('document.documentElement.scrollWidth<=innerWidth'),'campaign mobile width');
 for(const suffix of ['/agreement','/deliveries','/publishing-proof','/feedback','/messages','/deliveries/'+fixture.firstDelivery.id+'/comments'])assert.equal((await api('outsider',base+suffix)).status,404);
 const grouped=await must('brand','/collaborations/offers/'+offer.id);assert.equal(grouped.participants.filter(p=>p.delivery_status==='completed').length,2);assert.ok(grouped.participants.every(p=>p.feedback_status==='both_submitted'));
 if(!fixture.extraChecks){
  // Prefill durable history through the test API, then exercise actual browser pagination.
  for(let n=0;n<35;n++)await must('creator',base+'/messages',{request_id:randomUUID(),text:'History sample '+n});
  await brand.go(`/dashboard/collaborations/offer/${offer.id}#messages`);await brand.until(`document.querySelector('.fl-collab-unread-badge')`);
  let group=await must('brand','/collaborations/offers/'+offer.id);assert.ok(group.participants.find(p=>p.collaboration_id===fixture.collaborations.creator).unread_count>0);assert.equal(group.participants.find(p=>p.collaboration_id===fixture.collaborations.creator2).unread_count,0);
  await openWork(brand,'creator','messages');await brand.until(`!document.querySelector('.fl-collab-person[aria-selected="true"] .fl-collab-unread-badge')`);
  group=await must('brand','/collaborations/offers/'+offer.id);assert.equal(group.participants.find(p=>p.collaboration_id===fixture.collaborations.creator).unread_count,0);
  await brand.text('Load older messages');await brand.until(`document.querySelector('.fl-chat-body').textContent.includes('History sample 0')`);await brand.text('Jump to latest');await brand.until(`document.querySelector('.fl-chat-body').textContent.includes('History sample 34')`);
  await brand.send('Page.navigate',{url:'about:blank'});await brand.until(`location.href==='about:blank'`);await brand.fail('*/api/account/collaborations/offers/'+offer.id+'*',undefined,'GET',true);await brand.go(`/dashboard/collaborations/offer/${offer.id}#overview`);await brand.until(`document.querySelector('.fl-shared [role="alert"]')`);await brand.clearFailure();await brand.text('Retry');await brand.until(`document.querySelector('.fl-collab-overview-flat')`);
  await brand.go('/dashboard/brand#campaigns/'+fixture.folder.id);await brand.until(`document.querySelectorAll('.fl-offer-ticket').length===2`);await brand.click(`.fl-offer-ticket:has(a[href="/dashboard/offers/${offer.id}"]) .fl-ticket-interest`);await brand.until(`document.querySelector('.fl-activity')`);assert.ok(await brand.ev('document.documentElement.scrollWidth<=innerWidth'),'campaign activity mobile width');
  await brand.click('[aria-label="Switch to light theme"]');await brand.until(`document.documentElement.dataset.theme==='light'`);assert.ok(await brand.ev('document.documentElement.scrollWidth<=innerWidth'));await brand.shot('activity-mobile-light');
  await brand.go(offerPath+'#applicants');await brand.until(`document.querySelectorAll('.fl-offer-applicant-link').length===3`);await brand.ev(`[...document.querySelectorAll('.fl-offer-applicant-link')].find(e=>e.querySelector('strong')?.textContent===${JSON.stringify(fixture.creator.profile.display_name)}).click()`);await brand.until(`document.querySelector('.fl-applicant-row img')?.naturalWidth>0`,'saved applicant photo renders');
  await outsider.go('/dashboard/collaborations/'+fixture.collaborations.creator);await outsider.until(`document.querySelector('.fl-shared [role="alert"]')`);
  fixture.extraChecks=true;await save();pass('persisted unread counts reconcile on opening the right creator, older/latest chat pagination, grouped-load failure/retry, mobile campaign activity and outsider UI denial');
 }
 fixture.verifiedAt=new Date().toISOString();fixture.browserErrors=errors;await save();assert.deepEqual(errors,[]);pass('current grouped totals, feedback, outsider access, calendar/proof/campaign mobile layouts and no uncaught browser exceptions');

} finally {for(const browserContextId of contexts)await call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});socket.close();}
