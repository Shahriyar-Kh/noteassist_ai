import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'redux', 'react-redux'],
          'lucide': ['lucide-react'],
          'ui': ['react-hot-toast'],
        }
      }
    }
  },
  server: {
    port: 5173,
    // ─── FIX: COOP header so Google Sign-In popup can postMessage back ──────
    // By default browsers treat pages as 'same-origin' COOP, which blocks
    // cross-origin popup → opener communication (the Google OAuth/GSI flow).
    // Setting 'same-origin-allow-popups' allows the callback popup to reach
    // window.opener without being blocked.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none', // keep loose so Google iframes load
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
})