import { createRouter, createWebHistory } from 'vue-router'

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
      component: () => import('@/pages/AddFighterPage.vue')
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
      component: () => import('@/pages/AddTournamentPage.vue')
    }
  ]
})

export default router
