import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Expose on LAN so companion (phone) can reach this dev server
    host: true,
  },
});
