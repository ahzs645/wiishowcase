import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'http://localhost:4932/wiishowcase/';
const output = process.env.CHANNEL_ARTIFACTS || await fs.mkdtemp(path.join(os.tmpdir(), 'showcase-loading-'));
await fs.mkdir(output, { recursive: true });
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4932', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', data => process.stderr.write(data));
let exited = false; server.on('exit', () => { exited = true; });
let browser;
const channels = ['disc', 'mii', 'photo', 'shop', 'news', 'onliine', 'pokemon-ranch'];
const bundles = ['disc', 'mii', 'photo', 'shop', 'news', null, 'pokemon-ranch'];
const reports = [];
async function setup(name, delay = 0, cpu = 1, disableWebGl = false) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  if (disableWebGl) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type === 'webgl' || type === 'webgl2' ? null : original.call(this, type, ...args);
    };
  });
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push({ text: message.text(), location: message.location() }); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push(`${request.failure()?.errorText} ${request.url()}`); });
  if (delay) await page.route('**/channels/*.zip', async route => {
    await new Promise(resolve => setTimeout(resolve, delay)); await route.continue();
  });
  if (cpu > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.addInitScript(() => {
    window.channelAudit = { requests: [], tasks: [], pending: 0 };
    new PerformanceObserver(list => window.channelAudit.tasks.push(...list.getEntries().map(task => ({ start: task.startTime, ms: task.duration })))).observe({ type: 'longtask', buffered: true });
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); this.auditPending = new Map();
        this.addEventListener('message', async event => {
          const request = this.auditPending.get(event.data.id); if (!request) return;
          this.auditPending.delete(event.data.id); window.channelAudit.pending--;
          Object.assign(request, { end: performance.now(), ms: performance.now() - request.start, error: event.data.error ?? null });
          const audio = event.data.bundle?.audioWav;
          if (audio) request.audioHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', audio))].map(n => n.toString(16).padStart(2, '0')).join('');
        });
      }
      postMessage(data, ...args) {
        if (typeof data.source === 'string') {
          const request = { source: data.source, targets: data.options?.targets, audio: data.options?.audio, start: performance.now() };
          this.auditPending.set(data.id, request); window.channelAudit.requests.push(request); window.channelAudit.pending++;
        }
        return super.postMessage(data, ...args);
      }
    };
  });
  const start = Date.now(); await page.goto(`${base}?screen=menu`, { waitUntil: 'domcontentloaded' });
  return { page, context, errors, failed, name, start, delay, cpu };
}
async function menuReady(test) {
  await test.page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('.wii-channel-ui:not(.wii-channel-ui-empty)')];
    return cards.length === 7 && cards.every(card => {
      const wrapper = card.querySelector('[data-channel-bundle]');
      if (wrapper) return wrapper.dataset.channelReady === 'true' && wrapper.querySelector('canvas').width !== 300;
      return [...card.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0);
    });
  }, null, { timeout: 180000 });
  await test.page.waitForFunction(() => window.channelAudit.pending === 0, null, { timeout: 180000 });
  const readyMs = Date.now() - test.start;
  const icons = await test.page.evaluate(() => [...document.querySelectorAll('.wii-channel-ui:not(.wii-channel-ui-empty)')].map(card => {
    const canvas = card.querySelector('canvas'); let alphaPixels = null;
    if (canvas) {
      // Both renderer backends can be sampled through a temporary 2D canvas.
      const sample = document.createElement('canvas'); sample.width = canvas.width; sample.height = canvas.height;
      const ctx = sample.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
      alphaPixels = pixels.filter((value, index) => index % 4 === 3 && value > 0).length;
    }
    return { index: card.dataset.channelIndex, width: canvas?.width, height: canvas?.height, alphaPixels };
  }));
  icons.filter(icon => icon.width).forEach(icon => assert.ok(icon.alphaPixels > 0, `Icon ${icon.index} is blank`));
  const requests = await test.page.evaluate(() => window.channelAudit.requests);
  assert.equal(requests.filter(request => request.targets?.includes('icon')).length, 7, 'Expected six channel icons plus one shared blank decode');
  assert.ok(requests.every(request => !request.audio && !request.targets?.includes('banner')), 'Banner/audio eagerly loaded on menu');
  const resources = await test.page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
  assert.ok(!resources.some(url => /FFLResHigh\.dat|\/news-channel\/index\.html/.test(url)), 'Hidden Mii/News application eagerly initialized on menu');
  await test.page.screenshot({ path: path.join(output, `${test.name}-all-menu.png`) });
  return { readyMs, icons };
}
async function select(test, index) {
  const page = test.page; const start = Date.now();
  await page.locator(`[data-channel-index="${index}"]`).click();
  await page.waitForSelector('.ch-selection.visible');
  if (bundles[index]) {
    await page.waitForFunction(bundle => {
      const wrapper = document.querySelector('.ch-selection.visible [data-channel-target="banner"]');
      return wrapper?.dataset.channelBundle === `channels/${bundle}.zip` && wrapper.dataset.channelReady === 'true';
    }, bundles[index], { timeout: 180000 });
    if (bundles[index] !== 'disc') await page.waitForFunction(() => document.querySelector('.ch-selection audio')?.getAttribute('src')?.startsWith('blob:'), null, { timeout: 180000 });
  } else await page.waitForFunction(() => { const image = document.querySelector('.ch-selection.visible img.ch-sel-video'); return image?.complete && image.naturalWidth > 0; });
  const ms = Date.now() - start;
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(output, `${test.name}-${channels[index]}.png`) });
  await page.locator('.ch-selection.visible').getByRole('button', { name: 'Wii Menu', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.ch-selection.visible'));
  await page.waitForTimeout(450);
  return { channel: channels[index], ms };
}
async function finish(test, extra) {
  const audit = await test.page.evaluate(() => structuredClone(window.channelAudit));
  reports.push({ scenario: test.name, delayMs: test.delay, cpuSlowdown: test.cpu, ...extra, audit, errors: test.errors, failedRequests: test.failed });
  await fs.writeFile(path.join(output, 'loading-results.json'), JSON.stringify(reports, null, 2));
  assert.deepEqual(test.errors, [], `${test.name}: browser errors`);
  assert.deepEqual(test.failed, [], `${test.name}: failed requests`);
  assert.ok(audit.requests.every(request => !request.error), `${test.name}: worker errors`);
  await test.context.close();
}
try {
  const deadline = Date.now() + 30000;
  while (true) {
    if (exited) throw new Error('Preview exited before loading test');
    try { if ((await fetch(base)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error('Preview startup timed out');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM || undefined, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const cold = await setup('cold-full');
  const menu = await menuReady(cold); const selections = [];
  // Three groups, all on a menu whose channels have already loaded together.
  for (const group of [[0, 1, 2], [3, 4, 5], [6]]) for (const index of group) selections.push(await select(cold, index));
  const beforeWarm = await cold.page.evaluate(() => window.channelAudit.requests.length);
  const warmSelections = [];
  for (let index = 0; index < channels.length; index++) warmSelections.push(await select(cold, index));
  assert.equal(await cold.page.evaluate(() => window.channelAudit.requests.length), beforeWarm, 'Warm selections repeated bundle decoding');
  await cold.page.getByRole('button', { name: 'Open Mail', exact: true }).click();
  await cold.page.waitForSelector('.message-board-screen.visible');
  await cold.page.waitForFunction(() => {
    const image = document.querySelector('.message-board-card-avatar img[src^="blob:"]');
    return image?.complete && image.naturalWidth > 0;
  }, null, { timeout: 60000 });
  const miiHeadWidth = await cold.page.locator('.message-board-card-avatar img[src^="blob:"]').first().evaluate(image => image.naturalWidth);
  const miiHeadSrc = await cold.page.locator('.message-board-card-avatar img[src^="blob:"]').first().getAttribute('src');
  await cold.page.getByRole('button', { name: 'Close Mail', exact: true }).click();
  await cold.page.waitForFunction(() => !document.querySelector('.message-board-screen.visible'));
  await cold.page.waitForTimeout(450);
  await cold.page.getByRole('button', { name: 'Open Mail', exact: true }).click();
  await cold.page.waitForSelector('.message-board-screen.visible');
  assert.equal(await cold.page.locator('.message-board-card-avatar img[src^="blob:"]').first().getAttribute('src'), miiHeadSrc, 'Reopening mail rebuilt the Mii avatar');
  await cold.page.getByRole('button', { name: 'Close Mail', exact: true }).click();
  await cold.page.waitForFunction(() => !document.querySelector('.message-board-screen.visible'));
  await cold.page.waitForTimeout(450);
  await cold.page.locator('[data-channel-index="4"]').click();
  await cold.page.waitForSelector('.ch-selection.visible');
  await cold.page.waitForTimeout(450);
  await cold.page.locator('.ch-selection.visible').getByRole('button', { name: 'Start', exact: true }).click();
  const newsFrame = cold.page.frameLocator('iframe[title="Wii News Channel"]');
  await newsFrame.getByRole('button', { name: 'Wii Menu', exact: true }).waitFor({ timeout: 60000 });
  await newsFrame.getByRole('button', { name: 'Wii Menu', exact: true }).click();
  await cold.page.waitForFunction(() => !document.querySelector('.news-channel-screen.visible'));
  assert.equal(await cold.page.locator('iframe[title="Wii News Channel"]').count(), 1, 'Closing News discarded its application state');
  await finish(cold, { menu, selections, warmSelections, miiHeadWidth, deferredAppsVerified: true });
  console.log('PASS all seven menu channels, all selection groups, and warm decode reuse');
  const slow = await setup('slow-full', 750, 4);
  const slowMenu = await menuReady(slow);
  const heavySelections = [];
  for (const index of [1, 3, 6]) heavySelections.push(await select(slow, index));
  await finish(slow, { menu: slowMenu, selections: heavySelections });
  console.log('PASS full menu and heavy Mii/Shop/Ranch subset at 4x CPU and 750ms ZIP delay');
  const rapid = await setup('rapid-cold', 1000);
  await rapid.page.waitForSelector('[data-channel-index="0"]');
  await rapid.page.locator('[data-channel-index="0"]').click();
  await rapid.page.waitForSelector('.ch-selection.visible');
  await rapid.page.waitForTimeout(320);
  for (let index = 1; index < channels.length; index++) {
    await rapid.page.locator('.ch-selection.visible .channel-page-arrow-next').click();
    await rapid.page.waitForTimeout(50);
  }
  await rapid.page.waitForFunction(() => {
    const wrapper = document.querySelector('.ch-selection.visible [data-channel-target="banner"]');
    return wrapper?.dataset.channelBundle === 'channels/pokemon-ranch.zip' && wrapper.dataset.channelReady === 'true';
  }, null, { timeout: 180000 });
  await rapid.page.waitForFunction(() => window.channelAudit.pending === 0 && window.channelAudit.requests.some(request => request.source.endsWith('pokemon-ranch.zip') && request.audioHash), null, { timeout: 180000 });
  const audioCorrect = await rapid.page.evaluate(async () => {
    const src = document.querySelector('.ch-selection audio').getAttribute('src');
    if (!src?.startsWith('blob:')) return false;
    const bytes = await (await fetch(src)).arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
    return hash === window.channelAudit.requests.findLast(request => request.source.endsWith('pokemon-ranch.zip') && request.audioHash).audioHash;
  });
  assert.ok(audioCorrect, 'Rapid switching ended with another channel audio');
  await rapid.page.screenshot({ path: path.join(output, 'rapid-final-ranch.png') });
  await finish(rapid, { finalChannel: 'pokemon-ranch', audioCorrect });
  console.log('PASS rapid cold switching while icons/banners load; final Ranch banner/audio agree');
  const fallback = await setup('canvas-fallback', 0, 1, true);
  const fallbackMenu = await menuReady(fallback);
  for (const bundle of ['disc', 'shop']) assert.ok(await fallback.page.locator(`[data-channel-bundle="channels/${bundle}.zip"] canvas`).evaluate(canvas => !!canvas.getContext('2d')), `${bundle}: missing Canvas fallback`);
  await finish(fallback, { menu: fallbackMenu, canvasFallback: true });
  console.log('PASS full menu with WebGL unavailable; Disc/Shop thumbnails use Canvas');
  await fs.writeFile(path.join(output, 'loading-results.json'), JSON.stringify(reports, null, 2));
  console.log(`Screenshots and metrics: ${output}`);
} finally { await browser?.close(); server.kill(); }
