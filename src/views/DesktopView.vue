<template>
  <div class="desktop-view">
    <h1 class="page-title">{{ t('desktop.title') }}</h1>

    <!-- 操作工具栏 -->
    <div class="toolbar card">
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="organizeDesktop">
          <span>📁</span>
          {{ t('desktop.organize') }}
        </button>
        <button class="btn btn-secondary" @click="refreshIcons">
          <span>🔄</span>
          {{ t('desktop.refresh') }}
        </button>
        <button class="btn btn-secondary" @click="toggleIcons">
          <span>{{ iconsHidden ? '👁️' : '🙈' }}</span>
          {{ iconsHidden ? t('desktop.showIcons') : t('desktop.hideIcons') }}
        </button>
      </div>
      <div class="toolbar-right">
        <select v-model="sortBy" class="select-box">
          <option value="name">{{ t('desktop.sortByName') }}</option>
          <option value="type">{{ t('desktop.sortByType') }}</option>
          <option value="date">{{ t('desktop.sortByDate') }}</option>
          <option value="size">{{ t('desktop.sortBySize') }}</option>
        </select>
      </div>
    </div>

    <!-- 桌面图标预览 -->
    <div class="icons-section mt-md">
      <h3 class="section-title">{{ t('desktop.desktopIcons') }} ({{ t('desktop.iconCount', { count: icons.length }) }})</h3>
      
      <!-- 加载状态骨架屏 -->
      <div v-if="loading" class="icons-skeleton">
        <div v-for="i in 12" :key="i" class="skeleton-icon-item">
          <div class="skeleton-emoji"></div>
          <div class="skeleton-name"></div>
          <div class="skeleton-type"></div>
        </div>
      </div>

      <div v-else-if="icons.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <span>{{ t('desktop.noItems') }}</span>
      </div>

      <div v-else class="icons-grid">
        <div
          v-for="icon in sortedIcons"
          :key="icon.path"
          class="icon-item"
          :class="{ selected: selectedIcons.includes(icon.path) }"
          @click="toggleSelect(icon.path)"
          @dblclick="openItem(icon.path)"
        >
          <span class="icon-emoji">{{ getIconEmoji(icon) }}</span>
          <span class="icon-name" :title="icon.name">{{ icon.name }}</span>
          <span class="icon-type">{{ getTypeLabel(icon.type) }}</span>
        </div>
      </div>
    </div>

    <!-- 分组管理 -->
    <div class="groups-section mt-lg">
      <div class="section-header flex-between">
        <h3 class="section-title">{{ t('desktop.createGroup') }}</h3>
      </div>
      
      <div class="group-form card" v-if="selectedIcons.length > 0">
        <p class="selected-count">{{ t('desktop.selectedCount', { count: selectedIcons.length }) }}</p>
        <div class="form-row">
          <input
            v-model="newGroupName"
            type="text"
            :placeholder="t('desktop.groupNamePlaceholder')"
            class="input-box"
          />
          <button class="btn btn-primary" @click="createGroup" :disabled="!newGroupName">
            {{ t('desktop.createGroupBtn') }}
          </button>
        </div>
      </div>
      
      <div v-else class="hint-text">
        {{ t('desktop.selectHint') }}
      </div>
    </div>

    <!-- 整理选项 -->
    <div class="options-section mt-lg">
      <h3 class="section-title">{{ t('desktop.organizeOptions') }}</h3>
      <div class="options-grid">
        <div class="option-card" @click="organizeByType">
          <span class="option-icon">📂</span>
          <h4>{{ t('desktop.organizeByType') }}</h4>
          <p>{{ t('desktop.organizeByTypeDesc') }}</p>
        </div>
        <div class="option-card" @click="organizeByDate">
          <span class="option-icon">📅</span>
          <h4>{{ t('desktop.organizeByDate') }}</h4>
          <p>{{ t('desktop.organizeByDateDesc') }}</p>
        </div>
        <div class="option-card" @click="cleanupShortcuts">
          <span class="option-icon">🔗</span>
          <h4>{{ t('desktop.cleanEmpty') }}</h4>
          <p>{{ t('desktop.cleanEmptyDesc') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface DesktopIcon {
  name: string
  path: string
  type: 'file' | 'folder' | 'shortcut'
  extension: string
  size: number
  modifiedTime: Date
}

const icons = ref<DesktopIcon[]>([])
const loading = ref(true)
const iconsHidden = ref(false)
const selectedIcons = ref<string[]>([])
const newGroupName = ref('')
const sortBy = ref('type')

const sortedIcons = computed(() => {
  const sorted = [...icons.value]
  
  switch (sortBy.value) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'type':
      sorted.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
      break
    case 'date':
      sorted.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
      break
    case 'size':
      sorted.sort((a, b) => b.size - a.size)
      break
  }
  
  return sorted
})

const getIconEmoji = (icon: DesktopIcon): string => {
  if (icon.type === 'folder') return '📁'
  if (icon.type === 'shortcut') return '🔗'
  
  const ext = icon.extension.toLowerCase()
  const emojiMap: Record<string, string> = {
    '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️',
    '.mp4': '🎬', '.avi': '🎬', '.mkv': '🎬',
    '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵',
    '.doc': '📄', '.docx': '📄', '.pdf': '📕',
    '.xls': '📊', '.xlsx': '📊',
    '.zip': '📦', '.rar': '📦', '.7z': '📦',
    '.exe': '⚙️', '.msi': '⚙️',
    '.txt': '📝',
  }
  
  return emojiMap[ext] || '📄'
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    file: t('desktop.file'),
    folder: t('desktop.folder'),
    shortcut: t('desktop.shortcut')
  }
  return labels[type] || t('desktop.unknown')
}

