import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // The API (apps/api) will listen here once it exists. In demo mode the
      // mock service worker answers /api before the request leaves the browser.
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
});
