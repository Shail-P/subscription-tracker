import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // React compiles TSX and supports development refresh; Tailwind builds CSS.
  plugins: [react(), tailwindcss()],
  // Relative asset URLs also work when Electron loads dist/index.html from disk.
  base: './',
})
