import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path para GitHub Pages.
// Cambiar a '/' cuando se despliegue en infraestructura corporativa propia.
export default defineConfig({
  plugins: [react()],
  base: '/noc-turnos-avatel/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
