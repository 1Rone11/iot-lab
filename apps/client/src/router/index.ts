import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@/views/home/HomeView.vue'
import Manage from '@/views/manage/ManageView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/manage',
      name: 'manage',
      component: Manage,
    },
  ],
})

export default router
