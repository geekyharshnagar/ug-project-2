import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev/preview proxy below is ONLY a development-time CORS fallback for the
// MedlinePlus web service. It is not a backend: nothing is stored or processed.
const proxy = {
  '/proxy/medlineplus': {
    target: 'https://wsearch.nlm.nih.gov',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/proxy\/medlineplus/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
