import router from '@/router'
import http from './http'
import { useApiUiStore } from '@/stores/apiUi'
import { useAuthStore } from '@/stores/auth'
import type { Pinia } from 'pinia'

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error?: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })

  failedQueue = []
}

const setupInterceptors = (pinia: Pinia) => {
  // Request interceptor - Add JWT token to headers
  http.interceptors.request.use((config) => {
    const ui = useApiUiStore(pinia)
    const auth = useAuthStore(pinia)

    ui.startLoading()
    ui.clearError()

    // Add authorization header if token exists
    if (auth.accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }

    return config
  })

  // Response interceptor - Handle token refresh and errors
  http.interceptors.response.use(
    (response) => {
      useApiUiStore(pinia).stopLoading()
      return response
    },
    async (error) => {
      const ui = useApiUiStore(pinia)
      const auth = useAuthStore(pinia)
      const originalRequest = error.config

      ui.stopLoading()

      // Don't retry refresh endpoint itself - if refresh fails, logout immediately
      const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh')

      // Handle 401 Unauthorized - Token expired
      if (error.response?.status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
        if (isRefreshing) {
          // Queue the request to be retried after token refresh
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => {
              originalRequest.headers.Authorization = `Bearer ${auth.accessToken}`
              return http(originalRequest)
            })
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          // Try to refresh token
          if (auth.refreshToken) {
            const { useAuthService } = await import('@/composables/useAuthService')
            const authService = useAuthService()

            await authService.refresh(auth.refreshToken)

            processQueue()
            isRefreshing = false

            // Retry original request with new token
            const freshStore = useAuthStore() // Get fresh store instance to ensure we have the updated token
            originalRequest.headers.Authorization = `Bearer ${freshStore.accessToken}`
            return http(originalRequest)
          } else {
            // No refresh token, logout user
            auth.logout()
            router.push('/')
            return Promise.reject(error)
          }
        } catch (refreshError) {
          processQueue(refreshError)
          isRefreshing = false

          // Token refresh failed, logout user
          auth.logout()
          router.push('/')

          return Promise.reject(refreshError)
        }
      }

      // If refresh endpoint itself returns 401, user record was likely deleted - logout immediately
      if (isRefreshEndpoint && error.response?.status === 401) {
        auth.logout()
        router.push('/')
      }

      // Handle other errors
      const message =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Ошибка запроса'

      ui.setError(typeof message === 'string' ? message : JSON.stringify(message))

      return Promise.reject(error)
    }
  )
}

export default setupInterceptors
