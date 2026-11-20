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

test('delivery dates stay on the same calendar day across timezones', () => {
  const api = load();
  for (const timezone of ['America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Kolkata']) {
    const prior = process.env.TZ;
    try {
      process.env.TZ = timezone;
      assert.equal(api.enquiryDeliveryDate('2028-02-29'), '29 Feb 2028');
    } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
  }
  assert.equal(api.enquiryDeliveryDate(null), 'To discuss');
  assert.equal(api.enquiryDeliveryDate(undefined), 'To discuss');
});

test('preferred delivery date is optional, valid and today or later', () => {
  const api = load();
  const today = '2026-11-16';
  assert.equal(api.validateEnquiryDeliveryDate('', today), null);
  assert.equal(api.validateEnquiryDeliveryDate(today, today), today);
  assert.equal(api.validateEnquiryDeliveryDate('2028-02-29', today), '2028-02-29');
  assert.throws(() => api.validateEnquiryDeliveryDate('2026-11-15', today), /today or a later/);
  for (const value of ['2026-02-30', '2026-11-16T00:00:00Z', '20261116', '2026-1-1', '2027-02-29']) assert.throws(() => api.validateEnquiryDeliveryDate(value, today), /valid preferred delivery date/);
});

test('late read acknowledgements never replace newer replies or roll back read state', () => {
  const api = load();
  const old = { id: 'one', revision: 1, read_revision: 0, is_unread: true, brief: 'Original' };
  const acknowledged = { ...old, read_revision: 1, is_unread: false };
  assert.equal(api.mergeEnquiryRead(old, acknowledged).is_unread, false);
  const newer = { ...old, revision: 2, brief: 'New reply' };
  const merged = api.mergeEnquiryRead(newer, acknowledged);
  assert.equal(merged.revision, 2);
  assert.equal(merged.read_revision, 1);
  assert.equal(merged.is_unread, true);
  assert.equal(merged.brief, 'New reply');
  assert.equal(api.mergeEnquiryRead({ ...newer, read_revision: 2, is_unread: false }, acknowledged).is_unread, false);
  assert.equal(api.mergeEnquiryRead(old, { ...old, id: 'another' }), old);
});

test('rate limits carry a bounded retry countdown through headers or JSON details', async () => {
  let header = '30';
  const api = load(async () => ({ ok: false, status: 429, headers: { get: () => header }, json: async () => ({ error: {
    message: 'Please leave a short gap.', details: [{ retry_after_seconds: 60 }],
  } }) }));
  await assert.rejects(api.enquiryRequest('', { method: 'POST' }), error => {
    assert.equal(error.retryAfterSeconds, 30); assert.equal(error.message, 'Please leave a short gap.'); return true;
  });
  header = null;
  await assert.rejects(api.enquiryRequest(''), error => { assert.equal(error.retryAfterSeconds, 60); return true; });
  header = 'Infinity';
  await assert.rejects(api.enquiryRequest(''), error => { assert.equal(error.retryAfterSeconds, undefined); return true; });
  assert.equal(api.enquiryRetryLabel(29.2), '30s');
  assert.equal(api.enquiryRetryLabel(90), '1m 30s');
  assert.equal(api.enquiryRetryLabel(3661), '1h 1m');
  assert.equal(api.enquiryRetryLabel(-1), '0s');
});
