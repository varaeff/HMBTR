import { defineStore } from 'pinia'
import type { Fighter, FighterDB } from '@/shared/model'
import http from '@/api/http'

import { getCityNameById, getClubNameById, getCountryNameById } from '@/features/getLocations'

interface FightersListState {
  fighters: Fighter[]
  seachString: string
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
    seachString: ''
  }),
  actions: {
    async showFighterDetails(this: FightersListState, id: number) {
      let fighter = this.fighters.find((fighter) => fighter.id === id)

      if (fighter) {
        return fighter
      }

      fighter = (await http.get(`/fighter/${id}`)).data

      return fighter ? fighter : this.fighters[0]
    },

    async getFightersList(this: FightersListState) {
      const data: Array<FighterDB> = (await http.get(`/fighters`)).data

      const fighters: Array<Fighter> = await Promise.all(
        data.map(async (fighterDB) => ({
          id: fighterDB.id || 0,
          name: fighterDB.name,
          surname: fighterDB.surname,
          patronymic: fighterDB.patronymic,
          birthday: fighterDB.birthday ? new Date(fighterDB.birthday) : null,
          country: await getCountryNameById(fighterDB.country_id),
          city: await getCityNameById(fighterDB.city_id),
          club: fighterDB.club_id ? await getClubNameById(fighterDB.club_id) : undefined,
          pic: fighterDB.pic
        }))
      )

      this.fighters.push(...fighters)
    },

    async addNewFighter(this: FightersListState, fighterDB: FighterDB, fighter: Fighter) {
      await http.post(`/fighters`, fighterDB)
      this.fighters.push(fighter)
    }
  },
  getters: {
    filteredFightersList(state) {
      const filtered = state.fighters
        .filter((fighter) => fighter.id !== 0)
        .filter(
          (fighter) =>
            fighter.name.toLowerCase().includes(state.seachString.toLowerCase()) ||
            fighter.surname.toLowerCase().includes(state.seachString.toLowerCase()) ||
            fighter.city.toLowerCase().includes(state.seachString.toLowerCase()) ||
            (fighter.club && fighter.club.toLowerCase().includes(state.seachString.toLowerCase()))
        )

      return filtered.length > 0 ? filtered : [state.fighters[0]]
    },
    getMaxId(state) {
      return (
        state.fighters.reduce((maxId, fighter) => {
          return Math.max(maxId, fighter.id)
        }, 0) + 1
      )
    }
  }
})
