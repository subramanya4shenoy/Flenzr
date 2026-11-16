const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load({ token = 'session-token', response = { ok: true, json: async () => ({ connected: true }) }, fetch: upstream } = {}) {
  const exports = {};
  const calls = [];
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/api/social/facebook/callback/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, AbortSignal, fetch: upstream || (async (url, options) => { calls.push({ url, options }); return response; }), require: name => {
    if (name === 'next/server') return { NextResponse: { redirect: (url, status) => ({ url, status }) } };
    if (name === '@/lib/server/session') return { accessToken: async () => token, API_URL: 'https://backend.test/api/v1', requestOrigin: () => 'https://preview.test' };
    throw Error(name);
  } });
  return { api: exports, calls };
}
test('Facebook callback forwards code and state to the authenticated owner backend', async () => {
  const { api, calls } = load();
  const result = await api.GET(new Request('https://preview.test/api/social/facebook/callback?code=provider-code&state=nonce'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer session-token');
  assert.deepEqual(JSON.parse(calls[0].options.body), { code: 'provider-code', state: 'nonce' });
  assert.equal(result.url.searchParams.get('facebook'), 'connected');
  assert.equal(result.url.hash, '#analytics');
  assert.equal(result.url.toString().includes('provider-code'), false);
});
test('missing sessions, cancelled consent and missing state never call the provider', async () => {
  for (const [options, query, expected] of [
    [{ token: null }, '?code=code&state=nonce', 'session_expired'],
    [{}, '?error=access_denied', 'cancelled'], [{}, '?code=code', 'expired'],
  ]) {
    const { api, calls } = load(options);
    const result = await api.GET(new Request('https://preview.test/api/social/facebook/callback' + query));
    assert.equal(calls.length, 0);
    assert.equal(result.url.searchParams.get('facebook'), expected);
  }
});
test('backend authorization failures redirect with a safe fixed message', async () => {
  const { api } = load({ response: { ok: false, json: async () => ({ error: { code: 'PERMISSION_DENIED', message: 'private upstream error' } }) } });
  const result = await api.GET(new Request('https://preview.test/api/social/facebook/callback?code=code&state=nonce'));
  assert.equal(result.url.searchParams.get('facebook'), 'page_mismatch');
  assert.equal(result.url.toString().includes('private'), false);
});


test('multiple Pages redirect to selection and setup failures stay distinguishable', async () => {
  const { api } = load({ response: { ok: true, json: async () => ({ selectionRequired: true }) } });
  assert.equal((await api.GET(new Request('https://preview.test/api/social/facebook/callback?code=code&state=nonce'))).url.searchParams.get('facebook'), 'select_pages');
  for (const [code, expected] of [
    ['FACEBOOK_NOT_CONFIGURED', 'not_configured'], ['FACEBOOK_FLOW_EXPIRED', 'expired'],
    ['FACEBOOK_USER_LOGIN_REQUIRED', 'configuration_required'], ['FACEBOOK_PERMISSION_REQUIRED', 'permissions_required'],
    ['FACEBOOK_NO_PAGES', 'no_pages'], ['FACEBOOK_TOO_MANY_PAGES', 'too_many_pages'],
    ['FACEBOOK_RATE_LIMITED', 'rate_limited'], ['FACEBOOK_AUTHORIZATION_FAILED', 'authorization_failed'],
  ]) {
    const { api } = load({ response: { ok: false, json: async () => ({ error: { code, message: 'private-message' } }) } });
    const result = await api.GET(new Request('https://preview.test/api/social/facebook/callback?code=code&state=nonce'));
    assert.equal(result.url.searchParams.get('facebook'), expected);
    assert.equal(result.url.toString().includes('private-message'), false);
  }
});
