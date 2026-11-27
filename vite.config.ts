import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { recognize } from './server/recognition'

export default defineConfig({
  plugins: [tailwindcss(), {
    name: 'local-wardrobe-recognition',
    configureServer(server) {
      server.middlewares.use('/api/wardrobe/recognize', recognize)
    },
  }],
})
