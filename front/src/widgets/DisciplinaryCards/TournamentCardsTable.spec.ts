import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import TournamentCardsTable from './TournamentCardsTable.vue'
import type { DisciplinaryCard } from '@/model'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'

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
          disciplinaryCardsNomination: 'Nomination',
          disciplinaryCardsFight: 'Fight',
          disciplinaryCardsOpponent: 'Opponent',
          disciplinaryCardsReason: 'Reason',
          disciplinaryCardsExpires: 'Expires',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsYellow: 'Yellow',
          disciplinaryCardsRed: 'Red',
          disciplinaryCardsSave: 'Save',
          disciplinaryCardsCancel: 'Cancel',
          disciplinaryCardsEdit: 'Edit',
          disciplinaryCardsDelete: 'Delete',
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
          disciplinaryCardsNomination: 'Nomination',
          disciplinaryCardsFight: 'Fight',
          disciplinaryCardsOpponent: 'Opponent',
          disciplinaryCardsReason: 'Reason',
          disciplinaryCardsExpires: 'Expires',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsYellow: 'Yellow',
          disciplinaryCardsRed: 'Red',
          disciplinaryCardsSave: 'Save',
          disciplinaryCardsCancel: 'Cancel',
          disciplinaryCardsEdit: 'Edit',
          disciplinaryCardsDelete: 'Delete',
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
  nomination_name_ru: '\u0412\u0437\u0440\u043e\u0441\u043b\u044b\u0435',
  nomination_name_en: 'Adults',
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
  opponent_patronymic: null,
  can_manage: true,
  can_delete: true
}

describe('TournamentCardsTable', () => {
  it('shows tournament card columns matching the PDF card summary', async () => {
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
          Button: { template: '<button v-bind="$attrs"><slot /></button>' }
        }
      }
    })

    expect(wrapper.text()).toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d'
    )
    expect(wrapper.text()).toContain('\u0412\u0437\u0440\u043e\u0441\u043b\u044b\u0435')
    expect(wrapper.text()).toContain('#1')
    expect(wrapper.text()).toContain('test')
    expect(wrapper.text()).not.toContain('Date')
    expect(wrapper.text()).not.toContain('Expires')
    expect(wrapper.text()).not.toContain('Opponent')
    expect(wrapper.text()).not.toContain(
      '\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440'
    )

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov Ivan')
    expect(wrapper.text()).toContain('Adults')
    expect(wrapper.text()).not.toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d'
    )

    wrapper.unmount()
  })

  it('hides actions for cards that the backend marks as not manageable', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [{ ...card, can_manage: false, can_delete: false }],
        canManage: true,
        canDelete: true
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' }
        }
      }
    })

    expect(wrapper.text()).not.toContain('Delete')
    expect(wrapper.text()).not.toContain('Edit')
    expect(wrapper.text()).not.toContain('Actions')

    wrapper.unmount()
  })

  it('allows editing card type and expiration while keeping issue date disabled', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [card],
        canManage: true,
        canDelete: false,
        mode: 'fighter'
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    })

    await wrapper.find('button').trigger('click')

    const typeSelect = wrapper.find('select')
    const dateInputs = wrapper.findAll('input[type="date"]')
    const receivedAtInput = dateInputs[0].element as HTMLInputElement
    const expiresAtInput = dateInputs[1].element as HTMLInputElement

    expect(typeSelect.attributes('disabled')).toBeUndefined()
    expect((typeSelect.element as HTMLSelectElement).value).toBe('YELLOW')
    expect(dateInputs[0].attributes('disabled')).toBeDefined()
    expect(receivedAtInput.value).toBe('2026-05-19')
    expect(dateInputs[1].attributes('disabled')).toBeUndefined()
    expect(expiresAtInput.value).toBe('2026-06-19')

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(card)

    await typeSelect.setValue('RED')
    await wrapper.findAll('button')[0].trigger('click')

    expect(updateCard).toHaveBeenCalledWith(1, {
      type: 'RED',
      reason: 'test'
    })

    wrapper.unmount()
  })
})
