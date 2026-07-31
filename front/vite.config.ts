import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), vueJsx(), tailwindcss(), VueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('/vue/') || id.includes('/@vue/') || id.includes('/pinia/')) {
            return 'vendor-vue'
          }

          if (id.includes('/vue-router/')) {
            return 'vendor-router'
          }

          if (id.includes('/i18next') || id.includes('/i18next-vue/')) {
            return 'vendor-i18n'
          }

          if (id.includes('/axios/')) {
            return 'vendor-http'
          }

          if (id.includes('/@internationalized/')) {
            return 'vendor-date'
          }

          if (id.includes('/vue-country-flag-next/')) {
            return 'vendor-flags'
          }

          if (id.includes('/transliteration/') || id.includes('/speakingurl/')) {
            return 'vendor-text'
          }

          if (
            id.includes('/reka-ui/') ||
            id.includes('/@vueuse/') ||
            id.includes('/lucide-vue-next/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/tailwind-merge/') ||
            id.includes('/clsx/')
          ) {
            return 'vendor-ui'
          }

          return 'vendor'
        }
      }
    }
  }
})
