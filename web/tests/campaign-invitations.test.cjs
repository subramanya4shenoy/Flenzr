/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function load(fetch){const context={exports:{},fetch,Error};const drafts={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-drafts.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,drafts);context.require=()=>drafts.exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-invitations.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,context);return context.exports;}
test('quotes keep exact cents and reject missing, fractional-cent or out-of-range offers',()=>{
 const api=load();assert.equal(api.invitationQuoteCents('123.45'),12345);assert.equal(api.invitationQuoteCents('1'),100);
 for(const value of ['', '0','0.99','12.345','-1','1e3','20,000','20000000.01'])assert.throws(()=>api.invitationQuoteCents(value),/offered quote/);
});
test('payload binds recipient and campaign revision without changing currency or identity ownership',()=>{
 const api=load();assert.deepEqual(JSON.parse(JSON.stringify(api.invitationPayload({id:'creator'},{id:'campaign',revision:7,currency:'INR'},'123.45','  Hello creator  '))),{creator_id:'creator',offered_rate_cents:12345,message:'Hello creator',expected_campaign_revision:7});
 assert.equal(api.invitationPayload({id:'creator'},{revision:1},'1','  ').message,null);
 assert.throws(()=>api.invitationPayload({id:'creator'},{revision:1},'1','x'.repeat(5001)),/5,000/);
});
test('invitation requests use the private cookie gateway and retain server conflicts',async()=>{
 const api=load(async(url,options)=>{assert.equal(url,'/api/account/campaigns/campaign/invite');assert.equal(options.cache,'no-store');assert.equal(options.method,'POST');return{ok:false,status:409,json:async()=>({error:{code:'INVITATION_EXISTS',message:'Review saved invitation'}})};});
 await assert.rejects(api.invitationRequest('/campaign/invite',{method:'POST'}),error=>error instanceof api.InvitationRequestError&&error.status===409&&error.code==='INVITATION_EXISTS');
});
test('profile, authorization and transport failures explain recovery',async()=>{
 for(const [status,path,message] of [[404,'/me',/brand profile/],[404,'/invitation-recipient/user',/no longer available/],[401,'/me',/session expired/],[403,'/me',/owning brand/],[503,'/me',/Please retry/]]){
 const api=load(async()=>({ok:false,status,json:async()=>null}));await assert.rejects(api.invitationRequest(path),message);
 }
});
