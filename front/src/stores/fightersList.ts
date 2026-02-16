import { defineStore } from 'pinia'
import type { Fighter, FighterDB } from '@/model'
import http from '@/api/http'
import { useCommonDataStore } from '@/stores/commonData'
import { API_ROUTES } from '@shared/routes'

interface FightersListState {
  fighters: Fighter[]
  searchString: string
}

const commonDataStore = useCommonDataStore()

const parseFighter = async (fighterDB: FighterDB): Promise<Fighter> => {
  return {
    id: fighterDB.id || 0,
    name: fighterDB.name,
    surname: fighterDB.surname,
    patronymic: fighterDB.patronymic,
    birthday: fighterDB.birthday ? new Date(fighterDB.birthday) : null,
    country: await commonDataStore.fetchCountry(fighterDB.country_id),
    city: await commonDataStore.fetchCity(fighterDB.city_id),
    club: fighterDB.club_id ? await commonDataStore.fetchClub(fighterDB.club_id) : undefined,
    pic: fighterDB.pic
  }
}

export const useFightersListStore = defineStore({
  id: 'fightersList',
  state: (): FightersListState => ({
    fighters: [
      {
        id: 0,
        name: 'боец не найден',
        surname: '',
        country: '',
        city: '',
        club: '',
        pic: ''
      }
    ],
    searchString: ''
  }),

  actions: {
    async showFighterDetails(this: FightersListState, id: number) {
      let fighter = this.fighters.find((fighter) => fighter.id === id)

      if (fighter) {
        return fighter
      }

      const fighterDB = (await http.get(API_ROUTES.FIGHTERS.BY_ID(id))).data as FighterDB

      if (!fighterDB) {
        return this.fighters[0]
      }

      fighter = await parseFighter(fighterDB)

      return fighter
    },

    async getFightersList(this: FightersListState) {
      const fightersCount: number = (
        await http.get(API_ROUTES.FIGHTERS.ROOT + '/' + API_ROUTES.FIGHTERS.COUNT)
      ).data

      if (fightersCount === this.fighters.length - 1) return

      const data: Array<FighterDB> = (await http.get(API_ROUTES.FIGHTERS.ROOT)).data

      const fighters: Array<Fighter> = await Promise.all(
        data.map(async (fighterDB) => parseFighter(fighterDB))
      )

      const existingIds = new Set(this.fighters.map((f) => f.id))

      this.fighters.push(...fighters.filter((fighter) => !existingIds.has(fighter.id)))
    },

    async addNewFighter(this: FightersListState, fighterDB: FighterDB, fighter: Fighter) {
      await http.post(API_ROUTES.FIGHTERS.ROOT, fighterDB)
      this.fighters.push(fighter)
    },

    clearSearchString() {
      this.searchString = ''
    },

    setSearchString(searchString: string) {
      this.searchString = searchString
    }
  },

  getters: {
    filteredFightersList(state) {
      const filtered = state.fighters
        .filter((fighter) => fighter.id !== 0)
        .filter(
          (fighter) =>
            fighter.name.toLowerCase().includes(state.searchString.toLowerCase()) ||
            fighter.surname.toLowerCase().includes(state.searchString.toLowerCase()) ||
            fighter.city.toLowerCase().includes(state.searchString.toLowerCase()) ||
            (fighter.club && fighter.club.toLowerCase().includes(state.searchString.toLowerCase()))
        )

      return filtered.length > 0 ? filtered : [state.fighters[0]]
    },

    getMaxId(state) {
      return (
        state.fighters.reduce((maxId, fighter) => {
          return Math.max(maxId, fighter.id)
        }, 0) + 1
      )
    },

    getSearchString(state) {
      return state.searchString
    }
  }
})
