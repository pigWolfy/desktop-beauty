<template>
  <div class="widget-container">
    <div class="widget-bar">
      <div class="drag-handle" title="按住拖动">
        <span class="drag-icon">⋮⋮</span>
      </div>
      
      <button class="widget-btn" @click="nextWallpaper" title="切换壁纸">
        <span class="icon">🖼️</span>
      </button>
      
      <button class="widget-btn" @click="organizeDesktop" title="整理桌面">
        <span class="icon">🧹</span>
      </button>
      
      <button class="widget-btn" @click="openMain" title="打开主界面">
        <span class="icon">🏠</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const nextWallpaper = async () => {
  await window.electronAPI?.nextWallpaper()
}

const organizeDesktop = async () => {
  // Get settings first to know how to organize
  const settings = await window.electronAPI?.getAppSettings()
  await window.electronAPI?.organizeDesktop({
    sortBy: settings?.defaultSort || 'type',
    groupBy: settings?.autoGroup ? 'type' : 'none'
  })
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
  }
}
</style>
