const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
function load(){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/collaboration-feedback.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,Error});return exports;}
test('feedback requires a deliberate integer rating and useful bounded plain text',()=>{
 const api=load(),result=api.feedbackPayload(4,'  Clear scope and quick reviews.  ');
 assert.equal(result.rating,4);assert.equal(result.comment,'Clear scope and quick reviews.');
 for(const rating of [0,6,3.5,true,'5',NaN])assert.throws(()=>api.feedbackPayload(rating,'Good collaboration experience.'));
 for(const comment of ['short','   ','x'.repeat(2001),'Clear scope\0hidden'])assert.throws(()=>api.feedbackPayload(4,comment));
 assert.equal(api.feedbackPayload(1,'😀'.repeat(10)).comment,'😀'.repeat(10));
 assert.equal(api.feedbackPayload(5,'<script>alert(1)</script>').comment,'<script>alert(1)</script>');
});
test('feedback status distinguishes eligibility and each participant submission',()=>{
 const {feedbackStatus:status}=load();const value={completion_id:'complete',collaboration_status:'completed',items:[]};
 assert.equal(status({...value,completion_id:null}),'Opens after completion');
 assert.equal(status(value),'Ready for feedback');
 assert.equal(status({...value,items:[{is_mine:true}]}),'Your feedback submitted');
 assert.equal(status({...value,items:[{is_mine:false}]}),'Your collaborator left feedback');
 assert.equal(status({...value,items:[{is_mine:true},{is_mine:false}]}),'Both reviews submitted');
});
