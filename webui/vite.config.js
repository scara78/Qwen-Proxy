import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version || '0.0.0'),
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': 'http://localhost:3000',
      '/v1beta': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/anthropic': 'http://localhost:3000',
      '/verify': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})