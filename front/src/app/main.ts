import { createApp } from 'vue'
import { createPinia } from 'pinia'
import setupInterceptors from '@/api/interceptors'

import App from './App.vue'
import router from '@/router/index'
import '@/styles/globals.css'

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
