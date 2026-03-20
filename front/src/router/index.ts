import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomeViewPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/fighters',
      name: 'fighters',
      component: () => import('@/pages/FightersListPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/fighter/:id',
      name: 'fighter',
      component: () => import('@/pages/FighterPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/addFighter',
      name: 'addFighter',
      component: () => import('@/pages/AddFighterPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tournaments',
      name: 'tournaments',
      component: () => import('@/pages/TournamentsListPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/tournament/:id',
      name: 'tournament',
      component: () => import('@/pages/TournamentPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/addTournament',
      name: 'addTournament',
      component: () => import('@/pages/AddTournamentPage.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Initialize auth before any navigation
let authInitialized = false

router.beforeEach(async (to, from, next) => {
  // Initialize auth once on first navigation
  if (!authInitialized) {
    authInitialized = true
  }

  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth === true

  if (requiresAuth && !authStore.isAuthenticated) {
    // User is not authenticated but the route requires authentication
    // Don't redirect - let the component handle it or show a message
    // The user can use LoginWidget to authenticate
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
