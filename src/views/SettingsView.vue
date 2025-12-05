<template>
  <div class="settings-view">
    <h1 class="page-title">设置 ⚙️</h1>

    <!-- 通用设置 -->
    <div class="settings-section">
      <h3 class="section-title">🔧 通用设置</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">开机自启动</span>
            <span class="setting-desc">系统启动时自动运行 Desktop Beauty</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.autoStart">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">最小化到托盘</span>
            <span class="setting-desc">关闭窗口时最小化到系统托盘</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.minimizeToTray">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">启动时隐藏窗口</span>
            <span class="setting-desc">程序启动后直接最小化到托盘</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.startMinimized">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">桌面小组件</span>
            <span class="setting-desc">在桌面上显示快捷操作小组件</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.showWidget">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 快捷键设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">⌨️ 快捷键</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">显示/隐藏主窗口</span>
            <span class="setting-desc">快速切换主窗口的显示状态</span>
          </div>
          <kbd class="shortcut-key">Alt + D</kbd>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">快捷启动器</span>
            <span class="setting-desc">打开应用快捷启动器</span>
          </div>
          <kbd class="shortcut-key">Alt + Space</kbd>
        </div>
      </div>
    </div>

    <!-- 桌面管理设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">🖥️ 桌面管理</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">默认排序方式</span>
            <span class="setting-desc">整理桌面时的默认排序规则</span>
          </div>
          <select v-model="settings.defaultSort" class="select-box">
            <option value="name">按名称</option>
            <option value="type">按类型</option>
            <option value="date">按日期</option>
            <option value="size">按大小</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动分组</span>
            <span class="setting-desc">整理时自动按类型创建文件夹</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.autoGroup">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 壁纸设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">🖼️ 壁纸设置</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动轮换</span>
            <span class="setting-desc">自动切换壁纸</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.wallpaperSlideshow">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">轮换间隔</span>
            <span class="setting-desc">自动切换壁纸的时间间隔</span>
          </div>
          <select v-model="settings.wallpaperInterval" class="select-box" :disabled="!settings.wallpaperSlideshow">
            <option :value="5">5 分钟</option>
            <option :value="15">15 分钟</option>
            <option :value="30">30 分钟</option>
            <option :value="60">1 小时</option>
            <option :value="120">2 小时</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 监控设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">📊 系统监控</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">刷新间隔</span>
            <span class="setting-desc">系统监控数据的刷新频率</span>
          </div>
          <select v-model="settings.monitorInterval" class="select-box">
            <option :value="1000">1 秒</option>
            <option :value="2000">2 秒</option>
            <option :value="5000">5 秒</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">侧边栏显示系统状态</span>
            <span class="setting-desc">在侧边栏底部显示 CPU 和内存使用率</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.showSidebarStats">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">ℹ️ 关于</h3>
      <div class="about-card card">
        <div class="about-logo">✨</div>
        <h2>Desktop Beauty</h2>
        <p class="version">版本 {{ appVersion }}</p>
        <p class="desc">一个优雅的桌面管理工具</p>
        
        <!-- 更新检测 -->
        <div class="update-section">
          <div v-if="updateState === 'idle'" class="update-check">
            <button class="btn-update" @click="checkForUpdate" :disabled="isCheckingUpdate">
              {{ isCheckingUpdate ? '检查中...' : '检查更新' }}
            </button>
          </div>
          
          <div v-else-if="updateState === 'available'" class="update-available">
            <div class="update-badge">🎉 发现新版本</div>
            <p class="new-version">v{{ newVersion }}</p>
            <button class="btn-download" @click="downloadUpdate" :disabled="isDownloading">
              {{ isDownloading ? `下载中 ${downloadProgress}%` : '立即下载' }}
            </button>
          </div>
          
          <div v-else-if="updateState === 'downloaded'" class="update-ready">
            <div class="update-badge success">✅ 下载完成</div>
            <p>新版本已准备就绪</p>
            <button class="btn-install" @click="installUpdate">重启并安装</button>
          </div>
          
          <div v-else-if="updateState === 'latest'" class="update-latest">
            <span class="latest-badge">✓ 已是最新版本</span>
          </div>
          
          <div v-else-if="updateState === 'error'" class="update-error">
            <span class="error-text">检查更新失败</span>
            <button class="btn-retry" @click="checkForUpdate">重试</button>
          </div>
          
          <div v-else-if="updateState === 'download-error'" class="update-error">
            <span class="error-text">下载失败: {{ errorMessage || '网络错误' }}</span>
            <button class="btn-retry" @click="downloadUpdate">重试下载</button>
          </div>
        </div>
        
        <div class="developer-info">
          <p>开发者：<a href="#" @click.prevent="openAuthorGithub">pigWolfy</a></p>
          <p>邮箱：happywangruifei@gmail.com</p>
        </div>
        <div class="about-links">
          <a href="#" @click.prevent="openGithub">GitHub</a>
          <span>·</span>
          <a href="#" @click.prevent="openFeedback">反馈问题</a>
        </div>
        <p class="copyright">© 2024 Desktop Beauty Team</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const appVersion = ref('1.0.0')

