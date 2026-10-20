const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const path = require('node:path');

function harness() {
  const jar = new Map();
  const writes = [];
  const fetches = [];
  const saved = [];
  const control = { google: true, exchange: true, sync: true, identity: true, role: true, bio: '' };
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/server/google-auth.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const mocks = {
    'node:crypto': crypto,
    'next/headers': { cookies: async () => ({
      get: (key) => jar.has(key) ? { value: jar.get(key) } : undefined,
      set: (key, value, options) => { writes.push({ key, value, options }); if (options.maxAge === 0) jar.delete(key); else jar.set(key, value); },
    }) },
    'next/server': { NextResponse: {
      json: (data, options = {}) => ({ data, status: options.status ?? 200 }),
      redirect: (url, status) => ({ location: url.toString(), status }),
    } },
    './session': {
      API_URL: 'http://backend/api/v1',
      sameOrigin: (r) => r.headers.get('origin') === new URL(r.url).origin,
      requestOrigin: (r) => new URL(r.url).origin,
      identityForToken: async () => control.identity ? { user: { email: 'google@example.com' }, active_roles: ['creator'] } : null,
      hasRole: () => control.role,
      saveSession: async (...args) => saved.push(args),
    },
  };
  const fetch = async (url, options) => {
    fetches.push({ url, options });
    if (url.endsWith('/settings')) return { ok: true, json: async () => ({ external: { google: control.google } }) };
    if (url.includes('grant_type=pkce')) return { ok: control.exchange, json: async () => ({ access_token: 'verified-supabase-token', expires_in: 3600 }) };
    if (url.endsWith('/identity/sync')) return { ok: control.sync };
    if (url.endsWith('/creators/me')) return { ok: true, json: async () => ({ bio: control.bio }) };
    throw Error('Unexpected request');
  };
  vm.runInNewContext(code, { exports, require: (name) => { assert.ok(name in mocks, name); return mocks[name]; }, Buffer, URL, AbortSignal, fetch, Date, process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key' } } });
  const begin = (role = 'creator', signup = false) => exports.beginGoogle(new Request('https://app.test/api/auth/google', { method: 'POST', headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ role, signup }) }));
  const callback = async (start, stateOverride) => {
    const auth = new URL(start.data.url);
    const url = new URL(auth.searchParams.get('redirect_to'));
    url.searchParams.set('code', 'authorization-code');
    if (stateOverride) url.searchParams.set('app_state', stateOverride);
    return exports.completeGoogle(new Request(url));
  };
  return { ...exports, jar, writes, fetches, saved, control, begin, callback };
}

test('Google authorization uses S256 PKCE and a short-lived HttpOnly browser flow cookie', async () => {
  const h = harness();
  const start = await h.begin();
  assert.equal(start.status, 200);
  const auth = new URL(start.data.url);
  const flow = JSON.parse(h.jar.get('flenzr_google_flow'));
  assert.equal(auth.searchParams.get('provider'), 'google');
  assert.equal(auth.searchParams.get('code_challenge_method'), 's256');
  assert.equal(auth.searchParams.get('code_challenge'), crypto.createHash('sha256').update(flow.verifier).digest('base64url'));
  assert.equal(new URL(auth.searchParams.get('redirect_to')).searchParams.get('app_state'), flow.state);
  assert.equal(h.writes[0].options.httpOnly, true);
  assert.equal(h.writes[0].options.secure, true);
  assert.equal(h.writes[0].options.maxAge, 600);
  assert.equal(start.data.url.includes(flow.verifier), false);
});

test('disabled Google provider reports the configuration issue without creating a flow', async () => {
  const h = harness();
  h.control.google = false;
  const res = await h.begin();
  assert.equal(res.status, 503);
  assert.match(res.data.error, /disabled/);
  assert.equal(h.jar.size, 0);
});

test('cross-site attempts cannot initiate a Google login flow', async () => {
  const h = harness();
  const res = await h.beginGoogle(new Request('https://app.test/api/auth/google', { method: 'POST', headers: { Origin: 'https://attacker.test' }, body: '{}' }));
  assert.equal(res.status, 403);
  assert.equal(h.fetches.length, 0);
});

for (const mode of ['missing-cookie', 'wrong-state', 'expired', 'wrong-origin']) {
  test(`OAuth callback rejects ${mode} before token exchange`, async () => {
    const h = harness();
    const start = await h.begin();
    const flow = JSON.parse(h.jar.get('flenzr_google_flow'));
    if (mode === 'missing-cookie') h.jar.clear();
    if (mode === 'expired') flow.expiresAt = 0;
    if (mode === 'wrong-origin') flow.origin = 'https://other.test';
    if (mode !== 'missing-cookie') h.jar.set('flenzr_google_flow', JSON.stringify(flow));
    const result = await h.callback(start, mode === 'wrong-state' ? 'attacker-state' : undefined);
    assert.match(result.location, /auth_error=/);
    assert.equal(h.fetches.filter((r) => r.url.includes('grant_type=pkce')).length, 0);
    assert.equal(h.saved.length, 0);
  });
}

for (const failed of ['exchange', 'sync', 'identity', 'role']) {
  test(`failed ${failed} never establishes an application session`, async () => {
    const h = harness();
    h.control[failed] = false;
    const result = await h.callback(await h.begin());
    assert.match(result.location, /auth_error=/);
    assert.equal(h.saved.length, 0);
  });
}

for (const [role, bio, next] of [['creator', '', '/signup/creator'], ['creator', 'Existing media kit', '/dashboard/creator'], ['brand', '', '/dashboard/brand']]) {
  test(`verified ${role} with ${bio ? 'complete' : 'empty'} profile routes to ${next}`, async () => {
    const h = harness();
    h.control.bio = bio;
    const start = await h.begin(role);
    const flow = JSON.parse(h.jar.get('flenzr_google_flow'));
    const result = await h.callback(start);
    assert.equal(result.status, 303);
    assert.equal(new URL(result.location).pathname, '/auth/complete');
    assert.equal(new URL(result.location).searchParams.get('next'), next);
    assert.equal(h.saved[0][0], 'verified-supabase-token');
    assert.equal(result.location.includes('verified-supabase-token'), false);
    const exchange = h.fetches.find((r) => r.url.includes('grant_type=pkce'));
    assert.equal(JSON.parse(exchange.options.body).code_verifier, flow.verifier);
    assert.equal(h.jar.size, 0);
    assert.match((await h.callback(start)).location, /auth_error=/);
  });
}
