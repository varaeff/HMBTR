import { flushPromises, mount } from '@vue/test-utils'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from './SettingsPage.vue'
import RoundTimeInput from '@/components/ui/round-time-input/RoundTimeInput.vue'
import type { DisciplinaryCardSettings, Nomination, NominationPayload } from '@/model'

const mocks = vi.hoisted(() => {
  const nominations: Nomination[] = [
    {
      id: 1,
      name_ru: 'Adults',
      name_en: 'Adults',
      is_male: true,
      rounds: 1,
      round_win: false,
      main_round_time: 0,
      additional_round_time: 0,
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

const saveLabel = 'Save'

const createI18n = async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'ru',
    resources: {
      ru: {
        translation: {
          settingsPageTitle: 'Settings',
          settingsCardsTab: 'Cards',
          settingsNominationsTab: 'Nominations',
          settingsCardsTitle: 'Card settings',
          settingsCardsDescription: 'Card expiration settings',
          settingsYellowMode: 'Yellow',
          settingsYellowModeMonth: 'End of month',
          settingsYellowModeDays: 'Days',
          settingsYellowMonth: 'Month',
          settingsYellowDays: 'Days',
          settingsRedAutoYellowDays: 'Auto',
          settingsRedManualDays: 'Manual',
          settingsRedManualOneYellowDays: 'With one',
          settingsRedManualTwoYellowsDays: 'With two',
          settingsNominationsTitle: 'Nomination settings',
          settingsNominationsDescription: 'Reference data',
          settingsNominationNameRu: 'Name RU',
          settingsNominationNameEn: 'Name EN',
          settingsNominationRounds: 'Rounds',
          settingsNominationRoundWin: 'Round win',
          settingsNominationMainRoundTime: 'Main round time',
          settingsNominationAdditionalRoundTime: 'Additional round time',
          settingsNominationUsage: 'Tournaments',
          settingsNominationAdd: 'Add',
          settingsNominationDeleteDisabled: 'Cannot delete',
          addFighterGenderLabel: 'Gender',
          addFighterGenderMale: 'Male',
          addFighterGenderFemale: 'Female',
          disciplinaryCardsActions: 'Actions',
          disciplinaryCardsSave: saveLabel,
          disciplinaryCardsDelete: 'Delete',
          disciplinaryCardsCancel: 'Cancel',
          tournamentPageConfirmBackwardAction: 'Confirm',
          settingsSaved: 'Saved',
          settingsNominationCreated: 'Created',
          settingsNominationConfirmTitle: 'Confirmation',
          settingsNominationConfirmText: 'There are fights'
        }
      }
    }
  })

  return instance
}

type SettingsWrapper = Awaited<ReturnType<typeof mountSettingsPage>>

const mountSettingsPage = async (alertWidget: true | object = true) => {
  const i18n = await createI18n()
  const wrapper = mount(SettingsPage, {
    global: {
      plugins: [[I18NextVue, { i18next: i18n }]],
      stubs: {
        AlertWidget: alertWidget,
        Tabs: { template: '<div><slot /></div>' },
        TabsContent: { template: '<div><slot /></div>' },
        TabsList: { template: '<div><slot /></div>' },
        TabsTrigger: { template: '<button><slot /></button>' }
      }
    }
  })
  await flushPromises()
  return wrapper
}

const findRoundsSelect = (wrapper: SettingsWrapper) =>
  wrapper.findAll('select').find((select) => {
    const values = select.findAll('option').map((option) => option.attributes('value'))
    return values.length === 3 && values.includes('1') && values.includes('2') && values.includes('3')
  })

const findNominationSaveButton = (wrapper: SettingsWrapper) =>
  wrapper.findAll('button').find((button) => button.attributes('aria-label') === saveLabel)

describe('SettingsPage', () => {
  beforeEach(() => {
    Object.assign(mocks.nominations[0], {
      id: 1,
      name_ru: 'Adults',
      name_en: 'Adults',
      is_male: true,
      rounds: 1,
      round_win: false,
      main_round_time: 0,
      additional_round_time: 0,
      tournaments_count: 0,
      can_delete: true
    })
    mocks.refreshNominations.mockReset()
    mocks.createNomination.mockReset()
    mocks.updateNomination.mockReset()
    mocks.deleteNomination.mockReset()
    mocks.loadDisciplinaryCardSettings.mockReset()
    mocks.updateDisciplinaryCardSettings.mockReset()
  })

  it('allows round-win checkbox when nomination rounds are set to three', async () => {
    mocks.refreshNominations.mockResolvedValue(mocks.nominations)
    mocks.loadDisciplinaryCardSettings.mockResolvedValue(mocks.cardSettings)
    mocks.updateNomination.mockResolvedValue(undefined)

    const wrapper = await mountSettingsPage()

    const roundsSelect = findRoundsSelect(wrapper)
    expect(roundsSelect).toBeDefined()

    const checkbox = wrapper.find('[data-slot="checkbox"]')
    expect(checkbox.attributes('disabled')).toBeDefined()

    await roundsSelect!.setValue('3')
    expect(checkbox.attributes('disabled')).toBeUndefined()
    await checkbox.trigger('click')

    const nominationSaveButton = findNominationSaveButton(wrapper)
    expect(nominationSaveButton).toBeDefined()
    await nominationSaveButton!.trigger('click')

    expect(mocks.updateNomination).toHaveBeenCalledWith(
      1,
      expect.objectContaining<Partial<NominationPayload>>({
        rounds: 3,
        round_win: true
      })
    )
  })

  it('does not send nomination update when draft is unchanged', async () => {
    mocks.refreshNominations.mockResolvedValue(mocks.nominations)
    mocks.loadDisciplinaryCardSettings.mockResolvedValue(mocks.cardSettings)

    const wrapper = await mountSettingsPage()

    const nominationSaveButton = findNominationSaveButton(wrapper)
    expect(nominationSaveButton).toBeDefined()
    await nominationSaveButton!.trigger('click')

    expect(mocks.updateNomination).not.toHaveBeenCalled()
  })

  it('opens confirmation when nomination scoring changes conflict with existing fights', async () => {
    mocks.refreshNominations.mockResolvedValue(mocks.nominations)
    mocks.loadDisciplinaryCardSettings.mockResolvedValue(mocks.cardSettings)
    mocks.updateNomination.mockRejectedValue({
      response: {
        status: 409,
        data: {
          message: {
            details: {
              code: 'NOMINATION_HAS_EXISTING_FIGHTS',
              fights_count: 1
            },
            error: 'Conflict'
          },
          error: 'Conflict',
          statusCode: 409
        }
      }
    })

    const wrapper = await mountSettingsPage({
      props: ['title'],
      template: '<div data-testid="nomination-confirm">{{ title }}</div>'
    })

    const roundsSelect = findRoundsSelect(wrapper)
    expect(roundsSelect).toBeDefined()
    await roundsSelect!.setValue('3')

    const nominationSaveButton = findNominationSaveButton(wrapper)
    expect(nominationSaveButton).toBeDefined()
    await nominationSaveButton!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="nomination-confirm"]').exists()).toBe(true)
  })

  it('updates nomination timing without confirmation dialog', async () => {
    mocks.refreshNominations.mockResolvedValue(mocks.nominations)
    mocks.loadDisciplinaryCardSettings.mockResolvedValue(mocks.cardSettings)
    mocks.updateNomination.mockResolvedValue(undefined)

    const wrapper = await mountSettingsPage({
      props: ['title'],
      template: '<div data-testid="nomination-confirm">{{ title }}</div>'
    })

    const mainRoundTimeInput = wrapper.findAllComponents(RoundTimeInput)[0]
    expect(mainRoundTimeInput).toBeDefined()
    mainRoundTimeInput.vm.$emit('update:modelValue', 90)
    await flushPromises()

    const nominationSaveButton = findNominationSaveButton(wrapper)
    expect(nominationSaveButton).toBeDefined()
    await nominationSaveButton!.trigger('click')
    await flushPromises()

    expect(mocks.updateNomination).toHaveBeenCalledWith(
      1,
      expect.objectContaining<Partial<NominationPayload>>({
        main_round_time: 90
      })
    )
    expect(wrapper.find('[data-testid="nomination-confirm"]').exists()).toBe(false)
  })
})
