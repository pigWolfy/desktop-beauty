<template>
  <!-- Widget Mode -->
  <div v-if="route.path === '/widget'" class="widget-mode">
    <router-view />
  </div>

  <!-- Main App Mode -->
  <div v-else class="app-container">
    <!-- 自定义标题栏 -->
    <TitleBar />
    
    <!-- 主体内容 -->
    <div class="main-content">
      <!-- 侧边栏导航 -->
      <Sidebar />
      
      <!-- 内容区域 -->
      <div class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>

    <!-- 快捷启动器弹窗 -->
    <QuickLauncher v-if="showLauncher" @close="showLauncher = false" />
    
    <!-- 全局更新通知 -->
    <Transition name="slide-up">
      <div v-if="showUpdateNotification" class="update-notification">
        <div class="notification-content">
          <span class="notification-icon">🎉</span>
          <div class="notification-text">
            <span class="notification-title">{{ t('update.available', { version: newVersion }) }}</span>
            <span class="notification-desc">{{ t('settings.newVersion') }}</span>
          </div>
        </div>
        <div class="notification-actions">
          <button class="btn-go" @click="goToSettings">{{ t('update.viewNow') }}</button>
          <button class="btn-dismiss" @click="dismissNotification">{{ t('common.close') }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import QuickLauncher from './components/QuickLauncher.vue'

const { t } = useI18n()
const showLauncher = ref(false)
const route = useRoute()
const router = useRouter()

// 更新通知相关
const showUpdateNotification = ref(false)
const newVersion = ref('')

// 监听路由变化，发送页面访问统计
watch(() => route.path, (newPath) => {
  if (newPath) {
    window.electronAPI?.trackPage(newPath)
  }
})

onMounted(() => {
  // 监听快捷键触发的启动器显示
  const unsubscribe = window.electronAPI?.onToggleLauncher(() => {
    showLauncher.value = !showLauncher.value
    // 统计启动器使用
    if (showLauncher.value) {
      window.electronAPI?.trackEvent('Launcher', 'Open', 'Shortcut')
    }
  })
  
  // 启动后延迟检查更新（避免阻塞启动）
  setTimeout(() => {
    checkForUpdate()
  }, 5000)

  onUnmounted(() => {
    unsubscribe?.()
  })
})

// 检查更新
const checkForUpdate = () => {
  // 监听更新可用事件
  window.electronAPI?.onUpdateAvailable((_, info) => {
    newVersion.value = info.version
    showUpdateNotification.value = true
    // 统计更新提示
    window.electronAPI?.trackEvent('Update', 'Available', info.version)
  })
  
  // 触发检查
  window.electronAPI?.checkForUpdate()
}

// 前往设置页面的关于部分
const goToSettings = () => {
  showUpdateNotification.value = false
  router.push({ path: '/settings', query: { scrollTo: 'about' } })
  window.electronAPI?.trackEvent('Update', 'GoToSettings', newVersion.value)
}

// 关闭通知
const dismissNotification = () => {
  showUpdateNotification.value = false
  window.electronAPI?.trackEvent('Update', 'Dismiss', newVersion.value)
}
</script>

<style lang="scss" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-primary;
  color: $text-primary;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: $bg-secondary;
}

// 路由切换动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.widget-mode {
  width: 100vw;
  height: 100vh;
  background: transparent;
  overflow: hidden;
}

// 更新通知样式
.update-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $border-radius;
  padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 300px;
  
  .notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .notification-icon {
    font-size: 32px;
  }
  
  .notification-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .notification-title {
    font-size: 15px;
    font-weight: 600;
    color: $text-primary;
  }
  
  .notification-desc {
    font-size: 13px;
    color: $text-muted;
  }
  
  .notification-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .btn-go {
    padding: 8px 16px;
    background: $accent-gradient;
    color: white;
    border: none;
    border-radius: $border-radius-sm;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all $transition-fast;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba($accent-primary, 0.3);
    }
  }
  
  .btn-dismiss {
    padding: 8px 16px;
    background: transparent;
    color: $text-secondary;
    border: 1px solid $border-color;
    border-radius: $border-radius-sm;
    cursor: pointer;
    font-size: 13px;
    transition: all $transition-fast;
    
    &:hover {
      border-color: $text-muted;
      color: $text-primary;
    }
  }
}

// 通知弹出动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
