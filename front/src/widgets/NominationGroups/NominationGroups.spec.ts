import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import NominationGroups from './NominationGroups.vue'
import type { Group } from '@/model'

vi.mock('@/stores/competition', () => ({
  useCompetitionStore: () => ({
    getGroups: [],
    setGroups: vi.fn()
  })
}))

const groups: Group[] = [
  {
    id: 1,
    letter: 'A',
    fighters: [
      {
        id: 1,
        competitorId: 101,
        name: 'Red',
        surname: 'Fighter',
        country: '',
        city: '',
        wins: 2,
        diff: 10
      },
      {
        id: 2,
        competitorId: 102,
        name: 'Regular',
        surname: 'Fighter',
        country: '',
        city: '',
        wins: 1,
        diff: 5
      }
    ]
  },
  {
    id: 2,
    letter: 'B',
    fighters: [
      {
        id: 1,
        competitorId: 101,
        name: 'Red',
        surname: 'Fighter',
        country: '',
        city: '',
        wins: 2,
        diff: 10
      }
    ]
  }
]

describe('NominationGroups', () => {
  it('uses a translucent red row only in the subgroup where the red card was received', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            tournamentPageGroupName: 'Group',
            groupsTableFighter: 'Fighter',
            groupsTableWins: 'Wins',
            groupsTableDifference: 'Difference'
          }
        }
      }
    })

    const wrapper = mount(NominationGroups, {
      props: {
        groups,
        isFixed: true,
        activeCardTypes: { 1: 'RED' },
        redCardGroupFighterKeys: new Set(['A:1'])
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          CardStatusIcon: true
        }
      }
    })
    const fighterRows = wrapper
      .findAll('[data-slot="table-row"]')
      .filter((row) => row.text().includes('Fighter Red'))
    const redRows = fighterRows.filter((row) => row.classes().includes('bg-red-100/60'))

    expect(fighterRows).toHaveLength(2)
    expect(redRows).toHaveLength(1)
    expect(fighterRows[0].classes()).toContain('bg-red-100/60')
    expect(fighterRows[0].classes()).not.toContain('bg-green-100')
    expect(fighterRows[1].classes()).not.toContain('bg-red-100/60')
    expect(fighterRows[1].classes()).toContain('bg-green-100')

    wrapper.unmount()
  })
})