const loadIcons = async () => {
  loading.value = true
  try {
    icons.value = await window.electronAPI?.getDesktopIcons() || []
  } catch (e) {
    console.error('Failed to load icons:', e)
  } finally {
    loading.value = false
  }
}

const refreshIcons = () => {
  selectedIcons.value = []
  loadIcons()
}

const toggleSelect = (path: string) => {
  const index = selectedIcons.value.indexOf(path)
  if (index === -1) {
    selectedIcons.value.push(path)
  } else {
    selectedIcons.value.splice(index, 1)
  }
}

const openItem = (path: string) => {
  window.electronAPI?.openPath(path)
}

const toggleIcons = async () => {
  if (iconsHidden.value) {
    await window.electronAPI?.showDesktopIcons()
  } else {
    await window.electronAPI?.hideDesktopIcons()
  }
  iconsHidden.value = !iconsHidden.value
}

const organizeDesktop = async () => {
  await window.electronAPI?.organizeDesktop({ sortBy: sortBy.value as any })
  await loadIcons()
}

const organizeByType = async () => {
  await window.electronAPI?.organizeDesktop({ groupBy: 'type' })
  await loadIcons()
}

const organizeByDate = async () => {
  await window.electronAPI?.organizeDesktop({ sortBy: 'date' })
  await loadIcons()
}

const cleanupShortcuts = async () => {
  // Filter shortcuts and create group
  const shortcuts = icons.value
    .filter(i => i.type === 'shortcut')
    .map(i => i.path)
  
  if (shortcuts.length > 0) {
    await window.electronAPI?.createIconGroup(t('desktop.shortcutsGroup'), shortcuts)
    await loadIcons()
  }
}

const createGroup = async () => {
  if (newGroupName.value && selectedIcons.value.length > 0) {
    await window.electronAPI?.createIconGroup(newGroupName.value, selectedIcons.value)
    newGroupName.value = ''
    selectedIcons.value = []
    await loadIcons()
  }
}

onMounted(() => {
  loadIcons()
})
</script>

<style lang="scss" scoped>
.desktop-view {
  animation: fadeIn 0.3s ease;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;

  .toolbar-left {
    display: flex;
    gap: 12px;
  }
}

.select-box {
  padding: 10px 16px;
  background: $bg-secondary;
  color: $text-primary;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: $accent-primary;
  }
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: $bg-card;
  border-radius: $border-radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  border: 2px solid transparent;

  &:hover {
    background: $bg-hover;
    transform: translateY(-2px);
  }

  &.selected {
    border-color: $accent-primary;
    background: rgba($accent-primary, 0.1);
  }

  .icon-emoji {
    font-size: 32px;
  }

  .icon-name {
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .icon-type {
    font-size: 10px;
    color: $text-muted;
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

.group-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .selected-count {
    color: $accent-primary;
    font-weight: 500;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }
}

.input-box {
  flex: 1;
  padding: 12px 16px;
  background: $bg-secondary;
  color: $text-primary;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;

  &:focus {
    outline: none;
    border-color: $accent-primary;
  }

  &::placeholder {
    color: $text-muted;
  }
}

.hint-text {
  color: $text-muted;
  font-size: 13px;
  padding: 20px;
  text-align: center;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.option-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 24px;
  background: $bg-card;
  border-radius: $border-radius;
  cursor: pointer;
  transition: all $transition-normal;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-md;
    background: $bg-hover;
  }

  .option-icon {
    font-size: 32px;
  }

  h4 {
    font-size: 15px;
    font-weight: 600;
  }

  p {
    font-size: 12px;
    color: $text-secondary;
  }
}

// 骨架屏样式
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.icons-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  padding: 16px;

  .skeleton-icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);

    .skeleton-emoji {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }

    .skeleton-name {
      width: 70%;
      height: 12px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }

    .skeleton-type {
      width: 40%;
      height: 10px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }
  }
}
</style>
