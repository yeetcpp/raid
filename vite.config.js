import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'import.meta.env.VITE_FLAG': JSON.stringify('__FLAG_PLACEHOLDER__')
  }
})