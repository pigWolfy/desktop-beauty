<template>
  <div class="app-container">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import QuickLauncher from './components/QuickLauncher.vue'

const showLauncher = ref(false)
const route = useRoute()

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

  onUnmounted(() => {
    unsubscribe?.()
  })
})
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
</style>
