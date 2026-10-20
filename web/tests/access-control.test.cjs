const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const json = (data, options = {}) => ({ data, status: options.status ?? 200, headers: options.headers });
function load(file, globals = {}, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name in mocks) return mocks[name];
    if (name === 'next/server') return { NextResponse: { json } };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    throw Error(`Unexpected dependency ${name}`);
  }, URL, Request, Response, AbortSignal, Uint8Array, process: { env: {} }, console, ...globals });
  return exports;
}
const request = (body = {}, origin = 'https://flenzr.test') => new Request('https://flenzr.test/api/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const identity = { user: { id: 'owner', email: 'owner@example.com', is_active: true, is_superadmin: false }, active_roles: ['creator'] };

for (const [workspace, allowedRole] of [['creator', 'creator'], ['brand', 'brand_owner']]) {
  test(`${workspace} dashboard rejects missing sessions and wrong roles on the server`, async () => {
    let current = null;
    const layout = load(`src/app/dashboard/${workspace}/layout.tsx`, {}, {
      'next/navigation': { redirect: (path) => { throw Error(path); } },
      '@/lib/server/session': { currentIdentity: async () => current, hasRole: (i, role) => i.active_roles.includes(role) },
    }).default;
    await assert.rejects(layout({ children: 'private' }), /\/login/);
    current = { ...identity, active_roles: ['unrelated'] };
    await assert.rejects(layout({ children: 'private' }), /access-denied/);
    current.active_roles = [allowedRole];
    assert.equal(await layout({ children: 'private' }), 'private');
  });
}

test('sessions require backend validation and set only secure HttpOnly cookies', async () => {
  const writes = [];
  let token;
  let valid = false;
  const session = load('src/lib/server/session.ts', {
    process: { env: { NODE_ENV: 'production' } },
    fetch: async () => ({ ok: valid, json: async () => identity }),
  }, { 'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined, set: (...args) => writes.push(args) }) } });
  assert.equal(await session.currentIdentity(), null);
  token = 'forged';
  assert.equal(await session.currentIdentity(), null);
  valid = true;
  assert.equal((await session.currentIdentity()).user.id, 'owner');
  await session.saveSession('verified', 3600);
  assert.equal(writes[0][2].httpOnly, true);
  assert.equal(writes[0][2].secure, true);
  assert.equal(writes[0][2].sameSite, 'lax');
  assert.equal(session.sameOrigin(request({}, 'https://attacker.test')), false);
  assert.equal(session.sameOrigin(new Request('http://localhost:3107/api/auth/login', { method: 'POST', headers: { Host: '127.0.0.1:3107', Origin: 'http://127.0.0.1:3107' } })), true);
});

for (const file of ['src/app/api/account/[...path]/route.ts', 'src/app/api/social/verify-bio/route.ts', 'src/app/api/social/enrich/route.ts']) {
  test(`${file} rejects missing cookies and cross-site mutations before fetching`, async () => {
    let originAllowed = true;
    let calls = 0;
    const api = load(file, { fetch: async () => { calls++; throw Error('Must not fetch'); } }, {
      '@/lib/server/session': { accessToken: async () => undefined, currentIdentity: async () => null, sameOrigin: () => originAllowed },
    });
    assert.equal((await api.POST(request(), { params: Promise.resolve({ path: ['creators', 'me'] }) })).status, 401);
    originAllowed = false;
    assert.equal((await api.POST(request(), { params: Promise.resolve({ path: ['creators', 'me'] }) })).status, 403);
    assert.equal(calls, 0);
  });
}

test('account gateway strips tokens and rejects traversal', async () => {
  let options;
  const api = load('src/app/api/account/[...path]/route.ts', { fetch: async (_url, opts) => {
    options = opts;
    return { status: 201, json: async () => ({ creator: {}, access_token: 'private-token' }) };
  } }, { '@/lib/server/session': { accessToken: async () => 'verified', sameOrigin: () => true, API_URL: 'http://backend/api/v1' } });
  const response = await api.POST(request(), { params: Promise.resolve({ path: ['creators', 'onboard'] }) });
  assert.equal(response.data.access_token, undefined);
  assert.equal(options.headers.Authorization, 'Bearer verified');
  assert.equal((await api.GET(new Request('https://flenzr.test/api/account/path'), { params: Promise.resolve({ path: ['creators', '..', 'admin'] }) })).status, 404);
});

test('password login does not create sessions on bad credentials or wrong backend roles', async () => {
  let saved = 0;
  let credentialsValid = false;
  let roleValid = false;
  const api = load('src/lib/server/password-auth.ts', {
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://auth.example', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key' } },
    fetch: async (url) => url.includes('/auth/v1/') ? { ok: credentialsValid, json: async () => ({ access_token: 'provider-token', expires_in: 3600 }) } : { ok: true },
  }, { './session': { API_URL: 'http://backend/api/v1', sameOrigin: () => true, identityForToken: async () => identity, hasRole: () => roleValid, saveSession: async () => { saved++; } } });
  const body = { email: 'owner@example.com', password: 'password', role: 'brand' };
  assert.equal((await api.passwordAuth(request(body))).status, 401);
  assert.equal(saved, 0);
  credentialsValid = true;
  assert.equal((await api.passwordAuth(request(body))).status, 403);
  assert.equal(saved, 0);
  roleValid = true;
  const response = await api.passwordAuth(request(body));
  assert.equal(response.status, 200);
  assert.equal(response.data.access_token, undefined);
  assert.equal(saved, 1);
});

test('public avatar proxy rejects internal URLs, redirects, and executable responses', async () => {
  let calls = 0;
  let response = { ok: false, status: 302 };
  const api = load('src/app/api/proxy-image/route.ts', { fetch: async () => { calls++; return response; } });
  for (const url of ['http://127.0.0.1:8002/docs', 'https://169.254.169.254/', 'https://cdninstagram.com.attacker.test/image', 'https://user:pass@ytimg.com/image']) {
    assert.equal((await api.GET(new Request(`https://flenzr.test/api/proxy-image?url=${encodeURIComponent(url)}`))).status, 400);
  }
  assert.equal(calls, 0);
  let result = await api.GET(new Request('https://flenzr.test/api/proxy-image?url=https://i.ytimg.com/avatar'));
  assert.equal(result.headers.get('content-type'), 'image/svg+xml');
  response = { ok: true, headers: new Headers({ 'content-type': 'text/html' }) };
  result = await api.GET(new Request('https://flenzr.test/api/proxy-image?url=https://i.ytimg.com/avatar'));
  assert.equal(result.headers.get('content-type'), 'image/svg+xml');
});
