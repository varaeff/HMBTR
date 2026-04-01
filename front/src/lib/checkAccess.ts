import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

export const hasAccess = () => {
  return (
    (authStore.isAuthenticated && (authStore.user?.is_organizer || authStore.user?.is_admin)) ||
    false
  )
}

export const hasAdminAccess = () => {
  return authStore.isAuthenticated && authStore.user?.is_admin
}
