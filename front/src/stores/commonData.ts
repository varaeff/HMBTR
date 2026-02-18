import { defineStore } from 'pinia'
import http from '@/api/http'
import type { City, Club, Country } from '@/model'
import { API_ROUTES } from '@shared/routes'

interface CommonDataState {
  countries: Country[]
  cities: City[]
  clubs: Club[]
  alertData: string
}

export const useCommonDataStore = defineStore({
  id: 'commonData',
  state: (): CommonDataState => ({
    countries: [],
    cities: [],
    clubs: [],
    alertData: ''
  }),

  actions: {
    async fetchCountries() {
      const count = await http.get(API_ROUTES.COUNTRIES.ROOT + '/' + API_ROUTES.COUNTRIES.COUNT)

      if (this.countries.length === count.data)
        return this.countries.sort((a: Country, b: Country) => a.name.localeCompare(b.name))

      const response = await http.get(API_ROUTES.COUNTRIES.ROOT)
      const data = response.data
      this.countries = []
      this.countries.push(...data)
      return data.sort((a: Country, b: Country) => a.name.localeCompare(b.name))
    },

    async fetchCountry(id: number) {
      const country = this.countries.find((country) => country.id === id)

      if (country) {
        return country.name
      }

      const response = await http.get(API_ROUTES.COUNTRIES.BY_ID(id))
      return response.data.name
    },

    async addCountry(name: string) {
      const country = await http.post(API_ROUTES.COUNTRIES.ROOT, { name })
      this.countries.push(...country.data)
    },

    async fetchCities() {
      const count = await http.get(API_ROUTES.CITIES.ROOT + '/' + API_ROUTES.CITIES.COUNT)

      if (this.cities.length === count.data) return

      const response = await http.get(API_ROUTES.CITIES.ROOT)
      this.cities = []
      this.cities.push(...response.data)
    },

    async fetchCitiesByCountry(id: number) {
      await this.fetchCities()

      const cities = this.cities.filter((city) => city.country_id === id)

      return cities.sort((a: City, b: City) => a.name.localeCompare(b.name))
    },

    async fetchCity(id: number) {
      const city = this.cities.find((city) => city.id === id)

      if (city) {
        return city.name
      }

      const response = await http.get(API_ROUTES.CITIES.BY_ID(id))
      return response.data.name
    },

    async addCity(country_id: number, name: string) {
      const city = await http.post(API_ROUTES.CITIES.ROOT, { country_id, name })
      this.cities.push(...city.data)
    },

    async fetchClubs() {
      const count = await http.get(API_ROUTES.CLUBS.ROOT + '/' + API_ROUTES.CLUBS.COUNT)

      if (this.clubs.length === count.data) return

      const response = await http.get(API_ROUTES.CLUBS.ROOT)
      this.clubs = []
      this.clubs.push(...response.data)
    },

    async fetchClubsByCity(id: number) {
      await this.fetchClubs()

      const clubs = this.clubs.filter((club) => club.city_id === id)

      return clubs.sort((a: Club, b: Club) => a.name.localeCompare(b.name))
    },

    async fetchClub(id: number) {
      const club = this.clubs.find((club) => club.id === id)

      if (club) {
        return club.name
      }

      const response = await http.get(API_ROUTES.CLUBS.BY_ID(id))
      return response.data.name
    },

    async addClub(city_id: number, name: string) {
      const club = await http.post(API_ROUTES.CLUBS.ROOT, { city_id, name })
      this.clubs.push(...club.data)
    }
  }
})
