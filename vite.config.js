import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Static assets in client/public/* get copied to dist root at build time.
  // Files referenced by absolute path (e.g. /sounds/foo.mp3) come from here.
  publicDir: 'client/public',
  build: {
    outDir: 'server/dist'
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true }
    }
  }
})