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
        city: '',
        nominations_ids: []
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
      await Promise.all([
        commonDataStore.fetchCountries(),
        commonDataStore.fetchCities(),
        commonDataStore.fetchClubs(),
        commonDataStore.fetchNominations()
      ])

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
          city: await commonDataStore.fetchCity(tournamentDB.city_id),
          nominations_ids: (
            await http.get(
              API_ROUTES.TOURNAMENTS.ROOT +
                '/' +
                API_ROUTES.TOURNAMENTS.NOMINATION +
                '/' +
                tournamentDB.id
            )
          ).data.map((nomination: any) => nomination.nomination_id)
        }))
      )

      const existingIds = new Set(this.tournaments.map((t) => t.id))

      this.tournaments.push(...tournaments.filter((tournament) => !existingIds.has(tournament.id)))
    },

    async addNewTournament(tournament: TournamentDB) {
      const newTournament: Tournament = await (
        await http.post(API_ROUTES.TOURNAMENTS.ROOT, tournament)
      ).data

      await Promise.all(
        tournament.nominations_ids.map(async (nominationId) => {
          await http.post(API_ROUTES.TOURNAMENTS.ROOT + '/' + API_ROUTES.TOURNAMENTS.NOMINATION, {
            tournament_id: newTournament.id,
            nomination_id: nominationId
          })
        })
      )

      this.tournaments.push({
        id: newTournament.id,
        name: newTournament.name,
        event_date: new Date(newTournament.event_date),
        country: await commonDataStore.fetchCountry(newTournament.country_id!),
        city: await commonDataStore.fetchCity(newTournament.city_id!),
        nominations_ids: tournament.nominations_ids
      })
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
