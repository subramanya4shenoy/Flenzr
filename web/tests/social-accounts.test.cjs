const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(fetch = async () => {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/social-accounts.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, fetch, Date, URL, ...globals });
  return exports;
}
const old = { id: 'old', platform: 'instagram', handle: 'mistake', url: 'https://instagram.com/mistake', isVerified: true, avatarUrl: 'old-avatar', createdAt: 1 };
test('server list removes cached accounts and stale verification', () => {
  const api = load();
  assert.equal(api.mergeSocialAccounts([], [old]).length, 0);
  const [edited] = api.mergeSocialAccounts([{ platform: 'instagram', handle: 'correct', is_verified: false }], [old]);
  assert.equal(edited.handle, 'correct');
  assert.equal(edited.isVerified, false);
  assert.equal(edited.avatarUrl, undefined);
});
test('late avatar lookup cannot restore removed or edited accounts', () => {
  const api = load();
  assert.equal(api.mergeSocialAvatars([], [old]).length, 0);
  const corrected = { ...old, handle: 'correct', avatarUrl: undefined, isVerified: false };
  assert.equal(api.mergeSocialAvatars([corrected], [old])[0].avatarUrl, undefined);
});
test('cached metadata cannot grant verification to an unverified server account', () => {
  const api = load();
  const [account] = api.mergeSocialAccounts([{ platform: 'instagram', handle: 'mistake', is_verified: false }], [old]);
  assert.equal(account.isVerified, false);
  assert.equal(account.avatarUrl, 'old-avatar');
});
test('edits/deletions carry expected handles and report persistence failures', async () => {
  const requests = [];
  let ok = true;
  const api = load(async (url, options) => {
    requests.push({ url, options });
    return { ok, json: async () => ok ? [] : { error: { message: 'Account changed' } } };
  });
  await api.saveSocialAccount('instagram', 'correct', 'mistake');
  assert.deepEqual(JSON.parse(requests[0].options.body), { handle: 'correct', expected_handle: 'mistake' });
  await api.deleteSocialAccount('instagram', 'correct');
  assert.match(requests[1].url, /expected_handle=correct/);
  assert.equal(requests[1].options.method, 'DELETE');
  ok = false;
  await assert.rejects(api.deleteSocialAccount('instagram', 'correct'), /Account changed/);
});
test('multiple accounts on one platform have distinct row identities', () => {
  const accounts = load().mergeSocialAccounts([
    { platform: 'instagram', handle: 'first', is_verified: true },
    { platform: 'instagram', handle: 'second', is_verified: false },
  ], []);
  assert.notEqual(accounts[0].id, accounts[1].id);
  assert.equal(accounts[0].isVerified, true);
  assert.equal(accounts[1].isVerified, false);
});

test('YouTube connection discovers channel without saving a manual username', async () => {
  let request, destination;
  const api = load(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ callbackOrigin: 'http://localhost:3210', url: 'https://accounts.google.com/o/oauth2/v2/auth?state=nonce' }) };
  }, { window: { location: { origin: 'http://localhost:3210', assign: value => { destination = value; } } } });
  await api.connectYouTube();
  assert.equal(request.url, '/api/account/creators/me/youtube/connect');
  assert.deepEqual(JSON.parse(request.options.body), {});
  assert.equal(new URL(destination).hostname, 'accounts.google.com');
  await api.connectYouTube('existing');
  assert.deepEqual(JSON.parse(request.options.body), { handle: 'existing' });
});
test('YouTube connection refuses foreign destinations and reports provider setup errors', async () => {
  let data = { callbackOrigin: 'http://localhost:3210', url: 'https://attacker.example/' };
  let ok = true;
  const api = load(async () => ({ ok, json: async () => data }), { window: { location: { origin: 'http://localhost:3210', assign: () => { throw Error('Must not redirect'); } } } });
  await assert.rejects(api.connectYouTube(), /Could not connect YouTube/);
  data = { callbackOrigin: 'https://other.test', url: 'https://accounts.google.com/o/oauth2/v2/auth' };
  await assert.rejects(api.connectYouTube(), /Open Flenzr/);
  ok = false;
  data = { error: { message: 'YouTube connection is not configured yet.' } };
  await assert.rejects(api.connectYouTube(), /not configured/);
});

