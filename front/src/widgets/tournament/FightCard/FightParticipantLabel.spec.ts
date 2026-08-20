import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import FightParticipantLabel from './FightParticipantLabel.vue'
import type { ActiveDisciplinaryCardSummary, Fighter } from '@/model'

const createI18n = async () => {
  const instance = i18next.createInstance()

  await instance.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          disciplinaryCardsIssueAction: 'Issue card',
          disciplinaryCardsReasonAUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT:
            'Automatic red for 2 yellows',
          fighterWithdrawalMarkerTitle: 'Fighter withdrew: {{reason}}',
          fightWarningIssueAction: 'Issue warning',
          fightWarningRemoveAction: 'Remove warning'
        }
      }
    }
  })

  return instance
}

const fighter: Fighter = {
  id: 1,
  name: 'Red',
  surname: 'Fighter',
  birthday: null,
  country_id: 1,
  city_id: 1,
  country: 'Country',
  city: 'City',
  club: 'Club'
}

const activeRedCard: ActiveDisciplinaryCardSummary = {
  id: 1,
  fighter_id: 1,
  tournament_id: 1,
  tournament_name: 'Cup',
  reason: 'AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT',
  type: 'RED',
  active: true,
  received_at: '2026-05-19T00:00:00.000Z',
  expires_at: '2026-06-19T00:00:00.000Z'
}

describe('FightParticipantLabel', () => {
  it('keeps active card hints on fight fighter icons', async () => {
    const instance = await createI18n()

    const wrapper = mount(FightParticipantLabel, {
      props: {
        surname: 'Fighter',
        fighter,
        cardTypes: [activeRedCard],
        warningMarkers: [],
        warningTitle: '',
        canOpenMenu: false,
        canIssueCard: false,
        canIssueWarning: false,
        canRemoveWarnings: false,
        canWithdraw: false,
        canCancelWithdrawal: false
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          CardStatusIcon: true
        }
      }
    })

    expect(wrapper.find('[title="Cup: Automatic red for 2 yellows"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('renders withdrawal marker with the reason tooltip', async () => {
    const instance = await createI18n()

    const wrapper = mount(FightParticipantLabel, {
      props: {
        surname: 'Fighter',
        fighter,
        withdrawal: {
          id: 9,
          competitorId: 101,
          reason: 'injury',
          isExcused: true,
          source: 'FIGHT',
          sourceFightId: 7
        },
        warningMarkers: [],
        warningTitle: '',
        canOpenMenu: false,
        canIssueCard: false,
        canIssueWarning: false,
        canRemoveWarnings: false,
        canWithdraw: false,
        canCancelWithdrawal: false
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]]
      }
    })

    const marker = wrapper.find('[title="Fighter withdrew: injury"]')
    const icon = marker.find('svg')

    expect(marker.exists()).toBe(true)
    expect(marker.element.tagName).toBe('SPAN')
    expect(icon.attributes('class')).toContain('h-[19px]')
    expect(icon.attributes('class')).toContain('w-[19px]')
    expect(icon.attributes('stroke-width')).toBe('3')

    wrapper.unmount()
  })
})
