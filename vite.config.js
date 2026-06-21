import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import signalingPlugin from './vite-plugin-signaling.js';
import miicreatorPlugin from './vite-plugin-miicreator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRendererRoot = path.resolve(__dirname, '../wewad/packages/wii-channel-renderer/src');

// The aliases below redirect the published @firstform/wii-channel-renderer to a
// local checkout for development. That sibling checkout doesn't exist in CI (or
// on a fresh clone), so only apply the aliases when it's actually present —
// otherwise fall back to the npm package, which exposes the same entry points.
const hasLocalRenderer = fs.existsSync(localRendererRoot);

// `miicreator` is wired up as a local file: dependency that isn't published to
// npm. When that package can't be resolved (e.g. on GitHub Actions), leave its
// dynamic import external so the build still succeeds — the Mii-head rendering
// that depends on it degrades gracefully at runtime via its try/catch.
const hasMiicreator = fs.existsSync(
  path.resolve(__dirname, 'node_modules', 'miicreator', 'package.json'),
);

function getLanHost() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '';
}

export default defineConfig(({ command }) => {
  const rendererAliases = hasLocalRenderer
    ? [
        {
          find: '@firstform/wii-channel-renderer/bundle-loader',
          replacement: path.join(localRendererRoot, 'bundleLoader.js'),
        },
        {
          find: '@firstform/wii-channel-renderer/bundle-renderer',
          replacement: path.join(localRendererRoot, 'bundleRenderer.js'),
        },
        {
          find: '@firstform/wii-channel-renderer',
          replacement: path.join(localRendererRoot, 'index.js'),
        },
      ]
    : [];

  // Unlike the production build (which externalizes `miicreator` — see below),
  // the dev server statically resolves the bare-specifier dynamic import of
  // `miicreator/primitives` in src/hooks/useMiiHead.js and 500s when the local
  // `miicreator` checkout is missing. Point it at a stub that resolves cleanly
  // but throws when used, so the hook's existing try/catch degrades gracefully.
  const miicreatorDevStub =
    command === 'serve' && !hasMiicreator
      ? [
          {
            find: 'miicreator/primitives',
            replacement: path.resolve(__dirname, 'dev-stubs/miicreator-primitives.js'),
          },
        ]
      : [];

  return {
    base: '/wiishowcase/',
    plugins: [react(), signalingPlugin(), miicreatorPlugin()],
    define: {
      __LAN_HOST__: JSON.stringify(getLanHost()),
    },
    resolve: {
      alias: [...rendererAliases, ...miicreatorDevStub],
      preserveSymlinks: false,
    },
    build: {
      target: 'esnext',
      // Vite 8 renamed `rollupOptions` to `rolldownOptions` (Rolldown is now the
      // bundler). The old name still works but emits a deprecation warning.
      rolldownOptions: hasMiicreator ? {} : { external: [/^miicreator(\/|$)/] },
    },
    server: {
      host: true,
    },
  };
});
