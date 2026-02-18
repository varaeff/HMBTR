import { defineStore } from 'pinia'
import http from '@/api/http'
import type { Tournament, TournamentDB } from '@/model'
import { useCommonDataStore } from '@/stores/commonData'
import { API_ROUTES } from '@shared/routes'

interface TournamentsListState {
  tournaments: Tournament[]
  searchString: string
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
    searchString: ''
  }),

  actions: {
    async showTournamentDetails(id: number) {
      let tournament = this.tournaments.find((tournament) => tournament.id === id)

      if (tournament) {
        return tournament
      }

      tournament = (await http.get(API_ROUTES.TOURNAMENTS.BY_ID(id))).data
      tournament &&
        tournament.country_id &&
        (tournament.country = await commonDataStore.fetchCountry(tournament.country_id))
      tournament &&
        tournament.city_id &&
        (tournament.city = await commonDataStore.fetchCity(tournament.city_id))

      return tournament ? tournament : this.tournaments[0]
    },

    async getTournamentsList() {
      await commonDataStore.fetchCountries()
      await commonDataStore.fetchCities()
      await commonDataStore.fetchClubs()

      const tournamentsCount: number = (
        await http.get(API_ROUTES.TOURNAMENTS.ROOT + '/' + API_ROUTES.TOURNAMENTS.COUNT)
      ).data

      if (tournamentsCount === this.tournaments.length - 1) return

      const data: Array<TournamentDB> = (await http.get(API_ROUTES.TOURNAMENTS.ROOT)).data

      const tournaments: Array<Tournament> = await Promise.all(
        data.map(async (tournamentDB) => ({
          id: tournamentDB.id!,
          name: tournamentDB.name,
          event_date: new Date(tournamentDB.event_date),
          country: await commonDataStore.fetchCountry(tournamentDB.country_id),
          city: await commonDataStore.fetchCity(tournamentDB.city_id)
        }))
      )

      const existingIds = new Set(this.tournaments.map((t) => t.id))

      this.tournaments.push(...tournaments.filter((tournament) => !existingIds.has(tournament.id)))
    },

    async addNewTournament(tournamentDB: TournamentDB) {
      await http.post(API_ROUTES.TOURNAMENTS.ROOT, tournamentDB)
    },

    clearSearchString() {
      this.searchString = ''
    },

    setSearchString(searchString: string) {
      this.searchString = searchString
    }
  },

  getters: {
    filteredTournamentsList(state) {
      const filtered = state.tournaments
        .filter((tournament) => tournament.id !== 0)
        .filter(
          (tournament) =>
            tournament.name.toLowerCase().includes(state.searchString.toLowerCase()) ||
            tournament.city.toLowerCase().includes(state.searchString.toLowerCase())
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
    },

    getSearchString(state) {
      return state.searchString
    }
  }
})
