import { mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { describe, expect, it } from 'vitest'
import FightScoreEditor from './FightScoreEditor.vue'

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

describe('FightScoreEditor', () => {
  it('renders round time control in the same row as editable score', async () => {
    const i18n = await createI18n()
    const wrapper = mount(FightScoreEditor, {
      props: {
        visibleRoundScores: [{ competitor1Score: 2, competitor2Score: 1, durationSeconds: 90 }],
        canEditScores: true,
        showRoundTimes: true,
        highlightTieBreakRequired: false,
        bonusForScore: () => 0
      },
      global: { plugins: [[I18NextVue, { i18next: i18n }]] }
    })

    const row = wrapper.find('[data-testid="fight-score-input"]')
    const timeControl = wrapper.find('[data-testid="fight-round-time-editor"]')

    expect(row.exists()).toBe(true)
    expect(timeControl.exists()).toBe(true)
    expect(timeControl.classes()).not.toContain('col-span-full')
    expect(timeControl.text()).toContain('Время:')
  })
})
