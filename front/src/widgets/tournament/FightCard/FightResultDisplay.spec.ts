import { mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { describe, expect, it } from 'vitest'
import FightResultDisplay from './FightResultDisplay.vue'

const createI18n = async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'ru',
    resources: {
      ru: {
        translation: {
          fightRoundTimeLabel: 'Время:'
        }
      }
    }
  })

  return instance
}

describe('FightResultDisplay', () => {
  it('does not show R1 prefix for one-round fight time', async () => {
    const i18n = await createI18n()
    const wrapper = mount(FightResultDisplay, {
      props: {
        warningResultScore: null,
        resultDisplay: { score: '2:1', details: '' },
        roundScores: [{ competitor1Score: 2, competitor2Score: 1, durationSeconds: 90 }],
        showRoundTimes: true
      },
      global: { plugins: [[I18NextVue, { i18next: i18n }]] }
    })

    const timeRow = wrapper.find('[data-testid="fight-round-time-display"]')
    expect(timeRow.text()).toBe('Время: 01:30')
    expect(timeRow.text()).not.toContain('R1')
  })

  it('keeps round prefixes when several round times are shown', async () => {
    const i18n = await createI18n()
    const wrapper = mount(FightResultDisplay, {
      props: {
        warningResultScore: null,
        resultDisplay: { score: '4:3', details: '(2:1, 2:2)' },
        roundScores: [
          { competitor1Score: 2, competitor2Score: 1, durationSeconds: 90 },
          { competitor1Score: 2, competitor2Score: 2, durationSeconds: 60 }
        ],
        showRoundTimes: true
      },
      global: { plugins: [[I18NextVue, { i18next: i18n }]] }
    })

    const timeRows = wrapper.findAll('[data-testid="fight-round-time-display"]')
    expect(timeRows.map((row) => row.text())).toEqual(['R1Время: 01:30', 'R2Время: 01:00'])
    expect(timeRows[0].find('span').classes()).toContain('mr-1')
  })
})
