import { createApp } from 'vue'
import { createPinia } from 'pinia'
import setupInterceptors from '@/api/interceptors'

import App from './App.vue'
import router from '@/router/index'
import '@/styles/globals.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

const app = createApp(App)

app.use(createPinia())
setupInterceptors()
app.use(router)

app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

app.mount('#app')
