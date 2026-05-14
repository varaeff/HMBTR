import { defineStore } from 'pinia'

export const useApiUiStore = defineStore('apiUi', {
  state: () => ({
    isLoading: false,
    pendingRequests: 0,
    error: null as string | null
  }),
  actions: {
    startLoading() {
      this.pendingRequests += 1
      this.isLoading = true
    },
    stopLoading() {
      this.pendingRequests = Math.max(0, this.pendingRequests - 1)
      this.isLoading = this.pendingRequests > 0
    },
    setError(message: string) {
      this.error = message
    },
    clearError() {
      this.error = null
    }
  }
})
