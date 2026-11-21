const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function loadPatterns() {
  const output = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/offer-ticket-pattern.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText, { exports: output });
  return output;
}
test('existing offer artwork stays fixed across fresh renders and sessions', () => {
  const fixtures = {
    '872d93ca': 'radiance',
    '11111111-1111-4111-8111-111111111111': 'shift',
    '22222222-2222-4222-8222-222222222222': 'echo',
  };
  for (const api of [loadPatterns(), loadPatterns()]) {
    for (const [id, expected] of Object.entries(fixtures)) assert.equal(api.offerTicketPattern(id), expected);
  }
});
test('all stable assignment slots resolve to the new complete SVG backgrounds', () => {
  const api = loadPatterns();
  const seen = new Set(Array.from({ length: 120 }, (_, index) => api.offerTicketPattern(`offer-${index}`)));
  assert.equal(seen.size, 6);
  const artwork = new Set();
  for (const pattern of api.offerTicketPatterns) {
    assert.ok(seen.has(pattern));
    const name = api.offerTicketArtwork[pattern];
    artwork.add(name);
    const svg = fs.readFileSync(path.join(__dirname, '../public/offer-patterns', `${name}.svg`), 'utf8');
    assert.ok(svg.includes('viewBox="0 0 400 280"'));
    assert.ok(!svg.includes('<image'), `${name}: artwork is vector content, not an embedded bitmap`);
    assert.ok(svg.includes('width="400" height="280"'), `${name}: texture covers the full canvas`);
  }
  assert.equal(artwork.size, 5);
  assert.equal(api.offerTicketArtwork['echo'], 'iridescent-silk');
});
