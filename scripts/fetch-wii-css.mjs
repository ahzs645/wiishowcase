#!/usr/bin/env node
// Fetches the prebuilt Wii.css package from the framework's GitHub Pages site
// and extracts it into ./Wii.css. The Wii.css repo is private, so CI can't
// clone the submodule; the Pages site publishes a zip of everything this
// project consumes (dist/, src/, js/, assets/, package.json) instead.
//
// Locally the git submodule takes priority: when Wii.css/package.json exists
// the script is a no-op unless --force is passed.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_URL =
  process.env.WII_CSS_PACKAGE_URL ?? 'https://ahzs645.github.io/Wii.css/package/wii-css.zip';
const VERSION_URL = new URL('version.json', PACKAGE_URL).href;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'Wii.css');
const force = process.argv.includes('--force');

if (!force && fs.existsSync(path.join(target, 'package.json'))) {
  console.log('Wii.css already present (submodule checked out) — skipping download.');
  console.log('Pass --force to overwrite with the published package.');
  process.exit(0);
}

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

try {
  const meta = JSON.parse((await download(VERSION_URL)).toString('utf8'));
  console.log(`Fetching wii.css v${meta.version} (${String(meta.commit).slice(0, 7)}, built ${meta.builtAt})`);
} catch {
  console.log('No version.json available — fetching zip directly.');
}

const zipBuf = await download(PACKAGE_URL);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wii-css-'));
const zipPath = path.join(tmp, 'wii-css.zip');
fs.writeFileSync(zipPath, zipBuf);

fs.mkdirSync(target, { recursive: true });

// unzip is preinstalled on GitHub runners and most dev machines; bsdtar
// (macOS/Windows `tar`) also reads zip archives, so fall back to it.
try {
  execFileSync('unzip', ['-oq', zipPath, '-d', target], { stdio: 'inherit' });
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  execFileSync('tar', ['-xf', zipPath, '-C', target], { stdio: 'inherit' });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Extracted Wii.css package to ${target}`);
