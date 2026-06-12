import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { createPinia } from 'pinia'
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
  fighter2Score: 0,
  roundScores: [],
  rounds: 1,
  roundWin: false,
  isResultValid: false
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
        plugins: [createPinia(), [I18NextVue, { i18next: instance }]]
      }
    })

    expect(wrapper.text()).toContain('Иванов')
    expect(wrapper.text()).toContain('Петров')

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov')
    expect(wrapper.text()).toContain('Petrov')
  })

  it('reveals a fourth round after blur when round wins are tied', async () => {
    const instance = i18next.createInstance()
    await instance.init({ lng: 'en', resources: { en: { translation: {} } } })
    const multiRoundFight: FightData = {
      ...fight,
      roundScores: [
        { competitor1Score: 0, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 0 }
      ],
      rounds: 3,
      roundWin: true
    }
    const wrapper = mount(FightCard, {
      props: { fight: multiRoundFight, hasAccess: true },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    expect(wrapper.text()).not.toContain('R4')
    await wrapper.find('input').trigger('blur')
    expect(wrapper.text()).toContain('R4')
  })

  it('formats a fixed round-win result compactly', async () => {
    const instance = i18next.createInstance()
    await instance.init({ lng: 'en', resources: { en: { translation: {} } } })
    const wrapper = mount(FightCard, {
      props: {
        hasAccess: true,
        fight: {
          ...fight,
          fighter1Score: 11,
          fighter2Score: 10,
          roundScores: [
            { competitor1Score: 5, competitor2Score: 3 },
            { competitor1Score: 2, competitor2Score: 4 },
            { competitor1Score: 1, competitor2Score: 1 },
            { competitor1Score: 3, competitor2Score: 2 }
          ],
          rounds: 3,
          roundWin: true,
          isResultValid: true,
          isFinished: true
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    expect(wrapper.find('strong').text()).toBe('2:1')
    expect(wrapper.find('.fight-result-details').text()).toBe('(5:3, 2:4, 1:1, 3:2)')
    expect(wrapper.find('.fight-result-details').classes()).toContain('font-normal')
  })
})
