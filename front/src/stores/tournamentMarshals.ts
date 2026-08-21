import { defineStore } from 'pinia'
import http from '@/api/http'
import { parseTournamentMarshal } from '@/stores/marshalsList'
import type { TournamentMarshal, TournamentMarshalDB } from '@/model'
import { API_ROUTES } from '@shared/routes'

interface TournamentMarshalsState {
  tournamentId: number
  tournamentMarshals: TournamentMarshal[]
}

export const useTournamentMarshalsStore = defineStore({
  id: 'tournamentMarshals',
  state: (): TournamentMarshalsState => ({
    tournamentId: 0,
    tournamentMarshals: []
  }),

  actions: {
    async loadTournamentMarshals(this: TournamentMarshalsState, tournamentId: number) {
      this.tournamentId = tournamentId

      const data = (await http.get(API_ROUTES.TOURNAMENTS.MARSHALS_BY_TOURNAMENT(tournamentId)))
        .data as TournamentMarshalDB[]
      this.tournamentMarshals = await Promise.all(
        data.map(async (item) => parseTournamentMarshal(item))
      )
    },

    async registerMarshal(this: TournamentMarshalsState, marshalId: number) {
      const response = await http.post(API_ROUTES.TOURNAMENTS.ROOT + '/' + API_ROUTES.TOURNAMENTS.MARSHALS, {
        tournament_id: this.tournamentId,
        marshal_id: marshalId
      })
      const tournamentMarshal = await parseTournamentMarshal(response.data as TournamentMarshalDB)
      this.tournamentMarshals.push(tournamentMarshal)
    },

    async setChiefMarshal(this: TournamentMarshalsState, tournamentMarshalId: number) {
      const response = await http.patch(
        API_ROUTES.TOURNAMENTS.TOURNAMENT_MARSHAL_CHIEF_BY_ID(tournamentMarshalId)
      )
      const chiefMarshal = await parseTournamentMarshal(response.data as TournamentMarshalDB)
      this.tournamentMarshals = this.tournamentMarshals.map((item) => ({
        ...item,
        is_chief_judge: item.id === chiefMarshal.id
      }))
    },

    async deleteTournamentMarshal(this: TournamentMarshalsState, tournamentMarshalId: number) {
      await http.delete(API_ROUTES.TOURNAMENTS.TOURNAMENT_MARSHAL_BY_ID(tournamentMarshalId))
      this.tournamentMarshals = this.tournamentMarshals.filter(
        (item) => item.id !== tournamentMarshalId
      )
    },

    async updateTournamentSecretary(this: TournamentMarshalsState, secretaryName: string) {
      await http.patch(API_ROUTES.TOURNAMENTS.SECRETARY(this.tournamentId), {
        secretary_name: secretaryName
      })
    }
  }
})
