import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    // если хотите — можно оставить порт, корс и т.п.
    proxy: {}, // ничего не проксируем
  },
})
