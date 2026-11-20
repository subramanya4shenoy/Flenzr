/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(fetch) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/brand-profile.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, fetch, Error });
  return exports;
}
test('brand profile requests use owned cookie routes, trim input and never treat failed loads as missing profiles', async () => {
  let called, status = 200;
  const api = load(async (url, options) => { called = {url, options}; return {ok:status === 200, status, json:async () => ({name:'Saved'})}; });
  assert.equal((await api.brandProfileRequest('GET')).name, 'Saved');
  assert.equal(called.url, '/api/account/organizations/me');
  assert.equal(called.options.cache, 'no-store');
  assert.equal(called.options.headers.Authorization, undefined);
  await api.brandProfileRequest('PATCH', {name:' Brand ', website:''});
  assert.equal(called.options.method, 'PATCH');
  assert.deepEqual(JSON.parse(called.options.body), {name:'Brand', website:''});
  await api.brandProfileRequest('POST', {name:'New Brand'});
  assert.equal(called.url, '/api/account/organizations');
  status = 404; assert.equal(await api.brandProfileRequest('GET'), null);
  await assert.rejects(api.brandProfileRequest('PATCH', {}), /retry/);
  status = 401; await assert.rejects(api.brandProfileRequest('GET'), /Sign in again/);
  status = 403; await assert.rejects(api.brandProfileRequest('PATCH', {}), /brand owner/);
  status = 422; await assert.rejects(api.brandProfileRequest('PATCH', {}), /valid email/);
  status = 503; await assert.rejects(api.brandProfileRequest('GET'), /retry/);
});
test('legacy organizations without a profile get editable defaults without inventing company data', () => {
  const api = load();
  const fields = api.brandProfileFields({name:'Existing Brand', billing_email:'billing@example.com'});
  assert.equal(fields.company_name, 'Existing Brand');
  assert.equal(fields.website, '');
  assert.equal(fields.industry, '');
});
