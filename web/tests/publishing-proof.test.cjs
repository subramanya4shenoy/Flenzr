const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
function load(name,dependencies={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,URL,Error,require:n=>dependencies[n]});return exports;}
test('publishing proof validates final links and serializes only creator notes and links',()=>{
 const helper=load('publishing-proof',{'./deliveries':load('deliveries')});
 const fields={notes:' Published the reel. ',links:[{label:' Instagram post ',url:' https://EXAMPLE.com/post '}]};
 const result=helper.proofPayload(fields);
 assert.deepEqual(Object.keys(result).sort(),['links','notes']);assert.equal(result.notes,'Published the reel.');assert.equal(result.links[0].url,'https://example.com/post');assert.equal(fields.links[0].label,' Instagram post ');
 for(const url of ['http://example.com','javascript:alert(1)','https://user:secret@example.com','https://example.com/a b'])assert.throws(()=>helper.proofPayload({notes:'',links:[{label:'Post',url}]}));
 assert.throws(()=>helper.proofPayload({notes:'',links:[]}));assert.throws(()=>helper.proofPayload({notes:'',links:[{label:'Post',url:'https://example.com'},{label:'Duplicate',url:'https://example.com/'}]}));
});
