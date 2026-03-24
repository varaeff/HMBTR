import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/model/index'

interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  password: string
  name: string
  surname: string
  patronymic?: string
  email?: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export const useAuthService = () => {
  const authStore = useAuthStore()

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await http.post<AuthResponse>('/auth/register', data)
    const { user, access_token, refresh_token } = response.data

    authStore.register(user, {
      access_token,
      refresh_token
    })

    return response.data
  }

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await http.post<AuthResponse>('/auth/login', data)
    const { user, access_token, refresh_token } = response.data

    authStore.login(user, {
      access_token,
      refresh_token
    })

    return response.data
  }

  const logout = async (): Promise<void> => {
    try {
      await http.post('/auth/logout')
      authStore.logout()
    } catch (error) {
      authStore.logout()
      throw error
    }
  }

  const refresh = async (refreshToken: string): Promise<AuthResponse> => {
    try {
      const response = await http.post<AuthResponse>('/auth/refresh', {
        refreshToken
      })

      const { user, access_token, refresh_token } = response.data

      authStore.updateTokens({
        access_token,
        refresh_token
      })

      authStore.setUser(user)

      return response.data
    } catch (error) {
      console.error('Failed to refresh token:', error)
      authStore.logout()
      throw error
    }
  }

  const profile = async (): Promise<User> => {
    const response = await http.post<User>('/auth/profile')
    const user = response.data

    authStore.setUser(user)

    return user
  }

  return {
    register,
    login,
    logout,
    refresh,
    profile
  }
}
