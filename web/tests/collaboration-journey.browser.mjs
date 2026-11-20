/** Full collaboration journey; isolated stack setup: docs/COLLABORATION-JOURNEY.md. */
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
        body: Buffer.from(JSON.stringify({ error: 'Simulated journey response failure' })).toString('base64') }, message.sessionId);
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
  await send('Network.setBlockedURLs', { urls: ['*webpack-hmr*'] });
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
  return { sessionId, send, evaluate, until, click, fill, go, signal, failNextNotificationRead };
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
const checkpoint = text => console.log('PASS ' + text);
try {
  const brand = await browser('brand'), creator = await browser('creator'), outsider = await browser('outsider');
  await brand.go('/' + fixture.profile.handle);
  await brand.click('Custom Offer');
  await brand.fill('input[placeholder="Your brand name"]', 'Journey brand');
  await brand.fill('input[placeholder="e.g. 1 Reel and 3 Stories"]', 'One original launch Reel');
  await brand.fill('input[placeholder="To discuss"]', '2400.50');
  await brand.fill('input[type=date]', fixture.delivery_date);
  await brand.fill('textarea', 'An original launch video with organic usage for thirty days.');
  await submit(brand);
  const enquiry = (await api('brand', '/enquiries/me?view=sent')).data[0];
  assert.equal(enquiry.amount_cents, 240050);
  await creator.go('/dashboard/enquiries/' + enquiry.id);
  await creator.click('Open enquiry'); await creator.click('Accept'); await creator.click('Accept enquiry');
  await creator.until("document.querySelector('.fl-enquiry-status')?.innerText==='Accepted'");
  await brand.go('/dashboard/enquiries/' + enquiry.id);
  await brand.click('Start collaboration'); await brand.click('Start collaboration');
  await brand.until("document.querySelector('.fl-shared-detail')");
  const id = (await brand.evaluate('location.pathname')).split('/').at(-1), base = '/collaborations/' + id;
  await creator.go('/dashboard/collaborations/' + id);
  await creator.until("document.querySelector('.fl-message-history')");
  await brand.fill('[name=message-text]', 'Please include captions in the preview.'); await brand.click('Send message');
  await brand.until("document.querySelector('.fl-message-history')?.innerText.includes('include captions')");
  await creator.click('Refresh messages'); await creator.until("document.querySelector('.fl-message-history')?.innerText.includes('include captions')");
  checkpoint('public offer → accepted enquiry → shared collaboration and private conversation');

  await brand.click('Draft proposal');
  await brand.fill('[name=proposal-price]', '2400.50');
  await brand.fill('[name=proposal-deliverables]', 'One original Reel with captions');
  await brand.fill('[name=proposal-date]', fixture.delivery_date);
  await brand.fill('[name=proposal-revision-limit]', '1');
  await brand.fill('[name=proposal-rights]', 'Organic reposting for thirty days.');
  await brand.click('Save private draft'); await brand.until("document.querySelector('.fl-proposal-draft')");
  await brand.click('Review & send'); await brand.click('Send proposal');
  await brand.until("document.querySelector('.fl-agreement')?.innerText.includes('Acceptance · Version 1')");
  await creator.click('Refresh proposals'); await creator.until("document.querySelector('.fl-agreement')?.innerText.includes('Acceptance · Version 1')");
  await creator.click('Draft a revision'); await creator.fill('[name=proposal-price]', '2500');
  await creator.click('Save private draft'); await creator.until("document.querySelector('.fl-proposal-draft')");
  await creator.click('Review & send'); await creator.click('Send proposal');
  await creator.until("document.querySelector('.fl-agreement')?.innerText.includes('Acceptance · Version 2')");
  await brand.click('Refresh proposals'); await brand.until("document.querySelector('.fl-agreement')?.innerText.includes('Acceptance · Version 2')");
  for (const participant of [brand, creator]) {
    await participant.click('Review & accept version 2');
    await participant.until("document.querySelector('[name=confirm-proposal-acceptance]')");
    await participant.evaluate("document.querySelector('[name=confirm-proposal-acceptance]').click()");
    await participant.click('Accept version 2');
    await participant.until("!document.querySelector('dialog[open]')");
  }
  await brand.click('Refresh proposals');
  await brand.until("document.querySelector('.fl-agreement')?.innerText.includes('Agreement saved · Version 2')");
  const agreement = (await api('brand', base + '/agreement')).data;
  assert.equal(agreement.snapshot.terms.amount_cents, 250000); assert.equal(agreement.snapshot.terms.revision_limit, 1);
  const calendar = (await api('creator', '/collaborations/calendar?month=' + fixture.delivery_date.slice(0,7))).data;
  assert.equal(calendar.items.find(row => row.collaboration_id === id).delivery_date, fixture.delivery_date);
  checkpoint('private proposal → creator counteroffer → mutual agreement and real calendar deadline');

  await creator.click('Refresh deliveries'); await creator.click('New delivery submission');
  await creator.until("document.querySelector('input[type=file]')&&!document.querySelector('input[type=file]').disabled");
  await creator.fill('[name=delivery-title]', 'Captioned first preview');
  await creator.evaluate(`(()=>{const file=new File(['%PDF-1.4\\nJourney creative preview\\n%%EOF\\n'],'journey-preview.pdf',{type:'application/pdf'});const files=new DataTransfer();files.items.add(file);const input=document.querySelector('input[type=file]');input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await creator.until("document.querySelector('.fl-delivery-files input[type=checkbox]')?.checked", 'real Supabase upload verified');
  await creator.click('Review delivery'); await creator.click('Submit delivery');
  await creator.until("document.querySelector('.fl-delivery-version')?.innerText.includes('journey-preview.pdf')");
  const first = (await api('brand', base + '/deliveries')).data.items[0]; assert.equal(first.files.length, 1);
  await brand.click('Refresh deliveries'); await brand.until("document.querySelector('.fl-delivery-version')?.innerText.includes('journey-preview.pdf')");
  await brand.click('Download journey-preview.pdf');
  await brand.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Download journey-preview.pdf'&&!b.disabled)");
  await brand.click('Request revisions for version 1');
  await brand.until("document.querySelector('[name=delivery-review-feedback]')");
  await brand.fill('[name=delivery-review-feedback]', 'Please make the captions larger.'); await brand.click('Send revision request');
  await brand.until("document.querySelector('.fl-delivery-review')?.innerText.includes('Revisions requested')");
  await creator.click('Refresh deliveries'); await creator.until("document.querySelector('.fl-delivery-review')?.innerText.includes('captions larger')");
  await creator.click('Submit a new version'); await creator.fill('[name=delivery-title]', 'Final preview with larger captions');
  await creator.fill('[name=delivery-label-0]', 'Final video'); await creator.fill('[name=delivery-url-0]', 'https://example.com/final-preview');
  await creator.click('Review delivery'); await creator.click('Submit delivery');
  await creator.until("document.querySelector('.fl-delivery-version')?.innerText.includes('Final preview')");
  await brand.click('Refresh deliveries'); await brand.until("document.querySelector('.fl-delivery-version')?.innerText.includes('Final preview')");
  assert.equal(await brand.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Request revisions for version 2').disabled"), true);
  await brand.click('Approve version 2'); await brand.until("document.querySelector('dialog[open]')?.innerText.includes('Final preview')");
  await brand.click('Confirm approval'); await brand.until("document.querySelector('.fl-delivery-review')?.innerText.includes('Approved')");
  checkpoint('private Supabase upload/download → revision → new version → approval and revision-limit enforcement');

  await creator.click('Refresh publishing proof'); await creator.click('Record publishing proof');
  await creator.fill('[name=proof-label-0]', 'Published Reel'); await creator.fill('[name=proof-url-0]', 'https://example.com/published-reel');
  await creator.click('Review publishing proof'); await creator.until("[...document.querySelectorAll('dialog button')].some(b=>b.textContent==='Save publishing proof')");
  await creator.click('Save publishing proof'); await creator.until("document.querySelector('.fl-proof-version')");
  await brand.click('Refresh publishing proof'); await brand.click('Review & confirm proof 1');
  await brand.until("document.querySelector('[name=confirm-publishing-proof]')");
  await brand.evaluate("document.querySelector('[name=confirm-publishing-proof]').click()"); await brand.click('Confirm proof');
  await brand.until("document.querySelector('.fl-proof-confirmation')?.innerText.includes('Proof confirmed')");
  await brand.click('Complete collaboration'); await brand.until("document.querySelector('dialog[open]')?.innerText.includes('Final preview')");
  await brand.click('Confirm completion'); await brand.until("document.querySelector('.fl-completion-receipt')");
  await creator.click('Refresh feedback'); await creator.until("document.querySelector('.fl-feedback-state')?.innerText==='Ready for feedback'");
  for (const [participant, rating, text] of [[brand, 4, 'Clear communication and careful delivery.'], [creator, 5, 'Clear brief and prompt review feedback.']]) {
    await participant.click('Leave feedback');
    await participant.evaluate(`document.querySelector('[name=feedback-rating][value="${rating}"]').click()`);
    await participant.fill('[name=feedback-comment]', text); await participant.click('Review feedback');
    await participant.until("document.querySelector('[name=confirm-feedback]')");
    await participant.evaluate("document.querySelector('[name=confirm-feedback]').click()"); await participant.click('Submit feedback');
    await participant.until("document.querySelector('.fl-feedback-card')");
  }
  await brand.click('Refresh feedback'); await brand.until("document.querySelector('.fl-feedback-state')?.innerText==='Both reviews submitted'");
  await creator.fill('[name=message-text]', 'Thank you for the collaboration.'); await creator.click('Send message');
  await creator.until("document.querySelector('.fl-message-history')?.innerText.includes('Thank you')");
  checkpoint('publishing proof → brand confirmation → completion → both private reviews and follow-up message');

  const deliveries = (await api('creator', base + '/deliveries')).data;
  assert.equal(deliveries.total, 2); assert.equal(deliveries.items[1].files[0].id, first.files[0].id);
  assert.equal(deliveries.completion.version, 2);
  assert.equal((await api('creator', base + '/agreement')).data.snapshot_hash, agreement.snapshot_hash);
  for (const participant of [brand, creator]) {
    await participant.send('Page.reload');
    await participant.until("document.querySelector('.fl-completion-receipt')&&document.querySelectorAll('.fl-feedback-card').length===2");
  }
  await outsider.go('/dashboard/collaborations/' + id); await outsider.until("document.querySelector('.fl-shared [role=alert]')");
  for (const suffix of ['/agreement','/deliveries','/publishing-proof','/feedback','/messages', '/files/' + first.files[0].id + '/download']) {
    assert.equal((await api('outsider', base + suffix, suffix.endsWith('/download') ? {} : undefined)).status, 404);
  }
  await creator.send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await creator.evaluate("document.querySelector('.fl-collab-feedback').scrollIntoView({block:'start'})");
  assert.equal(await creator.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  const screenshot = await creator.send('Page.captureScreenshot', {format:'png'});
  await fs.writeFile('/tmp/flenzr-collaboration-journey-mobile.png', Buffer.from(screenshot.data, 'base64'));
  assert.deepEqual(errors, []);
  checkpoint('reload persistence, unchanged agreement/history, outsider isolation and mobile layout');
} finally {
  for (const context of contexts) await call('Target.disposeBrowserContext', {browserContextId:context}).catch(()=>{});
  await call('Browser.close').catch(()=>{}); socket.close();
}
