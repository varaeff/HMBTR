import { defineStore } from 'pinia'
import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'
import type {
  CreateDisciplinaryCardPayload,
  DisciplinaryCard,
  UpdateDisciplinaryCardPayload
} from '@/model'

interface DisciplinaryCardsState {
  tournamentCards: DisciplinaryCard[]
  fighterCards: DisciplinaryCard[]
}

export const useDisciplinaryCardsStore = defineStore('disciplinaryCards', {
  state: (): DisciplinaryCardsState => ({
    tournamentCards: [],
    fighterCards: []
  }),

  actions: {
    async loadTournamentCards(tournamentId: number) {
      const { data } = await http.get<DisciplinaryCard[]>(
        API_ROUTES.DISCIPLINARY_CARDS.BY_TOURNAMENT(tournamentId)
      )
      this.tournamentCards = data
    },

    async loadFighterCards(fighterId: number) {
      const { data } = await http.get<DisciplinaryCard[]>(
        API_ROUTES.DISCIPLINARY_CARDS.BY_FIGHTER(fighterId)
      )
      this.fighterCards = data
    },

    async createCard(payload: CreateDisciplinaryCardPayload) {
      const { data } = await http.post<DisciplinaryCard>(
        API_ROUTES.DISCIPLINARY_CARDS.ROOT,
        payload
      )
      await this.loadTournamentCards(payload.tournament_id)
      return data
    },

    async updateCard(id: number, payload: UpdateDisciplinaryCardPayload) {
      const { data } = await http.patch<DisciplinaryCard>(
        API_ROUTES.DISCIPLINARY_CARDS.BY_ID(id),
        payload
      )
      await this.loadTournamentCards(data.tournament_id)
      return data
    },

    async deleteCard(id: number) {
      await http.delete(API_ROUTES.DISCIPLINARY_CARDS.BY_ID(id))
    }
  }
})
