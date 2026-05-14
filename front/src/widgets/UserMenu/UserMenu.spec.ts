import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import UserMenu from './UserMenu.vue'
import { useAuthStore } from '@/stores/auth'

describe('UserMenu', () => {
  it('updates user names when the language changes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }]
    })

    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      username: 'иванов',
      name: 'Иван',
      surname: 'Иванов',
      is_admin: false,
      is_organizer: false
    }

    const instance = i18next.createInstance()
    await instance.init({
      lng: 'ru',
      fallbackLng: 'ru',
      resources: {
        en: { translation: { userMenuUser: 'User', userMenuLogout: 'Logout' } },
        ru: { translation: { userMenuUser: 'Пользователь', userMenuLogout: 'Выйти' } }
      }
    })

    const wrapper = mount(UserMenu, {
      attachTo: document.body,
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia, router]
      }
    })

    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Иван Иванов')
    expect(document.body.textContent).toContain('иванов')

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivan Ivanov')
    expect(document.body.textContent).toContain('ivanov')

    wrapper.unmount()
  })
})
