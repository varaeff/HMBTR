import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import NominationCompetitors from './NominationCompetitors.vue'
import type { Fighter } from '@/model'

vi.mock('@/stores/competition', () => ({
  useCompetitionStore: () => ({
    tournamentCompetitors: [],
    deleteCompetitor: vi.fn()
  })
}))

const createI18n = async () => {
  const instance = i18next.createInstance()

  await instance.init({
    lng: 'ru',
    fallbackLng: 'ru',
    resources: {
      en: {
        translation: {
          tournamentPageCloseRegistrationButton: 'Close registration',
          tournamentPageRegistrationClosed: 'Registration closed',
          tournamentPageRemoveCompetitorButton: 'Remove'
        }
      },
      ru: {
        translation: {
          tournamentPageCloseRegistrationButton: 'Close registration',
          tournamentPageRegistrationClosed: 'Registration closed',
          tournamentPageRemoveCompetitorButton: 'Remove'
        }
      }
    }
  })

  return instance
}

const competitor: Fighter = {
  id: 1,
  name: '\u0418\u0432\u0430\u043d',
  surname: '\u0418\u0432\u0430\u043d\u043e\u0432',
  birthday: null,
  country_id: 1,
  city_id: 1,
  country: '\u0420\u043e\u0441\u0441\u0438\u044f',
  city: '\u041c\u043e\u0441\u043a\u0432\u0430',
  club: '\u0426\u0421\u041a\u0410'
}

describe('NominationCompetitors', () => {
  it('transliterates registered fighter names when the language changes to English', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const instance = await createI18n()

    const wrapper = mount(NominationCompetitors, {
      props: {
        competitors: [competitor],
        activeTab: 1,
        isOpen: true,
        hasBlocks: false,
        hasAccess: false
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }], pinia],
        stubs: {
          Button: { template: '<button><slot /></button>' },
          CardStatusIcon: true
        }
      }
    })

    expect(wrapper.text()).toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d'
    )

    await instance.changeLanguage('en')
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Ivanov Ivan')
    expect(wrapper.text()).not.toContain(
      '\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d'
    )

    wrapper.unmount()
  })
})
