import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import FightersSelect from './FightersSelect.vue'
import type { Fighter } from '@/model'

const mocks = vi.hoisted(() => ({
  fighters: [] as Fighter[],
  eligibility: [
    { fighter_id: 1, nomination_ids: [2] },
    { fighter_id: 3, nomination_ids: [3] }
  ],
  getFightersList: vi.fn(),
  clearSearchString: vi.fn(),
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

vi.mock('@/stores/competition', () => ({
  useCompetitionStore: () => ({
    tournamentId: 0,
    tournamentCompetitors: [],
    setCompetitors: mocks.setCompetitors,
    getRegistrationEligibility: mocks.getRegistrationEligibility,
    registerFighter: mocks.registerFighter
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

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

const nominations = [
  { id: 1, name_ru: 'Male entered', name_en: 'Male entered', is_male: true },
  { id: 2, name_ru: 'Male available', name_en: 'Male available', is_male: true },
  { id: 3, name_ru: 'Female available', name_en: 'Female available', is_male: false }
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
          fightersSelectRegister: 'Register'
        }
      }
    }
  })
  return instance
}

describe('FightersSelect', () => {
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
})
