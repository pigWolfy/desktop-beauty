import Store from 'electron-store'
import { app } from 'electron'

interface AppSettings {
  autoStart: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  defaultSort: 'name' | 'type' | 'date' | 'size'
  autoGroup: boolean
  monitorInterval: number
  showSidebarStats: boolean
  showWidget: boolean
}

const defaultSettings: AppSettings = {
  autoStart: false,
  minimizeToTray: true,
  startMinimized: false,
  defaultSort: 'type',
  autoGroup: true,
  monitorInterval: 2000,
  showSidebarStats: true,
  showWidget: true
}

export class SettingsManager {
  private store: Store<AppSettings>

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'app-settings',
      defaults: defaultSettings
    })
  }

  getSettings(): AppSettings {
    return this.store.store
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key)
  }

  setSettings(settings: Partial<AppSettings>): void {
    this.store.set(settings)
    this.applySettings(settings)
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value)
    this.applySettings({ [key]: value })
  }

  private applySettings(settings: Partial<AppSettings>): void {
    // 应用开机自启动设置
    if (settings.autoStart !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: settings.autoStart,
        path: app.getPath('exe')
      })
    }
  }
}
