#!/usr/bin/env node
// Copies Wii.css/assets into Wii.css/dist/assets, mirroring what the Wii.css
// repo's own build.js does. The compiled dist/wii.css references its images as
// url('./assets/...') relative to itself, so when we compile the stylesheet
// with the plain `sass` CLI (npm run dev / build:css) those URLs only resolve
// if dist/assets exists. Without it every mask/icon URL falls through to the
// SPA index.html fallback and the channel grid renders fully transparent.
//
// Fonts are skipped: dist/wii.css doesn't reference them (they ship separately)
// and they account for ~23 of the folder's ~24 MB.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'Wii.css', 'assets');
const dest = path.join(root, 'Wii.css', 'dist', 'assets');

if (!fs.existsSync(src)) {
  console.error(`sync-wii-css-assets: ${src} not found — is the Wii.css submodule checked out?`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, {
  recursive: true,
  filter: (p) => path.basename(p) !== 'fonts' || !fs.statSync(p).isDirectory(),
});
console.log(`sync-wii-css-assets: copied ${path.relative(root, src)} → ${path.relative(root, dest)} (fonts excluded)`);
