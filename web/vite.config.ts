import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5160,
    proxy: {
      // API_PROXY_TARGET 只给 scripts/demo-media.mjs 指向它自己的演示服务用
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4060', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
