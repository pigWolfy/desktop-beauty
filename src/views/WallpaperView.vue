<template>
  <div class="wallpaper-view">
    <div class="view-header">
      <h2>{{ t('wallpaper.title') }}</h2>
      <p>{{ t('wallpaper.subtitle') }}</p>
    </div>

    <!-- 选项卡 -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.name }}
      </button>
    </div>

    <!-- 本地壁纸 -->
    <div v-show="activeTab === 'local'" class="tab-content">
      <div class="section-header">
        <h3>{{ t('wallpaper.localWallpapers') }}</h3>
        <div class="header-actions">
          <button class="btn-danger" @click="removeAllWallpapers" v-if="localWallpapers.length > 0">
            <span>🗑️</span> {{ t('wallpaper.clearAll') }}
          </button>
          <button class="btn-add" @click="addLocalWallpaper">
            <span>+</span> {{ t('wallpaper.addLocal') }}
          </button>
        </div>
      </div>

      <!-- 幻灯片设置 -->
      <div class="slideshow-card">
        <div class="slideshow-header">
          <div class="slideshow-title">
            <span class="icon">🎞️</span>
            <h4>{{ t('wallpaper.slideshow') }}</h4>
            <button class="toggle-btn" :class="{ active: slideshowEnabled }" @click="toggleSlideshowWithButton">
              {{ slideshowEnabled ? t('common.enabled') : t('common.disabled') }}
            </button>
          </div>
          <p class="desc" v-if="!slideshowEnabled">{{ t('wallpaper.slideshowDesc') }}</p>
          <p class="status" v-else>
             <span class="status-dot active"></span>
             {{ t('wallpaper.slideshowRunning') }}
          </p>
        </div>

        <div class="slideshow-settings" v-if="slideshowEnabled">
           <div class="setting-row">
             <label>{{ t('wallpaper.switchInterval') }}</label>
             <select v-model="slideshowInterval" @change="updateSlideshowInterval">
              <option :value="60000">1 {{ t('wallpaper.minutes') }}</option>
              <option :value="300000">5 {{ t('wallpaper.minutes') }}</option>
              <option :value="600000">10 {{ t('wallpaper.minutes') }}</option>
              <option :value="1800000">30 {{ t('wallpaper.minutes') }}</option>
              <option :value="3600000">1 {{ t('wallpaper.hours') }}</option>
            </select>
           </div>
        </div>
      </div>
      
      <div class="wallpaper-grid">
        <div 
          v-for="wallpaper in localWallpapers" 
          :key="wallpaper.path"
          :class="['wallpaper-item', { active: currentWallpaper === wallpaper.path }]"
          @click="setWallpaper(wallpaper.path)"
        >
          <img 
            :src="`local-file://image?path=${encodeURIComponent(wallpaper.path)}`" 
            :alt="wallpaper.name" 
            loading="lazy"
          />
          <div class="overlay">
            <button class="btn-apply" @click.stop="setWallpaper(wallpaper.path)">{{ t('wallpaper.apply') }}</button>
            <button class="btn-delete" @click.stop="removeWallpaper(wallpaper.path)">{{ t('common.delete') }}</button>
          </div>
          <span v-if="currentWallpaper === wallpaper.path" class="current-badge">{{ t('common.current') }}</span>
        </div>
      </div>
    </div>

    <!-- 在线壁纸 -->
    <div v-show="activeTab === 'online'" class="tab-content">
      <!-- 自动更换壁纸设置 - 顶部醒目位置 -->
      <div class="auto-change-card">
        <div class="auto-change-header">
          <div class="auto-change-title">
            <span class="auto-icon">🔄</span>
            <h4>{{ t('wallpaper.autoChangeTitle') }}</h4>
            <button class="toggle-btn" :class="{ active: autoChangeConfig.enabled }" @click="onAutoChangeToggle">
              {{ autoChangeConfig.enabled ? t('common.enabled') : t('common.disabled') }}
            </button>
          </div>
          <p class="auto-desc" v-if="!autoChangeConfig.enabled">{{ t('wallpaper.autoChangeDesc') }}</p>
          <p class="auto-status" v-else>
            <span class="status-dot active"></span>
            {{ t('wallpaper.slideshowRunning') }} · {{ t('wallpaper.nextChange') }}: {{ formatNextChange }}
          </p>
        </div>
        
        <div class="auto-change-settings" v-show="autoChangeConfig.enabled">
          <div class="setting-row">
            <label>{{ t('wallpaper.interval') }}</label>
            <div class="interval-inputs">
              <input type="number" v-model.number="autoChangeConfig.intervalValue" min="1" max="999" @change="saveAutoChangeConfig">
              <select v-model="autoChangeConfig.intervalUnit" @change="saveAutoChangeConfig">
                <option value="minutes">{{ t('wallpaper.minutes') }}</option>
                <option value="hours">{{ t('wallpaper.hours') }}</option>
                <option value="days">{{ t('monitor.days') }}</option>
              </select>
            </div>
          </div>
          
          <div class="setting-row">
            <label>{{ t('wallpaper.resolution') }}</label>
            <select v-model="autoChangeConfig.resolution" @change="saveAutoChangeConfig">
              <option value="auto">{{ t('wallpaper.resolutions.auto') }}</option>
              <option value="1080p">{{ t('wallpaper.resolutions.hd') }}</option>
              <option value="2k">{{ t('wallpaper.resolutions.2k') }}</option>
              <option value="4k">{{ t('wallpaper.resolutions.4k') }}</option>
            </select>
          </div>
          
          <div class="setting-row categories-row">
            <label>{{ t('wallpaper.category') }}</label>
            <div class="category-chips">
              <button 
                v-for="cat in availableCategories" 
                :key="cat.id"
                :class="['chip', { active: autoChangeConfig.categories.includes(cat.id) }]"
                @click="toggleAutoCategory(cat.id)"
              >
                {{ cat.icon }} {{ cat.name }}
              </button>
            </div>
            <p class="category-hint" v-if="autoChangeConfig.categories.length === 0"></p>
          </div>
          
          <div class="setting-actions">
            <button class="btn-change-now" @click="changeWallpaperNow" :disabled="changingWallpaper">
              {{ changingWallpaper ? t('wallpaper.loading') : '🎲 ' + t('wallpaper.change') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 在线壁纸浏览 - 直接显示，无需API密钥 -->
      <div class="online-browser">
        <!-- 壁纸来源选择 -->
        <div class="source-tabs">
          <button 
            v-for="source in wallpaperSources" 
            :key="source.id"
            :class="['source-btn', { active: activeSource === source.id }]"
            @click="selectSource(source.id)"
          >
            {{ source.icon }} {{ source.name }}
            <span v-if="source.free" class="free-badge">Free</span>
          </button>
        </div>

        <!-- 搜索和筛选 -->
        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('common.search') + '...'"
            @keyup.enter="searchOnline"
          />
          <button @click="searchOnline">{{ t('common.search') }}</button>
        </div>

        <!-- 分类 -->
        <div class="categories">
          <button 
            v-for="category in categories" 
            :key="category.id"
            :class="['category-btn', { active: selectedCategory === category.id }]"
            @click="selectCategory(category.id)"
          >
            {{ t(`wallpaper.categories.${category.id}`) }}
          </button>
        </div>

        <!-- 当前屏幕分辨率提示 -->
        <div v-if="screenInfo && activeSource === 'best'" class="resolution-hint">
          <span class="icon">🖥️</span>
          <span>{{ t('wallpaper.screenResolution') }}: {{ screenInfo.primary.width }}×{{ screenInfo.primary.height }}</span>
          <span class="hint">（{{ t('wallpaper.perfectMatch') }}）</span>
        </div>

        <!-- 加载状态骨架屏（仅初始加载时显示） -->
        <div v-if="loading && onlineWallpapers.length === 0" class="wallpaper-skeleton">
          <div v-for="i in 8" :key="i" class="skeleton-wallpaper-item"></div>
        </div>

        <!-- 壁纸网格 -->
        <div class="wallpaper-grid" v-if="onlineWallpapers.length > 0">
          <div 
            v-for="wallpaper in onlineWallpapers" 
            :key="wallpaper.id"
            class="wallpaper-item online"
            :class="{ 'resolution-match': isResolutionMatch(wallpaper) }"
            @click="previewWallpaper(wallpaper)"
          >
            <img :src="wallpaper.thumbnailUrl" :alt="wallpaper.description" loading="lazy" />
            <div class="overlay">
              <span class="source-badge">{{ getSourceName(wallpaper.source) }}</span>
              <span class="resolution-badge">{{ wallpaper.width }}×{{ wallpaper.height }}</span>
              <span class="author" v-if="wallpaper.author && !isSourceName(wallpaper.author)">{{ wallpaper.author }}</span>
            </div>
            <span v-if="isResolutionMatch(wallpaper)" class="match-badge" :title="t('wallpaper.perfectMatch')">✓</span>
            <button 
              class="btn-favorite"
              :class="{ favorited: wallpaper.isFavorite }"
              @click.stop="toggleFavorite(wallpaper)"
            >
              {{ wallpaper.isFavorite ? '❤️' : '🤍' }}
            </button>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more-section" v-if="onlineWallpapers.length > 0">
          <button 
            class="btn-load-more" 
            @click="loadMore"
            :disabled="loadingMore"
          >
            <span v-if="loadingMore" class="loading-spinner"></span>
            {{ loadingMore ? t('wallpaper.loading') : t('wallpaper.loadMore') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 动态壁纸 -->
    <div v-show="activeTab === 'live'" class="tab-content">
      <div class="section-header">
        <h3>{{ t('wallpaper.liveWallpaper') }}</h3>
        <div class="live-status" :class="{ active: liveWallpaperActive }">
          {{ liveWallpaperActive ? t('wallpaper.slideshowRunning') : t('wallpaper.liveStopped') }}
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="usage-guide">
        <h4>📖 {{ t('wallpaper.liveGuide.title') }}</h4>
        <div class="guide-content">
          <div class="guide-step">
            <span class="step-num">1</span>
            <span>{{ t('wallpaper.liveGuide.step1') }}</span>
          </div>
          <div class="guide-step">
            <span class="step-num">2</span>
            <span>{{ t('wallpaper.liveGuide.step2') }}</span>
          </div>
          <div class="guide-step">
            <span class="step-num">3</span>
            <span>{{ t('wallpaper.liveGuide.step3') }}</span>
          </div>
        </div>
        
        <div class="format-info">
          <h5>✅ {{ t('wallpaper.liveGuide.formatTitle') }}</h5>
          <div class="format-list">
            <span class="format-tag">.mp4</span>
            <span class="format-tag">.webm</span>
            <span class="format-tag">.ogg</span>
            <span class="format-tag">.mov</span>
            <span class="format-tag">.avi</span>
            <span class="format-tag">.mkv</span>
          </div>
          <p class="format-tip">💡 {{ t('wallpaper.liveGuide.formatTip') }}</p>
        </div>
        
        <div class="video-tips">
          <h5>📌 {{ t('wallpaper.liveGuide.tipsTitle') }}</h5>
          <ul>
            <li>{{ t('wallpaper.liveGuide.tip1') }}</li>
            <li>{{ t('wallpaper.liveGuide.tip2') }}</li>
            <li><span v-html="getTip3Html()"></span></li>
          </ul>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 添加本地视频壁纸 -->
      <div class="add-live-section">
        <h4>🎬 {{ t('wallpaper.liveGuide.addVideo') }}</h4>
        <div class="add-buttons">
          <button class="btn-add-video primary" @click="addVideoWallpaper">
            <span>📁</span>
            {{ t('wallpaper.selectVideo') }}
          </button>
        </div>
      </div>

      <!-- 控制面板 -->
      <div v-if="liveWallpaperActive" class="live-controls">
        <div class="control-group">
          <label>{{ t('monitor.sound') || 'Volume' }}</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            v-model="liveVolume"
            @change="setLiveVolume"
          />
          <span>{{ liveVolume }}%</span>
        </div>

        <div class="control-group">
          <label>{{ t('monitor.speed') }}</label>
          <select v-model="livePlaybackRate" @change="setLivePlaybackRate">
            <option :value="0.5">0.5x</option>
            <option :value="0.75">0.75x</option>
            <option :value="1">1x</option>
            <option :value="1.25">1.25x</option>
            <option :value="1.5">1.5x</option>
            <option :value="2">2x</option>
          </select>
        </div>

        <div class="control-buttons">
          <button @click="pauseLiveWallpaper" v-if="!livePaused">⏸ {{ t('common.pause') || 'Pause' }}</button>
          <button @click="resumeLiveWallpaper" v-else>▶ {{ t('common.resume') || 'Resume' }}</button>
          <button @click="stopLiveWallpaper" class="btn-stop">⏹ {{ t('wallpaper.stopLive') }}</button>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-section" v-if="liveHistory.length > 0">
        <h4>{{ t('home.recentApps').replace('📱 ', '') }}</h4>
        <div class="history-list">
          <div 
            v-for="(item, index) in liveHistory" 
            :key="index"
            class="history-item"
            @click="replayLiveWallpaper(item)"
          >
            <span class="type-icon">{{ item.type === 'video' ? '🎬' : '🌐' }}</span>
            <span class="source-name">{{ getFileName(item.source) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏 -->
    <div v-show="activeTab === 'favorites'" class="tab-content">
      <h3>{{ t('wallpaper.favorites') }}</h3>
      <div class="wallpaper-grid" v-if="favorites.length > 0">
        <div 
          v-for="wallpaper in favorites" 
          :key="wallpaper.id"
          class="wallpaper-item"
          @click="previewWallpaper(wallpaper)"
        >
          <img :src="wallpaper.thumbnailUrl" :alt="wallpaper.description" />
          <div class="overlay">
            <span class="author">{{ wallpaper.author }}</span>
          </div>
          <button 
            class="btn-favorite favorited"
            @click.stop="removeFavorite(wallpaper.id)"
          >
            ❤️
          </button>
        </div>
      </div>
      <div v-else class="empty-state">
        <span>💔</span>
        <p>{{ t('wallpaper.noWallpapers') }}</p>
        <p></p>
      </div>
    </div>

    <!-- 壁纸预览弹窗 -->
    <div v-if="previewingWallpaper" class="preview-modal" @click="closePreview">
      <div class="preview-content" @click.stop>
        <img :src="previewingWallpaper.url" :alt="previewingWallpaper.description" />
        <div class="preview-info">
          <h3>{{ previewingWallpaper.description || 'No Title' }}</h3>
          <p>Author: {{ previewingWallpaper.author }}</p>
          <p>Size: {{ previewingWallpaper.width }} x {{ previewingWallpaper.height }}</p>
          <p>Source: {{ previewingWallpaper.source }}</p>
        </div>
        <div class="preview-actions">
          <button 
            class="btn-primary" 
            @click="downloadAndApply(previewingWallpaper)"
            :disabled="downloading"
          >
            {{ downloading ? t('wallpaper.loading') : t('wallpaper.download') + ' & ' + t('wallpaper.apply') }}
          </button>
          <button 
            class="btn-secondary" 
            @click="downloadWallpaper(previewingWallpaper)"
            :disabled="downloading"
          >
            {{ downloading ? t('wallpaper.loading') : t('wallpaper.download') }}
          </button>
          <button class="btn-close" @click="closePreview" :disabled="downloading">{{ t('common.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 定时器引用
let autoChangeStatusTimer: number | undefined

// Generate tip3 HTML with links
const getTip3Html = () => {
  const pexelsLink = '<a href="#" onclick="window.electronAPI?.openExternal(\'https://www.pexels.com/videos/\'); return false;">Pexels</a>'
  const pixabayLink = '<a href="#" onclick="window.electronAPI?.openExternal(\'https://pixabay.com/videos/\'); return false;">Pixabay</a>'
  return t('wallpaper.liveGuide.tip3', { pexels: pexelsLink, pixabay: pixabayLink })
}

interface LocalWallpaper {
  path: string
  name: string
  thumbnailDataUrl?: string  // base64 缩略图
}

interface WallpaperItem {
  id: string
  url: string
  thumbnailUrl: string
  downloadUrl: string
  author: string
  authorUrl: string
  description: string
  width: number
  height: number
  source: 'unsplash' | 'pexels'
  color?: string
  isFavorite?: boolean
}

interface LiveWallpaperConfig {
  type: 'video' | 'web' | 'image'
  source: string
  volume: number
  playbackRate: number
}

const tabs = computed(() => [
  { id: 'local', name: t('wallpaper.localWallpapers'), icon: '📁' },
  { id: 'online', name: t('wallpaper.onlineWallpapers'), icon: '🌐' },
  { id: 'live', name: t('wallpaper.liveWallpaper'), icon: '🎬' },
  { id: 'favorites', name: t('wallpaper.favorites'), icon: '❤️' }
])

const wallpaperSources = computed(() => [
  { id: 'best', name: t('wallpaper.source.best'), icon: '✨', free: true },
  { id: 'all', name: t('common.all'), icon: '🌍', free: true },
  { id: 'bing', name: 'Bing', icon: '🖼️', free: true },
  { id: 'wallhaven', name: 'Wallhaven', icon: '🎨', free: true },
  { id: 'picsum', name: 'Picsum', icon: '📷', free: true }
])

const activeTab = ref('local')
const activeSource = ref('all')

// 本地壁纸
const localWallpapers = ref<LocalWallpaper[]>([])
const currentWallpaper = ref('')
const slideshowEnabled = ref(false)
const slideshowInterval = ref(300000)

// 在线壁纸
const onlineWallpapers = ref<WallpaperItem[]>([])
const categories = ref<{ id: string; query: string }[]>([])
const selectedCategory = ref('')
const searchQuery = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const downloading = ref(false)
const currentPage = ref(1)

// 屏幕分辨率信息
const screenInfo = ref<{ primary: { width: number; height: number; scaleFactor: number } } | null>(null)

// 动态壁纸
const liveWallpaperActive = ref(false)
const livePaused = ref(false)
const liveVolume = ref(0)
const livePlaybackRate = ref(1)
const liveHistory = ref<LiveWallpaperConfig[]>([])

// 自动更换壁纸
interface AutoChangeConfig {
  enabled: boolean
  interval: number
  intervalUnit: 'minutes' | 'hours' | 'days'
  intervalValue: number
  resolution: string
  categories: string[]
}

interface AutoChangeStatus {
  enabled: boolean
  lastChangeTime: number | null
  lastWallpaper: any | null
  nextChangeIn: number | null
}

const autoChangeConfig = ref<AutoChangeConfig>({
  enabled: false,
  interval: 3600000,
  intervalUnit: 'hours',
  intervalValue: 1,
  resolution: 'auto',
  categories: []
})

const autoChangeStatus = ref<AutoChangeStatus>({
  enabled: false,
  lastChangeTime: null,
  lastWallpaper: null,
  nextChangeIn: null
})

const changingWallpaper = ref(false)

// 监听自动更换开关变化
watch(() => autoChangeConfig.value.enabled, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    console.log('watch: enabled changed from', oldVal, 'to', newVal)
    // 开启在线自动更换前，先关闭本地轮播
    if (newVal && slideshowEnabled.value) {
      slideshowEnabled.value = false
      await electronAPI.stopWallpaperSlideshow()
    }
    await saveAutoChangeConfig()
  }
})

// 计算下次更换时间的格式化显示
const formatNextChange = computed(() => {
  // 如果未启用，不应该显示这个
  if (!autoChangeStatus.value.enabled) {
    return '未启用'
  }
  if (autoChangeStatus.value.nextChangeIn === null || autoChangeStatus.value.nextChangeIn === undefined) {
    return t('wallpaper.calculating')
  }
  const ms = autoChangeStatus.value.nextChangeIn
  if (ms <= 0) {
    return t('wallpaper.soon')
  } else if (ms < 60000) {
    return t('wallpaper.timeFormat.secondsLater', { seconds: Math.ceil(ms / 1000) })
  } else if (ms < 3600000) {
    return t('wallpaper.timeFormat.minutesLater', { minutes: Math.ceil(ms / 60000) })
  } else if (ms < 86400000) {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.ceil((ms % 3600000) / 60000)
    return minutes > 0 ? t('wallpaper.timeFormat.hoursMinutesLater', { hours, minutes }) : t('wallpaper.timeFormat.hoursLater', { hours })
  } else {
    const days = Math.floor(ms / 86400000)
    const hours = Math.ceil((ms % 86400000) / 3600000)
    return hours > 0 ? t('wallpaper.timeFormat.daysHoursLater', { days, hours }) : t('wallpaper.timeFormat.daysLater', { days })
  }
})

// 可选的壁纸分类
const availableCategories = computed(() => [
  { id: 'nature', name: t('wallpaper.categories.nature'), icon: '🌿', query: 'nature' },
  { id: 'city', name: t('wallpaper.categories.city'), icon: '🏙️', query: 'city' },
  { id: 'abstract', name: t('wallpaper.categories.abstract'), icon: '🎨', query: 'abstract' },
  { id: 'animal', name: t('wallpaper.categories.animal'), icon: '🦁', query: 'animal' },
  { id: 'space', name: t('wallpaper.categories.space'), icon: '🌌', query: 'space' },
  { id: 'minimal', name: t('wallpaper.categories.minimal'), icon: '⬜', query: 'minimal' },
  { id: 'dark', name: t('wallpaper.categories.dark'), icon: '🌑', query: 'dark' },
  { id: 'anime', name: t('wallpaper.categories.anime'), icon: '🎌', query: 'anime' },
  { id: 'tech', name: t('wallpaper.categories.tech'), icon: '💻', query: 'technology' },
  { id: 'landscape', name: t('wallpaper.categories.landscape'), icon: '📸', query: 'landscape' }
])

// 收藏
const favorites = ref<WallpaperItem[]>([])

// 预览
const previewingWallpaper = ref<WallpaperItem | null>(null)

const electronAPI = (window as any).electronAPI

// 标记组件是否已卸载
let isUnmounted = false

onMounted(async () => {
  isUnmounted = false
  await loadLocalWallpapers()
  await loadCategories()
  await loadFavorites()
  await checkLiveWallpaperStatus()
  await loadAutoChangeConfig()
  await loadSlideshowStatus()
  // 获取屏幕分辨率信息
  try {
    screenInfo.value = await electronAPI.getScreenInfo()
    console.log('屏幕分辨率:', screenInfo.value?.primary)
  } catch (error) {
    console.error('获取屏幕信息失败:', error)
  }
  // 默认加载最佳适配壁纸
  activeSource.value = 'best'
  await loadBestMatchWallpapers()
  
  // 定期更新自动更换状态
  autoChangeStatusTimer = window.setInterval(updateAutoChangeStatus, 10000)
})

onUnmounted(() => {
  isUnmounted = true
  // 清理定时器
  if (autoChangeStatusTimer) {
    clearInterval(autoChangeStatusTimer)
    autoChangeStatusTimer = undefined
  }
})

// 本地壁纸方法
async function loadLocalWallpapers() {
  try {
    const wallpapers = await electronAPI.getWallpapers()
    localWallpapers.value = wallpapers
  } catch (error) {
    console.error('加载本地壁纸失败:', error)
  }
}

async function addLocalWallpaper() {
  try {
    const result = await electronAPI.addWallpaper('')
    if (result) {
      await loadLocalWallpapers()
    }
  } catch (error) {
    console.error('添加壁纸失败:', error)
    window.electronAPI?.trackError('WallpaperAdd', String(error), 'medium', 'WallpaperView')
  }
}

async function setWallpaper(path: string) {
  try {
    await electronAPI.setWallpaper(path)
    currentWallpaper.value = path
    // 统计壁纸设置
    window.electronAPI?.trackFeature('Wallpaper', 'Set', { source: 'local' })
  } catch (error) {
    console.error('设置壁纸失败:', error)
    window.electronAPI?.trackError('WallpaperSet', String(error), 'medium', 'WallpaperView')
  }
}

async function removeWallpaper(path: string) {
  if (!confirm('确定要删除这张壁纸吗？')) return
  try {
    await electronAPI.removeWallpaper(path)
    await loadLocalWallpapers()
    window.electronAPI?.trackFeature('Wallpaper', 'Remove', { type: 'single' })
  } catch (error) {
    console.error('删除壁纸失败:', error)
  }
}

async function removeAllWallpapers() {
  if (!confirm('确定要清空所有本地壁纸吗？此操作不可恢复！')) return
  
  try {
    const success = await electronAPI.removeAllWallpapers()
    if (success) {
      await loadLocalWallpapers()
      currentWallpaper.value = ''
      window.electronAPI?.trackFeature('Wallpaper', 'Remove', { type: 'all' })
    }
  } catch (error) {
    console.error('清空壁纸失败:', error)
  }
}

async function toggleSlideshow() {
  if (slideshowEnabled.value) {
    // 开启本地轮播前，先关闭在线自动更换
    if (autoChangeConfig.value.enabled) {
      autoChangeConfig.value.enabled = false
      await electronAPI.autoWallpaperSaveConfig(autoChangeConfig.value)
      await updateAutoChangeStatus()
    }
    await electronAPI.startWallpaperSlideshow(slideshowInterval.value)
    window.electronAPI?.trackFeature('Wallpaper', 'Slideshow', { action: 'start', interval: slideshowInterval.value })
  } else {
    await electronAPI.stopWallpaperSlideshow()
    window.electronAPI?.trackFeature('Wallpaper', 'Slideshow', { action: 'stop' })
  }
}

async function toggleSlideshowWithButton() {
  slideshowEnabled.value = !slideshowEnabled.value
  await toggleSlideshow()
}

async function updateSlideshowInterval() {
  if (slideshowEnabled.value) {
    await electronAPI.startWallpaperSlideshow(slideshowInterval.value)
  }
}

async function loadSlideshowStatus() {
  try {
    const status = await electronAPI.getWallpaperSlideshowStatus()
    if (status) {
      slideshowEnabled.value = status.enabled
      slideshowInterval.value = status.interval
    }
  } catch (error) {
    console.error('加载轮播状态失败:', error)
  }
}

// 在线壁纸方法
async function selectSource(sourceId: string) {
  activeSource.value = sourceId
  selectedCategory.value = ''
  searchQuery.value = ''
  
  switch (sourceId) {
    case 'best':
      await loadBestMatchWallpapers()
      break
    case 'bing':
      await loadBingWallpapers()
      break
    case 'wallhaven':
      await loadWallhavenWallpapers()
      break
    case 'picsum':
      await loadPicsumWallpapers()
      break
    case 'all':
    default:
      await loadPopular()
      break
  }
}

// 加载最佳适配分辨率的壁纸
async function loadBestMatchWallpapers() {
  loading.value = true
  try {
    const result = await electronAPI.onlineWallpaperGetForResolution({ page: 1 })
    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('加载最佳适配壁纸失败:', error)
    // 回退到普通加载
    await loadPopular()
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await electronAPI.onlineWallpaperGetCategories()
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

async function loadPopular() {
  loading.value = true
  try {
    const result = await electronAPI.onlineWallpaperGetPopular()
    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('加载热门壁纸失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadBingWallpapers() {
  loading.value = true
  try {
    const result = await electronAPI.onlineWallpaperGetBing()
    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('加载Bing壁纸失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadWallhavenWallpapers() {
  loading.value = true
  try {
    const result = await electronAPI.onlineWallpaperGetWallhaven({ page: 1 })
    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('加载Wallhaven壁纸失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadPicsumWallpapers() {
  loading.value = true
  try {
    const result = await electronAPI.onlineWallpaperGetPicsum(1)
    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('加载Picsum壁纸失败:', error)
  } finally {
    loading.value = false
  }
}

async function searchOnline() {
  if (!searchQuery.value.trim()) {
    // 如果搜索词为空，重新加载当前源的默认内容
    await selectSource(activeSource.value)
    return
  }
  
  loading.value = true
  selectedCategory.value = ''
  try {
    let result: WallpaperItem[] = []
    
    if (activeSource.value === 'wallhaven') {
      // Wallhaven 专属搜索
      result = await electronAPI.onlineWallpaperGetWallhaven({ 
        query: searchQuery.value,
        page: 1 
      })
    } else {
      // 其他源不支持搜索，切换到"全部"并进行全局搜索
      if (activeSource.value !== 'all') {
        activeSource.value = 'all'
      }
      result = await electronAPI.onlineWallpaperSearch({ 
        query: searchQuery.value,
        page: 1 
      })
    }

    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('搜索壁纸失败:', error)
  } finally {
    loading.value = false
  }
}

async function selectCategory(category: string) {
  selectedCategory.value = category
  searchQuery.value = ''
  loading.value = true
  try {
    const result = await electronAPI.onlineWallpaperGetCategory(category, 1)
    onlineWallpapers.value = await markFavorites(result)
    currentPage.value = 1
  } catch (error) {
    console.error('加载分类壁纸失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value) return  // 防止重复点击
  loadingMore.value = true
  currentPage.value++
  try {
    let result: WallpaperItem[] = []
    
    if (searchQuery.value) {
      if (activeSource.value === 'wallhaven') {
        result = await electronAPI.onlineWallpaperGetWallhaven({ 
          query: searchQuery.value, 
          page: currentPage.value 
        })
      } else {
        result = await electronAPI.onlineWallpaperSearch({ 
          query: searchQuery.value,
          page: currentPage.value 
        })
      }
    } else if (selectedCategory.value) {
      result = await electronAPI.onlineWallpaperGetCategory(selectedCategory.value, currentPage.value)
    } else {
      switch (activeSource.value) {
        case 'best':
          result = await electronAPI.onlineWallpaperGetForResolution({ page: currentPage.value })
          break
        case 'bing':
          // Bing API 通常只返回最近几天的壁纸，不支持分页加载更多
          result = []
          break
        case 'wallhaven':
          result = await electronAPI.onlineWallpaperGetWallhaven({ page: currentPage.value })
          break
        case 'picsum':
          result = await electronAPI.onlineWallpaperGetPicsum(currentPage.value)
          break
        case 'all':
        default:
          result = await electronAPI.onlineWallpaperSearch({ page: currentPage.value })
          break
      }
    }
    
    if (result.length > 0) {
      const marked = await markFavorites(result)
      onlineWallpapers.value = [...onlineWallpapers.value, ...marked]
    } else if (activeSource.value === 'bing') {
      // Bing 没有更多数据，不回退页码，但也不做任何事
      currentPage.value--
    }
  } catch (error) {
    console.error('加载更多失败:', error)
    currentPage.value--  // 加载失败时回退页码
  } finally {
    loadingMore.value = false
  }
}

async function markFavorites(wallpapers: WallpaperItem[]): Promise<WallpaperItem[]> {
  const favIds = favorites.value.map(f => f.id)
  return wallpapers.map(w => ({ ...w, isFavorite: favIds.includes(w.id) }))
}

// 检查壁纸是否匹配屏幕分辨率
function isResolutionMatch(wallpaper: WallpaperItem): boolean {
  if (!screenInfo.value) return false
  const screen = screenInfo.value.primary
  const screenRatio = screen.width / screen.height
  const wallpaperRatio = wallpaper.width / wallpaper.height
  
  // 分辨率足够且比例接近
  const resolutionOk = wallpaper.width >= screen.width && wallpaper.height >= screen.height
  const ratioMatch = Math.abs(screenRatio - wallpaperRatio) < 0.1
  
  return resolutionOk && ratioMatch
}

async function toggleFavorite(wallpaper: WallpaperItem) {
  if (wallpaper.isFavorite) {
    await electronAPI.onlineWallpaperRemoveFavorite(wallpaper.id)
    wallpaper.isFavorite = false
  } else {
    await electronAPI.onlineWallpaperAddFavorite(wallpaper)
    wallpaper.isFavorite = true
  }
  await loadFavorites()
}

async function loadFavorites() {
  try {
    favorites.value = await electronAPI.onlineWallpaperGetFavorites()
  } catch (error) {
    console.error('加载收藏失败:', error)
  }
}

async function removeFavorite(id: string) {
  await electronAPI.onlineWallpaperRemoveFavorite(id)
  await loadFavorites()
}

function previewWallpaper(wallpaper: WallpaperItem) {
  previewingWallpaper.value = wallpaper
}

function closePreview() {
  previewingWallpaper.value = null
}

async function downloadWallpaper(wallpaper: WallpaperItem) {
  if (downloading.value) return
  downloading.value = true
  try {
    const path = await electronAPI.onlineWallpaperDownload(wallpaper.downloadUrl)
    if (path) {
      await electronAPI.addWallpaper(path)
      await loadLocalWallpapers()
      alert('壁纸已下载到: ' + path)
    }
  } catch (error) {
    console.error('下载壁纸失败:', error)
  } finally {
    downloading.value = false
  }
}

async function downloadAndApply(wallpaper: WallpaperItem) {
  if (downloading.value) return
  downloading.value = true
  try {
    // 直接下载并应用，无需用户选择目录
    const path = await electronAPI.onlineWallpaperDownloadAndApply(wallpaper.downloadUrl)
    if (path) {
      currentWallpaper.value = path
      await loadLocalWallpapers()
      closePreview()
      console.log('壁纸已应用:', path)
    } else {
      console.error('壁纸应用失败')
    }
  } catch (error) {
    console.error('下载并应用壁纸失败:', error)
  } finally {
    downloading.value = false
  }
}

// 动态壁纸方法
async function checkLiveWallpaperStatus() {
  try {
    liveWallpaperActive.value = await electronAPI.liveWallpaperIsActive()
    if (liveWallpaperActive.value) {
      const config = await electronAPI.liveWallpaperGetConfig()
      if (config) {
        liveVolume.value = config.volume
        livePlaybackRate.value = config.playbackRate
      }
    }
  } catch (error) {
    console.error('检查动态壁纸状态失败:', error)
  }
}

async function addVideoWallpaper() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.mp4,.webm,.ogg,.mov,.avi,.mkv,video/*'
  input.onchange = async (e: any) => {
    const file = e.target.files[0]
    if (file) {
      const config: LiveWallpaperConfig = {
        type: 'video',
        source: file.path,
        volume: liveVolume.value,
        playbackRate: livePlaybackRate.value
      }
      await startLiveWallpaper(config)
    }
  }
  input.click()
}

async function addWebWallpaper() {
  const url = prompt('请输入网页 URL:', 'https://')
  if (url && url !== 'https://') {
    const config: LiveWallpaperConfig = {
      type: 'web',
      source: url,
      volume: 0,
      playbackRate: 1
    }
    await startLiveWallpaper(config)
  }
}

async function startLiveWallpaper(config: LiveWallpaperConfig) {
  try {
    const success = await electronAPI.liveWallpaperStart(config)
    if (success) {
      liveWallpaperActive.value = true
      livePaused.value = false
      liveHistory.value.unshift(config)
      if (liveHistory.value.length > 10) {
        liveHistory.value = liveHistory.value.slice(0, 10)
      }
      // 统计动态壁纸使用
      window.electronAPI?.trackEvent('Wallpaper', 'Set', `Live-${config.type}`)
    }
  } catch (error) {
    console.error('启动动态壁纸失败:', error)
  }
}

async function pauseLiveWallpaper() {
  await electronAPI.liveWallpaperPause()
  livePaused.value = true
}

async function resumeLiveWallpaper() {
  await electronAPI.liveWallpaperResume()
  livePaused.value = false
}

async function stopLiveWallpaper() {
  await electronAPI.liveWallpaperStop()
  liveWallpaperActive.value = false
  livePaused.value = false
}

async function setLiveVolume() {
  await electronAPI.liveWallpaperSetVolume(liveVolume.value)
}

async function setLivePlaybackRate() {
  await electronAPI.liveWallpaperSetPlaybackRate(livePlaybackRate.value)
}

async function replayLiveWallpaper(config: LiveWallpaperConfig) {
  await startLiveWallpaper(config)
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

function openExternal(url: string) {
  electronAPI.openExternal(url)
}

// 获取来源的中文名称
function getSourceName(source: string): string {
  const sourceNames: Record<string, string> = {
    'wallhaven': 'Wallhaven',
    'picsum': 'Picsum',
    'bing': 'Bing',
    'unsplash': 'Unsplash',
    'pexels': 'Pexels'
  }
  return sourceNames[source] || source
}

// 检查作者名是否就是来源名（避免重复显示）
function isSourceName(author: string): boolean {
  const sourceNames = ['Wallhaven', 'Picsum', 'Bing', 'Unsplash', 'Pexels', 'Unknown', '佚名']
  return sourceNames.includes(author)
}

// 自动更换壁纸相关函数
async function loadAutoChangeConfig() {
  try {
    const config = await electronAPI.autoWallpaperGetConfig()
    console.log('loadAutoChangeConfig got:', config)
    autoChangeConfig.value = config
    await updateAutoChangeStatus()
  } catch (error) {
    console.error('加载自动更换配置失败:', error)
  }
}

async function saveAutoChangeConfig() {
  try {
    console.log('saveAutoChangeConfig called, config:', autoChangeConfig.value)
    // 使用 JSON.parse(JSON.stringify()) 确保传递的是纯对象，去除 Proxy 包装
    const configToSave = JSON.parse(JSON.stringify(autoChangeConfig.value))
    await electronAPI.autoWallpaperSaveConfig(configToSave)
    await updateAutoChangeStatus()
  } catch (error) {
    console.error('保存自动更换配置失败:', error)
  }
}

async function onAutoChangeToggle() {
  // 切换状态
  autoChangeConfig.value.enabled = !autoChangeConfig.value.enabled
  console.log('onAutoChangeToggle: enabled =', autoChangeConfig.value.enabled)
  
  // 开启在线自动更换前，先关闭本地轮播
  if (autoChangeConfig.value.enabled) {
    if (slideshowEnabled.value) {
      slideshowEnabled.value = false
      await electronAPI.stopWallpaperSlideshow()
    }
    // 统计自动更换开启
    window.electronAPI?.trackEvent('Wallpaper', 'AutoChange', 'Enable')
  }
  await saveAutoChangeConfig()
}

async function toggleAutoChange() {
  console.log('toggleAutoChange called, enabled:', autoChangeConfig.value.enabled)
  // 开启在线自动更换前，先关闭本地轮播
  if (autoChangeConfig.value.enabled && slideshowEnabled.value) {
    slideshowEnabled.value = false
    await electronAPI.stopWallpaperSlideshow()
  }
  await saveAutoChangeConfig()
}

async function updateAutoChangeStatus() {
  if (isUnmounted) return
  try {
    autoChangeStatus.value = await electronAPI.autoWallpaperGetStatus()
  } catch (error) {
    if (!isUnmounted) {
      console.error('获取自动更换状态失败:', error)
    }
  }
}

function toggleAutoCategory(id: string) {
  const index = autoChangeConfig.value.categories.indexOf(id)
  if (index === -1) {
    autoChangeConfig.value.categories.push(id)
  } else {
    autoChangeConfig.value.categories.splice(index, 1)
  }
  saveAutoChangeConfig()
}

async function changeWallpaperNow() {
  changingWallpaper.value = true
  try {
    const success = await electronAPI.autoWallpaperChangeNow()
    if (success) {
      await updateAutoChangeStatus()
    } else {
      alert('更换壁纸失败，请稍后重试')
    }
  } catch (error) {
    console.error('立即更换壁纸失败:', error)
    alert('更换壁纸失败')
  } finally {
    changingWallpaper.value = false
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  } else if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
}

function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.ceil(ms / 1000)} 秒`
  } else if (ms < 3600000) {
    return `${Math.ceil(ms / 60000)} 分钟`
  } else if (ms < 86400000) {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.ceil((ms % 3600000) / 60000)
    return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
  } else {
    const days = Math.floor(ms / 86400000)
    const hours = Math.ceil((ms % 86400000) / 3600000)
    return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`
  }
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.wallpaper-view {
  padding: 2rem;
  height: 100%;
  overflow-y: auto;
}

.view-header {
  margin-bottom: 2rem;
  
  h2 {
    color: $accent-primary;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: rgba($text-primary, 0.7);
  }
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba($accent-primary, 0.2);
  padding-bottom: 1rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba($accent-primary, 0.1);
  border: 1px solid transparent;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba($accent-primary, 0.2);
  }
  
  &.active {
    background: $gradient-primary;
    border-color: $accent-primary;
  }
  
  .tab-icon {
    font-size: 1.2rem;
  }
}

// 自动更换壁纸卡片样式
.auto-change-card {
  background: linear-gradient(135deg, rgba($accent-primary, 0.15) 0%, rgba($accent-secondary, 0.1) 100%);
  border: 1px solid rgba($accent-primary, 0.3);
  border-radius: $radius-lg;
  padding: 1.5rem;
  margin-bottom: 2rem;
  
  .auto-change-header {
    margin-bottom: 1rem;
    
    .auto-change-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
      
      .auto-icon {
        font-size: 1.3rem;
      }
      
      h4 {
        color: $text-primary;
        font-size: 1.1rem;
        margin: 0;
        flex: 1;
      }
      
      .toggle-btn {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.3s ease;
        background: rgba($text-primary, 0.2);
        color: $text-primary;
        
        &.active {
          background: $gradient-primary;
          color: white;
        }
        
        &:hover {
          transform: scale(1.05);
        }
      }
      
      .switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 26px;
        
        input {
          opacity: 0;
          width: 0;
          height: 0;
          
          &:checked + .slider {
            background: $gradient-primary;
          }
          
          &:checked + .slider:before {
            transform: translateX(24px);
          }
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: rgba($text-primary, 0.2);
          border-radius: 26px;
          transition: 0.3s;
          
          &:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.3s;
          }
        }
      }
    }
    
    .auto-desc {
      color: rgba($text-primary, 0.6);
      font-size: 0.9rem;
      margin: 0;
    }
    
    .auto-status {
      color: $accent-primary;
      font-size: 0.9rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        animation: pulse 2s infinite;
        
        &.active {
          background: #4ade80;
        }
      }
    }
  }
  
  .auto-change-settings {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding-top: 1rem;
    border-top: 1px solid rgba($accent-primary, 0.2);
    
    .setting-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      
      > label {
        color: rgba($text-primary, 0.8);
        min-width: 100px;
        font-size: 0.95rem;
      }
      
      .interval-inputs {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      input[type="number"] {
        width: 70px;
        padding: 0.5rem;
        background: rgba($bg-primary, 0.5);
        border: 1px solid rgba($accent-primary, 0.3);
        border-radius: $radius-sm;
        color: $text-primary;
        text-align: center;
        
        &:focus {
          outline: none;
          border-color: $accent-primary;
        }
      }
      
      select {
        padding: 0.5rem 1rem;
        background: rgba($bg-primary, 0.5);
        border: 1px solid rgba($accent-primary, 0.3);
        border-radius: $radius-sm;
        color: $text-primary;
        cursor: pointer;
        
        &:focus {
          outline: none;
          border-color: $accent-primary;
        }
        
        option {
          background: $bg-primary;
          color: $text-primary;
        }
      }
      
      &.categories-row {
        flex-direction: column;
        align-items: flex-start;
        
        > label {
          margin-bottom: 0.5rem;
        }
      }
    }
    
    .category-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: 100%;
      
      .chip {
        padding: 0.4rem 0.8rem;
        background: rgba($bg-primary, 0.5);
        border: 1px solid rgba($accent-primary, 0.3);
        border-radius: 20px;
        color: rgba($text-primary, 0.7);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          border-color: $accent-primary;
          color: $text-primary;
        }
        
        &.active {
          background: rgba($accent-primary, 0.3);
          border-color: $accent-primary;
          color: $text-primary;
        }
      }
    }
    
    .category-hint {
      color: rgba($text-primary, 0.5);
      font-size: 0.8rem;
      margin: 0.25rem 0 0 0;
    }
    
    .setting-actions {
      margin-top: 0.5rem;
      
      .btn-change-now {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.2rem;
        background: $gradient-primary;
        border: none;
        border-radius: $radius-md;
        color: $text-primary;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
        
        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: $shadow-glow;
        }
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h3 {
    color: $text-primary;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba($error-color, 0.1);
  border: 1px solid rgba($error-color, 0.3);
  border-radius: $radius-md;
  color: $error-color;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba($error-color, 0.2);
    border-color: $error-color;
  }
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: $gradient-primary;
  border: none;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-glow;
  }
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.wallpaper-item {
  position: relative;
  aspect-ratio: 16/10;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover .overlay {
    opacity: 1;
  }
  
  &.active {
    border: 3px solid $accent-primary;
  }
  
  .loading-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, rgba($surface-secondary, 0.8), rgba($surface-primary, 0.8));
    color: $text-secondary;
    font-size: 0.85rem;
  }
  
  .current-badge {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: $accent-primary;
    color: white;
    border-radius: $radius-sm;
    font-size: 0.75rem;
  }
  
  .btn-apply, .btn-delete {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: $radius-sm;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .btn-apply {
    background: $accent-primary;
    color: white;
  }
  
  .btn-delete {
    background: rgba(255, 100, 100, 0.8);
    color: white;
  }
  
  .btn-favorite {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 2rem;
    height: 2rem;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &.favorited {
      background: rgba(255, 100, 100, 0.8);
    }
  }
  
  .source-badge {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: $radius-sm;
    font-size: 0.7rem;
    text-transform: uppercase;
  }
  
  .author {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
  }
}

.slideshow-card {
  background: linear-gradient(135deg, rgba($accent-primary, 0.15) 0%, rgba($accent-secondary, 0.1) 100%);
  border: 1px solid rgba($accent-primary, 0.3);
  border-radius: $radius-lg;
  padding: 1.5rem;
  margin-bottom: 2rem;
  
  .slideshow-header {
    margin-bottom: 1rem;
  }
  
  .slideshow-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    
    .icon {
      font-size: 1.3rem;
    }
    
    h4 {
      color: $text-primary;
      font-size: 1.1rem;
      margin: 0;
      flex: 1;
    }
  }

  .toggle-btn {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.3s ease;
    background: rgba($text-primary, 0.2);
    color: $text-primary;
    
    &.active {
      background: $gradient-primary;
      color: white;
    }
    
    &:hover {
      transform: scale(1.05);
    }
  }

  .desc {
    color: rgba($text-primary, 0.6);
    font-size: 0.9rem;
    margin: 0;
  }

  .status {
    color: $accent-primary;
    font-size: 0.9rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      animation: pulse 2s infinite;
      
      &.active {
        background: #4ade80;
      }
    }
  }
  
  .slideshow-settings {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding-top: 1rem;
    border-top: 1px solid rgba($accent-primary, 0.2);
    
    .setting-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      > label {
        color: rgba($text-primary, 0.8);
        min-width: 100px;
        font-size: 0.95rem;
      }
      
      select {
        padding: 0.5rem 1rem;
        background: rgba($bg-primary, 0.5);
        border: 1px solid rgba($accent-primary, 0.3);
        border-radius: $radius-sm;
        color: $text-primary;
        cursor: pointer;
        
        &:focus {
          outline: none;
          border-color: $accent-primary;
        }
        
        option {
          background: $bg-primary;
          color: $text-primary;
        }
      }
    }
  }
}

.slideshow-controls {
  display: flex;
  align-items: center;
  gap: 2rem;
  
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: $text-primary;
  }
  
  .interval-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    select {
      padding: 0.5rem;
      background: $surface-primary;
      border: 1px solid rgba($accent-primary, 0.3);
      border-radius: $radius-sm;
      color: $text-primary;
    }
  }
}

.source-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.resolution-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba($accent-primary, 0.15), rgba($accent-secondary, 0.1));
  border: 1px solid rgba($accent-primary, 0.3);
  border-radius: $radius-md;
  margin-bottom: 1rem;
  color: $text-primary;
  font-size: 0.9rem;
  
  .icon {
    font-size: 1.2rem;
  }
  
  .hint {
    color: $text-secondary;
    font-size: 0.8rem;
  }
}

.resolution-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  padding: 0.2rem 0.4rem;
  background: rgba(0, 0, 0, 0.7);
  color: #90EE90;
  border-radius: $radius-sm;
  font-size: 0.65rem;
  font-family: monospace;
}

.match-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.wallpaper-item.resolution-match {
  border: 2px solid rgba(76, 175, 80, 0.6);
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), transparent);
    pointer-events: none;
  }
}

.source-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: rgba($surface-secondary, 0.5);
  border: 1px solid rgba($accent-primary, 0.2);
  border-radius: $radius-full;
  color: $text-primary;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background: rgba($accent-primary, 0.2);
    border-color: rgba($accent-primary, 0.4);
  }
  
  &.active {
    background: rgba($accent-primary, 0.3);
    border-color: $accent-primary;
  }
  
  .free-badge {
    padding: 0.15rem 0.4rem;
    background: rgba(100, 200, 100, 0.3);
    color: #90EE90;
    border-radius: $radius-sm;
    font-size: 0.7rem;
    font-weight: 600;
  }
}

.search-bar {
  
  input {
    width: 100%;
    padding: 0.75rem;
    background: $surface-primary;
    border: 1px solid rgba($accent-primary, 0.3);
    border-radius: $radius-sm;
    color: $text-primary;
    margin-bottom: 0.5rem;
    
    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }
  
  a {
    color: $accent-primary;
    font-size: 0.85rem;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.btn-save {
  width: 100%;
  padding: 1rem;
  background: $gradient-primary;
  border: none;
  border-radius: $radius-md;
  color: $text-primary;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-glow;
  }
}

.search-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: rgba($surface-secondary, 0.5);
    border: 1px solid rgba($accent-primary, 0.3);
    border-radius: $radius-md;
    color: $text-primary;
    
    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }
  
  button {
    padding: 0.75rem 1.5rem;
    background: $gradient-primary;
    border: none;
    border-radius: $radius-md;
    color: $text-primary;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
}

.categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.category-btn {
  padding: 0.5rem 1rem;
  background: rgba($surface-secondary, 0.5);
  border: 1px solid rgba($accent-primary, 0.2);
  border-radius: $radius-full;
  color: $text-primary;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover, &.active {
    background: rgba($accent-primary, 0.3);
    border-color: $accent-primary;
  }
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba($accent-primary, 0.3);
    border-top-color: $accent-primary;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  p {
    margin-top: 1rem;
    color: rgba($text-primary, 0.7);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.load-more-section {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.btn-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 300px;
  padding: 1rem 2rem;
  background: rgba($accent-primary, 0.2);
  border: 1px solid $accent-primary;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  
  &:hover:not(:disabled) {
    background: rgba($accent-primary, 0.3);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba($accent-primary, 0.3);
    border-top-color: $accent-primary;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.add-live-section {
  margin-top: 1.5rem;
  
  h4 {
    margin-bottom: 1rem;
    color: $text-primary;
    font-size: 1.1rem;
  }
  
  .add-buttons {
    display: flex;
    gap: 1rem;
  }
}

// 使用说明样式
.usage-guide {
  background: rgba($surface-secondary, 0.3);
  border-radius: $radius-lg;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  h4 {
    color: $text-primary;
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }
  
  .guide-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .guide-step {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
    
    .step-num {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, $accent-primary, $accent-secondary);
      border-radius: 50%;
      color: white;
      font-size: 0.85rem;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    span:last-child {
      color: $text-primary;
      font-size: 0.95rem;
    }
  }
  
  .format-info {
    background: rgba($accent-primary, 0.1);
    border-radius: $radius-md;
    padding: 1rem;
    margin-bottom: 1rem;
    
    h5 {
      color: $accent-primary;
      font-size: 0.95rem;
      margin-bottom: 0.75rem;
    }
    
    .format-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    
    .format-tag {
      padding: 0.3rem 0.75rem;
      background: rgba($accent-primary, 0.2);
      border-radius: $radius-full;
      color: $text-primary;
      font-size: 0.85rem;
      font-family: monospace;
    }
    
    .format-tip {
      color: $text-muted;
      font-size: 0.85rem;
      margin: 0;
    }
  }
  
  .video-tips {
    h5 {
      color: $text-primary;
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }
    
    ul {
      margin: 0;
      padding-left: 1.5rem;
      
      li {
        color: $text-muted;
        font-size: 0.9rem;
        line-height: 1.6;
        
        a {
          color: $accent-primary;
          text-decoration: none;
          
          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }
}

.divider {
  height: 1px;
  background: $border-color;
  margin: 1.5rem 0;
}

.btn-add-video, .btn-add-web {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background: rgba($surface-secondary, 0.5);
  border: 2px dashed rgba($accent-primary, 0.3);
  border-radius: $radius-lg;
  color: $text-primary;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  span {
    font-size: 1.8rem;
  }
  
  &:hover {
    background: rgba($accent-primary, 0.1);
    border-color: $accent-primary;
  }
  
  &.primary {
    background: linear-gradient(135deg, rgba($accent-primary, 0.3), rgba($accent-secondary, 0.3));
    border: 2px solid rgba($accent-primary, 0.5);
    
    &:hover {
      background: linear-gradient(135deg, rgba($accent-primary, 0.4), rgba($accent-secondary, 0.4));
      border-color: $accent-primary;
      transform: translateY(-2px);
    }
  }
}

.live-status {
  padding: 0.5rem 1rem;
  background: rgba(100, 100, 100, 0.3);
  border-radius: $radius-full;
  font-size: 0.85rem;
  
  &.active {
    background: rgba(100, 200, 100, 0.3);
    color: #90EE90;
  }
}

.live-controls {
  padding: 1.5rem;
  background: rgba($surface-secondary, 0.5);
  border-radius: $radius-lg;
  margin-bottom: 2rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  
  label {
    min-width: 80px;
    color: $text-primary;
  }
  
  input[type="range"] {
    flex: 1;
    max-width: 200px;
  }
  
  select {
    padding: 0.5rem;
    background: $surface-primary;
    border: 1px solid rgba($accent-primary, 0.3);
    border-radius: $radius-sm;
    color: $text-primary;
  }
}

.control-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  
  button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba($accent-primary, 0.2);
    color: $text-primary;
    
    &:hover {
      background: rgba($accent-primary, 0.3);
    }
    
    &.btn-stop {
      background: rgba(255, 100, 100, 0.3);
      
      &:hover {
        background: rgba(255, 100, 100, 0.5);
      }
    }
  }
}

.history-section {
  margin-top: 2rem;
  
  h4 {
    margin-bottom: 1rem;
    color: $text-primary;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba($surface-secondary, 0.3);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba($accent-primary, 0.2);
  }
  
  .type-icon {
    font-size: 1.25rem;
  }
  
  .source-name {
    color: $text-primary;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  color: rgba($text-primary, 0.6);
  
  span {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  p {
    text-align: center;
    line-height: 1.6;
  }
}

.preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.preview-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: $surface-primary;
  border-radius: $radius-lg;
  overflow: hidden;
  
  img {
    max-width: 100%;
    max-height: 60vh;
    object-fit: contain;
  }
}

.preview-info {
  padding: 1.5rem;
  
  h3 {
    margin-bottom: 0.5rem;
    color: $text-primary;
  }
  
  p {
    margin: 0.25rem 0;
    color: rgba($text-primary, 0.7);
    font-size: 0.9rem;
  }
}

.preview-actions {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem 1.5rem;
  
  button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:first-child {
      background: $gradient-primary;
      color: $text-primary;
    }
    
    &:nth-child(2) {
      background: rgba($accent-primary, 0.2);
      color: $text-primary;
    }
    
    &:last-child {
      background: rgba(100, 100, 100, 0.3);
      color: $text-primary;
    }
    
    &:hover {
      transform: translateY(-2px);
    }
  }
}

// 骨架屏样式
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.wallpaper-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;

  .skeleton-wallpaper-item {
    aspect-ratio: 16/9;
    border-radius: $radius-md;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }
}

// 自动更换壁纸设置样式
.auto-change-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba($surface-secondary, 0.3);
  border-radius: $radius-lg;
  border: 1px solid rgba($accent-primary, 0.2);
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    
    h4 {
      margin: 0;
      color: $text-primary;
      font-size: 1.1rem;
    }
  }
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + .slider {
      background: $gradient-primary;
    }
    
    &:checked + .slider:before {
      transform: translateX(24px);
    }
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba($surface-secondary, 0.8);
    transition: 0.3s;
    border-radius: 26px;
    
    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }
}

.auto-change-settings {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  
  > label {
    min-width: 100px;
    color: $text-muted;
    font-size: 0.9rem;
  }
  
  &.categories-row {
    flex-direction: column;
    align-items: flex-start;
    
    > label {
      margin-bottom: 0.5rem;
    }
  }
}

.interval-input {
  display: flex;
  gap: 0.5rem;
  
  input {
    width: 80px;
    padding: 0.5rem;
    background: rgba($surface-primary, 0.5);
    border: 1px solid rgba($accent-primary, 0.3);
    border-radius: $radius-sm;
    color: $text-primary;
    text-align: center;
    
    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }
  
  select {
    padding: 0.5rem 1rem;
    background: rgba($surface-primary, 0.5);
    border: 1px solid rgba($accent-primary, 0.3);
    border-radius: $radius-sm;
    color: $text-primary;
    cursor: pointer;
    
    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }
}

.resolution-select {
  padding: 0.5rem 1rem;
  background: rgba($surface-primary, 0.5);
  border: 1px solid rgba($accent-primary, 0.3);
  border-radius: $radius-sm;
  color: $text-primary;
  cursor: pointer;
  min-width: 180px;
  
  &:focus {
    outline: none;
    border-color: $accent-primary;
  }
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-chip {
  padding: 0.4rem 0.8rem;
  background: rgba($surface-secondary, 0.5);
  border: 1px solid rgba($accent-primary, 0.2);
  border-radius: $radius-full;
  color: $text-muted;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba($accent-primary, 0.1);
    border-color: rgba($accent-primary, 0.4);
  }
  
  &.active {
    background: rgba($accent-primary, 0.3);
    border-color: $accent-primary;
    color: $text-primary;
  }
}

.status-info {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: rgba($surface-primary, 0.3);
  border-radius: $radius-md;
  font-size: 0.85rem;
  color: $text-muted;
}

.btn-change-now {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: $gradient-primary;
  border: none;
  border-radius: $radius-md;
  color: $text-primary;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: $shadow-glow;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;

  button {
    padding: 0.6rem 1.2rem;
    border-radius: $radius-md;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .btn-primary {
    background: $gradient-primary;
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: $shadow-glow;
    }
  }

  .btn-secondary {
    background: rgba($surface-secondary, 0.8);
    color: $text-primary;
    border: 1px solid rgba($accent-primary, 0.3);

    &:hover:not(:disabled) {
      background: rgba($accent-primary, 0.2);
      border-color: $accent-primary;
    }
  }

  .btn-close {
    background: transparent;
    color: $text-muted;
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      color: $text-primary;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
