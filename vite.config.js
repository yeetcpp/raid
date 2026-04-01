import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'import.meta.env.VITE_FLAG': JSON.stringify(process.env.FLAG || 'Default @123')
  }
})