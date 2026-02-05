import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import signalingPlugin from './vite-plugin-signaling.js';

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
  plugins: [react(), signalingPlugin()],
  define: {
    __LAN_HOST__: JSON.stringify(getLanHost()),
  },
  server: {
    host: true,
  },
});
