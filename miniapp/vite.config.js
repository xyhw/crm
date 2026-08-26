import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    allowedHosts: ['.monkeycode-ai.online', '.monkeycode-ai.com'],
  },
})