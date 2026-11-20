/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(fetch) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-drafts.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,{exports,fetch,Error});
  return exports;
}
test('draft budgets are exact cents and incomplete fields stay undecided', () => {
  const api=load();
  assert.equal(api.draftBudgetCents('12.34'),1234);assert.equal(api.draftBudgetCents(''),0);
  assert.equal(api.draftBudgetCents('0.01'),1);assert.equal(api.draftBudgetCents('20000000'),2000000000);
  for(const value of ['-1','1e3','2.345','Infinity','20000000.01']) assert.throws(()=>api.draftBudgetCents(value));
  const payload=api.campaignDraftPayload({...api.emptyCampaignDraft,title:' New brief '});
  assert.equal(payload.title,'New brief');assert.equal(payload.brief,'');assert.equal(payload.budget_total_cents,0);
  assert.equal(payload.target_niche,null);assert.equal(payload.start_date,null);
  assert.throws(()=>api.campaignDraftPayload({...api.emptyCampaignDraft,title:'Short',start_date:'2026-02-30'}),/valid campaign dates/);
  assert.throws(()=>api.campaignDraftPayload({...api.emptyCampaignDraft,title:'Short',start_date:'2026-12-20',end_date:'2026-12-01'}),/End date/);
  const restored=api.campaignDraftFields({title:'Saved draft',brief:'',currency:'INR',budget_total_cents:1234567,start_date:'2026-12-01T00:00:00Z'});
  assert.equal(restored.budget,'12345.67');assert.equal(restored.start_date,'2026-12-01');
});
test('campaign requests keep cookies on the gateway and expose retry/conflict failures', async () => {
  let called,status=200;
  const api=load(async(url,options)=>{called={url,options};return {ok:status===200,status,json:async()=>({error:{message:'Draft changed'},id:'saved'})};});
  assert.equal((await api.campaignRequest('/me')).id,'saved');assert.equal(called.url,'/api/account/campaigns/me');
  assert.equal(called.options.cache,'no-store');assert.equal(called.options.headers.Authorization,undefined);
  status=409;await assert.rejects(api.campaignRequest('/one/draft',{method:'PATCH',body:'{}'}),error=>error.status===409&&error.message==='Draft changed');
  assert.equal(called.options.method,'PATCH');status=401;await assert.rejects(api.campaignRequest('/me'),/Sign in again/);
  status=403;await assert.rejects(api.campaignRequest('/me'),/owning brand/);
  status=404;await assert.rejects(api.campaignRequest('/me'),/brand profile/);
});
test('campaign budgets are grouped by currency without inventing conversions', () => {
  const api=load();
  const totals=api.campaignBudgetTotals([{currency:'INR',budget_total_cents:10000},{currency:'USD',budget_total_cents:20000},{currency:'INR',budget_total_cents:5000}]);
  assert.equal(totals.length,2);assert.match(totals[0],/150/);assert.match(totals[1],/200/);
});
