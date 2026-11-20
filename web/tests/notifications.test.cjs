const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
test('notifications use the cookie gateway, no-store and useful failure messages', async () => {
  let called, status = 200;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/notifications.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, fetch: async (url, options) => { called = { url, options }; return { ok: status === 200, status, json: async () => 3 }; },
  });
  assert.equal(await exports.notificationRequest('/unread-count'), 3);
  assert.equal(called.url, '/api/account/notifications/unread-count');
  assert.equal(called.options.cache, 'no-store'); assert.equal(called.options.headers.Authorization, undefined);
  status = 401; await assert.rejects(exports.notificationRequest(''), /Sign in again/);
  status = 503; await assert.rejects(exports.notificationRequest('/one/read', { method: 'POST' }), /Please retry/);
  assert.equal(called.options.method, 'POST');
});
