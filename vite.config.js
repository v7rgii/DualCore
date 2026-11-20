import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Las peticiones a /api las atiende el servidor de datos (server/index.mjs).
// Se usa 127.0.0.1 (no «localhost») porque el servidor solo escucha en esa dirección.
const proxy = { '/api': 'http://127.0.0.1:3001' };

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  // `npm run share`: versión compilada para enseñarla por un enlace público (túnel de Cloudflare).
  preview: {
    port: 4173,
    proxy,
    allowedHosts: ['.trycloudflare.com'],
  },
});
