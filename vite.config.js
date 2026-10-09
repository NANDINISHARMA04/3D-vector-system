import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, host: true },
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
  build: {
    rollupOptions: {
      input: {
        vector: resolve(import.meta.dirname, 'index.html'),
        body: resolve(import.meta.dirname, 'body.html'),
      },
    },
  },
});
