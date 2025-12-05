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
      component: () => import('@/views/DesktopView.vue'),
      meta: { title: '桌面管理' }
    },
    {
      path: '/wallpaper',
      name: 'wallpaper',
      component: () => import('@/views/WallpaperView.vue'),
      meta: { title: '壁纸管理' }
    },
    {
      path: '/monitor',
      name: 'monitor',
      component: () => import('@/views/MonitorView.vue'),
      meta: { title: '系统监控' }
    },
    {
      path: '/cpu-health',
      name: 'cpu-health',
      component: () => import('@/views/CpuHealthView.vue'),
      meta: { title: 'CPU健康' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '设置' }
    },
    {
      path: '/widget',
      name: 'widget',
      component: () => import('@/views/WidgetView.vue'),
      meta: { title: '小组件' }
    }
  ]
})

// 页面访问追踪
router.afterEach((to) => {
  // 追踪页面访问
  const pageName = to.meta?.title as string || to.name as string || to.path
  window.electronAPI?.trackPage(pageName)
})

export default router
