import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api/xaman': {
        target: 'https://xumm.app/api/v1/platform',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xaman/, ''),
      },
    },
  },
})

