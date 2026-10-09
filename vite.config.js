import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { assistantMiddleware } from './server/assistant.js';

// Serves the AI assistant API (/api/*) from both `npm run dev` and `npm run preview`,
// so the Anthropic API key stays on the server (put it in a local .env file).
const assistantApi = () => ({
  name: 'body-explorer-api',
  configureServer(server) {
    server.middlewares.use('/api', assistantMiddleware());
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api', assistantMiddleware());
  },
});

export default defineConfig(({ mode }) => {
  // Load ANTHROPIC_* from .env into process.env for the server-side assistant only.
  const env = loadEnv(mode, process.cwd(), 'ANTHROPIC_');
  for (const [k, v] of Object.entries(env)) process.env[k] ??= v;

  return {
    plugins: [assistantApi()],
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
  };
});
