import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api to Wrangler dev server
      '/api': 'http://127.0.0.1:8787'
    }
  }
})
