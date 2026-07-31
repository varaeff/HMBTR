import router from '@/router'
import http from './http'
import { refreshAuth } from '@/api/auth'
import { useApiUiStore } from '@/stores/apiUi'
import { useAuthStore } from '@/stores/auth'
import type { Pinia } from 'pinia'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface ApiErrorData {
  details?: unknown
  error?: unknown
  message?: unknown
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

export const isAuthEndpoint = (url?: string) => {
  if (!url) return false

  return ['/auth/login', '/auth/register', '/auth/refresh'].some((endpoint) =>
    url.includes(endpoint)
  )
}

const processQueue = (error?: unknown) => {
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
    async (error: AxiosError<ApiErrorData>) => {
      const ui = useApiUiStore(pinia)
      const auth = useAuthStore(pinia)
      const originalRequest = error.config as RetriableRequestConfig | undefined

      ui.stopLoading()

      const isAuthRequest = isAuthEndpoint(originalRequest?.url)
      const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh') === true

      // Handle 401 Unauthorized - Token expired
      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !isAuthRequest
      ) {
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
            const authResponse = await refreshAuth(auth.refreshToken)
            auth.updateTokens({
              access_token: authResponse.access_token,
              refresh_token: authResponse.refresh_token
            })
            auth.setUser(authResponse.user)

            processQueue()
            isRefreshing = false

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${auth.accessToken}`
            return http(originalRequest)
          } else {
            // No refresh token, logout user
            isRefreshing = false
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
        getErrorMessage(error.response?.data?.details) ||
        getErrorMessage(error.response?.data?.error) ||
        getErrorMessage(error.response?.data?.message) ||
        getErrorMessage(error.response?.data) ||
        error.message ||
        'Ошибка запроса'

      ui.setError(message)

      return Promise.reject(error)
    }
  )
}

const getErrorMessage = (value: unknown): string | undefined => {
  if (!value) return undefined
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export default setupInterceptors
