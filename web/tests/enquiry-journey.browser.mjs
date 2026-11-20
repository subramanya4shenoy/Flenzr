/** Isolated full UI journey. See docs/ENQUIRY-REGRESSION.md for setup. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const WEB = 'http://localhost:3211';
const API = 'http://127.0.0.1:8312/api/v1';
const fixture = JSON.parse(await fs.readFile('/tmp/flenzr-p05-regression-fixture.json', 'utf8'));
const version = await fetch('http://127.0.0.1:9333/json/version').then(r => r.json());
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(resolve => socket.onopen = resolve);
let sequence = 0;
const pending = new Map(), errors = [], contexts = [], failRead = new Set();
const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  pending.set(++sequence, { resolve, reject });
  socket.send(JSON.stringify({ id: sequence, method, params, ...(sessionId ? { sessionId } : {}) }));
});
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const waiter = pending.get(message.id); pending.delete(message.id);
    if (message.error) waiter.reject(Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  } else if (message.method === 'Fetch.requestPaused' && failRead.has(message.sessionId)) {
    failRead.delete(message.sessionId);
    void (async () => {
      await call('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 503,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ error: 'Simulated notification read failure' })).toString('base64') }, message.sessionId);
      await call('Fetch.disable', {}, message.sessionId);
    })().catch(error => errors.push(error.message));
  } else if (message.method === 'Runtime.exceptionThrown') {
    errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  }
};
async function api(role, path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(API + path, { method, headers: {
    Authorization: 'Bearer ' + fixture[role].token, 'Content-Type': 'application/json',
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
async function browser(role) {
  const { browserContextId } = await call('Target.createBrowserContext'); contexts.push(browserContextId);
  const { targetId } = await call('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => call(method, params, sessionId);
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*webpack-hmr*', 'https://*'] });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Network.setCookie', { name: 'flenzr_access', value: fixture[role].token, url: WEB,
    httpOnly: true, sameSite: 'Lax', path: '/' });
  // Only the transport signal is controlled: all UI requests use real cookie BFF,
  // role layouts, participant API, SQL persistence and validation on the test stack.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.p05Sources=[];window.EventSource=class{handlers={};constructor(){window.p05Sources.push(this)}addEventListener(n,f){this.handlers[n]=f}close(){}emit(n){this.handlers[n]?.()}}` });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (expression, label = expression, timeout = 60000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error(`${role}: timed out ${label}; ${await evaluate('document.body.innerText.slice(-1200)')}`);
  };
  const click = async text => {
    await until(`(()=>{const scope=document.querySelector('dialog[open]')||document;const b=[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});return b&&Object.keys(b).some(k=>k.startsWith('__reactProps'))})()`, `hydrated button ${text}`);
    return evaluate(`(()=>{const scope=document.querySelector('dialog[open]')||document;[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()})()`);
  };
  const fill = (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const go = async path => { await send('Page.bringToFront'); await send('Page.navigate', { url: WEB + path }); };
  const signal = () => evaluate(`window.p05Sources.at(-1)?.emit('changed')`);
  const failNextNotificationRead = async () => {
    failRead.add(sessionId);
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/account/notifications/*/read' }] });
  };
  return { send, evaluate, until, click, fill, go, signal, failNextNotificationRead };
}
async function submit(composer) {
  await composer.click('Send enquiry');
  await composer.until(`document.querySelector('dialog h2')?.textContent==='Enquiry sent'||document.querySelector('button[type=submit]')?.textContent.includes('Retry in')`, 'saved or cooldown');
  if (await composer.evaluate(`document.querySelector('button[type=submit]')?.textContent.includes('Retry in')`)) {
    await composer.until(`document.querySelector('button[type=submit]')?.disabled===false`, 'cooldown expiry', 35000);
    await composer.click('Send enquiry');
    await composer.until(`document.querySelector('dialog h2')?.textContent==='Enquiry sent'`, 'retry saved');
  }
}
try {
  const brand = await browser('brand'), creator = await browser('creator'), outsider = await browser('outsider');
  await creator.go('/dashboard/creator#pipeline');
  await creator.until(`document.querySelector('.fl-enquiries-empty')`, 'creator Collabs empty');
  await brand.go('/dashboard/brand'); await brand.until(`document.querySelector('.fl-notification-bell')`, 'brand workspace bell');
  await brand.go('/' + fixture.profile.handle);
  await brand.until(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Custom Offer');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps'))})()`, 'public media kit ready');
  assert.equal(await brand.evaluate(`document.cookie.includes('flenzr_access')`), false);
  await brand.click('Custom Offer'); await brand.until(`document.querySelector('dialog[open]')`);
  await brand.fill('input[placeholder="Your brand name"]', 'P05 launch brand');
  await brand.fill('input[placeholder="e.g. 1 Reel and 3 Stories"]', '1 original launch Reel');
  await brand.fill('input[placeholder="To discuss"]', '2400.50');
  await brand.fill('input[type=date]', fixture.delivery_date);
  await brand.fill('textarea', 'A launch campaign with one original video and one month organic usage.');
  await submit(brand);
  const first = (await api('brand', '/enquiries/me?view=sent')).data[0];
  assert.equal(first.preferred_delivery_date, fixture.delivery_date); assert.equal(first.amount_cents, 240050);
  await creator.send('Page.bringToFront'); await creator.signal();
  await creator.until(`document.querySelector('.fl-enquiry-card') && document.querySelector('.fl-notification-bell span')?.textContent==='1'`, 'new enquiry and bell');
  assert.equal((await api('creator', '/enquiries/unread-counts')).data.received, 1);
  console.log('PASS actual public composer → cookie gateway → saved deadline → creator inbox and notification');
  await creator.click('Open enquiry'); await creator.until(`!document.querySelector('.fl-enquiry-unread-label')`);
  await creator.click('Counter budget'); await creator.until(`document.querySelector('dialog[open]')`);
  await creator.fill('dialog input', '3000'); await creator.fill('dialog textarea', 'Includes the requested organic usage rights.'); await creator.click('Propose a budget');
  await creator.until(`!document.querySelector('dialog') && document.querySelector('.fl-enquiry-status')?.textContent==='Awaiting brand'`);
  await brand.go('/dashboard/notifications');
  await brand.until(`document.querySelector('.fl-notifications li h2')?.textContent.includes('New budget proposal')`, 'brand notification');
  await brand.until(`document.querySelector('.fl-notifications header p')?.textContent==='1 unread updates'`, 'brand notification count loaded');
  await brand.failNextNotificationRead(); await brand.click('Open enquiry');
  await brand.until(`document.querySelector('.fl-notifications [role=alert]')`, 'failed notification acknowledgement');
  await brand.until(`document.querySelector('.fl-notifications header p')?.textContent==='1 unread updates'`, 'failed read retains unread notification');
  assert.equal(await brand.evaluate(`location.pathname`), '/dashboard/notifications');
  await brand.click('Open enquiry'); await brand.until(`location.pathname.endsWith(${JSON.stringify('/' + first.id)}) && document.querySelector('.fl-enquiry-card')`, 'protected exact enquiry link');
  await brand.click('Open enquiry'); await brand.click('Accept'); await brand.until(`document.querySelector('dialog[open]')`); await brand.click('Accept enquiry');
  await brand.until(`!document.querySelector('dialog') && document.querySelector('.fl-enquiry-status')?.textContent==='Accepted'`);
  await brand.send('Page.reload'); await brand.until(`document.querySelector('.fl-enquiry-status')?.textContent==='Accepted'`);
  await brand.click('Open enquiry'); await brand.evaluate(`document.querySelector('details').open=true`);
  assert.equal(await brand.evaluate(`document.querySelectorAll('.fl-enquiry-history li').length`), 3);
  assert.equal(await brand.evaluate(`document.querySelector('.fl-enquiry-delivery').textContent.includes('requested')||document.querySelector('.fl-enquiry-delivery').textContent.includes('Requested')`), true);
  const replay = await api('brand', '/enquiries', { request_id: randomUUID(), creator_handle: fixture.profile.handle,
    brand_name: 'P05 launch brand', brief: 'A launch campaign with one original video and one month organic usage.',
    deliverable: '1 original launch Reel', amount_cents: 240050, currency: 'INR', preferred_delivery_date: fixture.delivery_date });
  assert.equal(replay.status, 429); assert.equal(replay.data.error.code, 'ENQUIRY_DUPLICATE');
  console.log('PASS creator counter → brand notification/deep link → accept → reload/history; duplicate original stays blocked');
  await outsider.go('/dashboard/enquiries/' + first.id);
  await outsider.until(`document.body.innerText.includes('404')`, 'stranger cannot read deep link');
  assert.equal((await api('outsider', '/enquiries/' + first.id)).status, 404);
  assert.equal((await api('outsider', '/notifications')).data.length, 0);
  assert.equal((await api('outsider', '/enquiries/' + first.id + '/withdraw', { expected_revision: 3 })).status, 404);
  console.log('PASS independent outsider session cannot read, withdraw or see another account’s notifications');
  await brand.go('/' + fixture.profile.handle); await brand.until(`document.body.innerText.includes('P05 product Reel')`);
  await brand.click('Send enquiry'); await brand.until(`document.querySelector('dialog[open]')`);
  await brand.fill('input[placeholder="Your brand name"]', 'P05 package brand');
  await brand.fill('input[type=date]', fixture.delivery_date);
  await brand.fill('textarea', 'A second campaign using the saved product Reel package and deadline.');
  await submit(brand);
  const second = (await api('brand', '/enquiries/me?view=sent')).data[0];
  assert.equal(second.rate_card_id, fixture.package.id); assert.equal(second.amount_cents, 250000);
  await creator.go('/dashboard/enquiries/' + second.id); await creator.until(`document.querySelector('.fl-enquiry-card')`);
  await creator.click('Open enquiry'); await creator.click('Accept'); await creator.until(`document.querySelector('dialog[open]')`);
  await brand.go('/dashboard/enquiries/' + second.id); await brand.until(`document.querySelector('.fl-enquiry-card')`);
  await brand.click('Open enquiry'); await brand.click('Withdraw enquiry'); await brand.until(`document.querySelector('dialog[open]')`);
  await brand.click('Keep enquiry'); assert.equal((await api('brand', '/enquiries/' + second.id)).data.status, 'pending');
  await brand.click('Withdraw enquiry'); await brand.until(`document.querySelector('dialog[open]')`);
  await brand.fill('dialog textarea', 'Campaign postponed.'); await brand.click('Withdraw enquiry');
  await brand.until(`document.querySelector('.fl-enquiry-status')?.textContent==='Withdrawn'`);
  await creator.send('Page.bringToFront'); await creator.click('Accept enquiry'); await creator.until(`document.querySelector('dialog [role=alert]')`, 'stale creator decision rejected');
  await creator.click('Cancel'); await creator.signal(); await creator.until(`document.querySelector('.fl-enquiry-status')?.textContent==='Withdrawn'`);
  await creator.send('Page.reload'); await creator.until(`document.querySelector('.fl-enquiry-status')?.textContent==='Withdrawn'`);
  await creator.click('Open enquiry'); await creator.until(`!document.querySelector('.fl-enquiry-unread-label')`);
  assert.equal((await api('creator', '/enquiries/' + second.id)).data.history.at(-1).note, 'Campaign postponed.');
  console.log('PASS package snapshot/deadline → cancelled confirmation → withdrawal → stale acceptance conflict → reload');
  await creator.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await creator.evaluate(`document.documentElement.scrollWidth>visualViewport.width`), false);
  await fs.writeFile('/tmp/flenzr-p05-creator-mobile.png', Buffer.from((await creator.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await creator.go('/dashboard/notifications'); await creator.until(`document.querySelectorAll('.fl-notifications li').length>=3`);
  assert.equal(await creator.evaluate(`document.documentElement.scrollWidth>visualViewport.width`), false);
  const latest = (await api('creator', '/enquiries/' + second.id)).data;
  assert.equal(latest.revision, 2); assert.equal(latest.preferred_delivery_date, fixture.delivery_date);
  assert.equal(latest.history.length, 2); assert.deepEqual(errors, []);
  console.log('PASS mobile enquiry/notification layouts, read state, exact deadline and no browser exceptions');
  await fs.writeFile('/tmp/flenzr-p05-browser-result.json', JSON.stringify({ passed: true, first: first.id, second: second.id, exceptions: errors }));
} finally {
  for (const browserContextId of contexts) await call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  await call('Browser.close').catch(() => {}); socket.close();
}
