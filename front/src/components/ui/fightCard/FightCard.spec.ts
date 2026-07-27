import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { createPinia } from 'pinia'
import FightCard from './FightCard.vue'
import FightParticipantLabel from './FightParticipantLabel.vue'
import IssueCardDialog from './IssueCardDialog.vue'
import FightWarningIssueDialog from './FightWarningIssueDialog.vue'
import type { FightData, Fighter } from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

interface FightScoreUpdatePayload {
  roundScores?: RoundScore[]
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
  roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
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

  it('reveals a fourth round only after the last score input blur when round wins are tied', async () => {
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
    const inputs = wrapper.findAll('[data-testid="fight-score-input"]')
    await inputs[0].trigger('blur', { relatedTarget: inputs[1].element })
    expect(wrapper.text()).not.toContain('R4')

    await inputs[5].trigger('blur')
    expect(wrapper.text()).toContain('R4')
  })

  it('highlights tied inputs without revealing an extra round when focus leaves a non-last score input for another fight', async () => {
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
    const nextFightInput = document.createElement('input')
    nextFightInput.dataset.fightScoreInput = 'true'
    document.body.appendChild(nextFightInput)

    const inputs = wrapper.findAll('[data-testid="fight-score-input"]')
    await inputs[0].trigger('blur', { relatedTarget: nextFightInput })

    expect(wrapper.text()).not.toContain('R4')
    expect(inputs[0].classes()).toContain('border-red-500')
    expect(inputs[5].classes()).toContain('border-red-500')
    nextFightInput.remove()
  })

  it('reveals an extra round when focus leaves the last tied fight input for another fight', async () => {
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
    const nextFightInput = document.createElement('input')
    nextFightInput.dataset.fightScoreInput = 'true'
    document.body.appendChild(nextFightInput)

    const inputs = wrapper.findAll('[data-testid="fight-score-input"]')
    await inputs[5].trigger('blur', { relatedTarget: nextFightInput })

    expect(wrapper.text()).toContain('R4')
    nextFightInput.remove()
  })

