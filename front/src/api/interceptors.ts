import http from './http'
import { useApiUiStore } from '@/stores/apiUi'

const setupInterceptors = () => {
  http.interceptors.request.use((config) => {
    const ui = useApiUiStore()
    ui.startLoading()
    ui.clearError()
    return config
  })

  http.interceptors.response.use(
    (response) => {
      useApiUiStore().stopLoading()
      return response
    },
    (error) => {
      const ui = useApiUiStore()
      ui.stopLoading()

      const message =
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
