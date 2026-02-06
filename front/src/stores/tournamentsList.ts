import { defineStore } from 'pinia'
import http from '@/api/http'
import type { Tournament, TournamentDB } from '@/model'
import { useCommonDataStore } from '@/stores/commonData'

interface TournamentsListState {
  tournaments: Tournament[]
  seachString: string
}

const commonDataStore = useCommonDataStore()

export const useTournamentsListStore = defineStore({
  id: 'tournamentsList',

  state: (): TournamentsListState => ({
    tournaments: [
      {
        id: 0,
        name: 'турнир не найден',
        event_date: new Date(),
        country: '',
        city: ''
      }
    ],
    seachString: ''
  }),

  actions: {
    async showTournamentDetails(this: TournamentsListState, id: number) {
      let tournament = this.tournaments.find((tournament) => tournament.id === id)

      if (tournament) {
        return tournament
      }

      tournament = (await http.get(`/tournament/${id}`)).data
      tournament &&
        tournament.country_id &&
        (tournament.country = await commonDataStore.fetchCountry(tournament.country_id))
      tournament &&
        tournament.city_id &&
        (tournament.city = await commonDataStore.fetchCity(tournament.city_id))

      return tournament ? tournament : this.tournaments[0]
    },

    async getTournamentsList(this: TournamentsListState) {
      const data: Array<TournamentDB> = (await http.get(`/tournaments`)).data

      const tournaments: Array<Tournament> = await Promise.all(
        data.map(async (tournamentDB) => ({
          id: tournamentDB.id!,
          name: tournamentDB.name,
          event_date: new Date(tournamentDB.event_date),
          country: await commonDataStore.fetchCountry(tournamentDB.country_id),
          city: await commonDataStore.fetchCity(tournamentDB.city_id)
        }))
      )

      const newTournaments = tournaments.filter(
        (newTournament) =>
          !this.tournaments.some((existingTournament) => existingTournament.id === newTournament.id)
      )

      this.tournaments.push(...newTournaments)
    },

    async addNewTournament(tournamentDB: TournamentDB) {
      await http.post(`/tournaments`, tournamentDB)
    }
  },

  getters: {
    filteredTournamentsList(state) {
      const filtered = state.tournaments
        .filter((tournament) => tournament.id !== 0)
        .filter(
          (tournament) =>
            tournament.name.toLowerCase().includes(state.seachString.toLowerCase()) ||
            tournament.city.toLowerCase().includes(state.seachString.toLowerCase())
        )
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

      return filtered.length > 0
        ? filtered.sort((a, b) => b.event_date.getTime() - a.event_date.getTime())
        : [state.tournaments[0]]
    },

    getMaxId(state) {
      return (
        state.tournaments.reduce((maxId, tournament) => {
          return Math.max(maxId, tournament.id)
        }, 0) + 1
      )
    }
  }
})
