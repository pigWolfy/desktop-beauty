<template>
  <div class="home-view">
    <h1 class="page-title">欢迎使用 Desktop Beauty ✨</h1>
    
    <!-- 消息提示 -->
    <transition name="fade">
      <div v-if="message" class="message-toast">
        {{ message }}
      </div>
    </transition>
    
    <div class="grid grid-2 gap-lg">
      <!-- 快速操作 -->
      <div class="card quick-actions">
        <h3 class="section-title">🚀 快速操作</h3>
        <div class="action-grid">
          <button class="action-btn" @click="organizeDesktop" :disabled="isLoading">
            <span class="action-icon">📁</span>
            <span class="action-text">整理桌面</span>
          </button>
          <button class="action-btn" @click="toggleIcons" :disabled="isLoading">
            <span class="action-icon">{{ iconsHidden ? '👁️' : '🙈' }}</span>
            <span class="action-text">{{ iconsHidden ? '显示图标' : '隐藏图标' }}</span>
          </button>
          <button class="action-btn" @click="changeWallpaper" :disabled="isLoading">
            <span class="action-icon">🖼️</span>
            <span class="action-text">切换壁纸</span>
          </button>
          <button class="action-btn" @click="openLauncher" :disabled="isLoading">
            <span class="action-icon">⚡</span>
            <span class="action-text">快速启动</span>
          </button>
        </div>
      </div>

      <!-- 系统状态 -->
      <div class="card system-status">
        <h3 class="section-title">📊 系统状态</h3>
        <!-- 加载状态 -->
        <div v-if="isLoadingStats" class="status-loading">
          <div class="status-skeleton" v-for="i in 3" :key="i">
            <div class="skeleton-header">
              <div class="skeleton-text short"></div>
              <div class="skeleton-text tiny"></div>
            </div>
            <div class="skeleton-bar"></div>
          </div>
        </div>
        <!-- 实际数据 -->
        <div v-else class="status-grid">
          <div class="status-item">
            <div class="status-header">
              <span>CPU</span>
              <span class="status-value">{{ cpuUsage }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill cpu" :style="{ width: cpuUsage + '%' }"></div>
            </div>
          </div>
          <div class="status-item">
            <div class="status-header">
              <span>内存</span>
              <span class="status-value">{{ memoryUsage }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill memory" :style="{ width: memoryUsage + '%' }"></div>
            </div>
          </div>
          <!-- 磁盘 - 可折叠 -->
          <div class="status-item disk-expandable">
            <div class="status-header clickable" @click="diskExpanded = !diskExpanded">
              <span class="disk-toggle">
                <span class="toggle-icon" :class="{ expanded: diskExpanded }">▶</span>
                磁盘
              </span>
              <span class="status-value">{{ totalDiskUsage }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill disk" :style="{ width: totalDiskUsage + '%' }"></div>
            </div>
            <!-- 展开的磁盘详情 -->
            <transition name="slide">
              <div v-if="diskExpanded" class="disk-details">
                <div 
                  v-for="(disk, index) in diskDevices" 
                  :key="disk.mount"
                  class="disk-detail-item"
                >
                  <div class="disk-detail-header">
                    <span class="disk-label">
                      <span 
                        class="disk-dot" 
                        :style="{ backgroundColor: diskColors[index % diskColors.length] }"
                      ></span>
                      {{ disk.mount }}
                      <span class="disk-type-badge" :class="disk.diskType?.toLowerCase()">
                        {{ disk.diskType || 'Unknown' }}
                      </span>
                    </span>
                    <span class="disk-percent">{{ disk.usedPercent.toFixed(0) }}%</span>
                  </div>
                  <div class="disk-size-info">
                    {{ formatBytes(disk.used) }} / {{ formatBytes(disk.size) }}
                  </div>
                  <div class="progress-bar small">
                    <div 
                      class="progress-fill" 
                      :style="{ 
                        width: disk.usedPercent + '%',
                        background: diskColors[index % diskColors.length]
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能介绍 -->
    <div class="features-section mt-lg">
      <h3 class="section-title">✨ 功能特色</h3>
      <div class="grid grid-4 gap-md">
        <router-link to="/desktop" class="feature-card">
          <span class="feature-icon">🖥️</span>
          <h4>桌面管理</h4>
          <p>自动整理桌面图标，按类型分组归类</p>
        </router-link>
        <router-link to="/wallpaper" class="feature-card">
          <span class="feature-icon">🖼️</span>
          <h4>壁纸管理</h4>
          <p>管理壁纸收藏，支持自动轮换</p>
        </router-link>
        <router-link to="/apps" class="feature-card">
          <span class="feature-icon">🚀</span>
          <h4>快捷启动</h4>
          <p>快速搜索并启动应用程序</p>
        </router-link>
        <router-link to="/monitor" class="feature-card">
          <span class="feature-icon">📊</span>
          <h4>系统监控</h4>
          <p>实时监控系统资源使用情况</p>
        </router-link>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div class="shortcuts-section mt-lg">
      <h3 class="section-title">⌨️ 快捷键</h3>
      <div class="shortcuts-list">
        <div class="shortcut-item">
          <kbd>Alt + D</kbd>
          <span>显示/隐藏主窗口</span>
        </div>
        <div class="shortcut-item">
          <kbd>Alt + Space</kbd>
          <span>打开快捷启动器</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const cpuUsage = ref(0)
const memoryUsage = ref(0)
const totalDiskUsage = ref(0)
const diskDevices = ref<Array<{ 
  mount: string
  usedPercent: number
  size: number
  used: number
  widthPercent: number
  diskType?: string 
}>>([])
const diskColors = ['#fd79a8', '#00b894', '#6c5ce7', '#fdcb6e', '#00cec9', '#e17055']
const diskExpanded = ref(false)
const iconsHidden = ref(false)
const isLoading = ref(false)
const isLoadingStats = ref(true)
const message = ref('')

let refreshTimer: number
let messageTimer: number

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${units[i]}`
}

const showMessage = (msg: string) => {
  message.value = msg
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => {
    message.value = ''
  }, 3000)
}

const updateStats = async () => {
  try {
    const [cpu, memory, disk] = await Promise.all([
      window.electronAPI?.getCpuUsage(),
      window.electronAPI?.getMemoryUsage(),
      window.electronAPI?.getDiskUsage()
    ])
    
    if (cpu) cpuUsage.value = Math.round(cpu.currentLoad)
    if (memory) memoryUsage.value = Math.round(memory.usedPercent)
    if (disk && disk.devices.length > 0) {
      // 计算总容量和总已用
      const totalSize = disk.devices.reduce((sum: number, d: any) => sum + d.size, 0)
      const totalUsed = disk.devices.reduce((sum: number, d: any) => sum + d.used, 0)
      totalDiskUsage.value = Math.round((totalUsed / totalSize) * 100)
      
      // 计算每个磁盘在进度条中的宽度占比（按容量比例）
      diskDevices.value = disk.devices.map((d: any) => ({
        mount: d.mount,
        usedPercent: d.usedPercent,
        size: d.size,
        used: d.used,
        diskType: d.diskType,
        // 宽度 = (该磁盘容量 / 总容量) * 该磁盘使用率
        widthPercent: (d.size / totalSize) * d.usedPercent
      }))
    }
    isLoadingStats.value = false
  } catch (e) {
    isLoadingStats.value = false
    // 忽略错误
  }
}

const organizeDesktop = async () => {
  if (isLoading.value) return
  isLoading.value = true
  showMessage('正在整理桌面...')
  try {
    const result = await window.electronAPI?.organizeDesktop({ groupBy: 'type' })
    if (result) {
      if (result.success) {
        showMessage(`✅ ${result.message}`)
        window.electronAPI?.trackFeature('Desktop', 'Organize', { method: 'quick_action', success: true })
      } else {
        showMessage(`❌ ${result.message}`)
        window.electronAPI?.trackFeature('Desktop', 'Organize', { method: 'quick_action', success: false })
      }
    } else {
      showMessage('❌ 整理桌面失败')
    }
  } catch (error) {
    console.error('整理桌面错误:', error)
    showMessage('❌ 发生错误: ' + error)
    window.electronAPI?.trackError('DesktopOrganize', String(error), 'medium', 'HomeView')
  } finally {
    isLoading.value = false
  }
}

const toggleIcons = async () => {
  if (isLoading.value) return
  isLoading.value = true
  const action = iconsHidden.value ? '显示' : '隐藏'
  showMessage(`正在${action}图标...`)
  
  try {
    let result: boolean
    if (iconsHidden.value) {
      result = await window.electronAPI?.showDesktopIcons()
    } else {
      result = await window.electronAPI?.hideDesktopIcons()
    }
    if (result) {
      iconsHidden.value = !iconsHidden.value
      showMessage(`✅ 图标已${action}`)
      window.electronAPI?.trackFeature('Desktop', 'ToggleIcons', { hidden: !iconsHidden.value })
    } else {
      showMessage('❌ 操作失败')
    }
  } catch (error) {
    console.error('切换图标错误:', error)
    showMessage('❌ 发生错误: ' + error)
    window.electronAPI?.trackError('ToggleIcons', String(error), 'low', 'HomeView')
  } finally {
    isLoading.value = false
  }
}

// 检查图标当前状态
const checkIconsState = async () => {
  try {
    const hidden = await window.electronAPI?.getIconsHiddenState()
    iconsHidden.value = hidden || false
  } catch (error) {
    console.error('获取图标状态失败:', error)
  }
}

const changeWallpaper = async () => {
  showMessage('正在选择壁纸...')
  try {
    const result = await window.electronAPI?.addWallpaper()
    if (result) {
      showMessage('✅ 壁纸已添加')
    }
  } catch (error) {
    console.error('切换壁纸错误:', error)
    showMessage('❌ 发生错误')
  }
}

const openLauncher = () => {
  // 发送事件给父组件
  document.dispatchEvent(new CustomEvent('toggle-launcher'))
}

onMounted(() => {
  updateStats()
  checkIconsState()  // 检查图标当前状态
  refreshTimer = window.setInterval(updateStats, 2000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})
</script>

<style lang="scss" scoped>
.home-view {
  animation: fadeIn 0.3s ease;
  position: relative;
}

.message-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba($accent-primary, 0.9), rgba($accent-secondary, 0.9));
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.quick-actions {
  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    background: $bg-secondary;
    border-radius: $border-radius-sm;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: $bg-hover;
      transform: translateY(-2px);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-icon {
      font-size: 28px;
    }

    .action-text {
      font-size: 13px;
      color: $text-secondary;
    }
  }
}

.system-status {
  .status-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .status-item {
    .status-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: $text-secondary;

      .status-value {
        font-weight: 600;
        color: $text-primary;
      }
      
      .disk-label {
        display: flex;
        align-items: center;
        gap: 6px;
        
        .disk-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }
      }
    }

    .progress-bar {
      height: 8px;
      background: $bg-secondary;
      border-radius: 4px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;

        &.cpu {
          background: linear-gradient(90deg, #00b894, #00cec9);
        }

        &.memory {
          background: linear-gradient(90deg, #6c5ce7, #a29bfe);
        }

        &.disk {
          background: linear-gradient(90deg, #fd79a8, #e84393);
        }
      }
      
      &.small {
        height: 5px;
      }
    }
    
    // 可折叠磁盘区域
    &.disk-expandable {
      .status-header.clickable {
        cursor: pointer;
        user-select: none;
        
        &:hover {
          color: $text-primary;
        }
      }
      
      .disk-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        
        .toggle-icon {
          font-size: 10px;
          transition: transform 0.2s ease;
          
          &.expanded {
            transform: rotate(90deg);
          }
        }
      }
      
      .disk-details {
        margin-top: 12px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        
        .disk-detail-item {
          .disk-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
            font-size: 12px;
            
            .disk-label {
              display: flex;
              align-items: center;
              gap: 6px;
              color: $text-secondary;
              
              .disk-dot {
                width: 6px;
                height: 6px;
                border-radius: 2px;
              }
              
              .disk-type-badge {
                font-size: 10px;
                padding: 1px 5px;
                border-radius: 3px;
                font-weight: 500;
                
                &.ssd {
                  background: rgba(0, 184, 148, 0.2);
                  color: #00b894;
                }
                
                &.hdd {
                  background: rgba(108, 92, 231, 0.2);
                  color: #a29bfe;
                }
                
                &.unknown {
                  background: rgba(255, 255, 255, 0.1);
                  color: $text-secondary;
                }
              }
            }
            
            .disk-percent {
              color: $text-primary;
              font-weight: 500;
            }
          }
          
          .disk-size-info {
            font-size: 11px;
            color: $text-secondary;
            margin-bottom: 4px;
            opacity: 0.8;
          }
        }
      }
    }
  }
}

// 展开动画
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding: 0 12px;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 300px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 24px 16px;
  background: $bg-card;
  border-radius: $border-radius;
  text-decoration: none;
  color: inherit;
  transition: all $transition-normal;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-md;
    background: $bg-hover;
  }

  .feature-icon {
    font-size: 36px;
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
  }

  p {
    font-size: 12px;
    color: $text-secondary;
    line-height: 1.5;
  }
}

.shortcuts-section {
  .shortcuts-list {
    display: flex;
    gap: 24px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 12px;

    kbd {
      padding: 6px 12px;
      background: $bg-card;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      border: 1px solid $border-color;
    }

    span {
      color: $text-secondary;
      font-size: 13px;
    }
  }
}

// 骨架屏动画
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.status-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .status-skeleton {
    .skeleton-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .skeleton-text {
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;

      &.short { width: 40px; }
      &.tiny { width: 30px; }
    }

    .skeleton-bar {
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }
  }
}
</style>
