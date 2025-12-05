import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { setLocale, type Locale } from '../i18n'

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
    showWidget: true,
    language: 'zh-CN' as Locale
  })

  const initialized = ref(false)
  let previousSettings: typeof settings.value | null = null

  async function init() {
    if (initialized.value) return
    if (window.electronAPI?.getAppSettings) {
      const saved = await window.electronAPI.getAppSettings()
      Object.assign(settings.value, saved)
      previousSettings = JSON.parse(JSON.stringify(settings.value))
      
      // Apply initial state
      if (settings.value.wallpaperSlideshow) {
        window.electronAPI?.startWallpaperSlideshow(settings.value.wallpaperInterval * 60 * 1000)
      }
      
      // Apply saved language
      if (settings.value.language) {
        setLocale(settings.value.language)
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
      
      // Track setting changes for telemetry
      if (previousSettings) {
        const keys = Object.keys(newVal) as (keyof typeof newVal)[]
        for (const key of keys) {
          if (newVal[key] !== previousSettings[key]) {
            window.electronAPI?.trackSettings(key, previousSettings[key], newVal[key])
          }
        }
      }
      previousSettings = JSON.parse(JSON.stringify(newVal))
      
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
