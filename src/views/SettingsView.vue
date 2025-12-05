<template>
  <div class="settings-view">
    <h1 class="page-title">{{ t('settings.title') }}</h1>

    <!-- 通用设置 -->
    <div class="settings-section">
      <h3 class="section-title">{{ t('settings.general') }}</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.autoStart') }}</span>
            <span class="setting-desc">{{ t('settings.autoStartDesc') }}</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.autoStart">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.minimizeToTray') }}</span>
            <span class="setting-desc">{{ t('settings.minimizeToTrayDesc') }}</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.minimizeToTray">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.startMinimized') }}</span>
            <span class="setting-desc">{{ t('settings.startMinimizedDesc') }}</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.startMinimized">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.showWidget') }}</span>
            <span class="setting-desc">{{ t('settings.showWidgetDesc') }}</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.showWidget">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.language') }}</span>
            <span class="setting-desc">{{ t('settings.languageDesc') }}</span>
          </div>
          <select v-model="settings.language" class="select-box" @change="onLanguageChange">
            <option v-for="locale in availableLocales" :key="locale.value" :value="locale.value">
              {{ locale.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 快捷键设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">{{ t('settings.shortcuts') }}</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.showHideWindow') }}</span>
            <span class="setting-desc">{{ t('settings.showHideWindowDesc') }}</span>
          </div>
          <kbd class="shortcut-key">Alt + D</kbd>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.quickLauncher') }}</span>
            <span class="setting-desc">{{ t('settings.quickLauncherDesc') }}</span>
          </div>
          <kbd class="shortcut-key">Alt + Space</kbd>
        </div>
      </div>
    </div>

    <!-- 桌面管理设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">{{ t('settings.desktopSettings') }}</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.defaultSort') }}</span>
            <span class="setting-desc">{{ t('settings.defaultSortDesc') }}</span>
          </div>
          <select v-model="settings.defaultSort" class="select-box">
            <option value="name">{{ t('desktop.sortByName') }}</option>
            <option value="type">{{ t('desktop.sortByType') }}</option>
            <option value="date">{{ t('desktop.sortByDate') }}</option>
            <option value="size">{{ t('desktop.sortBySize') }}</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.autoGroup') }}</span>
            <span class="setting-desc">{{ t('settings.autoGroupDesc') }}</span>
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
      <h3 class="section-title">{{ t('settings.wallpaperSettings') }}</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.wallpaperSlideshow') }}</span>
            <span class="setting-desc">{{ t('settings.wallpaperSlideshowDesc') }}</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.wallpaperSlideshow">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.wallpaperInterval') }}</span>
            <span class="setting-desc">{{ t('settings.wallpaperIntervalDesc') }}</span>
          </div>
          <select v-model="settings.wallpaperInterval" class="select-box" :disabled="!settings.wallpaperSlideshow">
            <option :value="5">5 {{ t('wallpaper.minutes') }}</option>
            <option :value="15">15 {{ t('wallpaper.minutes') }}</option>
            <option :value="30">30 {{ t('wallpaper.minutes') }}</option>
            <option :value="60">1 {{ t('wallpaper.hours') }}</option>
            <option :value="120">2 {{ t('wallpaper.hours') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 监控设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">{{ t('settings.monitorSettings') }}</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.monitorInterval') }}</span>
            <span class="setting-desc">{{ t('settings.monitorIntervalDesc') }}</span>
          </div>
          <select v-model="settings.monitorInterval" class="select-box">
            <option :value="1000">1s</option>
            <option :value="2000">2s</option>
            <option :value="5000">5s</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ t('settings.showSidebarStats') }}</span>
            <span class="setting-desc">{{ t('settings.showSidebarStatsDesc') }}</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.showSidebarStats">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div class="settings-section mt-lg" ref="aboutSection">
      <h3 class="section-title">{{ t('settings.about') }}</h3>
      <div class="about-card card">
        <div class="about-logo">✨</div>
        <h2>Desktop Beauty</h2>
        <p class="version">{{ t('settings.version') }} {{ appVersion }}</p>
        <p class="desc">A beautiful desktop management tool</p>
        
        <!-- 更新检测 -->
        <div class="update-section">
          <div v-if="updateState === 'idle'" class="update-check">
            <button class="btn-update" @click="checkForUpdate" :disabled="isCheckingUpdate">
              {{ isCheckingUpdate ? t('settings.checking') : t('settings.checkUpdate') }}
            </button>
          </div>
          
          <div v-else-if="updateState === 'available'" class="update-available">
            <p class="update-hint">{{ t('settings.newVersion') }} <span class="new-version">v{{ newVersion }}</span></p>
            <button class="btn-download" @click="downloadUpdate" :disabled="isDownloading">
              {{ isDownloading ? `${t('settings.downloading')} ${downloadProgress}%` : t('settings.updateNow') }}
            </button>
          </div>
          
          <div v-else-if="updateState === 'downloaded'" class="update-ready">
            <p class="update-hint">{{ t('settings.downloadComplete') }}</p>
            <button class="btn-install" @click="installUpdate">{{ t('settings.restartInstall') }}</button>
          </div>
          
          <div v-else-if="updateState === 'latest'" class="update-latest">
            <span class="latest-badge">{{ t('settings.upToDate') }}</span>
          </div>
          
          <div v-else-if="updateState === 'error'" class="update-error">
            <span class="error-text">{{ t('settings.checkFailed') }}</span>
            <button class="btn-retry" @click="checkForUpdate">{{ t('common.retry') }}</button>
          </div>
          
          <div v-else-if="updateState === 'download-error'" class="update-error">
            <span class="error-text">{{ t('settings.downloadFailed') }}: {{ errorMessage || t('settings.networkError') }}</span>
            <button class="btn-retry" @click="downloadUpdate">{{ t('common.retry') }}</button>
          </div>
        </div>
        
        <div class="developer-info">
          <p>{{ t('settings.developer') }}: <a href="#" @click.prevent="openAuthorGithub">pigWolfy</a></p>
          <p>{{ t('settings.email') }}: happywangruifei@gmail.com</p>
        </div>
        <div class="about-links">
          <a href="#" @click.prevent="openGithub">GitHub</a>
          <span>·</span>
          <a href="#" @click.prevent="openFeedback">Feedback</a>
        </div>
        <p class="copyright">© 2024 Desktop Beauty Team</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale, availableLocales, type Locale } from '../i18n'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const route = useRoute()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const appVersion = ref('1.0.0')
const aboutSection = ref<HTMLElement | null>(null)

// 语言切换
const onLanguageChange = () => {
  setLocale(settings.value.language as Locale)
}

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
  
  // 检查是否需要滚动到关于部分
  if (route.query.scrollTo === 'about') {
    await nextTick()
    aboutSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
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

  .update-hint {
    font-size: 14px;
    color: $text-secondary;
    
    .new-version {
      color: $accent-primary;
      font-weight: 600;
    }
  }

  .update-badge {
    display: inline-block;
    padding: 4px 12px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
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
