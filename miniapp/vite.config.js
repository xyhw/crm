import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
// API 代理目标：开发默认走本地后端 3001，Docker 环境用 API_TARGET 走 nginx 80 反代
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:3001'

export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    allowedHosts: ['.monkeycode-ai.online', '.monkeycode-ai.com'],
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})