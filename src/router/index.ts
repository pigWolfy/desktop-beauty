import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/desktop'
    },
    {
      path: '/desktop',
      name: 'desktop',
      component: () => import('@/views/DesktopView.vue')
    },
    {
      path: '/wallpaper',
      name: 'wallpaper',
      component: () => import('@/views/WallpaperView.vue')
    },
    {
      path: '/monitor',
      name: 'monitor',
      component: () => import('@/views/MonitorView.vue')
    },
    {
      path: '/driver',
      name: 'driver',
      component: () => import('@/views/DriverView.vue')
    },
    {
      path: '/cpu-health',
      name: 'cpu-health',
      component: () => import('@/views/CpuHealthView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue')
    },
    {
      path: '/widget',
      name: 'widget',
      component: () => import('@/views/WidgetView.vue')
    }
  ]
})

export default router
