<template>
  <div class="widget-container">
    <div class="widget-bar">
      <div class="drag-handle" :title="t('widget.dragToMove')">
        <span class="drag-icon">⋮⋮</span>
      </div>
      
      <button class="widget-btn" @click="nextWallpaper" :title="t('widget.switchWallpaper')" :disabled="isSwitching">
        <span class="icon" :class="{ 'spin': isSwitching }">🖼️</span>
      </button>
      
      <button class="widget-btn" @click="organizeDesktop" :title="t('widget.organizeDesktop')" :disabled="isOrganizing">
        <span class="icon" :class="{ 'sweep': isOrganizing }">🧹</span>
      </button>
      
      <button class="widget-btn" @click="openMain" :title="t('widget.openMain')">
        <span class="icon hover-bounce">🏠</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const isSwitching = ref(false)
const isOrganizing = ref(false)

const nextWallpaper = async () => {
  if (isSwitching.value) return
  isSwitching.value = true
  
  // 至少播放 800ms 动画，让交互更明显
  const minTime = new Promise(resolve => setTimeout(resolve, 800))
  
  try {
    await Promise.all([
      window.electronAPI?.nextWallpaper(),
      minTime
    ])
  } catch (e) {
    console.error(e)
  } finally {
    isSwitching.value = false
  }
}

const organizeDesktop = async () => {
  if (isOrganizing.value) return
  isOrganizing.value = true
  
  const minTime = new Promise(resolve => setTimeout(resolve, 800))

  try {
    // Get settings first to know how to organize
    const settings = await window.electronAPI?.getAppSettings()
    await Promise.all([
      window.electronAPI?.organizeDesktop({
        sortBy: settings?.defaultSort || 'type',
        groupBy: settings?.autoGroup ? 'type' : 'none'
      }),
      minTime
    ])
  } catch (e) {
    console.error(e)
  } finally {
    isOrganizing.value = false
  }
}

const openMain = () => {
  window.electronAPI?.openMainWindow()
}

</script>

<style lang="scss" scoped>
.widget-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  user-select: none;
  overflow: hidden;
}

.widget-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(26, 26, 46, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(26, 26, 46, 0.7);
    transform: scale(1.02);
  }
}

.drag-handle {
  cursor: move;
  padding: 0 4px;
  color: rgba(255, 255, 255, 0.3);
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  
  .drag-icon {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: -1px;
  }
  
  &:hover {
    color: rgba(255, 255, 255, 0.8);
  }
}

.widget-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  .icon {
    font-size: 16px;
    display: inline-block;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes sweep {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-25deg); }
  50% { transform: rotate(10deg); }
  75% { transform: rotate(-5deg); }
  100% { transform: rotate(0deg); }
}

.sweep {
  animation: sweep 0.8s ease-in-out infinite;
}

.hover-bounce {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.widget-btn:hover .hover-bounce {
  transform: scale(1.2);
}
</style>
