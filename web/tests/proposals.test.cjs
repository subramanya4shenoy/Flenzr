const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/proposals.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,{exports,Error,Date});
  return exports;
}
test('proposal price preserves exact cents and incomplete terms remain undecided', () => {
  const api=load();
  const fields=api.proposalFields({amount_cents:12345,currency:'INR',deliverables:'One video'});
  assert.equal(fields.amount,'123.45');assert.equal(fields.usage_rights,'');
  assert.equal(api.proposalPayload(fields).amount_cents,12345);
  assert.equal(api.proposalPayload({...fields,amount:''}).amount_cents,null);
  assert.equal(api.proposalPayload({...fields,amount:'10000000'}).amount_cents,1000000000);
  for(const amount of ['0','0.99','-1','1e3','1.234','10000000.01','Infinity'])assert.throws(()=>api.proposalPayload({...fields,amount}));
});
test('proposal date and currency reject malformed terms before saving', () => {
  const api=load(),fields=api.proposalFields({currency:'INR'});
  for(const delivery_date of ['2026-02-30','2026-12-01T12:00:00Z','not-a-date'])assert.throws(()=>api.proposalPayload({...fields,delivery_date}));
  assert.throws(()=>api.proposalPayload({...fields,currency:'XYZ'}));
  const result=api.proposalPayload({...fields,delivery_date:'2026-12-01',usage_rights:' Organic reposting only '});
  assert.equal(result.delivery_date,'2026-12-01');assert.equal(result.usage_rights,'Organic reposting only');
});
test('revision allowance is optional and preserves explicit zero',()=>{
 const api=load(),fields=api.proposalFields({currency:'INR'});
 assert.equal(fields.revision_limit,'');assert.equal('revision_limit' in api.proposalPayload(fields),false);
 assert.equal(api.proposalPayload({...fields,revision_limit:'0'}).revision_limit,0);
 assert.equal(api.proposalPayload({...fields,revision_limit:'20'}).revision_limit,20);
 assert.equal(api.proposalFields({currency:'INR',revision_limit:0}).revision_limit,'0');
 for(const revision_limit of ['-1','21','2.5','1e1','02','Infinity'])assert.throws(()=>api.proposalPayload({...fields,revision_limit}),/revision rounds/);
});
