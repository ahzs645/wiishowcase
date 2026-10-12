import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shopRoot = process.argv[2] && path.resolve(process.argv[2]);
if (!shopRoot) throw new Error('Usage: node scripts/audit-shop-keyboard.mjs <extracted shopping/wiishopchannel.net>');
const cssRoot = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'Wii.css');
const output = process.env.KEYBOARD_ARTIFACTS || path.join(root, 'docs/shop-keyboard');
await fs.mkdir(output, { recursive: true });
const cssPage = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/wii-css/dist/wii.css"><style>body{font-family:var(--wii-font-family),sans-serif;}</style></head><body><button id="open">Open keyboard</button><wii-keyboard sounds="/wii-css/assets/audio/"></wii-keyboard><script src="/wii-css/js/wii-keyboard.js"></script><script>document.querySelector('#open').onclick=()=>document.querySelector('wii-keyboard').open({message:'Search by Title',value:'',onConfirm:value=>window.confirmed=value,onCancel:()=>window.cancelled=true});</script></body></html>`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/css-keyboard') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(cssPage); return; }
    const framework = url.pathname.startsWith('/wii-css/');
    const base = framework ? cssRoot : path.join(shopRoot, 'dist');
    const relative = decodeURIComponent(framework ? url.pathname.slice('/wii-css/'.length) : url.pathname.slice(1));
    let file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) file = path.join(base, 'index.html');
    try { if (!(await fs.stat(file)).isFile()) throw new Error(); }
    catch { if (framework || path.extname(relative)) { res.writeHead(404); res.end(); return; } file = path.join(base, 'index.html'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(await fs.readFile(file));
  } catch { res.writeHead(500); res.end(); }
});
await new Promise(resolve => server.listen(4944, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM, args: ['--no-sandbox'] });
  const reports = [];
  for (const implementation of ['shop', 'wii-css']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
    const errors = [], failures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push({ status: response.status(), path: new URL(response.url()).pathname }); });
    await page.addInitScript(() => {
      window.keyboardAudio = []; window.keyboardEvents = []; let seq = 0; const ids = new WeakMap();
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function() {
        if (/kbd_.*\.wav/.test(this.src)) { if (!ids.has(this)) ids.set(this, ++seq); window.keyboardAudio.push({ sound: this.src.split('/').pop(), volume: this.volume, instance: ids.get(this) }); }
        return original.call(this);
      };
    });
    await page.goto(`http://127.0.0.1:4944/${implementation === 'shop' ? 'wiiware' : 'css-keyboard'}`);
    const open = async () => {
      if (implementation === 'shop') await page.getByText('Search by Game Title', { exact: true }).click();
      else await page.locator('#open').click();
      await page.waitForTimeout(650);
    };
    const quit = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(650); };
    const value = async () => page.locator(implementation === 'shop' ? '#keyprompt' : '.wii-keyboard-input').inputValue();
    const key = label => implementation === 'shop' ? page.locator('#keyboard .key').filter({ has: page.locator('b.keytext').filter({ hasText: new RegExp(`^${label}$`, 'i') }) }) : page.locator('.wii-keyboard-panel').getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
    await open();
    await page.screenshot({ path: path.join(output, `${implementation}-keyboard-open.png`) });
    const initial = await page.evaluate(implementation => ({ keys: document.querySelectorAll(implementation === 'shop' ? '#keyboard .key' : '.wii-keyboard-key').length,
      aLabel: implementation === 'shop' ? [...document.querySelectorAll('#keyboard b.keytext')].find(el => el.textContent.toLowerCase() === 'a')?.textContent : document.querySelector('.wii-keyboard-key--a')?.textContent.trim(),
      semanticButtons: document.querySelectorAll(implementation === 'shop' ? '#keyboard button' : '.wii-keyboard-panel button').length,
      role: document.querySelector(implementation === 'shop' ? '#keyboard' : '.wii-keyboard')?.getAttribute('role'),
      clippedKeys: [...document.querySelectorAll(implementation === 'shop' ? '#keyboard .key' : '.wii-keyboard-key')].map(el => ({ label: el.textContent.trim() || el.querySelector('img[alt]')?.alt || 'Backspace', rect: el.getBoundingClientRect() })).filter(({ rect }) => rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1).map(({ label, rect }) => ({ label, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })) }), implementation);
    if (initial.aLabel === 'A') await key('Caps').click();
    await key('Shift').click(); await key('a').click(); await key('a').click(); const onScreenShift = await value(); await quit();
    await open(); if (initial.aLabel === 'A') await key('Caps').click(); await page.keyboard.down('ShiftRight'); await page.keyboard.press('a'); await page.keyboard.up('ShiftRight'); const shiftRight = await value(); await quit();
    await open(); await page.keyboard.press('Backquote'); const backquote = await value(); await quit();
    await open();
    await page.evaluate(() => document.addEventListener('keydown', event => window.keyboardEvents.push({ code: event.code, prevented: event.defaultPrevented })));
    await page.keyboard.press('Tab'); const tab = await page.evaluate(() => ({ event: window.keyboardEvents.find(e => e.code === 'Tab'), focusTag: document.activeElement?.tagName }));
    await page.locator(implementation === 'shop' ? '#keyprompt' : '.wii-keyboard-input').focus();
    await page.keyboard.press('Control+a'); const shortcut = await page.evaluate(() => window.keyboardEvents.filter(e => e.code === 'KeyA').at(-1)); await quit();
    await open(); await page.keyboard.press('Backspace'); await page.keyboard.press('a'); await page.keyboard.press('a'); await page.keyboard.press('Space'); await page.keyboard.press('Backspace');
    const beforeOk = await value(); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    const confirmed = implementation === 'shop' ? new URL(page.url()).searchParams.get('title') : await page.evaluate(() => window.confirmed);
    assert.equal(confirmed, beforeOk, `${implementation} OK callback lost input`);
    const audio = await page.evaluate(() => window.keyboardAudio);
    assert.ok(audio.some(a => a.sound === 'kbd_open.wav') && audio.some(a => a.sound === 'kbd_ok.wav'));
    assert.deepEqual(errors, [], `${implementation} raised a keyboard page exception`);
    assert.deepEqual(failures.filter(item => /kbd_.*\.wav/.test(item.path)), [], `${implementation} keyboard sounds failed to load`);
    reports.push({ implementation, initial, onScreenShift, shiftRight, backquote, tab, shortcut, confirmed, audio, errors, failures }); await page.close();
  }
  const hashes = [];
  for (const name of (await fs.readdir(path.join(cssRoot, 'assets/audio'))).filter(name => /^kbd_.*\.wav$/.test(name))) {
    const css = await fs.readFile(path.join(cssRoot, 'assets/audio', name)), shop = await fs.readFile(path.join(shopRoot, 'public/snd', name));
    const hash = value => createHash('sha256').update(value).digest('hex'); hashes.push({ name, identical: hash(css) === hash(shop), sha256: hash(css) });
  }
  assert.ok(hashes.every(item => item.identical), 'Sound assets differ');
  const cssRevision = execFileSync('git', ['-C', cssRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ reports, sounds: hashes, shopSource: 'Supplied shopping.zip project, unmodified', cssRoot, cssRevision }, null, 2));
  console.log(JSON.stringify(reports.map(({ implementation, initial, onScreenShift, shiftRight, backquote, tab, shortcut, errors }) => ({ implementation, initial, onScreenShift, shiftRight, backquote, tab, shortcut, errors })), null, 2));
  console.log(`PASS keyboard comparison and ten identical sound assets. ${output}`);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
