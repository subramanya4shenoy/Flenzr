/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function load(fetch){const drafts={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-drafts.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,drafts);const context={exports:{},fetch,Error,URLSearchParams,require:()=>drafts.exports};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-opportunities.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,context);return context.exports;}
test('queries trim and encode filters while preserving bounded page size',()=>{
 const api=load(),q=new URLSearchParams(api.opportunityQuery('  Brand & co  ',' Tech ',2));assert.equal(q.get('q'),'Brand & co');assert.equal(q.get('niche'),'Tech');assert.equal(q.get('page'),'2');assert.equal(q.get('page_size'),'12');assert.equal(new URLSearchParams(api.opportunityQuery('','')).has('q'),false);
});
test('application payload preserves exact cents and observed campaign revision without accepting identity fields',()=>{
 const api=load();assert.deepEqual(JSON.parse(JSON.stringify(api.applicationPayload({id:'campaign',revision:7},'123.45','  My pitch  '))),{proposed_rate_cents:12345,pitch_message:'My pitch',expected_campaign_revision:7});
 assert.equal(api.applicationPayload({revision:1},'1',' ').pitch_message,null);
 for(const quote of ['', '0','0.99','12.345','-1','1e3','20,000','20000000.01'])assert.throws(()=>api.applicationPayload({revision:1},quote,''),/proposed quote/);
 assert.throws(()=>api.applicationPayload({revision:1},'1','x'.repeat(5001)),/5,000/);
});
test('requests use the cookie gateway, no-store and preserve conflicts for reload',async()=>{
 const api=load(async(url,options)=>{assert.equal(url,'/api/account/campaigns/campaign/apply');assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');return{ok:false,status:409,json:async()=>({error:{code:'APPLICATION_EXISTS',message:'Review saved application'}})};});
 await assert.rejects(api.opportunityRequest('/campaign/apply',{method:'POST'}),e=>e instanceof api.OpportunityRequestError&&e.status===409&&e.code==='APPLICATION_EXISTS');
});
test('request failures distinguish profile setup, closed campaigns, sessions and transport errors',async()=>{
 for(const [status,path,message] of [[404,'/opportunities?page=1',/creator profile/],[404,'/opportunities/id',/no longer open/],[401,'/opportunities',/session expired/],[403,'/opportunities',/creator account/],[503,'/opportunities',/Please retry/]]){
 const api=load(async()=>({ok:false,status,json:async()=>null}));await assert.rejects(api.opportunityRequest(path),message);
 }
});
test('calendar dates stay on their UTC day, including SQLite values without a timezone',()=>{
 const api=load();assert.equal(api.opportunityDate(null),'Open end date');assert.equal(api.opportunityDate('2026-11-19T00:00:00'),api.opportunityDate('2026-11-19T00:00:00Z'));
});
