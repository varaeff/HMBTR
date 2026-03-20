import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: number
  username: string
  name: string
  surname: string
  email?: string
  is_admin: boolean
  is_organizer: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const isAdmin = computed(() => user.value?.is_admin ?? false)
  const isOrganizer = computed(() => user.value?.is_organizer ?? false)

  const login = (userData: User, tokens: { access_token: string; refresh_token: string }) => {
    user.value = userData
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token

    // Save tokens to localStorage
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }

  const register = (userData: User, tokens: { access_token: string; refresh_token: string }) => {
    login(userData, tokens)
  }

  const logout = () => {
    user.value = null
    accessToken.value = null
    refreshToken.value = null

    // Clear tokens from localStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const setUser = (userData: User) => {
    user.value = userData
  }

  const updateTokens = (tokens: { access_token: string; refresh_token?: string }) => {
    accessToken.value = tokens.access_token
    localStorage.setItem('access_token', tokens.access_token)

    if (tokens.refresh_token) {
      refreshToken.value = tokens.refresh_token
      localStorage.setItem('refresh_token', tokens.refresh_token)
    }
  }

  const loadStoredAuth = () => {
    const storedAccessToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')

    if (storedAccessToken) {
      accessToken.value = storedAccessToken
    }

    if (storedRefreshToken) {
      refreshToken.value = storedRefreshToken
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isAdmin,
    isOrganizer,
    login,
    register,
    logout,
    setUser,
    updateTokens,
    loadStoredAuth
  }
})
