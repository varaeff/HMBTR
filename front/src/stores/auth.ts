import { defineStore } from 'pinia'
import type { User } from '@/model'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token')
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    isAdmin: (state) => state.user?.is_admin ?? false,
    isOrganizer: (state) => state.user?.is_organizer ?? false
  },

  actions: {
    login(userData: User, tokens: { access_token: string; refresh_token: string }) {
      this.user = userData
      this.accessToken = tokens.access_token
      this.refreshToken = tokens.refresh_token

      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
    },

    register(userData: User, tokens: { access_token: string; refresh_token: string }) {
      this.login(userData, tokens)
    },

    logout() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null

      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    },

    setUser(userData: User) {
      this.user = userData
    },

    updateTokens(tokens: { access_token: string; refresh_token?: string }) {
      this.accessToken = tokens.access_token
      localStorage.setItem('access_token', tokens.access_token)

      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token
        localStorage.setItem('refresh_token', tokens.refresh_token)
      }
    },

    loadStoredAuth() {
      const storedAccessToken = localStorage.getItem('access_token')
      const storedRefreshToken = localStorage.getItem('refresh_token')

      if (storedAccessToken) this.accessToken = storedAccessToken
      if (storedRefreshToken) this.refreshToken = storedRefreshToken
    }
  }
})
