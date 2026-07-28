import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import TournamentCardsTable from './TournamentCardsTable.vue'
import type { DisciplinaryCard, TournamentMarshal } from '@/model'
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
          disciplinaryCardsMarshal: 'Judge',
          disciplinaryCardsOpponent: 'Opponent',
          disciplinaryCardsReason: 'Reason',
          disciplinaryCardsReasonAUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT:
            'Automatic red for 2 yellow cards in one tournament',
          disciplinaryCardsReasonAUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT:
            'Automatic red for 3 active yellow cards',
          disciplinaryCardsExpires: 'Expires',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsYellow: 'Yellow',
          disciplinaryCardsRed: 'Red',
          disciplinaryCardsSave: 'Save',
          disciplinaryCardsCancel: 'Cancel',
          disciplinaryCardsEdit: 'Edit',
          disciplinaryCardsDelete: 'Delete',
          disciplinaryCardsGroup: 'group',
          disciplinaryCardsActive: 'Active',
          disciplinaryCardsActiveYes: 'Yes',
          disciplinaryCardsActiveNo: 'No',
          disciplinaryCardsShowInactive: 'Show inactive',
          disciplinaryCardsActiveYellow: 'Active yellow card',
          disciplinaryCardsInactiveYellow: 'Inactive yellow card',
          disciplinaryCardsActiveRed: 'Active red card',
          disciplinaryCardsInactiveRed: 'Inactive red card',
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
          disciplinaryCardsMarshal: 'Judge',
          disciplinaryCardsOpponent: 'Opponent',
          disciplinaryCardsReason: 'Reason',
          disciplinaryCardsReasonAUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT:
            'Automatic red for 2 yellow cards in one tournament',
          disciplinaryCardsReasonAUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT:
            'Automatic red for 3 active yellow cards',
          disciplinaryCardsExpires: 'Expires',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsYellow: 'Yellow',
          disciplinaryCardsRed: 'Red',
          disciplinaryCardsSave: 'Save',
          disciplinaryCardsCancel: 'Cancel',
          disciplinaryCardsEdit: 'Edit',
          disciplinaryCardsDelete: 'Delete',
          disciplinaryCardsGroup: 'group',
          disciplinaryCardsActive: 'Active',
          disciplinaryCardsActiveYes: 'Yes',
          disciplinaryCardsActiveNo: 'No',
          disciplinaryCardsShowInactive: 'Show inactive',
          disciplinaryCardsActiveYellow: 'Active yellow card',
          disciplinaryCardsInactiveYellow: 'Inactive yellow card',
          disciplinaryCardsActiveRed: 'Active red card',
          disciplinaryCardsInactiveRed: 'Inactive red card',
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
  marshal_id: 10,
  type: 'YELLOW',
  source: 'MANUAL',
  active: true,
  received_at: '2026-05-19T00:00:00.000Z',
  reason: 'test',
  expires_at: '2026-06-19T00:00:00.000Z',
  expires_at_locked: false,
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
  marshal_name: '\u0421\u0435\u0440\u0433\u0435\u0439',
  marshal_surname: '\u0421\u0438\u0434\u043e\u0440\u043e\u0432',
  marshal_patronymic: '\u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447',
  can_manage: true,
  can_change_result_fields: true,
  can_delete: true
}

