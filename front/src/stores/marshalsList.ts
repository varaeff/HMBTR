import { defineStore } from 'pinia'
import type {
  Marshal,
  MarshalCategory,
  MarshalDB,
  MarshalProfileDB,
  TournamentMarshal,
  TournamentMarshalDB
} from '@/model'
import http from '@/api/http'
import { useCommonDataStore } from '@/stores/commonData'
import { API_ROUTES } from '@shared/routes'

interface MarshalsListState {
  marshals: Marshal[]
  categories: MarshalCategory[]
  searchString: string
}

const commonDataStore = useCommonDataStore()

const parseMarshal = async (marshalDB: MarshalDB): Promise<Marshal> => {
  return {
    id: marshalDB.id || 0,
    name: marshalDB.name,
    surname: marshalDB.surname,
    patronymic: marshalDB.patronymic,
    country_id: marshalDB.country_id,
    city_id: marshalDB.city_id,
    category_id: marshalDB.category_id,
    country: await commonDataStore.fetchCountry(marshalDB.country_id),
    city: await commonDataStore.fetchCity(marshalDB.city_id),
    pic: marshalDB.pic,
    category: marshalDB.category
  }
}

export const parseTournamentMarshal = async (
  tournamentMarshalDB: TournamentMarshalDB
): Promise<TournamentMarshal> => ({
  id: tournamentMarshalDB.id,
  tournament_id: tournamentMarshalDB.tournament_id,
  marshal_id: tournamentMarshalDB.marshal_id,
  marshal: await parseMarshal(tournamentMarshalDB.marshal)
})

export const useMarshalsListStore = defineStore({
  id: 'marshalsList',
  state: (): MarshalsListState => ({
    marshals: [],
    categories: [],
    searchString: ''
  }),

  actions: {
    async fetchCategories() {
      if (this.categories.length) return this.categories

      const data = (await http.get(API_ROUTES.MARSHALS.ROOT + '/' + API_ROUTES.MARSHALS.CATEGORIES))
        .data as MarshalCategory[]
      this.categories = data

      return this.categories
    },

    async showMarshalDetails(id: number) {
      let marshal = this.marshals.find((item) => item.id === id)

      if (marshal) return marshal

      const marshalDB = (await http.get(API_ROUTES.MARSHALS.BY_ID(id))).data as MarshalProfileDB

      if (!marshalDB) return

      marshal = await parseMarshal(marshalDB)

      return marshal
    },

    async getMarshalProfile(id: number) {
      const marshalDB = (await http.get(API_ROUTES.MARSHALS.BY_ID(id))).data as MarshalProfileDB
      const marshal = await parseMarshal(marshalDB)

      const existingIndex = this.marshals.findIndex((item) => item.id === marshal.id)
      if (existingIndex >= 0) {
        this.marshals[existingIndex] = marshal
      } else {
        this.marshals.push(marshal)
      }

      return { marshal, tournaments: marshalDB.tournaments.map((item) => item.tournament) }
    },

    async getMarshalsList() {
      await Promise.all([
        commonDataStore.fetchCountries(),
        commonDataStore.fetchCities(),
        this.fetchCategories()
      ])

      const marshalsCount: number = (
        await http.get(API_ROUTES.MARSHALS.ROOT + '/' + API_ROUTES.MARSHALS.COUNT)
      ).data

      if (marshalsCount === this.marshals.length) return

      const data = (await http.get(API_ROUTES.MARSHALS.ROOT)).data as MarshalDB[]

      const marshals = await Promise.all(data.map(async (marshalDB) => parseMarshal(marshalDB)))
      const existingIds = new Set(this.marshals.map((marshal) => marshal.id))

      this.marshals.push(...marshals.filter((marshal) => !existingIds.has(marshal.id)))
    },

    async addNewMarshal(marshalDB: MarshalDB, marshal: Marshal) {
      const response = await http.post(API_ROUTES.MARSHALS.ROOT, marshalDB)
      const savedMarshal = await parseMarshal(response.data as MarshalDB)
      this.marshals.push({ ...marshal, id: savedMarshal.id, category: savedMarshal.category })
      return savedMarshal
    },

    async updateMarshal(id: number, marshalDB: MarshalDB) {
      const response = await http.put(API_ROUTES.MARSHALS.BY_ID(id), marshalDB)
      const updatedMarshal = await parseMarshal(response.data as MarshalDB)
      const marshalIndex = this.marshals.findIndex((marshal) => marshal.id === id)

      if (marshalIndex >= 0) {
        this.marshals[marshalIndex] = updatedMarshal
      } else {
        this.marshals.push(updatedMarshal)
      }

      return updatedMarshal
    },

    clearSearchString() {
      this.searchString = ''
    },

    setSearchString(searchString: string) {
      this.searchString = searchString
    }
  },

  getters: {
    filteredMarshalsList(state) {
      const filtered = state.marshals.filter(
        (marshal) =>
          marshal.name.toLowerCase().includes(state.searchString.toLowerCase()) ||
          marshal.surname.toLowerCase().includes(state.searchString.toLowerCase()) ||
          marshal.city.toLowerCase().includes(state.searchString.toLowerCase()) ||
          (marshal.category &&
            (marshal.category.name_ru.toLowerCase().includes(state.searchString.toLowerCase()) ||
              marshal.category.name_en.toLowerCase().includes(state.searchString.toLowerCase())))
      )

      return filtered.length > 0 ? filtered : []
    },

    marshalsList(state) {
      return state.marshals
    },

    getMaxId(state) {
      return (
        state.marshals.reduce((maxId, marshal) => {
          return Math.max(maxId, marshal.id)
        }, 0) + 1
      )
    },

    getSearchString(state) {
      return state.searchString
    }
  }
})
