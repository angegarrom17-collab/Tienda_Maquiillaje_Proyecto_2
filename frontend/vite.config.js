import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configuración de Vite. El puerto 5173 coincide con CORS_ALLOWED_ORIGINS del backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})