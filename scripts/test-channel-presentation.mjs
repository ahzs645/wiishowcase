import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.CHANNEL_ARTIFACTS || await fs.mkdtemp(path.join(os.tmpdir(), 'showcase-presentation-'));
await fs.mkdir(output, { recursive: true });
const base = 'http://localhost:4938/wiishowcase/';
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4938', '--strictPort'], { cwd: root, stdio: 'ignore' });
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) { try { if ((await fetch(base)).ok) break; } catch {} if (Date.now() > deadline) throw new Error('Preview startup timed out'); await new Promise(resolve => setTimeout(resolve, 100)); }
  browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const reports = [];
  for (const scenario of ['normal', 'four-three', 'canvas-fallback', 'slow']) {
    const page = await browser.newPage({ viewport: scenario === 'four-three' ? { width: 1000, height: 900 } : { width: 1280, height: 800 } });
    const errors = [], failed = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    page.on('request', request => requests.push(request.url()));
    if (scenario === 'canvas-fallback') await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl' || type === 'webgl2' ? null : original.call(this, type, ...args); };
    });
    if (scenario === 'slow') {
      await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.route('**/channels/*.zip', async route => { await new Promise(resolve => setTimeout(resolve, 750)); await route.continue(); });
    }
    const start = Date.now();
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await page.waitForFunction(() => {
      const cards = [...document.querySelectorAll('.wii-channel-ui:not(.wii-channel-ui-empty)')];
      return cards.length === 8 && cards.every(card => { const wrapper = card.querySelector('[data-channel-bundle]'); return wrapper ? wrapper.dataset.channelReady === 'true' : [...card.querySelectorAll('img')].every(image => image.complete && image.naturalWidth); });
    }, null, { timeout: 60000 });
    const readyMs = Date.now() - start;
    await page.evaluate(() => {
      window.presentationErrors = [];
      window.addEventListener('wii:channel-presentation-error', e => window.presentationErrors.push(e.detail));
      window.sendPresentation = (channel, presentation) => window.dispatchEvent(new CustomEvent('wii:channel-presentation', { detail: { channel, presentation } }));
      window.forecastIconInstance = document.querySelector('[data-channel-bundle="channels/forecast.zip"][data-channel-target="icon"] canvas').channelRenderer;
      window.sendPresentation('forecast', { inputs: { customWeather: { enabled: true, condition: 'partly_cloudy', city: 'Seattle', temperature: -12, temperatureUnit: 'C', telop: 'Example data\nSnow showers', timeLabel: 'Example snapshot' } }, runtime: { banner: { view: 'weather' } } });
      window.sendPresentation('news', { inputs: { customNews: { enabled: true, headlines: ['Example headline one', 'Example headline two', 'Example headline three'], state: 'headlines', scrollSpeed: 60 } } });
      window.sendPresentation('shop', { runtime: { banner: { paneVisibility: { start_white: false } } } });
      const icon = document.querySelector('[data-channel-bundle="channels/forecast.zip"][data-channel-target="icon"] canvas').channelRenderer;
      if (icon !== window.forecastIconInstance || icon.customWeather.temperature !== -12) throw new Error('Live update recreated or failed to update Forecast icon');
    });
    await page.screenshot({ path: path.join(output, `${scenario}-eight-channel-menu.png`) });
    const selections = [];
    for (const [channel, index] of [['forecast', 7], ['news', 4], ['shop', 3]]) {
      await page.locator(`[data-channel-index="${index}"]`).click();
      const selection = page.locator('.ch-selection.visible'); await selection.waitFor();
      const wrapper = selection.locator(`[data-channel-bundle="channels/${channel}.zip"][data-channel-target="banner"]`);
      await page.waitForFunction(channel => document.querySelector(`.ch-selection.visible [data-channel-bundle="channels/${channel}.zip"]`)?.dataset.channelReady === 'true', channel, { timeout: 60000 });
      await page.waitForTimeout(750); // Complete the menu's selection reveal.
      const result = await wrapper.locator('canvas').evaluate((canvas, channel) => {
        const r = canvas.channelRenderer; r.stop(); r.renderFrame(channel === 'forecast' ? 16 : channel === 'news' ? 300 : 30);
        const require = (value, message) => { if (!value) throw new Error(message); };
        if (channel === 'forecast') {
          require(r.customWeather.city === 'Seattle' && r.customWeather.temperature === -12 && r.customWeatherDigitMap.atlas, 'Forecast banner did not receive icon snapshot');
          const before = JSON.stringify(r.customWeather);
          window.sendPresentation(channel, { inputs: { customWeather: { enabled: true, city: 'Wrong' } }, runtime: { banner: { paneVisibility: { absent: false } } } });
          require(JSON.stringify(r.customWeather) === before && window.forecastIconInstance.customWeather.city === 'Seattle', 'Invalid update partially changed mounted targets');
          require(window.presentationErrors.length === 1, 'Invalid controls were not reported'); window.presentationErrors.length = 0;
          window.sendPresentation(channel, { runtime: { banner: { view: 'unavailable' } } });
          require(!r.customWeather.enabled && r.customWeather.state === 'unavailable', 'Forecast fallback did not select');
          window.sendPresentation(channel, { runtime: { banner: { view: 'weather' } } });
          require(r.customWeather.city === 'Seattle' && r.customWeather.enabled, 'Fallback lost the weather snapshot');
          require(document.querySelector('.ch-selection.visible .wii-btn-start:disabled'), 'Forecast preview opens an application');
        } else if (channel === 'news') {
          require(r.getTotalFrames() > 120, 'News ticker is bound to the short banner intro');
          const bounds = canvas.getBoundingClientRect();
          require(Math.abs(canvas.width / canvas.height - bounds.width / bounds.height) < 0.03, 'News native canvas is cropped by the selection aspect ratio');
          require(r.customNews.headlines.length === 3, 'News banner did not receive icon snapshot');
          window.sendPresentation(channel, { runtime: { banner: { view: 'restricted' }, icon: { view: 'restricted' } } });
          require(r.customNews.state === 'restricted', 'News restriction did not select');
          window.sendPresentation(channel, { runtime: { banner: { view: 'headlines' }, icon: { view: 'headlines' } } });
          require(r.customNews.headlines.length === 3, 'Restriction discarded headlines');
          require(r.frame === 300, 'State updates reset the News ticker frame');
          require(r.preparedFrame.preparedPanes.some(p => /^telop\d+$/.test(p.pane.name) && p.drawable), 'News headlines remain hidden after restoring content');
        } else {
          require(!r.preparedFrame.preparedPanes.find(p => p.pane.name === 'start_white')?.drawable, 'Shop intro override lost on first banner load');
          window.sendPresentation(channel, { runtime: { banner: { paneVisibility: { start_white: null } } } });
          require(r.preparedFrame.preparedPanes.find(p => p.pane.name === 'start_white')?.drawable, 'Shop native intro was not restored');
          window.sendPresentation(channel, { runtime: { banner: { paneVisibility: { start_white: false } } } });
        }
        return { channel, canvasWidth: canvas.width, dataUpdated: true };
      }, channel);
      await wrapper.locator('canvas').screenshot({ path: path.join(output, `${scenario}-${channel}-banner.png`) });
      selections.push(result);
      await selection.getByRole('button', { name: 'Wii Menu', exact: true }).click(); await page.waitForTimeout(450);
    }
    assert.deepEqual(await page.evaluate(() => window.presentationErrors), []);
    assert.equal(await page.locator('[data-native-application]').count(), 0);
    assert.equal(await page.locator('iframe[title="Wii News Channel"]').count(), 0);
    assert.ok(!requests.some(url => url.includes('/channel-applications/')), 'Application resources loaded during banner/icon tests');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    reports.push({ scenario, readyMs, selections, applicationFetches: 0, errors, failed }); await page.close();
  }
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(reports, null, 2));
  console.log(`PASS eight-channel outside views, live inputs, atomic flags, Shop intro override, slow loading and Canvas fallback. ${output}`);
} finally { await browser?.close(); server.kill(); }
