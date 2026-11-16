const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, globals = {}, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Request, Response, URL, AbortSignal, Uint8Array,
    require: name => { if (name === 'node:crypto') return require('node:crypto'); if (name in mocks) return mocks[name]; throw Error(name); }, ...globals });
  return exports;
}
const { PublicImageCache } = load('src/lib/server/public-image-cache.ts');
const image = size => ({ bytes: new ArrayBuffer(size), contentType: 'image/png', etag: '"image"' });
test('image cache respects TTL, byte budget and least recently used eviction', () => {
  const cache = new PublicImageCache(8, 2, 100);
  cache.set('a', image(4), 0); cache.set('b', image(4), 0);
  assert.ok(cache.get('a', 1));
  cache.set('c', image(4), 2);
  assert.equal(cache.get('b', 3), null);
  assert.ok(cache.get('a', 3));
  assert.equal(cache.get('a', 100), null);
  cache.set('large', image(9), 4);
  assert.equal(cache.get('large', 5), null);
});
test('concurrent image loads share one upstream request; failed images are not cached', async () => {
  const cache = new PublicImageCache();
  let resolve, calls = 0;
  const loader = () => { calls++; return new Promise(r => { resolve = r; }); };
  const first = cache.load('same', loader), second = cache.load('same', loader);
  assert.equal(calls, 1); assert.equal(first, second);
  resolve(image(3)); await first;
  await cache.load('same', loader); assert.equal(calls, 1);
  await cache.load('failure', async () => { calls++; return null; });
  await cache.load('failure', async () => { calls++; return null; });
  assert.equal(calls, 3);
});
test('image proxy serves cached bytes and ETag 304s without redownloading from the provider', async () => {
  let calls = 0;
  const api = load('src/app/api/proxy-image/route.ts', { fetch: async () => {
    calls++; return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
  } }, { '@/lib/server/public-image-cache': { PublicImageCache } });
  const url = 'https://flenzr.test/api/proxy-image?url=https://pbs.twimg.com/avatar.png';
  const first = await api.GET(new Request(url));
  assert.equal(first.status, 200); assert.equal(calls, 1);
  assert.match(first.headers.get('cache-control'), /max-age=3600/);
  const etag = first.headers.get('etag'); assert.ok(etag);
  const second = await api.GET(new Request(url, { headers: { 'If-None-Match': etag } }));
  assert.equal(second.status, 304); assert.equal(await second.text(), ''); assert.equal(calls, 1);
  const third = await api.GET(new Request(url));
  assert.deepEqual([...new Uint8Array(await third.arrayBuffer())], [1, 2, 3]); assert.equal(calls, 1);
});
