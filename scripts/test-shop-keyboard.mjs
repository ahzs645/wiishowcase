import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssRoot = path.resolve(process.argv[2] || path.join(root, 'Wii.css'));
const output = process.env.KEYBOARD_ARTIFACTS || path.join(root, 'docs/shop-keyboard/adopted');
await fs.mkdir(output, { recursive: true });
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/framework/dist/wii.css"></head><body><button id="open">Open keyboard</button><wii-keyboard></wii-keyboard><script src="/framework/js/wii-keyboard.js"></script><script>window.kbd=document.querySelector('wii-keyboard');document.querySelector('#open').onclick=()=>kbd.open({message:'Search by Title',onConfirm:value=>window.confirmed=value,onCancel:()=>window.cancelled=true});</script></body></html>`;
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.otf': 'font/otf', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
    const file = path.resolve(cssRoot, decodeURIComponent(url.pathname.slice('/framework/'.length)));
    if (!url.pathname.startsWith('/framework/') || !file.startsWith(cssRoot + path.sep)) { res.writeHead(404); res.end(); return; }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(4945, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) missing.push(response.url()); });
  await page.addInitScript(() => {
    window.audioCalls = []; let next = 0; const ids = new WeakMap();
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!ids.has(this)) ids.set(this, ++next);
      window.audioCalls.push({ name: this.src.split('/').pop(), volume: this.volume, instance: ids.get(this), time: this.currentTime });
      return original.call(this);
    };
  });
  await page.goto('http://127.0.0.1:4945/');
  const open = async (value = '') => {
    await page.evaluate(value => kbd.open({ message: 'Search by Title', value, onConfirm: value => window.confirmed = value, onCancel: () => window.cancelled = true }), value);
    await page.waitForTimeout(550);
  };
  const input = page.locator('.wii-keyboard-input');
  const key = action => page.locator(`[data-action="${action}"]`);
  const a = page.locator('.wii-keyboard-key--a');
  const results = { cssRevision: execFileSync('git', ['-C', cssRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), viewports: [], physical: {}, audio: {}, images: [] };
  for (const [width, height] of [[608, 456], [1280, 720], [1000, 900], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height }); await open();
    const clipped = await page.locator('.wii-keyboard-key').evaluateAll(elements => elements.filter(el => {
      const r = el.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight;
    }).map(el => el.getAttribute('aria-label') || el.textContent.trim()));
    assert.equal(await page.getByRole('dialog').count(), 1);
    assert.equal(await page.locator('.wii-keyboard-panel button').count(), 53);
    assert.deepEqual(clipped, [], `${width}×${height} clips keys`);
    // Hit-testing catches controls hidden underneath decorative layers.
    assert.equal(await key('ok').evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, `keyboard-${width}x${height}.png`) });
    results.viewports.push({ width, height, keys: 53, clipped });
    await key('ok').click(); assert.equal(await page.evaluate(() => kbd.isOpen), false);
  }
  await page.setViewportSize({ width: 1280, height: 720 }); await open();
  assert.equal(await key('caps').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(184, 236, 255)');
  for (const action of ['caps', 'shift', 'space', 'backspace']) {
    await open('ab'); await key(action).hover(); await page.mouse.down();
    await page.waitForTimeout(100);
    assert.equal(await key(action).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(205, 210, 100)', `${action} must show Shop's pressed color while hovered`);
    assert.equal(await input.inputValue(), 'ab', `${action} should activate on release`);
    await page.mouse.up();
    assert.equal(await input.inputValue(), action === 'space' ? 'ab ' : action === 'backspace' ? 'a' : 'ab');
  }
  results.specialKeyPressedColorAndRelease = 'passed';
  await open();
  const chars = await page.locator('[data-char]').evaluateAll(elements => elements.map(el => el.dataset.char));
  for (let i = 0; i < chars.length; i++) await page.locator('[data-char]').nth(i).click();
  assert.equal(await input.inputValue(), chars.join(''));
  results.allCharacterKeys = { tested: chars.length, value: chars.join('') };
  await open(); await a.tap(); assert.equal(await input.inputValue(), 'a');
  await key('ok').tap(); assert.equal(await page.evaluate(() => window.confirmed), 'a');
  results.touch = 'passed';
  await open();
  assert.equal((await a.textContent()).trim(), 'a');
  await key('shift').click(); await a.click(); await a.click(); assert.equal(await input.inputValue(), 'AA');
  assert.equal(await key('caps').getAttribute('aria-pressed'), 'true');
  assert.equal(await key('shift').getAttribute('aria-pressed'), 'false');
  await key('caps').click(); await a.click(); assert.equal(await input.inputValue(), 'AAa');
  results.onScreenShift = 'AA';
  for (const side of ['ShiftLeft', 'ShiftRight']) {
    await open(); await page.keyboard.down(side); await page.keyboard.press('a'); await page.keyboard.press('a');
    await page.keyboard.up(side); await page.keyboard.press('a');
    assert.equal(await input.inputValue(), 'AAa'); results.physical[side] = 'AAa';
  }
  await open(); await page.keyboard.press('Backquote'); assert.equal(await input.inputValue(), '`');
  await page.keyboard.press('ShiftRight+Digit2'); assert.equal(await input.inputValue(), '`@');
  results.physical.backtickAndAt = '`@';
  await open('abc'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('x');
  assert.equal(await input.inputValue(), 'abxc');
  await page.keyboard.press('Control+a'); await page.keyboard.press('y'); assert.equal(await input.inputValue(), 'y');
  await open('abc'); await page.keyboard.press('Home'); await page.keyboard.press('Delete'); assert.equal(await input.inputValue(), 'bc');
  await open('a😀'); await page.keyboard.press('Backspace'); assert.equal(await input.inputValue(), 'a');
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.press('Space'); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => window.confirmed), '');
  results.physical.caretSelectionDeleteUnicode = 'passed';
  await page.locator('#open').click(); await page.waitForTimeout(550);
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BUTTON');
  await a.focus(); await page.keyboard.press('Enter'); assert.equal(await input.inputValue(), 'a');
  await key('quit').focus(); await page.keyboard.press('Tab'); assert.equal(await input.evaluate(el => document.activeElement === el), true);
  await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.activeElement.id), 'open');
  results.physical.focusAndKeyboardActivation = 'passed';
  // Exercise repeat playback through actual key actions, then the public audio options.
  await open(); await input.focus(); await page.keyboard.press('a'); await page.keyboard.press('a');
  const defaults = await page.evaluate(() => window.audioCalls);
  assert.ok(defaults.every(call => call.volume === 0.125 && call.time === 0));
  const repeated = defaults.filter(call => call.name === 'kbd_key.wav');
  assert.equal(new Set(repeated.map(call => call.instance)).size, 1);
  assert.equal(await page.evaluate(() => Object.keys(kbd._audioCache).length), 10);
  await page.evaluate(() => { kbd.setAttribute('volume', '0.3'); kbd.setAttribute('overlap', ''); window.audioCalls = []; });
  await page.keyboard.press('a'); await page.keyboard.press('a');
  const overlap = await page.evaluate(() => window.audioCalls);
  assert.ok(overlap.every(call => call.volume === 0.3)); assert.equal(new Set(overlap.map(call => call.instance)).size, 2);
  await page.evaluate(() => { kbd.setAttribute('muted', ''); window.audioCalls = []; });
  await page.keyboard.press('a'); assert.deepEqual(await page.evaluate(() => window.audioCalls), []);
  results.audio = { samplesLoaded: 10, defaultVolume: 0.125, repeatedSampleInstances: 1, optionalVolume: 0.3, optionalOverlap: 'passed', mute: 'passed' };
  const manifest = JSON.parse(await fs.readFile(path.join(cssRoot, 'assets/keyboard/shop-assets.json')));
  for (const entry of manifest.images) {
    const data = await fs.readFile(path.join(cssRoot, 'assets/keyboard', entry.file));
    assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256);
    results.images.push({ file: entry.file, sha256: entry.sha256 });
  }
  assert.equal(results.images.length, 8);
  assert.deepEqual(missing, []); assert.deepEqual(errors, []);
  results.errors = errors; results.missing = missing;
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`PASS: 53 keys visible at five sizes; Shop images, sticky on-screen Shift, physical input, caret, focus and audio options. ${output}`);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
