import { defineStore } from 'pinia'
import http from '@/api/http'
import type { City, Club, Country } from '@/model'
import { API_ROUTES } from '@shared/routes'

interface CommonDataState {
  countries: Country[]
  cities: City[]
  clubs: Club[]
  selectedCountry: number
  selectedCity: number
  alertData: string
}

export const useCommonDataStore = defineStore({
  id: 'commonData',
  state: (): CommonDataState => ({
    countries: [],
    cities: [],
    clubs: [],
    selectedCountry: 0,
    selectedCity: 0,
    alertData: ''
  }),

  actions: {
    async fetchCountries(this: CommonDataState) {
      const response = await http.get(API_ROUTES.COUNTRIES.ROOT)
      const data = response.data
      this.countries = []
      this.countries.push(...data)
      return data.sort((a: Country, b: Country) => a.name.localeCompare(b.name))
    },

    async fetchCountry(id: number) {
      const response = await http.get(API_ROUTES.COUNTRIES.BY_ID(id))
      return response.data.name
    },

    async addCountry(name: string) {
      await http.post(API_ROUTES.COUNTRIES.ROOT, { name })
    },

    async fetchCities(this: CommonDataState, id: number) {
      const response = await http.get(API_ROUTES.CITIES.BY_PARENT(id))
      const data = response.data
      this.cities = []
      this.cities.push(...data)
      return data.sort((a: City, b: City) => a.name.localeCompare(b.name))
    },

    async fetchCity(id: number) {
      const response = await http.get(API_ROUTES.CITIES.BY_ID(id))
      return response.data.name
    },

    async addCity(this: CommonDataState, country_id: number, name: string) {
      await http.post(API_ROUTES.CITIES.ROOT, { country_id, name })
    },

    async fetchClubs(this: CommonDataState, id: number) {
      const response = await http.get(API_ROUTES.CLUBS.BY_PARENT(id))
      const data = response.data
      this.clubs = []
      this.clubs.push(...data)
      return data.sort((a: Club, b: Club) => a.name.localeCompare(b.name))
    },

    async fetchClub(id: number) {
      const response = await http.get(API_ROUTES.CLUBS.BY_ID(id))
      return response.data.name
    },

    async addClub(this: CommonDataState, city_id: number, name: string) {
      await http.post(API_ROUTES.CLUBS.ROOT, { city_id, name })
    }
  }
})
