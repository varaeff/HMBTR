import { defineStore } from 'pinia'
import axios from 'axios'
import type { Fighter, FighterDB } from '@/shared/model'

import Ukolov from '@/entities/Ukolov.png'
import Namazov from '@/entities/Namazov.jpeg'
import Golovina from '@/entities/Golovina.jpeg'
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
      },
      {
        id: 1,
        name: 'Сергей',
        surname: 'Уколов',
        country: 'Россия',
        city: 'Москва',
        club: 'Байард',
        pic: Ukolov
      },
      {
        id: 2,
        name: 'Рафаэль',
        surname: 'Намазов',
        country: 'Россия',
        city: 'Нижний Новгород',
        club: 'Берн',
        pic: Namazov
      },
      {
        id: 3,
        name: 'Марина',
        surname: 'Головина',
        country: 'Россия',
        city: 'Москва',
        club: 'Тверд',
        pic: Golovina
      }
    ],
    seachString: ''
  }),
  actions: {
    showFighterDetails(this: FightersListState, id: number) {
      const fighter = this.fighters.find((fighter) => fighter.id === id)
      return fighter ? fighter : this.fighters[0]
    },

    async getFightersList(this: FightersListState) {
      const data: Array<FighterDB> = (
        await axios.get(`${import.meta.env.VITE_API_BASE_URL}/fighters`)
      ).data

      const fighters: Array<Fighter> = await Promise.all(
        data.map(async (fighterDB) => ({
          id: fighterDB.id,
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

      const newFighters = fighters.filter(
        (newFighter) =>
          !this.fighters.some((existingFighter) => existingFighter.id === newFighter.id)
      )

      this.fighters.push(...newFighters)
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
