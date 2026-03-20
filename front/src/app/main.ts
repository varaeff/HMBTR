import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router/index'
import setupInterceptors from '@/api/interceptors'
import setupI18n from '@/i18n'
import '@/styles/globals.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import { useAuthInit } from '@/composables/useAuthInit'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

setupInterceptors(pinia)

const { initAuth } = useAuthInit()
await initAuth()

app.use(router)

setupI18n(app)

app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

app.mount('#app')
