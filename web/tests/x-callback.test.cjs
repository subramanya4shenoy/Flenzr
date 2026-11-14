const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load({ token = 'session-token', response = { ok: true }, fetch: upstream } = {}) {
  const exports = {};
  const calls = [];
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/api/social/x/callback/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, AbortSignal, fetch: upstream || (async (url, options) => { calls.push({ url, options }); return response; }), require: name => {
    if (name === 'next/server') return { NextResponse: { redirect: (url, status) => ({ url, status }) } };
    if (name === '@/lib/server/session') return { accessToken: async () => token, API_URL: 'https://backend.test/api/v1', requestOrigin: () => 'https://preview.test' };
    throw Error(name);
  } });
  return { api: exports, calls };
}
test('X callback forwards code and state to the authenticated owner backend', async () => {
  const { api, calls } = load();
  const result = await api.GET(new Request('https://preview.test/api/social/x/callback?code=provider-code&state=nonce'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer session-token');
  assert.deepEqual(JSON.parse(calls[0].options.body), { code: 'provider-code', state: 'nonce' });
  assert.equal(result.url.searchParams.get('x'), 'connected');
  assert.equal(result.url.hash, '#analytics');
  assert.equal(result.url.toString().includes('provider-code'), false);
});
test('missing sessions, cancelled consent and missing state never call the provider', async () => {
  for (const [options, query, expected] of [
    [{ token: null }, '?code=code&state=nonce', 'session_expired'],
    [{}, '?error=access_denied', 'cancelled'], [{}, '?code=code', 'expired'],
  ]) {
    const { api, calls } = load(options);
    const result = await api.GET(new Request('https://preview.test/api/social/x/callback' + query));
    assert.equal(calls.length, 0);
    assert.equal(result.url.searchParams.get('x'), expected);
  }
});
test('backend authorization failures redirect with a safe fixed message', async () => {
  const { api } = load({ response: { ok: false, json: async () => ({ error: { code: 'PERMISSION_DENIED', message: 'private upstream error' } }) } });
  const result = await api.GET(new Request('https://preview.test/api/social/x/callback?code=code&state=nonce'));
  assert.equal(result.url.searchParams.get('x'), 'account_mismatch');
  assert.equal(result.url.toString().includes('private'), false);
});


test('X reports scope and billing errors separately from user cancellation', async () => {
  for (const [providerError, expected] of [
    ['invalid_scope', 'permissions_unavailable'], ['access_denied', 'cancelled'], ['server_error', 'authorization_failed'],
  ]) {
    const { api, calls } = load();
    const result = await api.GET(new Request(`https://preview.test/api/social/x/callback?error=${providerError}&error_description=private-message`));
    assert.equal(result.url.searchParams.get('x'), expected);
    assert.equal(calls.length, 0);
    assert.equal(result.url.toString().includes('private-message'), false);
  }
  for (const [code, expected] of [
    ['X_NOT_CONFIGURED', 'not_configured'], ['X_FLOW_EXPIRED', 'expired'],
    ['X_PERMISSION_REQUIRED', 'permissions_unavailable'], ['X_BILLING_REQUIRED', 'service_unavailable'],
    ['X_RATE_LIMITED', 'rate_limited'], ['X_AUTHORIZATION_FAILED', 'authorization_failed'],
    ['X_CLIENT_CONFIGURATION', 'client_configuration'], ['X_API_ACCESS_REQUIRED', 'api_access_required'],
  ]) {
    const { api } = load({ response: { ok: false, json: async () => ({ error: { code, message: 'private-message' } }) } });
    const result = await api.GET(new Request('https://preview.test/api/social/x/callback?code=code&state=nonce'));
    assert.equal(result.url.searchParams.get('x'), expected);
    assert.equal(result.url.toString().includes('private-message'), false);
  }
});