const tournamentMarshals: TournamentMarshal[] = [
  {
    id: 1,
    tournament_id: 1,
    marshal_id: 10,
    marshal: {
      id: 10,
      name: '\u0421\u0435\u0440\u0433\u0435\u0439',
      surname: '\u0421\u0438\u0434\u043e\u0440\u043e\u0432',
      patronymic: '\u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447',
      country_id: 1,
      city_id: 1,
      category_id: 1,
      country: '\u0420\u043e\u0441\u0441\u0438\u044f',
      city: '\u041c\u043e\u0441\u043a\u0432\u0430'
    }
  },
  {
    id: 2,
    tournament_id: 1,
    marshal_id: 11,
    marshal: {
      id: 11,
      name: '\u0410\u043d\u0434\u0440\u0435\u0439',
      surname: '\u041a\u0443\u0437\u043d\u0435\u0446\u043e\u0432',
      country_id: 1,
      city_id: 1,
      category_id: 1,
      country: '\u0420\u043e\u0441\u0441\u0438\u044f',
      city: '\u041c\u043e\u0441\u043a\u0432\u0430'
    }
  }
]

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

    expect(wrapper.text()).toContain('\u0418\u0432\u0430\u043d\u043e\u0432 \u0418.')
    expect(wrapper.text()).toContain('\u0421\u0438\u0434\u043e\u0440\u043e\u0432 \u0421.\u041f.')
    expect(wrapper.text()).toContain('\u0412\u0437\u0440\u043e\u0441\u043b\u044b\u0435')
    expect(wrapper.text()).toContain('#1')
    expect(wrapper.text()).toContain('test')
    expect(wrapper.text()).not.toContain('Yellow')
    expect(wrapper.text()).not.toContain('Red')
    expect(wrapper.text()).not.toContain('Date')
    expect(wrapper.text()).not.toContain('Expires')
    expect(wrapper.text()).not.toContain('Opponent')
    expect(wrapper.text()).not.toContain(
      '\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440'
    )

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov I.')
    expect(wrapper.text()).toContain('Adults')
    expect(wrapper.text()).not.toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418.'
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

  it('shows automatic reason labels and allows the reason cell to wrap', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [
          {
            ...card,
            type: 'RED',
            reason: 'AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT'
          }
        ],
        canManage: false,
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

    const reasonCell = wrapper.find('[data-testid="disciplinary-card-reason"]')

    expect(wrapper.text()).toContain('Automatic red for 2 yellow cards in one tournament')
    expect(wrapper.text()).not.toContain('AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT')
    expect(reasonCell.classes()).toContain('whitespace-normal')
    expect(reasonCell.classes()).toContain('break-words')

    wrapper.unmount()
  })

  it('hides inactive cards until requested and marks inactive rows as muted', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [
          card,
          {
            ...card,
            id: 2,
            active: false,
            reason: 'inactive yellow'
          }
        ],
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

    expect(wrapper.text()).toContain('Show inactive')
    expect(wrapper.text()).not.toContain('inactive yellow')

    await wrapper.find('[data-slot="checkbox"]').trigger('click')

    const inactiveRow = wrapper
      .findAll('[data-slot="table-row"]')
      .find((row) => row.text().includes('inactive yellow'))

    expect(inactiveRow).toBeDefined()
    expect(inactiveRow!.classes()).toContain('text-muted-foreground')

    wrapper.unmount()
  })

  it('uses a destructive icon-only delete action with the delete label as hint', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [card],
        canManage: false,
        canDelete: true
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' }
        }
      }
    })

    const deleteButton = wrapper.find('button[title="Delete"]')

    expect(deleteButton.exists()).toBe(true)
    expect(deleteButton.text()).toBe('')
    expect(deleteButton.attributes('variant')).toBe('destructive')

    wrapper.unmount()
  })

  it('preserves inactive yellow state when editing a hidden card after showing inactive rows', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()
    const inactiveYellowCard: DisciplinaryCard = {
      ...card,
      id: 3,
      active: false,
      reason: 'closed yellow'
    }

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [inactiveYellowCard],
        canManage: true,
        canDelete: false,
        mode: 'fighter',
        tournamentMarshalsByTournamentId: { 1: tournamentMarshals }
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    })

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(inactiveYellowCard)

    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    await wrapper.find('button[title="Edit"]').trigger('click')
    await wrapper.find('input[type="text"], input:not([type])').setValue('updated closed yellow')
    await wrapper.find('button[title="Save"]').trigger('click')

    expect(updateCard).toHaveBeenCalledWith(3, {
      type: 'YELLOW',
      reason: 'updated closed yellow',
      marshal_id: 10,
      active: false
    })

    wrapper.unmount()
  })

  it('locks expiration editing for inactive yellow cards closed by an automatic red card', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()
    const lockedYellowCard: DisciplinaryCard = {
      ...card,
      id: 4,
      active: false,
      expires_at_locked: true,
      reason: 'closed by red'
    }

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [lockedYellowCard],
        canManage: true,
        canDelete: false,
        mode: 'fighter',
        tournamentMarshalsByTournamentId: { 1: tournamentMarshals }
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    })

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(lockedYellowCard)

    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    await wrapper.find('button[title="Edit"]').trigger('click')

    const dateInputs = wrapper.findAll<HTMLInputElement>('input[type="date"]')
    expect(dateInputs[1].attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="text"], input:not([type])').setValue('updated closed by red')
    await wrapper.find('button[title="Save"]').trigger('click')

    expect(updateCard).toHaveBeenCalledWith(4, {
      type: 'YELLOW',
      reason: 'updated closed by red',
      marshal_id: 10,
      active: false
    })

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
        mode: 'fighter',
        tournamentMarshalsByTournamentId: { 1: tournamentMarshals }
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    })

    await wrapper.find('button[title="Edit"]').trigger('click')

    const dateInputs = wrapper.findAll('input[type="date"]')
    const receivedAtInput = dateInputs[0].element as HTMLInputElement
    const expiresAtInput = dateInputs[1].element as HTMLInputElement

    const typeButton = wrapper.find('button[title="Type"]')
    const cancelButton = wrapper.find('button[title="Cancel"]')

    expect(typeButton.exists()).toBe(true)
    expect(typeButton.text()).toBe('')
    expect(cancelButton.exists()).toBe(true)
    expect(cancelButton.text()).toBe('')
    expect(dateInputs[0].attributes('disabled')).toBeDefined()
    expect(receivedAtInput.value).toBe('2026-05-19')
    expect(dateInputs[1].attributes('disabled')).toBeUndefined()
    expect(expiresAtInput.value).toBe('2026-06-19')

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(card)

    await typeButton.trigger('click')
    const saveButton = wrapper.find('button[title="Save"]')

    expect(saveButton.exists()).toBe(true)
    await saveButton.trigger('click')

    expect(updateCard).toHaveBeenCalledWith(1, {
      type: 'RED',
      reason: 'test',
      marshal_id: 10,
      active: true
    })

    wrapper.unmount()
  })

  it('allows changing the card marshal while editing', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [card],
        canManage: true,
        canDelete: false,
        tournamentMarshals
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' }
        }
      }
    })

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(card)

    await wrapper.find('button[title="Edit"]').trigger('click')
    const marshalSelect = wrapper.find<HTMLSelectElement>(
      '[data-testid="disciplinary-card-marshal-select"]'
    )

    expect(marshalSelect.exists()).toBe(true)
    expect(marshalSelect.element.value).toBe('10')

    await marshalSelect.setValue('11')
    await wrapper.find('button[title="Save"]').trigger('click')

    expect(updateCard).toHaveBeenCalledWith(1, {
      type: 'YELLOW',
      reason: 'test',
      marshal_id: 11,
      active: true
    })

    wrapper.unmount()
  })

  it('keeps metadata editing available after result fields are fixed', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()
    const fixedResultCard: DisciplinaryCard = {
      ...card,
      can_change_result_fields: false,
      can_delete: false
    }

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [fixedResultCard],
        canManage: true,
        canDelete: true,
        tournamentMarshals
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' }
        }
      }
    })

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(fixedResultCard)

    expect(wrapper.find('button[title="Edit"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Delete"]').exists()).toBe(false)

    await wrapper.find('button[title="Edit"]').trigger('click')

    const typeButton = wrapper.find<HTMLButtonElement>('button[title="Type"]')
    expect(typeButton.element.disabled).toBe(true)

    await wrapper.find('input[type="text"], input:not([type])').setValue('fixed metadata')
    await wrapper
      .find<HTMLSelectElement>('[data-testid="disciplinary-card-marshal-select"]')
      .setValue('11')
    await wrapper.find('button[title="Save"]').trigger('click')

    expect(updateCard).toHaveBeenCalledWith(1, {
      reason: 'fixed metadata',
      marshal_id: 11
    })

    wrapper.unmount()
  })

  it('hides automatic card edit and delete actions on the tournament page', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [
          {
            ...card,
            type: 'RED',
            source: 'AUTOMATIC',
            reason: 'AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT',
            can_delete: false
          }
        ],
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

    expect(wrapper.find('button[title="Delete"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Edit"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Actions')
    expect(wrapper.text()).toContain('Automatic red for 2 yellow cards in one tournament')

    wrapper.unmount()
  })

  it('allows editing only expiration for automatic cards on the fighter page', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()
    const automaticCard: DisciplinaryCard = {
      ...card,
      type: 'RED',
      source: 'AUTOMATIC',
      reason: 'AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT',
      can_delete: false
    }

    const wrapper = mount(TournamentCardsTable, {
      props: {
        cards: [automaticCard],
        canManage: true,
        canDelete: true,
        mode: 'fighter',
        tournamentMarshalsByTournamentId: { 1: tournamentMarshals }
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    })

    const cardsStore = useDisciplinaryCardsStore()
    const updateCard = vi.spyOn(cardsStore, 'updateCard').mockResolvedValue(automaticCard)

    expect(wrapper.find('button[title="Delete"]').exists()).toBe(false)
    await wrapper.find('button[title="Edit"]').trigger('click')

    expect(wrapper.find('[data-testid="disciplinary-card-marshal-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="disciplinary-card-reason"] input').exists()).toBe(false)
    expect(wrapper.text()).toContain('Automatic red for 2 yellow cards in one tournament')

    const expiresAtInput = wrapper.findAll<HTMLInputElement>('input[type="date"]')[1]
    await expiresAtInput.setValue('2026-07-19')
    await wrapper.find('button[title="Save"]').trigger('click')

    expect(updateCard).toHaveBeenCalledWith(1, {
      expires_at: '2026-07-19'
    })

    wrapper.unmount()
  })
})
