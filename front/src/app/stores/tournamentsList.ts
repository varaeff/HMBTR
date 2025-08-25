import { defineStore } from 'pinia'
import axios from 'axios'
import type { Tournament, TournamentDB } from '@/shared/model'
import { getCityNameById, getCountryNameById } from '@/features/getLocations'

interface TournamentsListState {
  tournaments: Tournament[]
  seachString: string
}

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
      },
      {
        id: 1,
        name: 'Залупинская сеча',
        event_date: new Date(),
        country: 'Россия',
        city: 'Залупинск'
      }
    ],
    seachString: ''
  }),
  actions: {
    showTournamentDetails(this: TournamentsListState, id: number) {
      const fighter = this.tournaments.find((tournament) => tournament.id === id)
      return fighter ? fighter : this.tournaments[0]
    },

    async getTournamentsList(this: TournamentsListState) {
      const data: Array<TournamentDB> = (
        await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tournaments`)
      ).data

      const tournaments: Array<Tournament> = await Promise.all(
        data.map(async (tournamentDB) => ({
          id: tournamentDB.id,
          name: tournamentDB.name,
          event_date: new Date(tournamentDB.event_date),
          country: await getCountryNameById(tournamentDB.country_id),
          city: await getCityNameById(tournamentDB.city_id)
        }))
      )

      const newTournaments = tournaments.filter(
        (newTournament) =>
          !this.tournaments.some((existingTournament) => existingTournament.id === newTournament.id)
      )

      this.tournaments.push(...newTournaments)
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

      return filtered.length > 0 ? filtered : [state.tournaments[0]]
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