// 更新相关状态
const updateState = ref<'idle' | 'available' | 'downloaded' | 'latest' | 'error' | 'download-error'>('idle')
const isCheckingUpdate = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const newVersion = ref('')
const errorMessage = ref('')

// 清理函数数组
const cleanupFns: (() => void)[] = []

onMounted(async () => {
  settingsStore.init()
  // 获取应用版本号
  try {
    const version = await window.electronAPI?.getAppVersion()
    if (version) {
      appVersion.value = version
    }
  } catch (e) {
    console.error('获取版本号失败:', e)
  }
  
  // 监听更新事件
  setupUpdateListeners()
})

onUnmounted(() => {
  // 清理事件监听
  cleanupFns.forEach(fn => fn())
})

const setupUpdateListeners = () => {
  // 更新消息
  window.electronAPI?.onUpdateMessage((_, data) => {
    isCheckingUpdate.value = false
    if (data.type === 'checking') {
      isCheckingUpdate.value = true
    } else if (data.type === 'not-available') {
      updateState.value = 'latest'
      setTimeout(() => {
        updateState.value = 'idle'
      }, 3000)
    }
  })
  
  // 发现新版本
  window.electronAPI?.onUpdateAvailable((_, info) => {
    isCheckingUpdate.value = false
    updateState.value = 'available'
    newVersion.value = info.version
  })
  
  // 下载进度
  window.electronAPI?.onUpdateProgress((_, progress) => {
    downloadProgress.value = Math.round(progress.percent)
  })
  
  // 下载完成
  window.electronAPI?.onUpdateDownloaded(() => {
    isDownloading.value = false
    updateState.value = 'downloaded'
  })
  
  // 更新错误
  window.electronAPI?.onUpdateError((_, error) => {
    console.error('Update error:', error)
    errorMessage.value = typeof error === 'string' ? error : '网络连接失败'
    
    // 根据当前状态判断是检查失败还是下载失败
    if (isDownloading.value) {
      isDownloading.value = false
      updateState.value = 'download-error'
    } else {
      isCheckingUpdate.value = false
      updateState.value = 'error'
    }
  })
}

const checkForUpdate = async () => {
  isCheckingUpdate.value = true
  updateState.value = 'idle'
  try {
    await window.electronAPI?.checkForUpdate()
  } catch (e) {
    console.error('检查更新失败:', e)
    updateState.value = 'error'
    isCheckingUpdate.value = false
  }
}

const downloadUpdate = async () => {
  isDownloading.value = true
  downloadProgress.value = 0
  errorMessage.value = ''
  try {
    await window.electronAPI?.downloadUpdate()
  } catch (e) {
    console.error('下载更新失败:', e)
    isDownloading.value = false
    updateState.value = 'download-error'
    errorMessage.value = '下载失败'
  }
}

const installUpdate = () => {
  window.electronAPI?.quitAndInstall()
}

