import { defineStore } from 'pinia'
import http from '@/api/http'
import type { DisciplinaryCardSettings, MinsportReportSettings } from '@/model'
import { API_ROUTES } from '@shared/routes'

interface SettingsState {
  disciplinaryCardSettings: DisciplinaryCardSettings | null
  minsportReportSettings: MinsportReportSettings | null
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    disciplinaryCardSettings: null,
    minsportReportSettings: null
  }),

  actions: {
    async loadDisciplinaryCardSettings() {
      const { data } = await http.get<DisciplinaryCardSettings>(
        `${API_ROUTES.SETTINGS.ROOT}/${API_ROUTES.SETTINGS.DISCIPLINARY_CARDS}`
      )
      this.disciplinaryCardSettings = data
      return data
    },

    async updateDisciplinaryCardSettings(payload: DisciplinaryCardSettings) {
      const body = {
        yellow_expiration_mode: payload.yellow_expiration_mode,
        yellow_expiration_month: payload.yellow_expiration_month,
        yellow_expiration_days: payload.yellow_expiration_days,
        red_auto_yellow_days: payload.red_auto_yellow_days,
        red_manual_days: payload.red_manual_days,
        red_manual_with_one_yellow_days: payload.red_manual_with_one_yellow_days,
        red_manual_with_two_or_more_yellows_days:
          payload.red_manual_with_two_or_more_yellows_days
      }
      const { data } = await http.patch<DisciplinaryCardSettings>(
        `${API_ROUTES.SETTINGS.ROOT}/${API_ROUTES.SETTINGS.DISCIPLINARY_CARDS}`,
        body
      )
      this.disciplinaryCardSettings = data
      return data
    },

    async loadMinsportReportSettings() {
      const { data } = await http.get<MinsportReportSettings>(
        `${API_ROUTES.SETTINGS.ROOT}/${API_ROUTES.SETTINGS.MINSPORT_REPORT}`
      )
      this.minsportReportSettings = data
      return data
    },

    async updateMinsportReportSettings(payload: MinsportReportSettings) {
      const body = {
        organization_name: payload.organization_name,
        organization_address: payload.organization_address
      }
      const { data } = await http.patch<MinsportReportSettings>(
        `${API_ROUTES.SETTINGS.ROOT}/${API_ROUTES.SETTINGS.MINSPORT_REPORT}`,
        body
      )
      this.minsportReportSettings = data
      return data
    }
  }
})
