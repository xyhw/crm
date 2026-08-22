import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'admin-html-fallback',
      configureServer(server) {
        return () => {
          const handler = (req, res, next) => {
            const url = req.url.split('?')[0];
            if (url.startsWith('/admin') && !url.startsWith('/api') && !url.includes('.')) {
              req.url = '/admin.html';
            }
            next();
          };
          const stack = server.middlewares.stack;
          const spaIdx = stack.findIndex(
            (s) => s.handle?.name === 'viteSpaFallbackMiddleware'
          );
          if (spaIdx >= 0) {
            stack.splice(spaIdx, 0, { route: '', handle: handler });
          } else {
            stack.unshift({ route: '', handle: handler });
          }
        };
      },
    },
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
