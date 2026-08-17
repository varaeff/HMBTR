import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import FightersSelect from './FightersSelect.vue'
import type { Competitor, Fighter, Nomination } from '@/model'

const mocks = vi.hoisted(() => ({
  fighters: [] as Fighter[],
  competitionStore: null as null | {
    tournamentCompetitors: Competitor[]
  },
  eligibility: [
    { fighter_id: 1, nomination_ids: [2] },
    { fighter_id: 3, nomination_ids: [3] }
  ],
  getFightersList: vi.fn(),
  clearSearchString: vi.fn(),
  setTournamentAndNomination: vi.fn(),
  setCompetitors: vi.fn(),
  getRegistrationEligibility: vi.fn(),
  registerFighter: vi.fn(),
  push: vi.fn()
}))

vi.mock('@/stores/fightersList', () => ({
  useFightersListStore: () => ({
    fightersList: mocks.fighters,
    filteredFightersList: mocks.fighters,
    getFightersList: mocks.getFightersList,
    clearSearchString: mocks.clearSearchString
  })
}))

vi.mock('@/stores/competition', async () => {
  const { reactive } = await vi.importActual<typeof import('vue')>('vue')
  const competitionStore = reactive({
    getNominationId: 0,
    tournamentCompetitors: [] as Competitor[],
    setTournamentAndNomination: mocks.setTournamentAndNomination,
    setCompetitors: mocks.setCompetitors,
    getRegistrationEligibility: mocks.getRegistrationEligibility,
    registerFighter: mocks.registerFighter
  })

  mocks.competitionStore = competitionStore

  return {
    useCompetitionStore: () => competitionStore
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

enableAutoUnmount(afterEach)

const fighters: Fighter[] = [
  {
    id: 1,
    name: 'Eligible',
    surname: 'Male',
    country: 'Georgia',
    city: 'Tbilisi',
    is_male: true
  },
  {
    id: 2,
    name: 'Excluded',
    surname: 'Red',
    country: 'Georgia',
    city: 'Tbilisi',
    is_male: true
  },
  {
    id: 3,
    name: 'Eligible',
    surname: 'Female',
    country: 'Georgia',
    city: 'Batumi',
    is_male: false
  }
]

const nominations: Nomination[] = [
  {
    id: 1,
    name_ru: 'Male entered',
    name_en: 'Male entered',
    is_male: true,
    rounds: 1,
    round_win: false,
    main_round_time: 0,
    additional_round_time: 0
  },
  {
    id: 2,
    name_ru: 'Male available',
    name_en: 'Male available',
    is_male: true,
    rounds: 1,
    round_win: false,
    main_round_time: 0,
    additional_round_time: 0
  },
  {
    id: 3,
    name_ru: 'Female available',
    name_en: 'Female available',
    is_male: false,
    rounds: 1,
    round_win: false,
    main_round_time: 0,
    additional_round_time: 0
  }
]

const createI18n = async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          fightersSelectPlaceholder: 'Select fighter',
          fightersSelectEmpty: 'No fighters',
          fightersSelectAddFighter: 'Add fighter',
          fightersSelectRegister: 'Register'
        }
      }
    }
  })
  return instance
}

describe('FightersSelect', () => {
  beforeEach(() => {
    mocks.fighters.splice(0, mocks.fighters.length)
    mocks.competitionStore?.tournamentCompetitors.splice(
      0,
      mocks.competitionStore.tournamentCompetitors.length
    )
    mocks.getFightersList.mockReset()
    mocks.clearSearchString.mockReset()
    mocks.setTournamentAndNomination.mockReset()
    mocks.setCompetitors.mockReset()
    mocks.getRegistrationEligibility.mockReset()
    mocks.registerFighter.mockReset()
    mocks.push.mockReset()
  })

  it('shows eligible fighters and only their available nominations', async () => {
    mocks.fighters.splice(0, mocks.fighters.length, ...fighters)
    mocks.getRegistrationEligibility.mockResolvedValue(mocks.eligibility)
    const instance = await createI18n()

    const wrapper = mount(FightersSelect, {
      props: { tournamentId: 7, nominations },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Popover: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          Command: { template: '<div><slot /></div>' },
          CommandInput: true,
          CommandList: { template: '<div><slot /></div>' },
          CommandEmpty: { template: '<div><slot /></div>' },
          CommandGroup: { template: '<div><slot /></div>' },
          CommandItem: {
            props: ['value'],
            emits: ['select'],
            template:
              '<button class="command-item" :data-value="value" @click="$emit(\'select\')"><slot /></button>'
          },
          Button: { template: '<button><slot /></button>' },
          Checkbox: true,
          Label: { template: '<label><slot /></label>' },
          CheckIcon: true,
          ChevronsUpDownIcon: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Male Eligible')
    expect(wrapper.text()).toContain('Female Eligible')
    expect(wrapper.text()).not.toContain('Red Excluded')

    await wrapper.get('[data-value="1"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Male available')
    expect(wrapper.text()).not.toContain('Male entered')
    expect(wrapper.text()).not.toContain('Female available')
  })

  it('reloads eligibility when tournament competitors change after deletion', async () => {
    mocks.fighters.splice(0, mocks.fighters.length, ...fighters.slice(0, 1))
    mocks.competitionStore?.tournamentCompetitors.splice(
      0,
      mocks.competitionStore.tournamentCompetitors.length,
      { id: 101, fighter_id: 1, tournament_id: 7, nomination_id: 1 },
      { id: 102, fighter_id: 1, tournament_id: 7, nomination_id: 2 }
    )
    mocks.getRegistrationEligibility
      .mockResolvedValueOnce([{ fighter_id: 1, nomination_ids: [] }])
      .mockResolvedValueOnce([{ fighter_id: 1, nomination_ids: [1] }])

    const instance = await createI18n()
    const wrapper = mount(FightersSelect, {
      props: { tournamentId: 7, nominations: nominations.slice(0, 2) },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Popover: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          Command: { template: '<div><slot /></div>' },
          CommandInput: true,
          CommandList: { template: '<div><slot /></div>' },
          CommandEmpty: { template: '<div><slot /></div>' },
          CommandGroup: { template: '<div><slot /></div>' },
          CommandItem: {
            props: ['value'],
            emits: ['select'],
            template:
              '<button class="command-item" :data-value="value" @click="$emit(\'select\')"><slot /></button>'
          },
          Button: { template: '<button><slot /></button>' },
          Checkbox: true,
          Label: { template: '<label><slot /></label>' },
          CheckIcon: true,
          ChevronsUpDownIcon: true
        }
      }
    })

    await flushPromises()
    expect(wrapper.text()).not.toContain('Male Eligible')

    mocks.competitionStore?.tournamentCompetitors.splice(0, 1)
    await nextTick()
    await flushPromises()

    expect(mocks.getRegistrationEligibility).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Male Eligible')
  })

  it('shows localized add-fighter action when no fighter matches the filter', async () => {
    mocks.getRegistrationEligibility.mockResolvedValue([])
    const instance = await createI18n()

    const wrapper = mount(FightersSelect, {
      props: { tournamentId: 7, nominations },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Popover: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          Command: { template: '<div><slot /></div>' },
          CommandInput: true,
          CommandList: { template: '<div><slot /></div>' },
          CommandEmpty: { template: '<div><slot /></div>' },
          CommandGroup: { template: '<div><slot /></div>' },
          CommandItem: true,
          Button: { template: '<button><slot /></button>' },
          Checkbox: true,
          Label: true,
          CheckIcon: true,
          ChevronsUpDownIcon: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Add fighter')
    expect(wrapper.text()).not.toContain('Р')
  })
})
