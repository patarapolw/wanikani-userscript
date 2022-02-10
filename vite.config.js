import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'public'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9000'
    }
  }
})
