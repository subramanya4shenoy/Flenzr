/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, globals, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {exports, require:name => mocks[name], URL, URLSearchParams, AbortSignal, ...globals});
  return exports;
}
test('discovery forwards combined filters and page offsets with cancellation, and failures stay failures', async () => {
  let request, ok=true;
  const api = load('src/lib/creator-discovery.ts', {fetch:async (url, options) => { request={url,options}; return {ok,json:async()=>({items:[],total:0,offset:12,limit:12})}; }});
  const signal = new AbortController().signal;
  const filters={q:' camera & travel ',niche:' Technology ',location:' Mumbai ',network:'youtube'};
  const page=await api.discoverCreators(filters,12,signal);
  const query=new URL(request.url,'http://localhost').searchParams;
  assert.equal(query.get('q'),'camera & travel'); assert.equal(query.get('location'),'Mumbai');
  assert.equal(query.get('niche'),'Technology'); assert.equal(query.get('offset'),'12');
  assert.equal(query.get('network'),'youtube'); assert.equal(query.get('limit'),'12'); assert.equal(request.options.signal,signal);
  assert.equal(request.options.cache,'no-store'); assert.equal(page.total,0);
  assert.equal(new URLSearchParams(api.discoveryQuery({q:' ',niche:'',location:''})).has('q'),false);
  assert.equal(new URLSearchParams(api.discoveryQuery({q:'',niche:'',location:'',network:''})).has('network'),false);
  ok=false; await assert.rejects(api.discoverCreators(filters,0,signal),/retry/);
});
test('public gateway forwards only supported filters to a fixed API path and preserves backend errors', async () => {
  let url, options, status=422;
  const route=load('src/app/api/discovery/creators/route.ts', {fetch:async(u,o)=>{url=u;options=o;return {status,json:async()=>({detail:'invalid filter'})};}}, {
    'next/server':{NextResponse:{json:(data,options)=>({data,...options})}}, '@/lib/server/session':{API_URL:'http://backend/api/v1'},
  });
  const result=await route.GET(new Request('http://localhost/api/discovery/creators?q=hello&offset=12&network=instagram&min_audience=0&updated_within_days=7&redirect=http://evil.test'));
  assert.equal(url,'http://backend/api/v1/discovery/creators/page?q=hello&offset=12&network=instagram&min_audience=0&updated_within_days=7');
  assert.equal(result.status,422);assert.equal(options.cache,'no-store');
  assert.equal(result.headers['Cache-Control'],'no-store'); assert.equal(options.redirect,'error');
  status=200;assert.equal((await route.GET(new Request('http://localhost/api/discovery/creators'))).status,200);
});

test('audience filters require a network, preserve zero and validate ranges without coercion', () => {
  const api=load('src/lib/creator-discovery.ts',{});
  const base={q:'',niche:'',location:'',network:'youtube'};
  assert.match(api.validateAudienceFilters({...base,network:'',min_audience:'0'}),/Choose a network/);
  assert.equal(api.validateAudienceFilters({...base,min_audience:'0',max_audience:'0'}),null);
  for(const value of ['-1','2.5','1e3','NaN','1000000000001']) assert.match(api.validateAudienceFilters({...base,min_audience:value}),/whole audience/);
  assert.match(api.validateAudienceFilters({...base,min_audience:'100',max_audience:'99'}),/Minimum audience/);
  const query=new URLSearchParams(api.discoveryQuery({...base,min_audience:'0',max_audience:'5000',updated_within_days:'7'}));
  assert.equal(query.get('min_audience'),'0');assert.equal(query.get('max_audience'),'5000');assert.equal(query.get('updated_within_days'),'7');
  const cleared=new URLSearchParams(api.discoveryQuery({...base,network:'',min_audience:'100'}));
  assert.equal(cleared.has('min_audience'),false);
  assert.equal(api.audienceSavedDate(null),'Update date unavailable');
  assert.equal(api.audienceSavedDate('not-a-date'),'Update date unavailable');
  assert.match(api.audienceSavedDate('2026-11-19T00:00:00Z'),/19 Nov 2026/);
});
