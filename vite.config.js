import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import signalingPlugin from './vite-plugin-signaling.js';
import miicreatorPlugin from './vite-plugin-miicreator.js';

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
