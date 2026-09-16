import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    allowedHosts: ['.monkeycode-ai.online', '.monkeycode-ai.com'],
    proxy: {
      '/api': {
        // 可用 API_TARGET 环境变量覆盖（本地联调指向 3011 等端口）
        target: process.env.API_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.API_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})