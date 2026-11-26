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
    if (name === 'react') return { cache: fn => fn };
    if (name === 'next/server') return { NextResponse: { json } };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'node:crypto') return require('node:crypto');
    if (name === '@/lib/server/public-image-cache') return load('src/lib/server/public-image-cache.ts');
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
      '@/components/creator/creator-account-context': { CreatorAccountProvider: 'CreatorAccountProvider' },
      '@/components/enquiries/enquiry-activity': { EnquiryActivityProvider: 'EnquiryActivityProvider' },
    }).default;
    await assert.rejects(layout({ children: 'private' }), /\/login/);
    current = { ...identity, active_roles: ['unrelated'] };
    await assert.rejects(layout({ children: 'private' }), /access-denied/);
    current.active_roles = [allowedRole];
    const rendered = await layout({ children: 'private' });
    if (workspace === 'creator') {
      assert.equal(rendered.props.ownerId, identity.user.id);
      assert.equal(rendered.props.children, 'private');
    } else {
      assert.equal(rendered.props.ownerId, identity.user.id);
      assert.equal(rendered.props.children, 'private');
    }
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
      '@/lib/server/youtube-public': { getYouTubePublicChannel: async () => { calls++; throw Error('Must not fetch'); } },
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

test('live enquiry bridge rejects cross-site and invalid sessions without opening sockets', async () => {
  let sockets = 0, current = null;
  const api = load('src/app/api/enquiries/live/route.ts', {}, {
    '@supabase/realtime-js': { RealtimeClient: class { constructor() { sockets++; } } },
    '@/lib/server/session': { currentIdentity: async () => current, accessToken: async () => undefined, requestOrigin: () => 'https://flenzr.test' },
  });
  assert.equal((await api.GET(new Request('https://flenzr.test/api/enquiries/live', { headers: { Origin: 'https://attacker.test' } }))).status, 403);
  assert.equal((await api.GET(new Request('https://flenzr.test/api/enquiries/live'))).status, 401);
  current = identity;
  assert.equal((await api.GET(new Request('https://flenzr.test/api/enquiries/live'))).status, 401);
  assert.equal(sockets, 0);
});

test('live bridge uses the verified account channel, sends only signals and releases sockets', async () => {
  let topic, config, listener, status, removed = 0, disconnected = 0, credential;
  const callbacks = new Map();
  class RealtimeClient {
    constructor(_url, options) { credential = options.accessToken(); }
    channel(name, options) { topic = name; config = options; return this; }
    on(_kind, _event, callback) { listener = callback; return this; }
    subscribe(callback) { status = callback; return this; }
    async removeAllChannels() { removed++; }
    async disconnect() { disconnected++; }
  }
  const api = load('src/app/api/enquiries/live/route.ts', {
    TextEncoder, ReadableStream,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key' } },
    setTimeout: f => { callbacks.set('lifetime', f); return 1; }, clearTimeout: () => callbacks.delete('lifetime'),
    setInterval: f => { callbacks.set('heartbeat', f); return 2; }, clearInterval: () => callbacks.delete('heartbeat'),
  }, {
    '@supabase/realtime-js': { RealtimeClient },
    '@/lib/server/session': { currentIdentity: async () => identity, accessToken: async () => 'http-only-session-token', requestOrigin: () => 'https://flenzr.test' },
  });
  const response = await api.GET(new Request('https://flenzr.test/api/enquiries/live?user=attacker'));
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  assert.equal(response.headers.get('cache-control'), 'no-store, no-transform');
  assert.equal(topic, 'enquiries:owner'); assert.equal(config.config.private, true);
  assert.equal(await credential, 'http-only-session-token');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /retry:/);
  status('SUBSCRIBED'); assert.equal(decoder.decode((await reader.read()).value), 'event: ready\ndata: {}\n\n');
  listener({ payload: { email: 'private@example.com', token: 'secret' } });
  assert.equal(decoder.decode((await reader.read()).value), 'event: changed\ndata: {}\n\n');
  await reader.cancel(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(removed, 1); assert.equal(disconnected, 1); assert.equal(callbacks.size, 0);
});

