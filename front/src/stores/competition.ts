import { defineStore } from 'pinia'
import http from '@/api/http'
import type { Competitor } from '@/model'
import { API_ROUTES } from '@shared/routes'

interface CompetitionState {
  tournamentCompetitors: Competitor[]
  tournamentId: number
  nominationId: number
}

export const useCompetitionStore = defineStore({
  id: 'competition',

  state: (): CompetitionState => ({
    tournamentCompetitors: [],
    tournamentId: 0,
    nominationId: 0
  }),

  actions: {
    setTournamentAndNomination(tournamentId: number, nominationId: number) {
      this.tournamentId = tournamentId
      this.nominationId = nominationId
    },

    async setCompetitors() {
      const url = API_ROUTES.COMPETITORS.BY_TOURNAMENT(this.tournamentId)
      const { data } = await http.get(url)
      this.tournamentCompetitors = data
    },

    async registerFighter(fighterId: number, nominationId: number) {
      const url = API_ROUTES.COMPETITORS.ROOT
      const { data } = await http.post(url, {
        fighter_id: fighterId,
        tournament_id: this.tournamentId,
        nomination_id: nominationId
      })
      this.tournamentCompetitors.push(data)
    },

    async deleteCompetitor(competitorId: number) {
      const url = `${API_ROUTES.COMPETITORS.ROOT}/${competitorId}`
      await http.delete(url)
      const index = this.tournamentCompetitors.findIndex((c) => c.id === competitorId)
      if (index !== -1) {
        this.tournamentCompetitors.splice(index, 1)
      }
    }
  },

  getters: {
    getTournamentId: (state) => state.tournamentId,
    getNominationId: (state) => state.nominationId,
    getTournamentCompetitors: (state) => state.tournamentCompetitors,
    getNominationCompetitors: (state) =>
      state.tournamentCompetitors.filter((c) => c.nomination_id === state.nominationId)
  }
})
