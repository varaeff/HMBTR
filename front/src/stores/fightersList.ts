import { defineStore } from 'pinia'
import type { Fighter, FighterDB } from '@/model'
import http from '@/api/http'
import { useCommonDataStore } from '@/stores/commonData'
import {
  clearListSearch,
  filterBySearch,
  getNextListId,
  hasLoadedRemoteList,
  mergeMissingById,
  setListSearch,
  upsertById
} from '@/stores/shared/listStorePolicy'
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
    country_id: fighterDB.country_id,
    city_id: fighterDB.city_id,
    club_id: fighterDB.club_id,
    country: await commonDataStore.fetchCountry(fighterDB.country_id),
    city: await commonDataStore.fetchCity(fighterDB.city_id),
    club: fighterDB.club_id ? await commonDataStore.fetchClub(fighterDB.club_id) : undefined,
    pic: fighterDB.pic,
    is_male: fighterDB.is_male ?? true
  }
}

export const useFightersListStore = defineStore({
  id: 'fightersList',
  state: (): FightersListState => ({
    fighters: [],
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
        return
      }

      fighter = await parseFighter(fighterDB)

      return fighter
    },

    async getFightersList(this: FightersListState) {
      await Promise.all([
        commonDataStore.fetchCountries(),
        commonDataStore.fetchCities(),
        commonDataStore.fetchClubs()
      ])

      const fightersCount: number = (
        await http.get(API_ROUTES.FIGHTERS.ROOT + '/' + API_ROUTES.FIGHTERS.COUNT)
      ).data

      if (hasLoadedRemoteList(this.fighters, fightersCount)) return

      const data: Array<FighterDB> = (await http.get(API_ROUTES.FIGHTERS.ROOT)).data

      const fighters: Array<Fighter> = await Promise.all(
        data.map(async (fighterDB) => parseFighter(fighterDB))
      )

      mergeMissingById(this.fighters, fighters)
    },

    async addNewFighter(this: FightersListState, fighterDB: FighterDB, fighter: Fighter) {
      await http.post(API_ROUTES.FIGHTERS.ROOT, fighterDB)
      this.fighters.push(fighter)
    },

    async updateFighter(this: FightersListState, id: number, fighterDB: FighterDB) {
      const response = await http.put(API_ROUTES.FIGHTERS.BY_ID(id), fighterDB)
      const updatedFighter = await parseFighter(response.data as FighterDB)
      upsertById(this.fighters, updatedFighter)

      return updatedFighter
    },

    clearSearchString() {
      clearListSearch(this)
    },

    setSearchString(searchString: string) {
      setListSearch(this, searchString)
    }
  },

  getters: {
    filteredFightersList(state) {
      return filterBySearch(state.fighters, state.searchString, [
        (fighter) => fighter.name,
        (fighter) => fighter.surname,
        (fighter) => fighter.city,
        (fighter) => fighter.club
      ])
    },

    fightersList(state) {
      return state.fighters
    },

    getMaxId(state) {
      return getNextListId(state.fighters)
    },

    getFighterById: (state) => (id: number) => {
      return state.fighters.find((fighter) => fighter.id === id)
    },

    getSearchString(state) {
      return state.searchString
    }
  }
})
