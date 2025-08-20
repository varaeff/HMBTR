import { defineStore } from 'pinia'
import axios from 'axios'
import type { City, Club, Country } from '@/shared/model'

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
      try {
        const response = await axios.get('http://localhost:3000/api/hmbtr/v1/countries')
        const data = response.data
        this.countries = []
        this.countries.push(...data)
        return data
      } catch (error) {
        console.error('Failed to fetch countries:', error)
        throw error
      }
    },
    async fetchCities(this: CommonDataState, id: number) {
      try {
        const response = await axios.get(`http://localhost:3000/api/hmbtr/v1/cities/${id}`)
        const data = response.data
        this.cities = []
        this.cities.push(...data)
        return data
      } catch (error) {
        console.error('Failed to fetch cities:', error)
        throw error
      }
    },
    async fetchClubs(this: CommonDataState, id: number) {
      try {
        const response = await axios.get(`http://localhost:3000/api/hmbtr/v1/clubs/${id}`)
        const data = response.data
        this.clubs = []
        this.clubs.push(...data)
        return data
      } catch (error) {
        console.error('Failed to fetch clubs:', error)
        throw error
      }
    }
  },
  getters: {
    getCountries(state) {
      return state.countries
    },
    getCities(state) {
      return state.cities
    },
    getClubs(state) {
      return state.clubs
    }
  }
})
