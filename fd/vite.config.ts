import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 所有 /api 开头的请求代理到后端
      '/api': {
        target: 'http://localhost:7777',
        changeOrigin: true,
      },
    },
  },
})
