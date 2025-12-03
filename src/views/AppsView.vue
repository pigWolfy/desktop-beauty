<template>
  <div class="apps-view">
    <h1 class="page-title">应用启动 🚀</h1>

    <!-- 搜索栏 -->
    <div class="search-section card">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索应用..."
          @input="handleSearch"
        />
        <span v-if="searchQuery" class="clear-btn" @click="clearSearch">✕</span>
      </div>
    </div>

    <!-- 收藏的应用 -->
    <div class="favorites-section mt-md" v-if="favorites.length > 0">
      <h3 class="section-title">⭐ 收藏的应用</h3>
      <div class="app-grid">
        <div
          v-for="app in favorites"
          :key="app.path"
          class="app-card favorite"
          @click="launchApp(app.path)"
        >
          <span class="app-icon">📱</span>
          <div class="app-info">
            <span class="app-name">{{ app.name }}</span>
          </div>
          <button class="remove-btn" @click.stop="removeFavorite(app.path)" title="取消收藏">
            ⭐
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索结果/所有应用 -->
    <div class="apps-section mt-lg">
      <h3 class="section-title">
        {{ searchQuery ? '🔍 搜索结果' : '📋 所有应用' }}
        <span class="count">({{ filteredApps.length }})</span>
      </h3>

      <!-- 加载状态骨架屏 -->
      <div v-if="loading" class="apps-skeleton">
        <div v-for="i in 6" :key="i" class="skeleton-app-item">
          <div class="skeleton-icon"></div>
          <div class="skeleton-content">
            <div class="skeleton-name"></div>
            <div class="skeleton-path"></div>
          </div>
        </div>
      </div>

      <div v-else-if="filteredApps.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <span>{{ searchQuery ? '未找到匹配的应用' : '没有发现已安装的应用' }}</span>
      </div>

      <div v-else class="app-list">
        <div
          v-for="app in filteredApps"
          :key="app.path"
          class="app-item"
          @click="launchApp(app.path)"
        >
          <span class="app-icon">📱</span>
          <div class="app-info">
            <span class="app-name">{{ app.name }}</span>
            <span class="app-path">{{ app.path }}</span>
          </div>
          <div class="app-actions">
            <button
              class="action-btn"
              @click.stop="toggleFavorite(app)"
              :title="isFavorite(app) ? '取消收藏' : '添加收藏'"
            >
              {{ isFavorite(app) ? '⭐' : '☆' }}
            </button>
            <button class="action-btn launch" @click.stop="launchApp(app.path)" title="启动">
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近使用 -->
    <div class="recent-section mt-lg" v-if="recentApps.length > 0">
      <div class="section-header flex-between">
        <h3 class="section-title">🕐 最近使用</h3>
        <button class="btn btn-secondary" @click="clearRecent">清除</button>
      </div>
      <div class="recent-list">
        <div
          v-for="appPath in recentApps"
          :key="appPath"
          class="recent-item"
          @click="launchApp(appPath)"
        >
          <span class="app-icon">📱</span>
          <span class="app-name">{{ getAppName(appPath) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface AppInfo {
  name: string
  path: string
  icon?: string
}

const apps = ref<AppInfo[]>([])
const favorites = ref<AppInfo[]>([])
const recentApps = ref<string[]>([])
const searchQuery = ref('')
const loading = ref(true)

const filteredApps = computed(() => {
  if (!searchQuery.value) return apps.value
  
  const query = searchQuery.value.toLowerCase()
  return apps.value.filter(app => 
    app.name.toLowerCase().includes(query)
  )
})

const loadApps = async () => {
  loading.value = true
  try {
    apps.value = await window.electronAPI?.getInstalledApps() || []
  } catch (e) {
    console.error('Failed to load apps:', e)
  } finally {
    loading.value = false
  }
}

const loadFavorites = async () => {
  favorites.value = await window.electronAPI?.getFavoriteApps() || []
}

const handleSearch = () => {
  // 实时搜索，不需要额外操作
}

const clearSearch = () => {
  searchQuery.value = ''
}

const launchApp = async (path: string) => {
  await window.electronAPI?.launchApp(path)
  // 刷新最近使用
  recentApps.value = [path, ...recentApps.value.filter(p => p !== path)].slice(0, 5)
}

const isFavorite = (app: AppInfo): boolean => {
  return favorites.value.some(f => f.path === app.path)
}

const toggleFavorite = async (app: AppInfo) => {
  if (isFavorite(app)) {
    await window.electronAPI?.removeFavoriteApp(app.path)
  } else {
    await window.electronAPI?.addFavoriteApp(app)
  }
  await loadFavorites()
}

const removeFavorite = async (path: string) => {
  await window.electronAPI?.removeFavoriteApp(path)
  await loadFavorites()
}

const getAppName = (path: string): string => {
  const app = apps.value.find(a => a.path === path)
  return app?.name || path.split('\\').pop()?.replace('.lnk', '') || path
}

const clearRecent = () => {
  recentApps.value = []
}

onMounted(async () => {
  await Promise.all([loadApps(), loadFavorites()])
})
</script>

<style lang="scss" scoped>
.apps-view {
  animation: fadeIn 0.3s ease;
}

.search-section {
  padding: 8px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: $bg-secondary;
  border-radius: $border-radius-sm;

  .search-icon {
    font-size: 18px;
    opacity: 0.6;
  }

  input {
    flex: 1;
    font-size: 16px;
    color: $text-primary;
    background: transparent;

    &::placeholder {
      color: $text-muted;
    }
  }

  .clear-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $bg-card;
    border-radius: 50%;
    cursor: pointer;
    font-size: 12px;
    opacity: 0.6;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }
}

.section-title .count {
  font-weight: normal;
  color: $text-muted;
  font-size: 14px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.app-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: $bg-card;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;
    transform: translateY(-2px);
  }

  &.favorite {
    border: 1px solid rgba($accent-primary, 0.3);
  }

  .app-icon {
    font-size: 28px;
  }

  .app-info {
    flex: 1;
    min-width: 0;

    .app-name {
      display: block;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .remove-btn {
    font-size: 16px;
    opacity: 0.6;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }
}

.app-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: $bg-card;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;

    .app-actions {
      opacity: 1;
    }
  }

  .app-icon {
    font-size: 28px;
  }

  .app-info {
    flex: 1;
    min-width: 0;

    .app-name {
      display: block;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .app-path {
      display: block;
      font-size: 11px;
      color: $text-muted;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .app-actions {
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity $transition-fast;

    .action-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $bg-secondary;
      border-radius: 50%;
      font-size: 14px;
      transition: all $transition-fast;

      &:hover {
        background: $bg-hover;
      }

      &.launch {
        background: $accent-primary;
        color: white;

        &:hover {
          background: lighten($accent-primary, 10%);
        }
      }
    }
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: $text-muted;

  .spinner {
    font-size: 32px;
    animation: spin 1s linear infinite;
  }

  .empty-icon {
    font-size: 48px;
    opacity: 0.5;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.recent-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: $bg-card;
  border-radius: 20px;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;
  }

  .app-icon {
    font-size: 16px;
  }

  .app-name {
    font-size: 13px;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .section-title {
    margin-bottom: 0;
  }
}

// 骨架屏样式
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.apps-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .skeleton-app-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);

    .skeleton-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      flex-shrink: 0;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }

    .skeleton-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-name {
      width: 30%;
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }

    .skeleton-path {
      width: 60%;
      height: 12px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }
  }
}
</style>
