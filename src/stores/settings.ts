import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false,
    defaultSort: 'type',
    autoGroup: true,
    wallpaperSlideshow: false,
    wallpaperInterval: 30,
    monitorInterval: 2000,
    showSidebarStats: true,
    showWidget: true
  })

  const initialized = ref(false)

  async function init() {
    if (initialized.value) return
    if (window.electronAPI?.getAppSettings) {
      const saved = await window.electronAPI.getAppSettings()
      Object.assign(settings.value, saved)
      
      // Apply initial state
      if (settings.value.wallpaperSlideshow) {
        window.electronAPI?.startWallpaperSlideshow(settings.value.wallpaperInterval * 60 * 1000)
      }
    }
    initialized.value = true
  }

  async function save() {
    if (window.electronAPI?.setAppSettings) {
      await window.electronAPI.setAppSettings(JSON.parse(JSON.stringify(settings.value)))
    }
  }

  // Watch for changes and save
  watch(settings, (newVal) => {
    if (initialized.value) {
      save()
      
      // Apply wallpaper slideshow settings
      if (newVal.wallpaperSlideshow) {
        window.electronAPI?.startWallpaperSlideshow(newVal.wallpaperInterval * 60 * 1000)
      } else {
        window.electronAPI?.stopWallpaperSlideshow()
      }
    }
  }, { deep: true })

  return {
    settings,
    init,
    save
  }
})
