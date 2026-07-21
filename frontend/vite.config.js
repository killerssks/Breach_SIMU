import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiBypass = (req, res, proxyOptions) => {
  if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
    return '/index.html';
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 🔥 important
    port: 5173,
    allowedHosts: [
      ".ngrok-free.app"   // 🔥 allow ngrok
    ],
    proxy: {
      '/phishing': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/phishing-site': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/dashboard': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/export': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/scanner': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/sandbox': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/ddos': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/bruteforce': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})