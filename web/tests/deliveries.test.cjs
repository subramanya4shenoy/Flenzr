const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/deliveries.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,Error,URL});
  return exports;
}
const valid={title:' Review reel ',notes:' Please review this cut. ',links:[{label:' Preview ',url:' https://EXAMPLE.com/video?email=a@b.com '}]};
test('delivery fields normalize shareable links and preserve plain text', () => {
  const api=load(),payload=api.deliveryPayload(valid);
  assert.equal(payload.title,'Review reel');assert.equal(payload.notes,'Please review this cut.');
  assert.equal(payload.links[0].label,'Preview');assert.equal(payload.links[0].url,'https://example.com/video?email=a@b.com');
  const one=api.emptyDelivery(),two=api.emptyDelivery();one.links[0].label='Changed';assert.equal(two.links[0].label,'');
});
test('delivery links reject unsafe schemes, credentials, malformed URLs and duplicates', () => {
  const api=load();
  for(const url of ['javascript:alert(1)','http://example.com','https:example.com','https://user:secret@example.com','https://@example.com','https://example.com/a b','https://example.com/\\bad','https://example.com/\npath','/relative'])
    assert.throws(()=>api.deliveryPayload({...valid,links:[{label:'Preview',url}]}));
  assert.throws(()=>api.deliveryPayload({...valid,links:[{label:'First',url:'https://example.com'},{label:'Duplicate',url:'https://example.com/'}]}),/duplicate/);
});
test('submission requires bounded title, notes and at most ten labelled links', () => {
  const api=load();
  for(const fields of [{...valid,title:' '},{...valid,title:'a'.repeat(161)},{...valid,notes:'a'.repeat(5001)},{...valid,links:[]},{...valid,links:Array(11).fill(valid.links[0])},{...valid,links:[{label:'',url:'https://example.com'}]}])assert.throws(()=>api.deliveryPayload(fields));
});
test('review requests require useful revision feedback and preserve optional approval feedback', () => {
  const api=load();
  assert.equal(api.deliveryReviewPayload('approve','').feedback,'');
  assert.equal(api.deliveryReviewPayload('request_revision',' Adjust captions ').feedback,'Adjust captions');
  for(const feedback of ['', '    ','abcd','😀😀a'])assert.throws(()=>api.deliveryReviewPayload('request_revision',feedback));
  assert.throws(()=>api.deliveryReviewPayload('approve','x'.repeat(5001)));
  assert.throws(()=>api.deliveryReviewPayload('complete','Looks good'));
});
