/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const path=require('node:path');
const exportsForTest={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/campaign-lifecycle.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,{exports:exportsForTest});
const api=exportsForTest;
const campaign={title:'A campaign',brief:'Complete campaign brief',target_niche:'Technology',deliverable_summary:'One video',budget_total_cents:10000,currency:'INR',status:'draft',start_date:null,end_date:null};
test('campaign actions follow the lifecycle and closed/cancelled states are terminal',()=>{
 assert.equal(api.campaignActions('draft').join(','),'publish,cancel');
 assert.equal(api.campaignActions('active').join(','),'pause,close,cancel');
 assert.equal(api.campaignActions('paused').join(','),'resume,close,cancel');
 assert.equal(api.campaignActions('completed').length,0);assert.equal(api.campaignActions('cancelled').length,0);
 assert.equal(api.campaignActionInfo.close.target,'completed');assert.equal(api.campaignStatusLabel.completed,'Closed');
});
test('publication readiness explains missing data without inventing a complete brief',()=>{
 assert.equal(api.campaignPublishIssues(campaign,'2026-11-19').length,0);
 for(const patch of [{brief:''},{target_niche:''},{deliverable_summary:null},{budget_total_cents:0},{currency:'usd'},{end_date:'2026-11-18T00:00:00Z'}]) assert.ok(api.campaignPublishIssues({...campaign,...patch},'2026-11-19').length);
 assert.ok(api.campaignPublishIssues({...campaign,start_date:'2026-12-12',end_date:'2026-12-01'},'2026-11-19').some(value=>value.includes('start date')));
 assert.equal(api.campaignPublishIssues({...campaign,end_date:'2026-11-19T00:00:00Z'},'2026-11-19').length,0);
});
test('availability respects campaign state and the inclusive end calendar day',()=>{
 assert.equal(api.campaignOpen({...campaign,status:'active'},'2026-11-19'),true);
 assert.equal(api.campaignOpen({...campaign,status:'paused'},'2026-11-19'),false);
 assert.equal(api.campaignOpen({...campaign,status:'active',end_date:'2026-11-18T00:00:00Z'},'2026-11-19'),false);
 assert.equal(api.campaignOpen({...campaign,status:'active',end_date:'2026-11-19T00:00:00Z'},'2026-11-19'),true);
});
