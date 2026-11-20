const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/components/theme/theme-bootstrap.ts', 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
function bootstrap(saved, initial = 'dark', blocked = false) {
 const root = { dataset: { theme: initial }, style: {}, classList: { toggle(name, enabled) { root.dark = enabled; } } };
 const meta = {};
 vm.runInNewContext(exportsObject.themeBootstrap, { document: { documentElement: root, querySelector: () => meta }, localStorage: { getItem() { if (blocked) throw Error('Blocked'); return saved; } } });
 return { root, meta };
}
test('saved light preference is applied before paint with native control and browser chrome colors', () => {
 const { root, meta } = bootstrap('light');
 assert.equal(root.dataset.theme, 'light'); assert.equal(root.dark, false);
 assert.equal(root.style.colorScheme, 'light'); assert.equal(meta.content, '#f5f6f9');
});
test('dark preference overrides a light server cookie', () => {
 const { root } = bootstrap('dark', 'light');
 assert.equal(root.dataset.theme, 'dark'); assert.equal(root.dark, true);
});
test('invalid saved values fall back to the validated server preference', () => {
 assert.equal(bootstrap('unexpected', 'light').root.dataset.theme, 'light');
 assert.equal(bootstrap(null).root.dataset.theme, 'dark');
});
test('blocked storage does not crash prepaint or erase the server theme', () => {
 assert.equal(bootstrap(null, 'light', true).root.dataset.theme, 'light');
});
