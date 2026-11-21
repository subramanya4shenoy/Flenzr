const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const filename = path.resolve(__dirname, '../src/lib', name + '.ts');
  const exportsForTest = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,
    {exports:exportsForTest, require: name => load(name.replace('./', ''))});
  return exportsForTest;
}
const api = load('campaign-folders');
const offer = (id, parent, currency='INR', cents=10000, status='active') => ({id, parent_campaign_id:parent, currency, budget_total_cents:cents, status, end_date:null});
test('campaign folders separate multiple offers and keep legacy unassigned offers accessible', () => {
  const offers = [offer('a','summer'),offer('b','summer'),offer('c','winter'),offer('d',null),offer('e',undefined)];
  assert.equal(api.offersInCampaign(offers,'summer').map(row=>row.id).join(','),'a,b');
  assert.equal(api.offersInCampaign(offers,'winter').map(row=>row.id).join(','),'c');
  assert.equal(api.offersInCampaign(offers,'unassigned').map(row=>row.id).join(','),'d,e');
  assert.equal(api.offersInCampaign(offers,'missing').length,0);
});
test('campaign totals keep currencies separate and distinguish active, expired and draft offers', () => {
  const offers = [offer('a','summer','INR',10000),offer('b','summer','INR',25000,'draft'),offer('c','summer','USD',5000),{...offer('d','summer','INR',1000),end_date:'2020-01-01'}];
  const summary = api.campaignFolderSummary(offers);
  assert.equal(summary.count,4); assert.equal(summary.active,2); assert.equal(summary.drafts,1);
  assert.equal(summary.status,'Active'); assert.equal(summary.budgets.length,2);
  assert.ok(summary.budgets.some(value=>value.includes('360.00')));
  assert.ok(summary.budgets.some(value=>value.includes('50.00')));
  assert.equal(api.campaignFolderSummary([]).status,'No offers yet');
  assert.equal(api.campaignFolderSummary([offer('a','summer','INR',0,'draft')]).status,'Drafts');
  assert.equal(api.campaignFolderSummary([offer('a','summer','INR',0,'completed')]).status,'Closed');
});
test('campaign URLs preserve root, parent and legacy folder navigation', () => {
  assert.equal(api.campaignFolderHref(),'/dashboard/brand#campaigns');
  assert.equal(api.campaignFolderHref('summer'),'/dashboard/brand#campaigns/summer');
  assert.equal(api.campaignFolderHref('unassigned'),'/dashboard/brand#campaigns/unassigned');
});
test('recent shortcuts include only opened folders and ignore creation, edits and offer activity', () => {
  const folders = ['a','b','c','d','unassigned'].map(id => ({id,title:id,objective:'',revision:1,created_at:'2026-05-01T00:00:00Z',updated_at:'2026-06-01T00:00:00Z'}));
  folders[0].last_opened_at = '2026-03-01T00:00:00Z';
  folders[1].last_opened_at = '2026-02-01T00:00:00Z';
  folders[4].last_opened_at = '2026-04-01T00:00:00Z';
  assert.equal(api.recentCampaigns(folders).map(folder=>folder.id).join(','),'unassigned,a,b');
  assert.equal(api.recentCampaigns(folders,2).map(folder=>folder.id).join(','),'unassigned,a');
  assert.equal(folders.length,5); // All folders remain in the separate full table.
  assert.equal(api.recentCampaigns([]).length,0);
  assert.equal(api.recentCampaigns([{...folders[0],last_opened_at:'invalid'}]).length,0);
});
