import { defineStore } from 'pinia'

export const useApiUiStore = defineStore('apiUi', {
  state: () => ({
    isLoading: false,
    error: null as string | null
  }),
  actions: {
    startLoading() {
      this.isLoading = true
    },
    stopLoading() {
      this.isLoading = false
    },
    setError(message: string) {
      this.error = message
    },
    clearError() {
      this.error = null
    }
  }
})