test('Instagram connect starts OAuth without username entry or bio verification', async () => {
  let request, destination;
  const api = load(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ callbackOrigin: 'https://preview.test', url: 'https://www.facebook.com/dialog/oauth?state=nonce&config_id=123' }) };
  }, { window: { location: { origin: 'https://preview.test', assign: value => { destination = value; } } } });
  await api.connectInstagram();
  assert.equal(request.url, '/api/account/creators/me/instagram/connect');
  assert.deepEqual(JSON.parse(request.options.body), {});
  assert.equal(new URL(destination).hostname, 'www.facebook.com');
  await api.connectInstagram('existing');
  assert.deepEqual(JSON.parse(request.options.body), { handle: 'existing' });
  await api.connectInstagram(undefined, '17841433090704381');
  assert.deepEqual(JSON.parse(request.options.body), { account_id: '17841433090704381' });
});
test('Instagram connection rejects foreign authorization URLs', async () => {
  const api = load(async () => ({ ok: true, json: async () => ({ callbackOrigin: 'https://preview.test', url: 'https://attacker.example/dialog/oauth' }) }), { window: { location: { origin: 'https://preview.test', assign: () => { throw Error('Must not redirect'); } } } });
  await assert.rejects(api.connectInstagram(), /Could not connect Instagram/);
});


test('LinkedIn imports server profile metadata without inventing a public vanity URL', () => {
  const api = load();
  const [account] = api.mergeSocialAccounts([{
    platform: 'linkedin', handle: 'li-opaque', is_verified: false,
    display_name: 'Example Member', avatar_url: '/api/proxy-image?url=photo', connected: true,
  }], []);
  assert.equal(account.displayName, 'Example Member');
  assert.equal(account.avatarUrl, '/api/proxy-image?url=photo');
  assert.equal(account.url, '');
  assert.equal(account.isConnected, true);
  assert.equal(account.isVerified, false);
  const [disconnected] = api.mergeSocialAccounts([{
    platform: 'linkedin', handle: 'li-opaque', is_verified: false,
    display_name: 'Example Member', connected: false,
  }], [account]);
  assert.equal(disconnected.isConnected, false);
});

test('LinkedIn connection validates the provider URL and browser callback origin', async () => {
  for (const [url, callbackOrigin, expected] of [
    ['https://www.linkedin.com/oauth/v2/authorization?state=nonce', 'https://preview.test', true],
    ['https://attacker.test/oauth/v2/authorization', 'https://preview.test', false],
    ['https://www.linkedin.com/other', 'https://preview.test', false],
    ['https://www.linkedin.com/oauth/v2/authorization', 'https://other.test', false],
  ]) {
    let destination;
    const api = load(async () => ({ ok: true, json: async () => ({ url, callbackOrigin }) }), {
      window: { location: { origin: 'https://preview.test', assign: value => { destination = value; } } },
    });
    if (expected) { await api.connectLinkedIn(); assert.equal(destination, url); }
    else { await assert.rejects(api.connectLinkedIn()); assert.equal(destination, undefined); }
  }
});


test('X connect starts without manual username and validates callback origin and provider URL', async () => {
  for (const [url, callbackOrigin, expected] of [
    ['https://x.com/i/oauth2/authorize?state=nonce', 'https://preview.test', true],
    ['https://attacker.test/i/oauth2/authorize', 'https://preview.test', false],
    ['https://x.com/other', 'https://preview.test', false],
    ['https://x.com/i/oauth2/authorize', 'https://other.test', false],
  ]) {
    let destination, body;
    const connected = load(async (requestUrl, options) => {
      assert.equal(requestUrl, '/api/account/creators/me/x/connect');
      body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ url, callbackOrigin }) };
    }, { window: { location: { origin: 'https://preview.test', assign: value => { destination = value; } } } });
    if (expected) { await connected.connectX(); assert.deepEqual(body, {}); assert.equal(destination, url); }
    else { await assert.rejects(connected.connectX()); assert.equal(destination, undefined); }
  }
});


test('Facebook Pages connection discovers Pages without a manual handle and pins the OAuth destination', async () => {
  let request, destination;
  let data = { callbackOrigin: 'https://preview.test', url: 'https://www.facebook.com/dialog/oauth?config_id=123' };
  const api = load(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => data };
  }, { window: { location: { origin: 'https://preview.test', assign: value => { destination = value; } } } });
  await api.connectFacebook();
  assert.equal(request.url, '/api/account/creators/me/facebook/connect');
  assert.deepEqual(JSON.parse(request.options.body), {});
  assert.equal(new URL(destination).hostname, 'www.facebook.com');
  await api.connectFacebook('101');
  assert.deepEqual(JSON.parse(request.options.body), { handle: '101' });
  assert.equal(api.socialUrl('facebook', '101'), 'https://www.facebook.com/101');
  data = { ...data, url: 'https://attacker.example/dialog/oauth' };
  await assert.rejects(api.connectFacebook(), /Could not connect Facebook Pages/);
  data = { ...data, callbackOrigin: 'https://another.test' };
  await assert.rejects(api.connectFacebook(), /Open Flenzr/);
});
