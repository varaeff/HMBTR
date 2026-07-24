import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { createPinia } from 'pinia'
import FightCard from './FightCard.vue'
import FightParticipantLabel from './FightParticipantLabel.vue'
import FightWarningIssueDialog from './FightWarningIssueDialog.vue'
import type { FightData, Fighter } from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

interface FightScoreUpdatePayload {
  f1?: number
  f2?: number
  roundScores?: RoundScore[]
  tieBreakRoundRevealed?: boolean
  warnings?: FightWarning[]
}

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

  it('renders warning markers and fixed score bonuses', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            fightWarningRoundReasonTooltip: 'Warning (round {{round}}): {{reason}}',
            fightWarningTooltip: 'Warning'
          }
        }
      }
    })
    const wrapper = mount(FightCard, {
      props: {
        hasAccess: true,
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          fighter1Score: 8,
          fighter2Score: 12,
          fighter1EffectiveScore: 11,
          fighter2EffectiveScore: 15,
          roundScores: [
            { competitor1Score: 2, competitor2Score: 4 },
            { competitor1Score: 5, competitor2Score: 5 },
            { competitor1Score: 1, competitor2Score: 3 }
          ],
          warnings: [
            { competitorId: 202, round: 1, reason: 'Holding' },
            { competitorId: 101, round: 3, reason: 'Late strike' }
          ],
          rounds: 3,
          roundWin: false,
          isResultValid: true,
          isFinished: true
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    expect(wrapper.findAll('[data-testid="fight-warning-marker"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('(3)')
    expect(wrapper.text()).toContain('(1)')
    expect(wrapper.findAll('[data-testid="fight-warning-marker"]')[0].attributes('title')).toBe(
      'Warning (round 3): Late strike'
    )
    expect(wrapper.find('strong').text()).toBe('11:15')
    expect(wrapper.find('.fight-result-details').text()).toBe('(2+3:4, 5:5, 1:3+3)')
    expect(wrapper.text()).toContain('+3')
  })

  it('blocks score inputs after the third warning before result fixation', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: { en: { translation: { fightWarningTooltip: 'Warning' } } }
    })
    const wrapper = mount(FightCard, {
      props: {
        hasAccess: true,
        canIssueCards: true,
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          warnings: [
            { competitorId: 101, round: 1, reason: 'First warning' },
            { competitorId: 101, round: 1, reason: 'Second warning' },
            { competitorId: 101, round: 1, reason: 'Third warning' }
          ],
          isFinished: false
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(2)
    expect(inputs.every((input) => input.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.findAll('[data-testid="fight-warning-marker"]')).toHaveLength(3)
  })

  it('requires a reason before issuing a single-round warning', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            disciplinaryCardsCancel: 'Cancel',
            fightWarningIssueAction: 'Issue warning',
            fightWarningIssueReasonDescription: 'Enter reason',
            fightWarningIssueReasonTitle: 'Warning reason',
            fightWarningReasonLabel: 'Reason'
          }
        }
      }
    })
    const wrapper = mount(FightCard, {
      props: {
        hasAccess: true,
        canIssueCards: true,
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          isFinished: false
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    wrapper.findComponent(FightParticipantLabel).vm.$emit('issue-warning')
    await nextTick()

    const issueDialog = wrapper.findComponent(FightWarningIssueDialog)
    expect(issueDialog.props('open')).toBe(true)
    expect(issueDialog.props('reason')).toBe('')

    issueDialog.vm.$emit('update:reason', 'Holding')
    await nextTick()
    issueDialog.vm.$emit('confirm')

    const emitted = wrapper.emitted('update:score')?.[0]?.[0] as FightScoreUpdatePayload
    expect(emitted.warnings).toEqual([{ competitorId: 101, round: 1, reason: 'Holding' }])
  })

  it('issues a multi-round warning with the selected round and reason', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            disciplinaryCardsCancel: 'Cancel',
            fightWarningIssueAction: 'Issue warning',
            fightWarningIssueReasonDescription: 'Enter reason',
            fightWarningIssueReasonTitle: 'Warning reason',
            fightWarningReasonLabel: 'Reason',
            fightWarningRoundLabel: 'Round {{round}}'
          }
        }
      }
    })
    const wrapper = mount(FightCard, {
      props: {
        hasAccess: true,
        canIssueCards: true,
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          rounds: 3,
          roundWin: false,
          roundScores: [
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 }
          ],
          isFinished: false
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    wrapper.findComponent(FightParticipantLabel).vm.$emit('issue-warning')
    await nextTick()
    const issueDialog = wrapper.findComponent(FightWarningIssueDialog)
    issueDialog.vm.$emit('update:selectedRound', 2)
    issueDialog.vm.$emit('update:reason', 'Late strike')
    await nextTick()
    issueDialog.vm.$emit('confirm')

    const emitted = wrapper.emitted('update:score')?.[0]?.[0] as FightScoreUpdatePayload
    expect(emitted.warnings).toEqual([{ competitorId: 101, round: 2, reason: 'Late strike' }])
  })

  it('keeps the warning issue button disabled until a reason is present', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            disciplinaryCardsCancel: 'Cancel',
            fightWarningIssueAction: 'Issue warning',
            fightWarningIssueReasonDescription: 'Enter reason',
            fightWarningIssueReasonTitle: 'Warning reason',
            fightWarningReasonLabel: 'Reason'
          }
        }
      }
    })
    const wrapper = mount(FightWarningIssueDialog, {
      attachTo: document.body,
      props: {
        open: true,
        rounds: 1,
        issueRounds: [1],
        selectedRound: 1,
        reason: '   '
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Dialog: { template: '<div><slot /></div>' },
          DialogContent: { template: '<div><slot /></div>' },
          DialogDescription: { template: '<div><slot /></div>' },
          DialogFooter: { template: '<div><slot /></div>' },
          DialogHeader: { template: '<div><slot /></div>' },
          DialogTitle: { template: '<div><slot /></div>' }
        }
      }
    })

    const confirmButton = () =>
      wrapper.find<HTMLButtonElement>('[data-testid="fight-warning-issue-confirm"]')

    expect(confirmButton().element.disabled).toBe(true)

    await wrapper.setProps({ reason: 'Holding' })
    expect(confirmButton().element.disabled).toBe(false)
    wrapper.unmount()
  })

  it('removes the warning selected from a marker context menu', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: { en: { translation: { fightWarningTooltip: 'Warning' } } }
    })
    const wrapper = mount(FightCard, {
      props: {
        hasAccess: true,
        canIssueCards: true,
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          warnings: [
            { competitorId: 101, round: 1, reason: 'First warning' },
            { competitorId: 202, round: 1, reason: 'Second warning' },
            { competitorId: 101, round: 1, reason: 'Third warning' }
          ],
          isFinished: false
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    wrapper.findComponent(FightParticipantLabel).vm.$emit('remove-warning', 2)

    const emitted = wrapper.emitted('update:score')?.[0]?.[0] as FightScoreUpdatePayload
    expect(emitted.warnings).toEqual([
      { competitorId: 101, round: 1, reason: 'First warning' },
      { competitorId: 202, round: 1, reason: 'Second warning' }
    ])
  })
})
