import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build from source (not pre-built bundle)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'index-dev.html',
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: 'asset-[name][extname]',
      },
    },
  },
})
