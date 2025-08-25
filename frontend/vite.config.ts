// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '^/(auth|folders|notes|files|users)(/|$)': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})