const openGithub = () => {
  window.electronAPI?.openExternal('https://github.com/pigWolfy/desktop-beauty')
}

const openFeedback = () => {
  window.electronAPI?.openExternal('https://github.com/pigWolfy/desktop-beauty/issues')
}

const openAuthorGithub = () => {
  window.electronAPI?.openExternal('https://github.com/pigWolfy')
}
</script>

<style lang="scss" scoped>
.settings-view {
  animation: fadeIn 0.3s ease;
  max-width: 800px;
}

.settings-card {
  padding: 0;
  overflow: hidden;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;

  &:last-child {
    border-bottom: none;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .setting-label {
      font-weight: 500;
    }

    .setting-desc {
      font-size: 12px;
      color: $text-muted;
    }
  }
}

.switch {
  position: relative;
  width: 48px;
  height: 24px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background: $accent-primary;

      &::before {
        transform: translateX(24px);
      }
    }
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: $bg-secondary;
    border-radius: 24px;
    transition: all $transition-fast;

    &::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      left: 2px;
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: all $transition-fast;
    }
  }
}

.select-box {
  padding: 8px 12px;
  background: $bg-secondary;
  color: $text-primary;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  cursor: pointer;
  min-width: 120px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    border-color: $accent-primary;
  }
}

.shortcut-key {
  padding: 6px 12px;
  background: $bg-secondary;
  border: 1px solid $border-color;
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
}

.about-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;

  .about-logo {
    font-size: 64px;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .version {
    font-size: 14px;
    color: $text-muted;
    margin-top: 8px;
  }

  .desc {
    font-size: 14px;
    color: $text-secondary;
    margin-top: 4px;
  }

  .developer-info {
    margin-top: 16px;
    font-size: 14px;
    color: $text-secondary;
    
    p {
      margin: 4px 0;
    }

    a {
      color: $accent-primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .about-links {
    display: flex;
    gap: 12px;
    margin-top: 24px;

    a {
      color: $accent-primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    span {
      color: $text-muted;
    }
  }

  .copyright {
    font-size: 12px;
    color: $text-muted;
    margin-top: 24px;
  }

  // 更新相关样式
  .update-section {
    margin: 20px 0;
    padding: 16px 24px;
    background: rgba($bg-secondary, 0.5);
    border-radius: $border-radius;
    min-width: 200px;
  }

  .update-check {
    display: flex;
    justify-content: center;
  }

  .btn-update {
    padding: 8px 24px;
    background: transparent;
    color: $text-primary;
    border: 1px solid $border-color;
    border-radius: $border-radius-sm;
    cursor: pointer;
    font-size: 14px;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      border-color: $accent-primary;
      color: $accent-primary;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .update-available, .update-ready {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .update-badge {
    display: inline-block;
    padding: 4px 12px;
    background: $accent-gradient;
    color: white;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;

    &.success {
      background: linear-gradient(135deg, #10b981, #059669);
    }
  }

  .new-version {
    font-size: 18px;
    font-weight: 600;
    color: $accent-primary;
  }

  .btn-download, .btn-install {
    padding: 10px 28px;
    background: $accent-gradient;
    color: white;
    border: none;
    border-radius: $border-radius-sm;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba($accent-primary, 0.3);
    }

    &:disabled {
      opacity: 0.8;
      cursor: not-allowed;
      transform: none;
    }
  }

  .btn-install {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  .update-latest {
    .latest-badge {
      color: #10b981;
      font-size: 14px;
    }
  }

  .update-error {
    display: flex;
    align-items: center;
    gap: 12px;

    .error-text {
      color: #ef4444;
      font-size: 14px;
    }

    .btn-retry {
      padding: 6px 16px;
      background: transparent;
      color: $text-secondary;
      border: 1px solid $border-color;
      border-radius: $border-radius-sm;
      cursor: pointer;
      font-size: 13px;

      &:hover {
        border-color: $accent-primary;
        color: $accent-primary;
      }
    }
  }
}
</style>
