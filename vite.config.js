import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import signalingPlugin from './vite-plugin-signaling.js';
import miicreatorPlugin from './vite-plugin-miicreator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRendererRoot = path.resolve(__dirname, '../wewad/packages/wii-channel-renderer/src');

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

export default defineConfig({
  base: '/wiishowcase/',
  plugins: [react(), signalingPlugin(), miicreatorPlugin()],
  define: {
    __LAN_HOST__: JSON.stringify(getLanHost()),
  },
  resolve: {
    alias: [
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
    ],
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['three'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    host: true,
  },
});
