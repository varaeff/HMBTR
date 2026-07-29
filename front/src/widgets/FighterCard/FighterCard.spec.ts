import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import FighterCard from './FighterCard.vue'

describe('FighterCard', () => {
  it('updates card data when the language changes', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'ru',
      fallbackLng: 'ru',
      resources: {
        en: { translation: {} },
        ru: { translation: {} }
      }
    })

    const wrapper = mount(FighterCard, {
      props: {
        name: 'Иванов Иван',
        description: 'Москва Спарта'
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]]
      }
    })

    expect(wrapper.text()).toContain('Иванов Иван')
    expect(wrapper.text()).toContain('Москва Спарта')

    await instance.changeLanguage('en')
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov Ivan')
    expect(wrapper.text()).toContain('Moskva Sparta')
  })
})
