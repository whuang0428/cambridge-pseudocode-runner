import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/cambridge-pseudocode-runner/',
  plugins: [react()],
})
