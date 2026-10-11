import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  server: {
    allowedHosts: true,
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx']
    }
  },
})
