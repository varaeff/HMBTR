import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import NominationCompetitors from './NominationCompetitors.vue'
import type { ActiveDisciplinaryCardSummary, Fighter } from '@/model'

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
          tournamentPageRemoveCompetitorButton: 'Remove',
          disciplinaryCardsReasonAUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT:
            'Automatic red for 3 active yellow cards'
        }
      },
      ru: {
        translation: {
          tournamentPageCloseRegistrationButton: 'Close registration',
          tournamentPageRegistrationClosed: 'Registration closed',
          tournamentPageRemoveCompetitorButton: 'Remove',
          disciplinaryCardsReasonAUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT:
            '\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043a\u0440\u0430\u0441\u043d\u0430\u044f \u0437\u0430 3 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0436\u0435\u043b\u0442\u044b\u0435'
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

const activeRedCard: ActiveDisciplinaryCardSummary = {
  id: 1,
  fighter_id: 1,
  tournament_id: 1,
  tournament_name: 'Cup',
  reason: 'AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT',
  type: 'RED',
  active: true,
  received_at: '2026-05-19T00:00:00.000Z',
  expires_at: '2026-06-19T00:00:00.000Z'
}

describe('NominationCompetitors', () => {
  it('transliterates registered fighter names when the language changes to English', async () => {
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
        plugins: [[I18NextVue, { i18next: instance }]],
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

  it('shows a hint on disabled close-registration action when no judges are registered', async () => {
    const instance = await createI18n()
    const competitors = [
      competitor,
      { ...competitor, id: 2, surname: '\u041f\u0435\u0442\u0440\u043e\u0432' },
      { ...competitor, id: 3, surname: '\u0421\u0438\u0434\u043e\u0440\u043e\u0432' }
    ]

    const wrapper = mount(NominationCompetitors, {
      props: {
        competitors,
        activeTab: 1,
        isOpen: true,
        hasBlocks: false,
        hasAccess: true,
        canCloseRegistration: false,
        closeRegistrationHint: '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0443\u0434\u0435\u0439 \u043d\u0430 \u0442\u0443\u0440\u043d\u0438\u0440'
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          CardStatusIcon: true
        }
      }
    })

    const hintWrapper = wrapper.find('span[title]')
    const closeButton = hintWrapper.find<HTMLButtonElement>('button')

    expect(hintWrapper.attributes('title')).toBe(
      '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0443\u0434\u0435\u0439 \u043d\u0430 \u0442\u0443\u0440\u043d\u0438\u0440'
    )
    expect(closeButton.element.disabled).toBe(true)

    wrapper.unmount()
  })

  it('keeps active card hints on registered fighter icons', async () => {
    const instance = await createI18n()

    const wrapper = mount(NominationCompetitors, {
      props: {
        competitors: [competitor],
        activeTab: 1,
        isOpen: true,
        hasBlocks: false,
        hasAccess: false,
        activeCardTypes: { 1: [activeRedCard] }
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Button: { template: '<button><slot /></button>' },
          CardStatusIcon: true
        }
      }
    })

    expect(
      wrapper
        .find(
          '[title="Cup: \u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043a\u0440\u0430\u0441\u043d\u0430\u044f \u0437\u0430 3 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0436\u0435\u043b\u0442\u044b\u0435"]'
        )
        .exists()
    ).toBe(true)

    wrapper.unmount()
  })

  it('emits fighter id when remove action is clicked', async () => {
    const instance = await createI18n()

    const wrapper = mount(NominationCompetitors, {
      props: {
        competitors: [competitor],
        activeTab: 1,
        isOpen: true,
        hasBlocks: false,
        hasAccess: true
      },
      global: {
        plugins: [[I18NextVue, { i18next: instance }]],
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          CardStatusIcon: true
        }
      }
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('remove-competitor')).toEqual([[competitor.id]])

    wrapper.unmount()
  })
})