  it('moves focus to the first extra-round input when Enter leaves the last tied fight input', async () => {
    const instance = i18next.createInstance()
    await instance.init({ lng: 'en', resources: { en: { translation: {} } } })
    const wrapper = mount(FightCard, {
      attachTo: document.body,
      props: {
        fight: {
          ...fight,
          roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
          rounds: 1,
          roundWin: false
        },
        hasAccess: true
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })
    const nextFightInput = document.createElement('input')
    nextFightInput.dataset.fightScoreInput = 'true'
    document.body.appendChild(nextFightInput)

    const inputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    inputs[1].element.dataset.fightScoreEnterNavigation = 'true'
    await inputs[1].trigger('blur', { relatedTarget: nextFightInput })
    await nextTick()

    const updatedInputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    expect(updatedInputs).toHaveLength(4)
    expect(document.activeElement).toBe(updatedInputs[2].element)
    nextFightInput.remove()
    wrapper.unmount()
  })

  it('moves focus to the first extra-round input when Tab leaves the last tied fight input', async () => {
    const instance = i18next.createInstance()
    await instance.init({ lng: 'en', resources: { en: { translation: {} } } })
    const wrapper = mount(FightCard, {
      attachTo: document.body,
      props: {
        fight: {
          ...fight,
          roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
          rounds: 1,
          roundWin: false
        },
        hasAccess: true
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })
    const nextFightInput = document.createElement('input')
    nextFightInput.dataset.fightScoreInput = 'true'
    document.body.appendChild(nextFightInput)

    const inputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    nextFightInput.focus()
    inputs[1].element.dataset.fightScoreTabNavigation = 'true'
    await inputs[1].trigger('blur', { relatedTarget: nextFightInput })
    await nextTick()

    const updatedInputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    expect(updatedInputs).toHaveLength(4)
    expect(document.activeElement).toBe(updatedInputs[2].element)
    nextFightInput.remove()
    wrapper.unmount()
  })

  it('does not highlight the next fight when Enter refocuses to a newly added extra round', async () => {
    const instance = i18next.createInstance()
    await instance.init({ lng: 'en', resources: { en: { translation: {} } } })
    const wrapper = mount(
      {
        components: { FightCard },
        setup() {
          return {
            firstFight: {
              ...fight,
              id: 1,
              number: 1,
              roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
              rounds: 1,
              roundWin: false
            } satisfies FightData,
            secondFight: {
              ...fight,
              id: 2,
              number: 2,
              roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
              rounds: 1,
              roundWin: false
            } satisfies FightData
          }
        },
        template: `
          <div>
            <FightCard :fight="firstFight" :has-access="true" />
            <FightCard :fight="secondFight" :has-access="true" />
          </div>
        `
      },
      {
        attachTo: document.body,
        global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
      }
    )

    const inputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    inputs[2].element.focus()
    inputs[1].element.dataset.fightScoreEnterNavigation = 'true'
    await inputs[1].trigger('blur', { relatedTarget: inputs[2].element })
    await nextTick()
    await nextTick()

    const updatedInputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    expect(updatedInputs).toHaveLength(6)
    expect(document.activeElement).toBe(updatedInputs[2].element)
    expect(updatedInputs[4].classes()).not.toContain('border-red-500')
    expect(updatedInputs[5].classes()).not.toContain('border-red-500')
    expect(updatedInputs[4].element.dataset.fightScoreSuppressExternalTieHighlight).toBeUndefined()
    wrapper.unmount()
  })

  it('adds another extra round when focus leaves the last tied extra-round input', async () => {
    const instance = i18next.createInstance()
    await instance.init({ lng: 'en', resources: { en: { translation: {} } } })
    const wrapper = mount(FightCard, {
      props: {
        fight: {
          ...fight,
          roundScores: [
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 }
          ],
          rounds: 1,
          roundWin: false
        },
        hasAccess: true
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })
    const nextFightInput = document.createElement('input')
    nextFightInput.dataset.fightScoreInput = 'true'
    document.body.appendChild(nextFightInput)

    const inputs = wrapper.findAll('[data-testid="fight-score-input"]')
    await inputs[3].trigger('blur', { relatedTarget: nextFightInput })

    expect(wrapper.text()).toContain('R3')
    nextFightInput.remove()
  })

  it('keeps the first stale extra round with warnings and trims later rounds before confirmation', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            disciplinaryCardsCancel: 'No',
            fightExtraRoundWarningRemovalConfirm: 'Yes',
            fightExtraRoundWarningRemovalDescription: 'Delete round {{round}}?',
            fightExtraRoundWarningRemovalTitle: 'Delete extra round?'
          }
        }
      }
    })
    const wrapper = mount(FightCard, {
      attachTo: document.body,
      props: {
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          roundScores: [
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 }
          ],
          warnings: [
            { competitorId: 101, round: 2, reason: 'Holding' },
            { competitorId: 202, round: 3, reason: 'Late strike' }
          ],
          rounds: 1,
          roundWin: false
        },
        hasAccess: true
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    const inputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    await inputs[0].setValue('3')
    await inputs[0].trigger('blur')
    await nextTick()

    const emittedEvents = wrapper.emitted('update:score') as FightScoreUpdatePayload[][]
    const latestPayload = emittedEvents.at(-1)?.[0]
    expect(wrapper.text()).toContain('R2')
    expect(wrapper.text()).not.toContain('R3')
    expect(latestPayload?.roundScores).toEqual([
      { competitor1Score: 3, competitor2Score: 0 },
      { competitor1Score: 0, competitor2Score: 0 }
    ])
    expect(latestPayload?.warnings).toEqual([{ competitorId: 101, round: 2, reason: 'Holding' }])
    expect(
      document.body.querySelector('[data-testid="extra-round-warning-removal-confirm"]')
    ).not.toBeNull()
    wrapper.unmount()
  })

  it('deletes the stale extra round and its warnings after confirmation', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            disciplinaryCardsCancel: 'No',
            fightExtraRoundWarningRemovalConfirm: 'Yes',
            fightExtraRoundWarningRemovalDescription: 'Delete round {{round}}?',
            fightExtraRoundWarningRemovalTitle: 'Delete extra round?'
          }
        }
      }
    })
    const wrapper = mount(FightCard, {
      attachTo: document.body,
      props: {
        fight: {
          ...fight,
          competitor1Id: 101,
          competitor2Id: 202,
          roundScores: [
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 },
            { competitor1Score: 0, competitor2Score: 0 }
          ],
          warnings: [{ competitorId: 101, round: 2, reason: 'Holding' }],
          rounds: 1,
          roundWin: false
        },
        hasAccess: true
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    const inputs = wrapper.findAll<HTMLInputElement>('[data-testid="fight-score-input"]')
    await inputs[0].setValue('3')
    await inputs[0].trigger('blur')
    await nextTick()

    const confirmButton = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="extra-round-warning-removal-confirm"]'
    )
    expect(confirmButton).not.toBeNull()
    confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const emittedEvents = wrapper.emitted('update:score') as FightScoreUpdatePayload[][]
    const latestPayload = emittedEvents.at(-1)?.[0]
    expect(wrapper.text()).not.toContain('R2')
    expect(latestPayload?.roundScores).toEqual([{ competitor1Score: 3, competitor2Score: 0 }])
    expect(latestPayload?.warnings).toEqual([])
    wrapper.unmount()
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

  it('formats a fixed one-round warning result with the effective total first', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            fightWarningReasonTooltip: 'Warning: {{reason}}',
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
          fighter1Score: 0,
          fighter2Score: 0,
          fighter1EffectiveScore: 0,
          fighter2EffectiveScore: 3,
          roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
          warnings: [{ competitorId: 101, round: 1, reason: 'Holding' }],
          rounds: 1,
          roundWin: false,
          isResultValid: true,
          isFinished: true
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    expect(wrapper.find('strong').text()).toBe('0:3')
    expect(wrapper.find('.fight-result-details').text()).toBe('(0:0+3)')
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

  it('reveals an extra round when a one-round warning makes the effective score tied', async () => {
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
          roundScores: [{ competitor1Score: 3, competitor2Score: 0 }],
          isFinished: false
        }
      },
      global: { plugins: [createPinia(), [I18NextVue, { i18next: instance }]] }
    })

    wrapper.findComponent(FightParticipantLabel).vm.$emit('issue-warning')
    await nextTick()
    const issueDialog = wrapper.findComponent(FightWarningIssueDialog)
    issueDialog.vm.$emit('update:reason', 'Holding')
    await nextTick()
    issueDialog.vm.$emit('confirm')
    await nextTick()

    const emittedEvents = wrapper.emitted('update:score') as FightScoreUpdatePayload[][]
    const emitted = emittedEvents.at(-1)?.[0]
    expect(emitted?.warnings).toEqual([{ competitorId: 101, round: 1, reason: 'Holding' }])
    expect(emitted?.roundScores).toEqual([
      { competitor1Score: 3, competitor2Score: 0 },
      { competitor1Score: 0, competitor2Score: 0 }
    ])
    expect(wrapper.text()).toContain('R2')
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
    const reasonInput = () => wrapper.find<HTMLInputElement>('[data-testid="fight-warning-reason-input"]')

    expect(confirmButton().element.disabled).toBe(true)
    await reasonInput().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await wrapper.setProps({ reason: 'Holding' })
    expect(confirmButton().element.disabled).toBe(false)
    await reasonInput().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    wrapper.unmount()
  })

  it('issues a disciplinary card on Enter when the reason is present', async () => {
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            disciplinaryCardsCancel: 'Cancel',
            disciplinaryCardsDate: 'Date',
            disciplinaryCardsIssueDescription: 'Enter card',
            disciplinaryCardsIssueTitle: 'Card',
            disciplinaryCardsReason: 'Reason',
            disciplinaryCardsRed: 'Red',
            disciplinaryCardsSave: 'Save',
            disciplinaryCardsType: 'Type',
            disciplinaryCardsYellow: 'Yellow'
          }
        }
      }
    })
    const wrapper = mount(IssueCardDialog, {
      attachTo: document.body,
      props: {
        open: true,
        fighter: fighter(1, 'Ivanov'),
        type: 'YELLOW',
        date: '2026-07-24',
        reason: '   ',
        isIssuing: false
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

    const reasonInput = () => wrapper.find<HTMLInputElement>('[data-testid="card-reason-input"]')
    await reasonInput().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('issue')).toBeUndefined()

    await wrapper.setProps({ reason: 'Late strike' })
    await reasonInput().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('issue')).toHaveLength(1)

    await wrapper.setProps({ isIssuing: true })
    await reasonInput().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('issue')).toHaveLength(1)
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
