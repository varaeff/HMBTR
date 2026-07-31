import {
  fetchAuthProfile,
  loginAuth,
  logoutAuth,
  refreshAuth,
  registerAuth,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest
} from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/model/index'

export const useAuthService = () => {
  const authStore = useAuthStore()

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const authResponse = await registerAuth(data)
    const { user, access_token, refresh_token } = authResponse

    authStore.register(user, {
      access_token,
      refresh_token
    })

    return authResponse
  }

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const authResponse = await loginAuth(data)
    const { user, access_token, refresh_token } = authResponse

    authStore.login(user, {
      access_token,
      refresh_token
    })

    return authResponse
  }

  const logout = async (): Promise<void> => {
    try {
      await logoutAuth()
      authStore.logout()
    } catch (error) {
      authStore.logout()
      throw error
    }
  }

  const refresh = async (refreshToken: string): Promise<AuthResponse> => {
    try {
      const authResponse = await refreshAuth(refreshToken)
      const { user, access_token, refresh_token } = authResponse

      authStore.updateTokens({
        access_token,
        refresh_token
      })

      authStore.setUser(user)

      return authResponse
    } catch (error) {
      console.error('Failed to refresh token:', error)
      authStore.logout()
      throw error
    }
  }

  const profile = async (): Promise<User> => {
    const user = await fetchAuthProfile()

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
