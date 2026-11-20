/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const path=require('node:path');
function load(fetch){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-activity.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,{exports,URLSearchParams,fetch,Error});return exports;}
test('participant lists use cookie gateway and encoded campaign filters',()=>{
 const api=load();const url=new URL(api.campaignActivityPath('brand','applications',2,'a&b'),'https://example.com');
 assert.equal(url.pathname,'/api/account/campaigns/me/applications');assert.equal(url.searchParams.get('campaign_id'),'a&b');assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.get('page_size'),'20');
 assert.equal(api.campaignActivityPath('creator','invitations',1),'/api/account/campaigns/creator/invitations?page=1&page_size=20');
});
test('reads bypass cache, preserve saved records and accept cancellation',async()=>{
 const data={items:[{id:'saved',status:'declined'}],total:1,page:1,page_size:20};const signal={aborted:false};
 const api=load(async(path,options)=>{assert.equal(path,'/list');assert.equal(options.cache,'no-store');assert.equal(options.signal,signal);return {ok:true,json:async()=>data};});
 assert.equal(await api.loadCampaignActivity('/list',signal),data);
});
test('session, authorization, missing profile and service errors explain recovery',async()=>{
 for(const [status,text] of [[401,/session expired/],[403,/do not have access/],[404,/profile not found/],[503,/Please retry/]]){
 const api=load(async()=>({ok:false,status,json:async()=>null}));await assert.rejects(api.loadCampaignActivity('/list'),text);
 }
});
test('response controls respect participant, pending state and campaign availability',()=>{
 const api=load(),item={status:'pending',campaign_status:'active',campaign_end_date:null};
 assert.equal(api.activityActions('brand','applications',item).join(','),'accept,reject');
 assert.equal(api.activityActions('creator','applications',item).join(','),'withdraw');
 const invited={...item,status:'invited'};
 assert.equal(api.activityActions('creator','invitations',invited).join(','),'accept,decline');
 assert.equal(api.activityActions('brand','invitations',invited).length,0);
 for(const campaign_status of ['draft','paused','completed','cancelled']){
  assert.equal(api.activityActions('brand','applications',{...item,campaign_status}).join(','),'reject');
  assert.equal(api.activityActions('creator','invitations',{...invited,campaign_status}).join(','),'decline');
  assert.equal(api.activityActions('creator','applications',{...item,campaign_status}).join(','),'withdraw');
 }
 for(const status of ['accepted','rejected','withdrawn','declined']){
  assert.equal(api.activityActions('brand','applications',{...item,status}).length,0);
  assert.equal(api.activityActions('creator','invitations',{...item,status}).length,0);
 }
 assert.equal(api.activityAccepting({...item,campaign_end_date:'2026-11-19T00:00:00Z'},'2026-11-19'),true);
 assert.equal(api.activityAccepting({...item,campaign_end_date:'2026-11-19T00:00:00'},'2026-11-19'),true);
 assert.equal(api.activityAccepting({...item,campaign_end_date:'2026-11-18T23:59:59Z'},'2026-11-19'),false);
});
test('confirmation sends only action and the observed statuses through the cookie gateway',async()=>{
 const api=load(async(path,options)=>{
  assert.equal(path,'/api/account/campaigns/creator/invitations/a%2Fb/respond');assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');
  assert.deepEqual(JSON.parse(options.body),{action:'accept',expected_status:'invited',expected_campaign_revision:7});
  return {ok:true,json:async()=>({id:'a/b',status:'accepted'})};
 });
 const path=api.campaignRecordPath('creator','invitations','a/b');
 assert.equal((await api.respondCampaignActivity(path,{status:'invited',campaign_revision:7,creator_id:'ignored',rate_cents:1},'accept')).status,'accepted');
});
test('record conflicts retain their HTTP status so the UI requires reload before reconfirmation',async()=>{
 const api=load(async()=>({ok:false,status:409,json:async()=>({error:{message:'Changed. Reload before confirming.'}})}));
 await assert.rejects(api.loadCampaignRecord('/record'),error=>error instanceof api.CampaignActivityError&&error.status===409&&error.message.includes('Reload'));
});
