import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'www-dist'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9000'
    }
  }
})
