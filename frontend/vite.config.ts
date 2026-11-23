import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No Docker o backend é acessado pelo nome do serviço; localmente, por localhost.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3333'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': apiTarget,
    },
  },
})
