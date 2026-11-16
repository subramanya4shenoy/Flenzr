const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function harness() {
  const entries = {};
  const storage = Object.defineProperties(entries, {
    getItem: { value: key => entries[key] || null },
    setItem: { value: (key, value) => { entries[key] = value; } },
    removeItem: { value: key => { delete entries[key]; } },
  });
  let calls = 0; const methods = []; let now = 1000000;
  const data = { platform: 'youtube', handle: 'example', status: 'ready', posts: [], total: 0, fetchedAt: now / 1000 };
  let upstream = async () => ({ ok: true, json: async () => ({ ...data, fetchedAt: now / 1000 }) });
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/recent-engagement.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, window: {}, localStorage: storage, Date: { now: () => now }, fetch: (...args) => { calls++; methods.push(args[1].method); return upstream(...args); } });
  return { ...exports, calls: () => calls, methods, advance: seconds => { now += seconds * 1000; }, fetch: fn => { upstream = fn; } };
}
const account = { platform: 'youtube', handle: 'example', is_verified: true, connected: true };
test('cached engagement is isolated by owner and connection revision', async () => {
  const h = harness();
  assert.equal((await h.loadRecentEngagement('a', account)).total, 0);
  await h.loadRecentEngagement('a', account);
  assert.equal(h.calls(), 2);
  assert.deepEqual(h.methods, ['GET', 'GET']);
  assert.equal(h.savedRecentEngagement('b', account), null);
  assert.equal(h.savedRecentEngagement('a', { ...account, connected: false }), null);
  h.advance(301);
  assert.equal(h.savedRecentEngagement('a', account).total, 0);
});
test('in-flight reads deduplicate and a reconnect rejects late results', async () => {
  const h = harness();
  let resolve;
  h.fetch(() => new Promise(r => { resolve = r; }));
  const first = h.loadRecentEngagement('a', account);
  const second = h.loadRecentEngagement('a', account);
  assert.equal(first, second);
  h.invalidateRecentEngagement('a', 'youtube');
  resolve({ ok: true, json: async () => ({ platform: 'youtube', handle: 'example', status: 'ready', posts: [], total: 5 }) });
  await assert.rejects(first, /connection changed/);
  assert.equal(h.savedRecentEngagement('a', account), null);
});
test('access denial discards the affected cached count', async () => {
  const h = harness();
  await h.loadRecentEngagement('a', account);
  h.fetch(async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Reconnect this account.' } }) }));
  await assert.rejects(h.loadRecentEngagement('a', account, true), /Reconnect/);
  assert.equal(h.savedRecentEngagement('a', account), null);
});
test('a response for a different account cannot enter the cache', async () => {
  const h = harness();
  h.fetch(async () => ({ ok: true, json: async () => ({ platform: 'youtube', handle: 'other', status: 'ready', posts: [], total: 42 }) }));
  await assert.rejects(h.loadRecentEngagement('a', account), /unavailable/);
  assert.equal(h.savedRecentEngagement('a', account), null);
});


test('only explicit refresh uses POST and normal saved reads use GET', async () => {
  const h = harness();
  await h.loadRecentEngagement('a', account);
  await h.loadRecentEngagement('a', account, true);
  assert.deepEqual(h.methods, ['GET', 'POST']);
});
test('never-refreshed server results clear obsolete browser snapshots', async () => {
  const h = harness();
  await h.loadRecentEngagement('a', account);
  h.fetch(async () => ({ ok: true, json: async () => ({ platform: 'youtube', handle: 'example', status: 'not_refreshed', posts: [], total: null }) }));
  assert.equal((await h.loadRecentEngagement('a', account)).status, 'not_refreshed');
  assert.equal(h.savedRecentEngagement('a', account), null);
});
