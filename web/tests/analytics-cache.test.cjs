const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const account = { platform: 'youtube', handle: 'example', is_verified: true };
const stats = { platform: 'youtube', handle: 'example', isRealData: true, followers: 0, avatarUrl: '/api/proxy-image?url=photo' };
function storage() {
  const values = {};
  Object.defineProperties(values, {
    getItem: { value: key => values[key] ?? null },
    setItem: { value: (key, value) => { values[key] = value; } },
    removeItem: { value: key => { delete values[key]; } },
  });
  return values;
}
function harness(saved = storage()) {
  let now = 1000000, calls = 0;
  let upstream = async () => ({ ok: true, json: async () => stats });
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/analytics-cache.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, window: {}, localStorage: saved, Date: { now: () => now },
    fetch: (...args) => { calls++; return upstream(...args); } });
  return { ...exports, saved, calls: () => calls, advance: ms => { now += ms; }, setFetch: fn => { upstream = fn; } };
}
test('fresh stats and image URL survive remounts and reloads without another request', async () => {
  const h = harness();
  await h.loadAnalytics('owner', account);
  assert.equal(h.calls(), 1);
  assert.equal(h.readAnalyticsSnapshot('owner', account).data.followers, 0);
  await h.loadAnalytics('owner', account);
  assert.equal(h.calls(), 1);
  const reloaded = harness(h.saved);
  const result = await reloaded.loadAnalytics('owner', account);
  assert.equal(reloaded.calls(), 0);
  assert.equal(result.data.avatarUrl, stats.avatarUrl);
});
test('cached display data is isolated by authenticated owner, handle and connection revision', async () => {
  const h = harness();
  await h.loadAnalytics('first-owner', account);
  assert.equal(h.readAnalyticsSnapshot('second-owner', account), null);
  assert.equal(h.readAnalyticsSnapshot(null, account), null);
  assert.equal(h.readAnalyticsSnapshot('first-owner', { ...account, handle: 'different' }), null);
  assert.equal(h.readAnalyticsSnapshot('first-owner', { ...account, is_verified: false }), null);
  await h.loadAnalytics('second-owner', account);
  assert.equal(h.calls(), 2);
});
test('stale snapshots remain available for display, but refresh; X has a fifteen-minute interval', async () => {
  const h = harness();
  await h.loadAnalytics('owner', account);
  h.advance(300001);
  assert.ok(h.readAnalyticsSnapshot('owner', account));
  await h.loadAnalytics('owner', account);
  assert.equal(h.calls(), 2);
  assert.equal(h.analyticsFreshness('x'), 900000);
  h.advance(86400001);
  assert.equal(h.readAnalyticsSnapshot('owner', account), null);
});
test('duplicate in-flight requests are shared and explicit refresh bypasses only the client cache', async () => {
  const h = harness();
  let resolve;
  h.setFetch(() => new Promise(r => { resolve = r; }));
  const first = h.loadAnalytics('owner', account);
  const second = h.loadAnalytics('owner', account);
  assert.equal(first, second);
  assert.equal(h.calls(), 1);
  resolve({ ok: true, json: async () => stats });
  await first;
  h.setFetch(async () => ({ ok: true, json: async () => stats }));
  await h.loadAnalytics('owner', account, true);
  assert.equal(h.calls(), 2);
});
test('disconnect/reconnect invalidates the cache and late requests cannot restore it', async () => {
  const h = harness();
  await h.loadAnalytics('owner', account);
  h.invalidateAnalytics('owner', 'youtube', 'example');
  assert.equal(h.readAnalyticsSnapshot('owner', account), null);
  let resolve;
  h.setFetch(() => new Promise(r => { resolve = r; }));
  const late = h.loadAnalytics('owner', account);
  h.invalidateAnalytics('owner', 'youtube');
  resolve({ ok: true, json: async () => stats });
  await assert.rejects(late, /connection changed/);
  assert.equal(h.readAnalyticsSnapshot('owner', account), null);
});
test('connection denial discards cached stats; temporary service errors retain display data', async () => {
  const h = harness();
  await h.loadAnalytics('owner', account);
  h.setFetch(async () => ({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) }));
  await assert.rejects(h.loadAnalytics('owner', account, true), /Unavailable/);
  assert.ok(h.readAnalyticsSnapshot('owner', account));
  h.setFetch(async () => ({ ok: false, status: 409, json: async () => ({ error: 'Reconnect required' }) }));
  await assert.rejects(h.loadAnalytics('owner', account, true), e => e.discardCached === true);
  assert.equal(h.readAnalyticsSnapshot('owner', account), null);
});
test('unavailable browser storage never prevents a live request', async () => {
  const h = harness({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  assert.equal(h.readAnalyticsSnapshot('owner', account), null);
  assert.equal((await h.loadAnalytics('owner', account)).data.followers, 0);
});
