const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function fixture() {
  let now = 0, next = 0;
  const timers = new Map(), sources = [], listeners = {};
  class Source {
    handlers = {}; closed = false;
    constructor(url) { assert.equal(url, '/api/enquiries/live'); sources.push(this); }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    close() { this.closed = true; }
    emit(name) { this.handlers[name]?.(); }
  }
  const document = { visibilityState: 'visible', addEventListener: (n, f) => listeners[n] = f, removeEventListener: n => delete listeners[n] };
  const schedule = (fn, delay, interval = false) => { const id = ++next; timers.set(id, { fn, at: now + delay, interval: interval ? delay : 0 }); return id; };
  const clear = id => timers.delete(id);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/enquiry-live.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, EventSource: Source, document, Date: { now: () => now }, Math: { random: () => 0 },
    setTimeout: (f, d) => schedule(f, d), clearTimeout: clear,
    setInterval: (f, d) => schedule(f, d, true), clearInterval: clear,
  });
  function advance(ms) {
    const target = now + ms;
    for (;;) {
      const entry = [...timers].filter(([, t]) => t.at <= target).sort((a,b) => a[1].at-b[1].at)[0];
      if (!entry) break;
      const [id,t] = entry; now = t.at;
      if (t.interval) t.at += t.interval; else timers.delete(id);
      t.fn();
    }
    now = target;
  }
  return { ...exports, sources, document, listeners, timers, advance };
}
test('subscription coalesces bursts, recovers missed state on ready, and cleans up', () => {
  const f = fixture(); let changes = 0, connected;
  const stop = f.subscribeEnquiryActivity(() => changes++, value => connected = value);
  f.sources[0].emit('ready'); assert.equal(connected, true);
  f.sources[0].emit('changed'); f.sources[0].emit('changed'); f.advance(150);
  assert.equal(changes, 1);
  f.sources[0].onerror(); assert.equal(connected, false); assert.equal(f.sources[0].closed, true);
  f.advance(10_000); assert.equal(f.sources.length, 2);
  f.sources[1].emit('ready'); f.advance(150); assert.equal(changes, 2);
  stop(); assert.equal(f.sources[1].closed, true); assert.equal(f.timers.size, 0);
});
test('hidden tabs release connections and returning to the tab reconnects', () => {
  const f = fixture(); let changes = 0;
  const stop = f.subscribeEnquiryActivity(() => changes++, () => {});
  f.document.visibilityState = 'hidden'; f.listeners.visibilitychange();
  assert.equal(f.sources[0].closed, true); f.advance(60_000); assert.equal(f.sources.length, 1);
  f.document.visibilityState = 'visible'; f.listeners.visibilitychange();
  assert.equal(f.sources.length, 2); f.sources[1].emit('ready'); f.advance(150); assert.equal(changes, 1);
  stop();
});
test('a silent broken connection restores fallback without waiting for a browser error', () => {
  const f = fixture(); let connected;
  const stop = f.subscribeEnquiryActivity(() => {}, value => connected = value);
  f.sources[0].emit('ready'); f.advance(30_000); f.sources[0].emit('heartbeat');
  assert.equal(connected, true); f.advance(60_000);
  assert.equal(connected, false); assert.equal(f.sources[0].closed, true);
  stop();
});

test('planned rotation reconnects promptly and late events from closed sockets are ignored', () => {
  const f = fixture(); let changes = 0, connected;
  const stop = f.subscribeEnquiryActivity(() => changes++, value => connected = value);
  const old = f.sources[0]; old.emit('ready'); f.advance(150);
  old.emit('rotate'); f.advance(0);
  assert.equal(f.sources.length, 2); assert.equal(old.closed, true);
  const current = f.sources[1]; current.emit('ready'); f.advance(150);
  assert.equal(connected, true); assert.equal(changes, 2);
  old.onerror(); old.emit('changed'); f.advance(150);
  assert.equal(current.closed, false); assert.equal(connected, true); assert.equal(changes, 2);
  stop(); current.emit('changed'); f.advance(150); assert.equal(changes, 2);
});
