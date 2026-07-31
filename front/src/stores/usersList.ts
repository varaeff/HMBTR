import { defineStore } from 'pinia'
import type { User } from '@/model'
import http from '@/api/http'
import {
  clearListSearch,
  filterBySearch,
  hasLoadedRemoteList,
  mergeMissingById,
  replaceById,
  setListSearch,
  withFallback
} from '@/stores/shared/listStorePolicy'
import { API_ROUTES } from '@shared/routes'

interface UsersListState {
  users: User[]
  searchString: string
}

const parseUser = async (user: User): Promise<User> => {
  return {
    id: user.id || 0,
    username: user.username,
    name: user.name,
    surname: user.surname,
    patronymic: user.patronymic,
    email: user.email,
    is_admin: user.is_admin,
    is_organizer: user.is_organizer,
    is_secretary: user.is_secretary ?? false
  }
}

export const useUsersListStore = defineStore({
  id: 'usersList',
  state: (): UsersListState => ({
    users: [
      {
        id: 0,
        username: '',
        name: 'пользователь не найден',
        surname: '',
        patronymic: '',
        email: '',
        is_admin: false,
        is_organizer: false,
        is_secretary: false
      }
    ],
    searchString: ''
  }),

  actions: {
    async getUsersList(this: UsersListState) {
      const usersCount: number = (
        await http.get(API_ROUTES.USERS.ROOT + '/' + API_ROUTES.USERS.COUNT)
      ).data

      if (hasLoadedRemoteList(this.users, usersCount, (user) => user.id !== 0)) return

      const data: Array<User> = (await http.get(API_ROUTES.USERS.ROOT)).data

      const users: Array<User> = await Promise.all(data.map(async (user) => parseUser(user)))

      mergeMissingById(this.users, users)
    },

    async updateUser(this: UsersListState, updatedUser: User) {
      const response = await http.put(
        API_ROUTES.USERS.ROOT +
          '/' +
          API_ROUTES.USERS.BY_ID_PATH.replace(':id', String(updatedUser.id)),
        updatedUser
      )
      const updatedUserData: User = await parseUser(response.data)
      replaceById(this.users, updatedUserData)
    },

    clearSearchString() {
      clearListSearch(this)
    },

    setSearchString(searchString: string) {
      setListSearch(this, searchString)
    }
  },

  getters: {
    filteredUsersList(state) {
      const filtered = filterBySearch(
        state.users.filter((user) => user.id !== 0),
        state.searchString,
        [(user) => user.username, (user) => user.name, (user) => user.surname]
      )

      return withFallback(filtered, state.users[0])
    },

    getSearchString(state) {
      return state.searchString
    }
  }
})
