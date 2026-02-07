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
    chunkSizeWarningLimit: 1500,  // Suppress warning for chunks larger than 1500 kB
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor': ['react', 'react-dom', 'react-router-dom', 'redux', 'react-redux'],
          'lucide': ['lucide-react'],
          'ui': ['react-hot-toast'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
})