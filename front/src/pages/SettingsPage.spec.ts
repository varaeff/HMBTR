import { flushPromises, mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from './SettingsPage.vue'
import type { DisciplinaryCardSettings, Nomination, NominationPayload } from '@/model'

const mocks = vi.hoisted(() => {
  const nominations: Nomination[] = [
    {
      id: 1,
      name_ru: 'Взрослые',
      name_en: 'Adults',
      is_male: true,
      rounds: 1,
      round_win: false,
      tournaments_count: 0,
      can_delete: true
    }
  ]
  const cardSettings: DisciplinaryCardSettings = {
    id: 1,
    yellow_expiration_mode: 'END_OF_YEAR_MONTH',
    yellow_expiration_month: 12,
    yellow_expiration_days: 365,
    red_auto_yellow_days: 45,
    red_manual_days: 90,
    red_manual_with_one_yellow_days: 120,
    red_manual_with_two_or_more_yellows_days: 180,
    updated_at: ''
  }

  return {
    nominations,
    cardSettings,
    refreshNominations: vi.fn(),
    createNomination: vi.fn(),
    updateNomination: vi.fn(),
    deleteNomination: vi.fn(),
    loadDisciplinaryCardSettings: vi.fn(),
    updateDisciplinaryCardSettings: vi.fn()
  }
})

vi.mock('@/stores/commonData', () => ({
  useCommonDataStore: () => ({
    nominations: mocks.nominations,
    refreshNominations: mocks.refreshNominations,
    createNomination: mocks.createNomination,
    updateNomination: mocks.updateNomination,
    deleteNomination: mocks.deleteNomination
  })
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    loadDisciplinaryCardSettings: mocks.loadDisciplinaryCardSettings,
    updateDisciplinaryCardSettings: mocks.updateDisciplinaryCardSettings
  })
}))

const createI18n = async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'ru',
    resources: {
      ru: {
        translation: {
          settingsPageTitle: 'Настройки',
          settingsCardsTab: 'Карточки',
          settingsNominationsTab: 'Номинации',
          settingsCardsTitle: 'Настройки карточек',
          settingsCardsDescription: 'Сроки карточек',
          settingsYellowMode: 'Желтая',
          settingsYellowModeMonth: 'До конца месяца',
          settingsYellowModeDays: 'Дни',
          settingsYellowMonth: 'Месяц',
          settingsYellowDays: 'Дней',
          settingsRedAutoYellowDays: 'Авто',
          settingsRedManualDays: 'Ручная',
          settingsRedManualOneYellowDays: 'С одной',
          settingsRedManualTwoYellowsDays: 'С двумя',
          settingsNominationsTitle: 'Настройки номинаций',
          settingsNominationsDescription: 'Справочник',
          settingsNominationNameRu: 'Название RU',
          settingsNominationNameEn: 'Название EN',
          settingsNominationRounds: 'Раунды',
          settingsNominationRoundWin: 'Победа по раундам',
          settingsNominationUsage: 'Турниры',
          settingsNominationAdd: 'Добавить',
          settingsNominationDeleteDisabled: 'Нельзя удалить',
          addFighterGenderLabel: 'Пол',
          addFighterGenderMale: 'Мужской',
          addFighterGenderFemale: 'Женский',
          disciplinaryCardsActions: 'Действия',
          disciplinaryCardsSave: 'Сохранить',
          disciplinaryCardsDelete: 'Удалить',
          disciplinaryCardsCancel: 'Отмена',
          tournamentPageConfirmBackwardAction: 'Подтвердить',
          settingsNominationConfirmTitle: 'Подтверждение',
          settingsNominationConfirmText: 'Есть бои'
        }
      }
    }
  })

  return instance
}

describe('SettingsPage', () => {
  it('allows round-win checkbox when nomination rounds are set to three', async () => {
    mocks.refreshNominations.mockResolvedValue(mocks.nominations)
    mocks.loadDisciplinaryCardSettings.mockResolvedValue(mocks.cardSettings)
    mocks.updateNomination.mockResolvedValue(undefined)
    const i18n = await createI18n()

    const wrapper = mount(SettingsPage, {
      global: {
        plugins: [[I18NextVue, { i18next: i18n }]],
        stubs: {
          AlertWidget: true,
          Tabs: { template: '<div><slot /></div>' },
          TabsContent: { template: '<div><slot /></div>' },
          TabsList: { template: '<div><slot /></div>' },
          TabsTrigger: { template: '<button><slot /></button>' }
        }
      }
    })
    await flushPromises()

    const roundsSelect = wrapper
      .findAll('select')
      .find((select) => {
        const values = select.findAll('option').map((option) => option.attributes('value'))
        return values.length === 3 && values.includes('1') && values.includes('2') && values.includes('3')
      })
    expect(roundsSelect).toBeDefined()

    const checkbox = wrapper.find('[data-slot="checkbox"]')
    expect(checkbox.attributes('disabled')).toBeDefined()

    await roundsSelect!.setValue('3')
    expect(checkbox.attributes('disabled')).toBeUndefined()
    await checkbox.trigger('click')
    const saveButtons = wrapper.findAll('button').filter((button) => button.text().includes('Сохранить'))
    await saveButtons[1].trigger('click')

    expect(mocks.updateNomination).toHaveBeenCalledWith(
      1,
      expect.objectContaining<Partial<NominationPayload>>({
        rounds: 3,
        round_win: true
      })
    )
  })
})
