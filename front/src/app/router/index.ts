import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomeView.vue')
    },
    {
      path: '/fighters',
      name: 'fighters',
      component: () => import('@/pages/FightersList.vue')
    },
    {
      path: '/fighter/:id',
      name: 'fighter',
      component: () => import('@/pages/FighterPage.vue')
    },
    {
      path: '/addFighter',
      name: 'addFighter',
      component: () => import('@/pages/AddFighter.vue')
    }
  ]
})

export default router
