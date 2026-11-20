const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(relativePath, globals = {}, requireMock = require) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: requireMock, console, ...globals });
  return exports;
}
function storage(seed = {}) {
  const result = { ...seed };
  Object.defineProperties(result, {
    getItem: { value: (key) => result[key] ?? null },
    setItem: { value: (key, val) => { result[key] = String(val); } },
    removeItem: { value: (key) => { delete result[key]; } },
  });
  return result;
}

test('migration clears old users and balances once, preserving preferences and unrelated data', () => {
  const localStorage = storage({ flenzr_auth_session: 'old', flenzr_vault_available_balance: '185500', flenzr_avatar_old: 'old', flenzr_locale: 'kn', flenzr_theme: 'light', unrelated: 'keep' });
  const sessionStorage = storage({ flenzr_token: 'old', unrelated: 'keep' });
  const api = load('src/lib/local-data.ts', { localStorage, sessionStorage });
  api.migrateLocalData();
  assert.equal(localStorage.getItem('flenzr_auth_session'), null);
  assert.equal(localStorage.getItem('flenzr_vault_available_balance'), null);
  assert.equal(localStorage.getItem('flenzr_avatar_old'), null);
  assert.equal(localStorage.getItem('flenzr_locale'), 'kn');
  assert.equal(localStorage.getItem('flenzr_theme'), 'light');
  assert.equal(localStorage.getItem('unrelated'), 'keep');
  assert.equal(sessionStorage.getItem('flenzr_token'), null);
  localStorage.setItem('flenzr_creator_profile', 'new');
  api.migrateLocalData();
  assert.equal(localStorage.getItem('flenzr_creator_profile'), 'new');
});

test('account switches cannot inherit a previous creator’s local deals', () => {
  const localStorage = storage();
  const api = load('src/lib/local-data.ts', { localStorage, sessionStorage: storage() });
  api.selectLocalAccount('first@example.com');
  localStorage.setItem('flenzr_theme', 'light');
  localStorage.setItem('flenzr_collab_pipeline_deals', '[{"id":"first"}]');
  api.selectLocalAccount('FIRST@example.com');
  assert.notEqual(localStorage.getItem('flenzr_collab_pipeline_deals'), null);
  api.selectLocalAccount('second@example.com');
  assert.equal(localStorage.getItem('flenzr_collab_pipeline_deals'), null);
  assert.equal(localStorage.getItem('flenzr_theme'), 'light');
});

function enrichment(fetch, connection = { ok: false, status: 409, json: async () => ({ error: { code: "INSTAGRAM_CONNECTION_REQUIRED" } }) }) {
  return load('src/app/api/social/enrich/route.ts', { fetch: async (url, ...args) => String(url).startsWith('http://backend/') ? connection : fetch(url, ...args), AbortSignal, console: { warn() {}, error() {} } }, (name) => {
    if (name === '@/lib/server/youtube-public') return {};
    if (name === '@/lib/server/session') return { currentIdentity: async () => ({}), sameOrigin: () => true, accessToken: async () => 'token', API_URL: 'http://backend/api/v1' };
    assert.equal(name, 'next/server');
    return { NextResponse: { json: (data) => data } };
  });
}
test('offline enrichment has no invented audience, rates, or magic-code verification', async () => {
  const api = enrichment(async () => { throw Error('offline'); });
  const result = await api.POST({ json: async () => ({ platform: 'instagram', handle: 'fresh', verificationCode: 'FLENZR-TEST' }) });
  assert.equal(result.followers, 0);
  assert.equal(result.engagementRate, null);
  assert.equal(result.avgViews, null);
  assert.equal(result.isRealData, false);
  assert.equal(result.codeFoundInBio, false);
  assert.equal(result.suggestedRates.length, 0);
});
test('live public follower count does not invent engagement or views', async () => {
  const api = enrichment(async () => ({ ok: true, json: async () => ({ data: { user: { full_name: 'Fresh', edge_followed_by: { count: 0 } } } }) }));
  const result = await api.POST({ json: async () => ({ platform: 'instagram', handle: 'fresh' }) });
  assert.equal(result.followers, 0);
  assert.equal(result.engagementRate, null);
  assert.equal(result.avgViews, null);
  assert.equal(result.suggestedRates.length, 0);
});

test('connected Instagram stats use the owner API and the protected image proxy', async () => {
  const api = enrichment(async () => { throw Error('Must not scrape a connected account'); }, {
    ok: true, json: async () => ({ platform: 'instagram', handle: 'fresh', displayName: 'Fresh', followers: 0, following: 3, postCount: 7, source: 'instagram-api', connected: true, isRealData: true, thumbnailUrl: 'https://cdninstagram.com/avatar.jpg' }),
  });
  const result = await api.POST({ json: async () => ({ platform: 'instagram', handle: 'fresh' }) });
  assert.equal(result.followers, 0);
  assert.equal(result.following, 3);
  assert.equal(result.postCount, 7);
  assert.equal(result.source, 'instagram-api');
  assert.equal(result.connected, true);
  assert.equal(result.avatarUrl.startsWith('/api/proxy-image?'), true);
  assert.equal(result.thumbnailUrl, undefined);
  assert.equal(result.codeFoundInBio, false);
});
