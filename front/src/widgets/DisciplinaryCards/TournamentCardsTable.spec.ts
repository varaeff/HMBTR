import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import TournamentCardsTable from './TournamentCardsTable.vue'
import type { DisciplinaryCard } from '@/model'

const createI18n = async () => {
  const instance = i18next.createInstance()

  await instance.init({
    lng: 'ru',
    fallbackLng: 'ru',
    resources: {
      en: {
        translation: {
          disciplinaryCardsType: 'Type',
          disciplinaryCardsFighter: 'Fighter',
          disciplinaryCardsDate: 'Date',
          disciplinaryCardsFight: 'Fight',
          disciplinaryCardsOpponent: 'Opponent',
          disciplinaryCardsReason: 'Reason',
          disciplinaryCardsExpires: 'Expires',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsYellow: 'Yellow',
          disciplinaryCardsRed: 'Red',
          disciplinaryCardsGroup: 'group',
          tournamentPageBronzeFight: 'bronze fight',
          tournamentPageRound: 'round'
        }
      },
      ru: {
        translation: {
          disciplinaryCardsType: 'Type',
          disciplinaryCardsFighter: 'Fighter',
          disciplinaryCardsDate: 'Date',
          disciplinaryCardsFight: 'Fight',
          disciplinaryCardsOpponent: 'Opponent',
          disciplinaryCardsReason: 'Reason',
          disciplinaryCardsExpires: 'Expires',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsYellow: 'Yellow',
          disciplinaryCardsRed: 'Red',
          disciplinaryCardsGroup: 'group',
          tournamentPageBronzeFight: 'bronze fight',
          tournamentPageRound: 'round'
        }
      }
    }
  })

  return instance
}

const card: DisciplinaryCard = {
  id: 1,
  fighter_id: 1,
  tournament_id: 1,
  fight_id: 1,
  type: 'YELLOW',
  source: 'MANUAL',
  received_at: '2026-05-19T00:00:00.000Z',
  reason: 'test',
  expires_at: '2026-06-19T00:00:00.000Z',
  created_at: '2026-05-19T00:00:00.000Z',
  updated_at: '2026-05-19T00:00:00.000Z',
  fight_number: 1,
  fight_stage: 1,
  tournament_name: '\u041a\u0443\u0431\u043e\u043a',
  nomination_id: 1,
  bracket_round: null,
  bracket_position: null,
  is_bronze: false,
  group_name: 'A',
  opponent_id: 2,
  fighter_name: '\u0418\u0432\u0430\u043d',
  fighter_surname: '\u0418\u0432\u0430\u043d\u043e\u0432',
  fighter_patronymic: null,
  opponent_name: '\u041f\u0435\u0442\u0440',
  opponent_surname: '\u041f\u0435\u0442\u0440\u043e\u0432',
  opponent_patronymic: null
}

describe('TournamentCardsTable', () => {
  it('transliterates disciplinary card fighter names when the language changes to English', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [card],
        canManage: false,
        canDelete: false
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button><slot /></button>' }
        }
      }
    })

    expect(wrapper.text()).toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d'
    )
    expect(wrapper.text()).toContain(
      '\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440'
    )

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov Ivan')
    expect(wrapper.text()).toContain('Petrov Petr')
    expect(wrapper.text()).not.toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d'
    )
    expect(wrapper.text()).not.toContain(
      '\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440'
    )

    wrapper.unmount()
  })
})
