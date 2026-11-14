const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, globals = {}, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, AbortSignal, process: { env: { YOUTUBE_API_KEY: 'private-test-key' } }, require: name => {
    if (name === 'server-only') return {};
    if (name in mocks) return mocks[name];
    throw Error(`Unexpected dependency ${name}`);
  }, ...globals });
  return exports;
}
const helperPath = 'src/lib/server/youtube-public.ts';
const channel = (statistics) => ({ items: [{ id: 'UC-test-channel', snippet: { title: 'Test channel' }, statistics }] });
const ok = body => ({ ok: true, json: async () => body });

test('public stats resolve by handle, keep key server-side, cache, and do not grant ownership', async () => {
  let request;
  const api = load(helperPath, { fetch: async (url, options) => { request = { url, options }; return ok(channel({ subscriberCount: '1230', viewCount: '45000', videoCount: '17' })); } });
  const result = await api.getYouTubePublicChannel('@Example');
  assert.equal(request.url.searchParams.get('forHandle'), 'example');
  assert.equal(request.url.searchParams.get('part'), 'snippet,statistics');
  assert.equal(request.url.toString().includes('private-test-key'), false);
  assert.equal(request.options.headers['X-Goog-Api-Key'], 'private-test-key');
  assert.equal(request.options.next.revalidate, 300);
  assert.equal(result.followers, 1230);
  assert.equal(result.totalViews, 45000);
  assert.equal(result.videoCount, 17);
  assert.equal(result.apiVerified, false);
  assert.equal(result.codeFoundInBio, false);
  assert.equal(JSON.stringify(result).includes('private-test-key'), false);
});

test('hidden, missing and invalid counts stay unavailable while real zeroes stay zero', async () => {
  let stats = { hiddenSubscriberCount: true, subscriberCount: '500', viewCount: '0', videoCount: '0' };
  const api = load(helperPath, { fetch: async () => ok(channel(stats)) });
  let result = await api.getYouTubePublicChannel('example');
  assert.equal(result.followers, null);
  assert.equal(result.followersAvailable, false);
  assert.equal(result.totalViews, 0);
  assert.equal(result.videoCount, 0);
  stats = { subscriberCount: '-5', viewCount: 'unknown', videoCount: '9999999999999999999999' };
  result = await api.getYouTubePublicChannel('example');
  assert.equal(result.followers, null);
  assert.equal(result.totalViews, null);
  assert.equal(result.videoCount, null);
});

test('missing configuration fails before an upstream request', async () => {
  const api = load(helperPath, { process: { env: {} }, fetch: async () => { throw Error('Must not call'); } });
  await assert.rejects(api.getYouTubePublicChannel('example'), error => error.code === 'YOUTUBE_NOT_CONFIGURED');
});

test('quota and configuration failures never leak upstream error text or API key', async () => {
  let reason = 'quotaExceeded';
  const api = load(helperPath, { fetch: async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'private-test-key', errors: [{ reason }] } }) }) });
  await assert.rejects(api.getYouTubePublicChannel('example'), error => error.code === 'YOUTUBE_QUOTA_EXCEEDED' && !error.message.includes('private-test-key'));
  reason = 'accessNotConfigured';
  await assert.rejects(api.getYouTubePublicChannel('example'), error => error.code === 'YOUTUBE_CONFIGURATION_ERROR');
});

test('missing channels and network failures have explicit errors', async () => {
  let offline = false;
  const api = load(helperPath, { fetch: async () => { if (offline) throw Error('private-test-key'); return ok({ items: [] }); } });
  await assert.rejects(api.getYouTubePublicChannel('missing'), error => error.status === 404);
  offline = true;
  await assert.rejects(api.getYouTubePublicChannel('example'), error => error.code === 'YOUTUBE_UNAVAILABLE' && !error.message.includes('private-test-key'));
});

test('enrichment uses the public API and forwards useful configuration errors', async () => {
  const helper = load(helperPath, { process: { env: {} } });
  const route = load('src/app/api/social/enrich/route.ts', { fetch: async () => ({ ok: false, status: 409, json: async () => ({ error: { code: 'YOUTUBE_CONNECTION_REQUIRED' } }) }) }, {
    '@/lib/server/session': { sameOrigin: () => true, currentIdentity: async () => ({}), accessToken: async () => 'session', API_URL: 'https://backend.test/api/v1' },
    '@/lib/server/youtube-public': helper,
    'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status ?? 200 }) } },
  });
  const response = await route.POST({ json: async () => ({ platform: 'youtube', handle: 'example' }) });
  assert.equal(response.status, 503);
  assert.equal(response.data.code, 'YOUTUBE_NOT_CONFIGURED');
});

test('connected YouTube uses owner OAuth stats without a public API key', async () => {
  const route = load('src/app/api/social/enrich/route.ts', { fetch: async (url, options) => {
    assert.match(url, /creators\/me\/youtube\/stats\?handle=example/);
    assert.equal(options.headers.Authorization, 'Bearer session');
    return ok({ platform: 'youtube', handle: 'example', connected: true, isRealData: true, followers: 0, displayName: 'Example', thumbnailUrl: 'https://yt3.ggpht.com/avatar.jpg' });
  } }, {
    '@/lib/server/session': { sameOrigin: () => true, currentIdentity: async () => ({}), accessToken: async () => 'session', API_URL: 'https://backend.test/api/v1' },
    '@/lib/server/youtube-public': { getYouTubePublicChannel: async () => { throw Error('Must not fetch public stats'); } },
    'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status ?? 200 }) } },
  });
  const response = await route.POST({ json: async () => ({ platform: 'youtube', handle: 'example' }) });
  assert.equal(response.status, 200);
  assert.equal(response.data.connected, true);
  assert.equal(response.data.followers, 0);
  assert.match(response.data.avatarUrl, /^\/api\/proxy-image\?/);
  assert.equal(response.data.thumbnailUrl, undefined);
});
