import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthService } from '@/composables/useAuthService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomeViewPage.vue')
    },
    {
      path: '/fighters',
      name: 'fighters',
      component: () => import('@/pages/FightersListPage.vue')
    },
    {
      path: '/fighter/:id',
      name: 'fighter',
      component: () => import('@/pages/FighterPage.vue')
    },
    {
      path: '/addFighter',
      name: 'addFighter',
      component: () => import('@/pages/AddFighterPage.vue'),
      meta: { requiresAuth: true, requiresOrganizer: true }
    },
    {
      path: '/tournaments',
      name: 'tournaments',
      component: () => import('@/pages/TournamentsListPage.vue')
    },
    {
      path: '/tournament/:id',
      name: 'tournament',
      component: () => import('@/pages/TournamentPage.vue')
    },
    {
      path: '/addTournament',
      name: 'addTournament',
      component: () => import('@/pages/AddTournamentPage.vue'),
      meta: { requiresAuth: true, requiresOrganizer: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/UsersPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/pages/ForbiddenPage.vue')
    }
  ]
})

let authInitialized = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const authService = useAuthService()

  if (!authInitialized) {
    if (authStore.accessToken) {
      try {
        await authService.profile()
      } catch (error) {
        console.error('Profile initialization error:', error)
      }
    }
    authInitialized = true
  }

  const isAuth = authStore.isAuthenticated
  const isAdmin = authStore.isAdmin
  const isOrganizer = authStore.isOrganizer

  const requiresAuth = to.meta.requiresAuth === true
  const requiresAdmin = to.meta.requiresAdmin === true
  const requiresOrganizer = to.meta.requiresOrganizer === true

  if (isAdmin) {
    return next()
  } else if (requiresAuth && !isAuth) {
    next({ name: 'forbidden' })
  } else if (requiresAdmin && !isAdmin) {
    next({ name: 'forbidden' })
  } else if (requiresOrganizer && !isOrganizer) {
    next({ name: 'forbidden' })
  } else {
    next()
  }
})

export default router
