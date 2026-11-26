/** Step 35: isolated call qualification. See docs/CALL-READINESS.md. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
if(process.env.FLENZR_QA_ALLOW_TURN_RESTART!=='1')throw Error('This runner restarts its isolated TURN process. Set FLENZR_QA_ALLOW_TURN_RESTART=1 only with the disposable setup in docs/CALL-READINESS.md.');
const WEB=process.env.FLENZR_QA_WEB_ORIGIN||'http://localhost:3232';
const fixturePath=process.env.FLENZR_QA_FIXTURE||'/tmp/flenzr-multi-creator-fixture.json';
const fixture=JSON.parse(await fs.readFile(fixturePath,'utf8'));
const version=await fetch(process.env.FLENZR_QA_CHROME_URL||'http://127.0.0.1:9362/json/version').then(r=>r.json());
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map(),contexts=[],errors=[],faults=new Map();
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'){errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);}else if(m.method==='Fetch.requestPaused'){void(async()=>{const fault=faults.get(m.sessionId);if(fault&&m.params.request.method===(fault.method||'POST')&&(!fault.match||m.params.request.postData?.includes(fault.match))){if(!fault.repeat)faults.delete(m.sessionId);await call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({error:{message:'Simulated request failure'}})).toString('base64')},m.sessionId);if(!fault.repeat)await call('Fetch.disable',{},m.sessionId);}else await call('Fetch.continueRequest',{requestId:m.params.requestId},m.sessionId);})().catch(e=>errors.push(e.message));}};
function pass(text){console.log('PASS '+text);}
async function browser(role){
 const {browserContextId}=await call('Target.createBrowserContext');contexts.push(browserContextId);
 const {targetId}=await call('Target.createTarget',{url:'about:blank',browserContextId});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const send=(method,params={})=>call(method,params,sessionId);await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__journeyReady=0;const NativeEventSource=window.EventSource;window.EventSource=class extends NativeEventSource{constructor(...args){super(...args);this.addEventListener('ready',()=>window.__journeyReady++);}};`});await send('Runtime.enable');await send('Network.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 if(role)await send('Network.setCookie',{name:'flenzr_access',value:fixture[role].token,url:WEB,httpOnly:true,sameSite:'Lax',path:'/'});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async(expression,label=expression)=>{const end=Date.now()+45000;while(Date.now()<end){if(await ev(`(async()=>Boolean(await (${expression})))()`))return;await new Promise(r=>setTimeout(r,120));}throw Error(`${role}: timed out ${label}; `+await ev('document.body.innerText.slice(-1800)'));};
 const click=async(selector)=>{await until(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e&&!e.disabled&&Object.keys(e).some(k=>k.startsWith('__reactProps'))})()`);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);};
 const text=async value=>{await until(`(()=>{const scope=document.querySelector('dialog[open]')||document;return [...scope.querySelectorAll('button')].some(e=>e.textContent.trim()===${JSON.stringify(value)}&&!e.disabled&&Object.keys(e).some(k=>k.startsWith('__reactProps')))})()`);await ev(`(()=>{const scope=document.querySelector('dialog[open]')||document;[...scope.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(value)}&&!e.disabled).click()})()`);};
 const fill=async(selector,value)=>{await until(`document.querySelector(${JSON.stringify(selector)})`);await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
 const go=async path=>{const url=new URL(WEB+path);url.searchParams.set('__journey',randomUUID());await send('Page.navigate',{url:url.href});};
 const shot=async name=>{const {data}=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/flenzr-multi-'+name+'.png',Buffer.from(data,'base64'));};
 const fail=async(pattern,match,method='POST',repeat=false)=>{faults.set(sessionId,{match,method,repeat});await send('Fetch.enable',{patterns:[{urlPattern:pattern,requestStage:'Request'}]});};
 const clearFailure=async()=>{faults.delete(sessionId);await send('Fetch.disable');};
 return {role,send,ev,until,click,text,fill,go,shot,fail,clearFailure,browserContextId};
}

const instrument = `window.__callPCs=[];const NativePC=window.RTCPeerConnection;window.RTCPeerConnection=class extends NativePC{constructor(...args){super(...args);window.__callPCs.push(this);}};
// Generated MediaStreamTracks exercise real RTP/ICE without camera hardware.
navigator.mediaDevices.getUserMedia=async constraints=>{
 if(window.__mediaDelay)await new Promise(r=>setTimeout(r,window.__mediaDelay));
 if((await navigator.permissions.query({name:'microphone'})).state==='denied')throw new DOMException('Denied','NotAllowedError');
 if(window.__audioOnly&&constraints.video&&!constraints.__screen)throw new DOMException('No camera','NotFoundError');
 const tracks=[];
 if(constraints.video){const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const context=canvas.getContext('2d');let frame=0;setInterval(()=>{context.fillStyle=frame++%2?'#3466dd':'#dd5533';context.fillRect(0,0,320,240);context.fillStyle='white';context.fillText(String(frame),20,20);},60);tracks.push(...canvas.captureStream(15).getVideoTracks());}
 if(constraints.audio){const ac=new AudioContext();const tone=ac.createOscillator();const destination=ac.createMediaStreamDestination();tone.connect(destination);tone.start();void ac.resume();tracks.push(...destination.stream.getAudioTracks());}
 return new MediaStream(tracks);
};navigator.mediaDevices.getDisplayMedia=async()=>navigator.mediaDevices.getUserMedia({video:true,audio:false,__screen:true});`;

const activePC = `window.__callPCs.filter(p=>p.connectionState!=='closed').at(-1)`;
const mediaFlow = `(async()=>{const p=${activePC};if(!p)return false;const stats=await p.getStats();return p.connectionState==='connected'&&[...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='video'&&s.framesDecoded>0);})()`;
const statsExpression = String.raw`(async()=>{const p=${activePC};const stats=await p.getStats();const t=[...stats.values()].find(s=>s.type==='transport'&&s.selectedCandidatePairId);const pair=t&&stats.get(t.selectedCandidatePairId);const local=pair&&stats.get(pair.localCandidateId);const remote=pair&&stats.get(pair.remoteCandidateId);return {state:p.connectionState,policy:p.getConfiguration().iceTransportPolicy,localType:local?.candidateType,remoteType:remote?.candidateType,protocol:local?.protocol,bytes:pair?.bytesReceived,pairId:pair?.id,relayProtocol:local?.relayProtocol,frames:[...stats.values()].find(s=>s.type==='inbound-rtp'&&s.kind==='video')?.framesDecoded,ufrag:p.localDescription?.sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1]};})()`;
try {
 const brand=await browser('brand'),creator=await browser('creator');
 for(const b of [brand,creator]){
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:instrument});
  await call('Browser.grantPermissions',{permissions:['audioCapture','videoCapture'],origin:WEB,browserContextId:b.browserContextId});
 }
 async function open(b){
  if(b.role==='brand'){
   await b.go(`/dashboard/collaborations/offer/${fixture.offers[0].id}#messages`);
   const name=fixture.creator.profile.display_name;
   await b.until(`[...document.querySelectorAll('.fl-collab-person')].some(e=>e.querySelector('.fl-collab-person-copy strong')?.textContent===${JSON.stringify(name)})`);
   await b.ev(`[...document.querySelectorAll('.fl-collab-person')].find(e=>e.querySelector('.fl-collab-person-copy strong')?.textContent===${JSON.stringify(name)}).click()`);
  }else await b.go(`/dashboard/collaborations/${fixture.collaborations.creator}#messages`);
  await b.until(`document.querySelector('[aria-label="Start video call"]')&&window.__journeyReady>0`);
 }
 await open(brand);await open(creator);
 await creator.ev('window.__mediaDelay=1500');
 await brand.click('[aria-label="Start video call"]');await creator.text('Accept');
 for(const b of [brand,creator])await b.until(mediaFlow,'two-way relay video with delayed media permission');
 const initial=[];
 for(const b of [brand,creator]){const stats=await b.ev(statsExpression);assert.equal(stats.policy,'relay');assert.equal(stats.localType,'relay');assert.equal(stats.remoteType,'relay');assert.ok(stats.bytes>0);if(process.env.FLENZR_QA_EXPECT_RELAY_PROTOCOL)assert.equal(stats.relayProtocol,process.env.FLENZR_QA_EXPECT_RELAY_PROTOCOL);initial.push(stats);}
 pass('actual UI/BFF/API call uses selected TURN relay candidate pairs and two-way decoded video despite delayed callee media');
 await brand.click('[aria-label="Mute microphone"]');assert.equal(await brand.ev(`${activePC}.getSenders().find(s=>s.track?.kind==='audio').track.enabled`),false);await brand.click('[aria-label="Unmute microphone"]');
 await brand.click('[aria-label="Turn camera off"]');assert.equal(await brand.ev(`${activePC}.getSenders().find(s=>s.track?.kind==='video').track.enabled`),false);await brand.click('[aria-label="Turn camera on"]');pass('microphone and camera controls change live media tracks');
 // Drop the actual relay, then restore it with the same isolated configuration.
 const turnPid=Number((await fs.readFile(process.env.FLENZR_QA_TURN_PID_FILE||'/tmp/flenzr-call-qualification-turn.pid','utf8')).trim());assert.ok(turnPid>0);process.kill(turnPid,'SIGTERM');await new Promise(r=>setTimeout(r,2500));
 const turnLog=await fs.open('/tmp/flenzr-call-qualification-turn-restart.log','a');const turn=spawn(process.env.FLENZR_QA_TURN_BINARY||'/opt/homebrew/bin/turnserver',['-c',process.env.FLENZR_QA_TURN_CONFIG||'/tmp/flenzr-call-qualification-turn.conf'],{detached:true,stdio:['ignore',turnLog.fd,turnLog.fd]});turn.unref();await turnLog.close();await new Promise(r=>setTimeout(r,1000));
 // Online recovery uses real ICE restart over the existing authenticated signaling.
 await creator.ev(`window.dispatchEvent(new Event('online'))`);
 for(const b of [brand,creator])await b.until(mediaFlow,'relay media resumes after TURN restart');
 await brand.until(`(async()=>{const s=await ${statsExpression};return s.ufrag!==${JSON.stringify(initial[0].ufrag)};})()`,'fresh ICE generation');
 for(let i=0;i<2;i++){const b=[brand,creator][i];await b.until(`(async()=>{const s=await ${statsExpression};return s.pairId!==${JSON.stringify(initial[i].pairId)}&&s.frames>${initial[i].frames}+3&&s.bytes>0;})()`,'fresh candidate pair carrying newly decoded frames');}
 for(const b of [brand,creator]){const snapshot=await b.ev(statsExpression);await b.until(`(async()=>{const s=await ${statsExpression};return s.pairId===${JSON.stringify(snapshot.pairId)}&&s.frames>${snapshot.frames}+4&&s.bytes>${snapshot.bytes};})()`,'media counters advance on the recovered relay pair');}
 const recovered=[];for(const b of [brand,creator]){const s=await b.ev(statsExpression);assert.equal(s.localType,'relay');recovered.push(s);}
 pass('TURN process interruption followed by ICE restart recovers the same call with a fresh ICE generation');
 await brand.ev(`window.__cameraTrack=${activePC}.getSenders().find(s=>s.track?.kind==='video').track`);
 await brand.click('[aria-label="Share screen"]');await brand.until(`document.querySelector('[aria-label="Stop sharing screen"]')`);assert.equal(await brand.ev(`${activePC}.getSenders().find(s=>s.track?.kind==='video').track===window.__cameraTrack`),false);
 await brand.click('[aria-label="Stop sharing screen"]');assert.equal(await brand.ev(`${activePC}.getSenders().find(s=>s.track?.kind==='video').track===window.__cameraTrack`),true);pass('simulated screen selection replaces the live sender and stopping restores the camera');
 await brand.click('[aria-label="End call"]');await creator.until(`!document.querySelector('.fl-call-stage')`);
 for(const b of [brand,creator])assert.ok(await b.ev(`window.__callPCs.every(p=>p.connectionState==='closed')`));pass('hangup propagates and closes all peer connections');
 // Explicit denial remains visible while remote media is received.
 await call('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin:WEB,browserContextId:creator.browserContextId});await call('Browser.setPermission',{permission:{name:'microphone'},setting:'denied',origin:WEB,browserContextId:creator.browserContextId});
 await brand.click('[aria-label="Start video call"]');await creator.text('Accept');await creator.until(`document.querySelector('.fl-call-stage [role="alert"]')&&document.querySelector('.fl-call-remote-video')?.readyState>=2`);await creator.click('[aria-label="End call"]');await brand.until(`!document.querySelector('.fl-call-stage')`);pass('denied local permissions remain visible alongside received remote media');
 await call('Browser.grantPermissions',{permissions:['audioCapture','videoCapture'],origin:WEB,browserContextId:creator.browserContextId});await creator.ev('window.__audioOnly=true;window.__mediaDelay=0');
 await brand.click('[aria-label="Start video call"]');await creator.text('Accept');await creator.until(`document.querySelector('[aria-label="Turn camera on"]')?.disabled&&${activePC}?.connectionState==='connected'`);
 await creator.click('[aria-label="Share screen"]');await creator.until(`document.querySelector('[aria-label="Stop sharing screen"]')`);await brand.until(mediaFlow,'screen video from participant without camera');await creator.click('[aria-label="Stop sharing screen"]');assert.equal(await creator.ev(`${activePC}.getTransceivers().find(t=>t.receiver.track.kind==='video').sender.track`),null);await creator.click('[aria-label="End call"]');await brand.until(`!document.querySelector('.fl-call-stage')`);pass('audio-only participant can share screen and restore the empty camera sender');
 await brand.fail('*/api/account/collaborations/*/chat/signal','call_ring');await brand.click('[aria-label="Start video call"]');await brand.until(`document.body.innerText.includes('Could not send the call invitation')&&!document.querySelector('.fl-call-banner')`);pass('failed call invitation shows an error and returns to idle without an unhandled rejection');
 await brand.click('[aria-label="Start video call"]');await creator.until(`document.querySelector('.fl-call-banner')`);await creator.fail('*/api/account/collaborations/*/chat/signal','call_accept');await creator.text('Accept');await creator.until(`document.body.innerText.includes('Could not accept the call')&&document.querySelector('.fl-call-banner')`);await creator.text('Decline');await brand.until(`!document.querySelector('.fl-call-banner')`);pass('failed acceptance preserves the incoming invitation and can still decline');
 assert.deepEqual(errors,[]);await fs.writeFile(process.env.FLENZR_QA_RESULT||'/tmp/flenzr-call-network-result.json',JSON.stringify({initial,recovered,uncaughtErrors:errors.length,scope:'same-host generated canvas/audio tracks; actual local TURN; simulated permission denial; physical devices/cross-network skipped by user'},null,2));
} finally {
 for(const browserContextId of contexts)await call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});socket.close();
}
