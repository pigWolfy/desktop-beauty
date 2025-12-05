<template>
  <Teleport to="body">
    <div class="launcher-overlay" @click.self="$emit('close')">
      <div class="launcher-container animate-slideUp">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            :placeholder="t('launcher.searchPlaceholder')"
            @input="handleSearch"
            @keydown.enter="launchFirst"
            @keydown.esc="$emit('close')"
          />
          <span class="shortcut-hint">{{ t('launcher.escHint') }}</span>
        </div>

        <div class="results-container">
          <!-- 收藏的应用 -->
          <div v-if="!searchQuery && favorites.length > 0" class="section">
            <div class="section-title">{{ t('launcher.favorites') }}</div>
            <div class="app-grid">
              <div
                v-for="app in favorites"
                :key="app.path"
                class="app-item"
                @click="launchApp(app.path)"
              >
                <span class="app-icon">📱</span>
                <span class="app-name">{{ app.name }}</span>
              </div>
            </div>
          </div>

          <!-- 搜索结果 -->
          <div v-if="searchResults.length > 0" class="section">
            <div class="section-title">{{ searchQuery ? t('launcher.searchResults') : t('launcher.allApps') }}</div>
            <div class="app-list">
              <div
                v-for="(app, index) in searchResults"
                :key="app.path"
                class="app-item-list"
                :class="{ selected: index === selectedIndex }"
                @click="launchApp(app.path)"
                @mouseenter="selectedIndex = index"
              >
                <span class="app-icon">📱</span>
                <div class="app-info">
                  <span class="app-name">{{ app.name }}</span>
                  <span class="app-path">{{ app.path }}</span>
                </div>
                <button 
                  class="favorite-btn"
                  @click.stop="toggleFavorite(app)"
                  :title="isFavorite(app) ? t('launcher.removeFavorite') : t('launcher.addFavorite')"
                >
                  {{ isFavorite(app) ? '⭐' : '☆' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="searchQuery && searchResults.length === 0" class="empty-state">
            <span class="empty-icon">🔍</span>
            <span class="empty-text">{{ t('launcher.noResults') }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface AppInfo {
  name: string
  path: string
  icon?: string
}

defineEmits(['close'])

const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const searchResults = ref<AppInfo[]>([])
const favorites = ref<AppInfo[]>([])
const selectedIndex = ref(0)

const handleSearch = async () => {
  if (!searchQuery.value) {
    searchResults.value = await window.electronAPI?.getInstalledApps() || []
  } else {
    searchResults.value = await window.electronAPI?.searchApps(searchQuery.value) || []
  }
  selectedIndex.value = 0
}

const launchApp = async (path: string) => {
  await window.electronAPI?.launchApp(path)
}

const launchFirst = () => {
  if (searchResults.value.length > 0) {
    launchApp(searchResults.value[selectedIndex.value].path)
  }
}

const loadFavorites = async () => {
  favorites.value = await window.electronAPI?.getFavoriteApps() || []
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

watch(searchQuery, () => {
  selectedIndex.value = 0
})

onMounted(async () => {
  searchInput.value?.focus()
  await loadFavorites()
  await handleSearch()
})
</script>

<style lang="scss" scoped>
.launcher-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.launcher-container {
  width: 600px;
  max-height: 500px;
  background: $bg-primary;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $shadow-lg;
  border: 1px solid $border-color;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;

  .search-icon {
    font-size: 20px;
  }

  input {
    flex: 1;
    font-size: 18px;
    color: $text-primary;
    background: transparent;

    &::placeholder {
      color: $text-muted;
    }
  }

  .shortcut-hint {
    font-size: 12px;
    color: $text-muted;
    padding: 4px 8px;
    background: $bg-card;
    border-radius: 4px;
  }
}

.results-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
}

.section {
  margin-bottom: 16px;

  &-title {
    font-size: 12px;
    color: $text-muted;
    margin-bottom: 8px;
    padding-left: 8px;
  }
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;
  }

  .app-icon {
    font-size: 28px;
  }

  .app-name {
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
}

.app-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-item-list {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover,
  &.selected {
    background: $bg-hover;
  }

  .app-icon {
    font-size: 24px;
  }

  .app-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .app-name {
      font-size: 14px;
      font-weight: 500;
    }

    .app-path {
      font-size: 11px;
      color: $text-muted;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .favorite-btn {
    font-size: 18px;
    padding: 4px;
    opacity: 0.6;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: $text-muted;

  .empty-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 14px;
  }
}
</style>
