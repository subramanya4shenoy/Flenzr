const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(fetch) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/enquiries.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, fetch, Intl });
  return exports;
}
test('budgets preserve exact minor units and reject ambiguous amounts', () => {
  const api = load();
  assert.equal(api.enquiryCents('2400.50'), 240050);
  assert.equal(api.enquiryCents('1.05'), 105);
  assert.equal(api.enquiryCents(''), null);
  for (const value of ['0', '-1', '1e3', '1.005', '2,000', 'Infinity', '10000001']) assert.throws(() => api.enquiryCents(value));
  assert.equal(api.enquiryMoney(null, 'INR'), 'Budget to discuss');
  assert.match(api.enquiryMoney(250050, 'USD'), /2,500.50/);
});
test('enquiry calls stay same-origin, uncached and surface useful errors', async () => {
  let status = 401, called;
  const api = load(async (url, options) => { called = { url, options }; return { ok: status === 200, status, json: async () => status === 409 ? { error: { message: 'Refresh before responding.' } } : { id: 'saved' } }; });
  await assert.rejects(api.enquiryRequest('', { method: 'POST', body: '{}' }), /Sign in/);
  assert.equal(called.url, '/api/account/enquiries');
  assert.equal(called.options.cache, 'no-store');
  assert.equal(called.options.headers.Authorization, undefined);
  status = 409;
  await assert.rejects(api.enquiryRequest('/123/respond'), /Refresh before responding/);
  status = 200;
  assert.equal((await api.enquiryRequest('/me?view=sent')).id, 'saved');
});
