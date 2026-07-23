#!/usr/bin/env node
// Post-build smoke test. Boots `vite preview` over ./dist in a headless
// browser and asserts the app actually renders — specifically the failure
// modes that have shipped before while the build stayed green:
//
//   - a Wii.css asset import that doesn't resolve (dev 500s / build breaks)
//   - channel-card masks falling through to the SPA index.html fallback,
//     which renders every card fully transparent
//   - the per-card inline mask override being dropped (unquoted data: URI)
//   - message-board pin icons 404ing in the deployed bundle
//   - the channel-renderer pipeline stalling before it ever sizes a canvas
//
// Usage: npm run build && npm run test:smoke
// Env:   SMOKE_CHROMIUM       - path to a chromium binary (skips download)
//        SMOKE_CANVAS_TIMEOUT - ms to wait for the first decoded icon
//                               (default 180000; software rendering is slow)

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4917;
const BASE = `http://localhost:${PORT}/wiishowcase/`;
const CANVAS_TIMEOUT = Number(process.env.SMOKE_CANVAS_TIMEOUT ?? 180000);

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('smoke-test: dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

const failures = [];
const fail = (msg) => { failures.push(msg); console.error(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

// --- start vite preview -----------------------------------------------------
// Spawn vite's entry point directly (not via npx): npx wraps vite in a child
// process our later kill() wouldn't reach, and the orphan's inherited pipes
// would keep this script alive after it prints its verdict.
const preview = spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
);
preview.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

let previewExited = false;
preview.on('exit', (code) => { previewExited = true; });

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (previewExited) {
      // Don't fall back to whatever else is on the port (e.g. a stale server
      // from an earlier run) — that would test the wrong build.
      throw new Error(`vite preview exited before becoming ready — is port ${PORT} already in use?`);
    }
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('vite preview did not become ready within 30s');
}

let browser;
try {
  await waitForServer();

  browser = await chromium.launch({
    executablePath: process.env.SMOKE_CHROMIUM || undefined,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const badResponses = [];
  const zipResponses = [];
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && !url.endsWith('/favicon.ico')) {
      badResponses.push(`${res.status()} ${url}`);
    }
    if (url.endsWith('.zip')) zipResponses.push(res);
  });
  const pageErrors = [];
  page.on('pageerror', (e) => {
    // The miicreator file: dep is absent on CI checkouts; its Mii-head path
    // degrades by design, so its error is not a smoke failure.
    if (!e.message.includes('miicreator')) pageErrors.push(e.message);
  });

  await page.goto(`${BASE}?screen=menu`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.wii-channel-ui', { timeout: 15000 });

  // --- channel cards exist and are masked -----------------------------------
  const cardCount = await page.locator('.wii-channel-ui').count();
  cardCount >= 12
    ? pass(`${cardCount} channel cards rendered`)
    : fail(`expected >= 12 channel cards, found ${cardCount}`);

  const mask = await page.evaluate(async () => {
    const el = document.querySelector('.wii-channel-ui');
    const cs = getComputedStyle(el);
    const maskImage = cs.maskImage || cs.webkitMaskImage || 'none';
    const inline = el.getAttribute('style') || '';
    let maskContentType = null;
    const m = maskImage.match(/^url\("?(https?:[^")]+)"?\)/);
    if (m) {
      try {
        maskContentType = (await fetch(m[1])).headers.get('content-type');
      } catch (e) {
        maskContentType = `fetch failed: ${e.message}`;
      }
    }
    return { maskImage: maskImage.slice(0, 64), inlineHasMask: inline.includes('--wii-channel-mask'), maskContentType };
  });

  mask.maskImage !== 'none'
    ? pass(`card mask present (${mask.maskImage}…)`)
    : fail('channel card has no mask-image — cards would render unmasked');
  mask.inlineHasMask
    ? pass('per-card inline mask override applied')
    : fail('inline --wii-channel-mask missing — url() likely invalid again');
  if (mask.maskContentType !== null) {
    /image\/svg|image\//.test(mask.maskContentType)
      ? pass(`mask URL serves ${mask.maskContentType}`)
      : fail(`mask URL serves "${mask.maskContentType}" — SPA fallback regression`);
  }

  // --- channel bundles download as real zips --------------------------------
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('.zip')), null, { timeout: 30000 }).catch(() => {});
  if (zipResponses.length === 0) {
    fail('no channel bundle (.zip) was requested');
  } else {
    let ok = true;
    for (const res of zipResponses) {
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('text/html')) { ok = false; fail(`${res.url()} served as HTML — SPA fallback`); }
    }
    if (ok) pass(`${zipResponses.length} channel bundles served as binary`);
  }

  // --- renderer pipeline produces a frame -----------------------------------
  // Only count canvases in real (non-blank) channel cards: the blank tiles'
  // shared renderer sizes its canvases near-instantly and would mask a stall
  // in the actual channel-bundle pipeline.
  const sized = await page
    .waitForFunction(
      () => [...document.querySelectorAll('.wii-channel-ui:not(.wii-channel-ui-empty) canvas')].some((c) => !(c.width === 300 && c.height === 150)),
      null,
      { timeout: CANVAS_TIMEOUT },
    )
    .then(() => true)
    .catch(() => false);
  sized
    ? pass('a channel renderer decoded and sized its canvas')
    : fail(`no channel canvas was sized within ${CANVAS_TIMEOUT}ms — renderer pipeline stalled`);

  // --- message board opens with working pins --------------------------------
  await page.locator('button[aria-label="Open Mail"]').click();
  await page.waitForSelector('.message-board-screen.visible', { timeout: 10000 });
  pass('message board opens');
  const pins = await page.evaluate(() =>
    [...document.querySelectorAll('.message-board-card-pin')].map((i) => i.complete && i.naturalWidth > 0),
  );
  pins.length > 0 && pins.every(Boolean)
    ? pass(`${pins.length} message pins loaded`)
    : fail('message-board pin icons failed to load');

  // --- global error sweep ----------------------------------------------------
  badResponses.length === 0
    ? pass('no failed network requests')
    : fail(`failed requests:\n      ${badResponses.join('\n      ')}`);
  pageErrors.length === 0
    ? pass('no uncaught page errors')
    : fail(`page errors:\n      ${pageErrors.join('\n      ')}`);
} catch (err) {
  fail(`smoke test aborted: ${err.message}`);
} finally {
  await browser?.close().catch(() => {});
  preview.kill();
}

if (failures.length) {
  console.error(`\nsmoke-test: FAIL (${failures.length} problem${failures.length === 1 ? '' : 's'})`);
  process.exit(1);
}
console.log('\nsmoke-test: PASS');
process.exit(0);
