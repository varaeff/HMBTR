import i18n from 'i18next'
import I18NextVue from 'i18next-vue'
import type { App } from 'vue'
import en from './locales/en.json'
import ru from './locales/ru.json'

const savedLanguage = localStorage.getItem('HMBTRi18nextLng') || 'ru'

if (!localStorage.getItem('HMBTRi18nextLng')) {
  localStorage.setItem('HMBTRi18nextLng', 'ru')
}

i18n.init({
  lng: savedLanguage,
  fallbackLng: 'ru',
  resources: {
    en: { translation: en },
    ru: { translation: ru }
  },
  interpolation: {
    escapeValue: false
  }
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('HMBTRi18nextLng', lng)
})

export default function setupI18n(app: App) {
  app.use(I18NextVue, { i18next: i18n })
  return i18n
}