test('notification center and enquiry links require verified sessions; detail ownership stays with API', async () => {
  let current = null, status = 404, calls = 0;
  const apiSession = { currentIdentity: async () => current, accessToken: async () => 'server-token', API_URL: 'http://backend/api/v1' };
  const mocks = {
    'next/navigation': { redirect: path => { throw Error(path); }, notFound: () => { throw Error('not-found'); } },
    'next/link': 'Link', '@/lib/server/session': apiSession,
    '@/components/navigation/shared-page-navigation': { SharedPageNavigation: 'SharedPageNavigation' },
    '@/components/enquiries/enquiry-activity': { EnquiryActivityProvider: 'Activity' },
    '@/components/enquiries/enquiry-inbox': { EnquiryInbox: 'Inbox' },
    '@/components/notifications/notification-center': { NotificationCenter: 'Center', NotificationBell: 'Bell' },
  };
  const notifications = load('src/app/dashboard/notifications/page.tsx', {}, mocks).default;
  await assert.rejects(notifications(), /\/login\?next=/);
  current = identity;
  await assert.doesNotReject(notifications());
  current = null;
  const detail = load('src/app/dashboard/enquiries/[id]/page.tsx', {
    fetch: async (url, options) => {
      calls++; assert.equal(options.headers.Authorization, 'Bearer server-token');
      assert.equal(options.cache, 'no-store');
      return { status, ok: status === 200, json: async () => ({ viewer_role: 'brand' }) };
    },
  }, mocks).default;
  const params = { params: Promise.resolve({ id: '12345678-1234-1234-1234-123456789abc' }) };
  await assert.rejects(detail(params), /\/login\?next=/); assert.equal(calls, 0);
  current = identity;
  await assert.rejects(detail(params), /not-found/);
  status = 200;
  const page = await detail(params);
  function find(element, type) {
    if (!element || typeof element !== 'object') return;
    if (element.type === type) return element;
    const children = element.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) { const found = find(child, type); if (found) return found; }
  }
  assert.equal(find(page, 'Inbox').props.enquiryId, '12345678-1234-1234-1234-123456789abc');
  assert.equal(find(page, 'Inbox').props.view, 'sent');
  await assert.rejects(detail({ params: Promise.resolve({ id: '../identity' }) }), /not-found/);
});

test('account gateway preserves backend Retry-After without exposing credentials', async () => {
  const api = load('src/app/api/account/[...path]/route.ts', {
    fetch: async () => ({ status: 429, headers: new Headers({ 'Retry-After': '30' }), json: async () => ({ error: { message: 'Please wait.' } }) }),
  }, { '@/lib/server/session': { accessToken: async () => 'private', sameOrigin: () => true, API_URL: 'http://backend/api/v1' } });
  const response = await api.POST(request(), { params: Promise.resolve({ path: ['enquiries'] }) });
  assert.equal(response.status, 429); assert.equal(response.headers['Retry-After'], '30');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('collaboration notification login redirect preserves only allowed views', async()=>{
 const detail=load('src/app/dashboard/collaborations/[id]/page.tsx',{}, {
  '@/lib/server/session':{currentIdentity:async()=>null},
  '@/components/collaborations/collaborations':{SharedCollaborations:()=>null},
  'next/navigation':{redirect:target=>{throw Error(target);}},
 });
 for(const view of ['proposal','deliveries','proof','activity','https://attacker.test']){
  const target='/dashboard/collaborations/record'+(view.startsWith('https')?'':'?view='+view);
  await assert.rejects(()=>detail.default({params:Promise.resolve({id:'record'}),searchParams:Promise.resolve({view})}),error=>error.message==='/login?next='+encodeURIComponent(target));
 }
});
