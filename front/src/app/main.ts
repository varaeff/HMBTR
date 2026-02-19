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

const app = createApp(App)

app.use(createPinia())
setupInterceptors()
app.use(router)

setupI18n(app)

app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

app.mount('#app')
