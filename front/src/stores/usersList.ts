import { defineStore } from 'pinia'
import type { User } from '@/model'
import http from '@/api/http'
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
    is_organizer: user.is_organizer
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
        is_organizer: false
      }
    ],
    searchString: ''
  }),

  actions: {
    async getUsersList(this: UsersListState) {
      const usersCount: number = (
        await http.get(API_ROUTES.USERS.ROOT + '/' + API_ROUTES.USERS.COUNT)
      ).data

      if (usersCount === this.users.length - 1) return

      const data: Array<User> = (await http.get(API_ROUTES.USERS.ROOT)).data

      const users: Array<User> = await Promise.all(data.map(async (user) => parseUser(user)))

      const existingIds = new Set(this.users.map((u) => u.id))

      this.users.push(...users.filter((user) => !existingIds.has(user.id)))
    },

    async updateUser(this: UsersListState, updatedUser: User) {
      const response = await http.put(
        API_ROUTES.USERS.ROOT +
          '/' +
          API_ROUTES.USERS.BY_ID_PATH.replace(':id', String(updatedUser.id)),
        updatedUser
      )
      const updatedUserData: User = await parseUser(response.data)
      const userIndex = this.users.findIndex((u) => u.id === updatedUser.id)
      if (userIndex !== -1) {
        this.users[userIndex] = updatedUserData
      }
    },

    clearSearchString() {
      this.searchString = ''
    },

    setSearchString(searchString: string) {
      this.searchString = searchString
    }
  },

  getters: {
    filteredUsersList(state) {
      const filtered = state.users
        .filter((user) => user.id !== 0)
        .filter(
          (user) =>
            user.username.toLowerCase().includes(state.searchString.toLowerCase()) ||
            user.name.toLowerCase().includes(state.searchString.toLowerCase()) ||
            user.surname.toLowerCase().includes(state.searchString.toLowerCase())
        )

      return filtered.length > 0 ? filtered : [state.users[0]]
    },

    getSearchString(state) {
      return state.searchString
    }
  }
})
