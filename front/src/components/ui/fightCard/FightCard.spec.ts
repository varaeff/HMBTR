import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import FightCard from './FightCard.vue'
import type { FightData, Fighter } from '@/model'

const fighter = (id: number, surname: string): Fighter => ({
  id,
  name: `Имя ${id}`,
  surname,
  birthday: null,
  country: 'Россия',
  city: 'Москва'
})

const fight: FightData = {
  id: 1,
  number: 1,
  fighter1: fighter(1, 'Иванов'),
  fighter2: fighter(2, 'Петров'),
  fighter1Score: 0,
  fighter2Score: 0
}

describe('FightCard', () => {
  it('updates fighter names when the language changes', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'ru',
      fallbackLng: 'ru',
      resources: {
        en: { translation: {} },
        ru: { translation: {} }
      }
    })

    const wrapper = mount(FightCard, {
      props: { fight, hasAccess: false },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]]
      }
    })

    expect(wrapper.text()).toContain('Иванов - Петров')

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov - Petrov')
  })
})
