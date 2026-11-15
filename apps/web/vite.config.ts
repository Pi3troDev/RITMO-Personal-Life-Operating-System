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
      // A API (apps/api) escuta aqui. Mesma origem para o navegador, então o cookie do refresh token
      // funciona sem CORS. Em modo demonstração o MSW responde /api antes de a requisição sair.
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
});
