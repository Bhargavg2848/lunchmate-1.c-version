import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split Mapbox into its own file
          if (id.includes('mapbox-gl')) {
            return 'mapbox';
          }
          // Split PDF generators into their own file
          if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
            return 'pdf-generator';
          }
          // Split Supabase into its own file
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          // Split React core into its own file
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
        }
      }
    }
  }
})
