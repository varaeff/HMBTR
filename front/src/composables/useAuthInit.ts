import { useAuthStore } from '@/stores/auth'
import { useAuthService } from './useAuthService'
import { ref } from 'vue'

export const useAuthInit = () => {
  const authStore = useAuthStore()
  const authService = useAuthService()
  const isInitialized = ref(false)

  const initAuth = async () => {
    try {
      // Load stored tokens from localStorage
      authStore.loadStoredAuth()

      // If we have tokens, try to fetch profile to verify they're still valid
      if (authStore.accessToken) {
        try {
          await authService.profile()
        } catch (error) {
          // If profile fetch fails, tokens are invalid
          authStore.logout()
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      isInitialized.value = true
    }
  }

  return {
    isInitialized,
    initAuth
  }
}
