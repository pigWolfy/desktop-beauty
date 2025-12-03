<template>
  <nav class="sidebar">
    <div class="nav-list">
      <router-link 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.name }}</span>
      </router-link>
    </div>

    <div class="sidebar-footer">
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-icon">💻</span>
          <span class="stat-value">{{ cpuUsage }}%</span>
          <span class="stat-label">CPU</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📊</span>
          <span class="stat-value">{{ memoryUsage }}%</span>
          <span class="stat-label">内存</span>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const navItems = [
  { path: '/desktop', name: '桌面管理', icon: '🖥️' },
  { path: '/wallpaper', name: '壁纸管理', icon: '🖼️' },
  { path: '/monitor', name: '系统监控', icon: '📊' },
  { path: '/driver', name: '驱动管理', icon: '🔧' },
  { path: '/cpu-health', name: 'CPU健康', icon: '🔍' },
  { path: '/settings', name: '设置', icon: '⚙️' }
]

const cpuUsage = ref(0)
const memoryUsage = ref(0)

let refreshTimer: number

const updateStats = async () => {
  try {
    const [cpu, memory] = await Promise.all([
      window.electronAPI?.getCpuUsage(),
      window.electronAPI?.getMemoryUsage()
    ])
    
    if (cpu) cpuUsage.value = Math.round(cpu.currentLoad)
    if (memory) memoryUsage.value = Math.round(memory.usedPercent)
  } catch (e) {
    // 忽略错误
  }
}

onMounted(() => {
  updateStats()
  refreshTimer = window.setInterval(updateStats, 3000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})
</script>

<style lang="scss" scoped>
.sidebar {
  width: $sidebar-width;
  background: $bg-primary;
  border-right: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: $border-radius-sm;
  color: $text-secondary;
  transition: all $transition-fast;
  text-decoration: none;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }

  &.active {
    background: $accent-gradient;
    color: white;
    box-shadow: $shadow-sm;
  }
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid $border-color;
  margin-top: auto;
}

.quick-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: $bg-secondary;
  border-radius: $border-radius-sm;
}

.stat-icon {
  font-size: 16px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: $accent-primary;
}

.stat-label {
  font-size: 11px;
  color: $text-muted;
}
</style>
