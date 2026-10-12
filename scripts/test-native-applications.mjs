import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.CHANNEL_ARTIFACTS || await fs.mkdtemp(path.join(os.tmpdir(), 'showcase-native-apps-'));
await fs.mkdir(output, { recursive: true });
const base = 'http://localhost:4937/wiishowcase/';
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4937', '--strictPort'], { cwd: root, stdio: 'ignore' });
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) { try { if ((await fetch(base)).ok) break; } catch {} if (Date.now() > deadline) throw new Error('Preview startup timed out'); await new Promise(resolve => setTimeout(resolve, 100)); }
  browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], failed = [], requests = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => requests.push(request.url()));
  await page.goto(`${base}?screen=menu&nativeApps=1`);
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('.wii-channel-ui:not(.wii-channel-ui-empty)')];
    return cards.length === 8 && cards.every(card => { const wrapper = card.querySelector('[data-channel-bundle]'); return wrapper ? wrapper.dataset.channelReady === 'true' : [...card.querySelectorAll('img')].every(image => image.complete && image.naturalWidth); });
  }, null, { timeout: 60000 });
  assert.ok(!requests.some(url => url.includes('/channel-applications/')), 'Application assets eagerly loaded on menu');
  assert.equal(await page.locator('iframe[title="Wii News Channel"]').count(), 0, 'Legacy News eagerly opened');
  await page.screenshot({ path: path.join(output, 'eight-channel-menu.png') });
  for (const [channel, index] of [['forecast', 7], ['news', 4]]) {
    await page.locator(`[data-channel-index="${index}"]`).click();
    await page.waitForSelector('.ch-selection.visible'); await page.waitForTimeout(450);
    await page.locator('.ch-selection.visible').getByRole('button', { name: 'Start', exact: true }).click();
    const screen = page.locator(`[data-native-application="${channel}"]`), canvas = screen.locator('canvas');
    await canvas.waitFor({ timeout: 60000 });
    await screen.getByRole('button', { name: 'Load example data', exact: true }).click();
    await page.waitForFunction(channel => document.querySelector(`[data-native-application="${channel}"] canvas`)?.dataset.applicationView === (channel === 'forecast' ? 'normal' : 'main'), channel);
    await canvas.screenshot({ path: path.join(output, `${channel}-application.png`) });
    const cache = await canvas.evaluate(canvas => canvas.applicationRenderer.stats.staticScreenBuilds);
    if (channel === 'news') {
      await canvas.evaluate(canvas => canvas.applicationRenderer.handleInput({ controller: 3, trig: 0x0800, pointer: { valid: true, x: 80, y: 193 } }));
      assert.equal(await canvas.getAttribute('data-application-view'), 'article');
      await canvas.screenshot({ path: path.join(output, 'news-article.png') });
      await canvas.evaluate(canvas => canvas.applicationRenderer.handleInput({ controller: 3, trig: 0x0400 }));
      assert.equal(await canvas.getAttribute('data-application-view'), 'main');
      await canvas.evaluate(canvas => canvas.applicationAdapter.setNativeSignals({ restriction: true }));
      assert.equal(await canvas.getAttribute('data-application-view'), 'restricted');
      await canvas.screenshot({ path: path.join(output, 'news-restricted.png') });
      await canvas.evaluate(canvas => canvas.applicationAdapter.setNativeSignals({ restriction: false }));
    } else {
      await canvas.evaluate(canvas => canvas.applicationRenderer.handleInput({ controller: 0, trig: 0x0800, pointer: { valid: true, x: 516, y: 34 } }));
      assert.equal(await canvas.getAttribute('data-application-view'), 'setting');
      await canvas.screenshot({ path: path.join(output, 'forecast-settings.png') });
      await screen.getByRole('button', { name: 'Back', exact: true }).click();
      assert.equal(await canvas.getAttribute('data-application-view'), 'normal');
    }
    const adapterState = await canvas.evaluate(canvas => canvas.applicationAdapter.getState());
    await screen.getByRole('button', { name: 'Wii Menu', exact: true }).click();
    const menu = await page.locator(`[data-channel-bundle="channels/${channel}.zip"][data-channel-target="icon"] canvas`).evaluate(canvas => {
      const renderer = canvas.channelRenderer; return { inputs: renderer.customWeather ?? renderer.customNews,
        panes: renderer.preparedFrame.preparedPanes.filter(pane => pane.drawable).map(pane => pane.pane.name) };
    });
    if (channel === 'forecast') assert.ok(menu.panes.includes('W_sun_00') && menu.panes.includes('W_cloud_00'), 'Forecast snapshot did not update menu icon');
    else assert.ok(menu.panes.some(name => /^telop\d+$/.test(name)), 'News snapshot did not update menu ticker');
    const applicationFetches = requests.filter(url => url.includes(`/channel-applications/${channel}.zip`)).length;
    await page.locator(`[data-channel-index="${index}"]`).click(); await page.waitForTimeout(450);
    await page.locator('.ch-selection.visible').getByRole('button', { name: 'Start', exact: true }).click();
    await canvas.waitFor();
    assert.equal(requests.filter(url => url.includes(`/channel-applications/${channel}.zip`)).length, applicationFetches, 'Reopening fetched application bundle again');
    assert.deepEqual(await canvas.evaluate(canvas => canvas.applicationAdapter.getState()), adapterState, 'Reopening discarded application state');
    await screen.getByRole('button', { name: 'Wii Menu', exact: true }).click();
    results.push({ channel, cache, applicationFetches, preservedState: true, liveMenuInputs: true });
  }
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, errors, failed, requests }, null, 2));
  console.log(`PASS eight-channel menu, lazy Forecast/News starts, native button masks, live menu inputs and cached reopen. ${output}`);
} finally { await browser?.close(); server.kill(); }
