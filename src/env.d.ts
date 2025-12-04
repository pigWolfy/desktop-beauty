/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface OrganizeOptions {
  sortBy?: 'name' | 'type' | 'date' | 'size'
  groupBy?: 'type' | 'none'
  layout?: 'grid' | 'list'
}

interface AppInfo {
  name: string
  path: string
  icon?: string
}

interface AutoChangeConfig {
  enabled: boolean
  interval: number
  intervalUnit: 'minutes' | 'hours' | 'days'
  intervalValue: number
  resolution: string
  categories: string[]
}

interface AutoWallpaperStatus {
  enabled: boolean
  lastChangeTime: number | null
  lastWallpaper: any | null
  nextChangeIn: number | null
}

interface ElectronAPI {
  // 设置管理
  getAppSettings: () => Promise<any>
  setAppSettings: (settings: any) => Promise<void>

  // 窗口控制
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  openMainWindow: () => void

  // 桌面图标管理
  getDesktopIcons: () => Promise<any[]>
  organizeDesktop: (options?: OrganizeOptions) => Promise<boolean>
  hideDesktopIcons: () => Promise<boolean>
  showDesktopIcons: () => Promise<boolean>
  createIconGroup: (name: string, icons: string[]) => Promise<boolean>

  // 壁纸管理
  getWallpapers: () => Promise<any[]>
  setWallpaper: (path: string) => Promise<boolean>
  nextWallpaper: () => Promise<boolean>
  addWallpaper: (path?: string) => Promise<string | null>
  removeWallpaper: (path: string) => Promise<boolean>
  startWallpaperSlideshow: (interval: number) => Promise<boolean>
  stopWallpaperSlideshow: () => Promise<void>

  // 自动更换壁纸
  autoWallpaperGetConfig: () => Promise<AutoChangeConfig>
  autoWallpaperSaveConfig: (config: AutoChangeConfig) => Promise<void>
  autoWallpaperGetStatus: () => Promise<AutoWallpaperStatus>
  autoWallpaperChangeNow: () => Promise<boolean>

  // 系统监控
  getSystemInfo: () => Promise<any>
  getCpuUsage: () => Promise<any>
  getMemoryUsage: () => Promise<any>
  getDiskUsage: () => Promise<any>
  getNetworkStats: () => Promise<any>

  // 应用启动器
  getInstalledApps: () => Promise<AppInfo[]>
  launchApp: (path: string) => Promise<boolean>
  searchApps: (query: string) => Promise<AppInfo[]>
  addFavoriteApp: (app: AppInfo) => Promise<void>
  removeFavoriteApp: (appPath: string) => Promise<void>
  getFavoriteApps: () => Promise<AppInfo[]>

  // 事件监听
  onToggleLauncher: (callback: () => void) => () => void

  // 打开外部链接
  openExternal: (url: string) => void
  openPath: (path: string) => void

  // 遥测
  trackEvent: (category: string, action: string, label?: string, value?: number) => void
  trackPage: (path: string) => void

  // 更新
  checkForUpdate: () => Promise<any>
  downloadUpdate: () => Promise<any>
  quitAndInstall: () => Promise<void>
  onUpdateMessage: (callback: (event: any, message: any) => void) => void
  onUpdateAvailable: (callback: (event: any, info: any) => void) => void
  onUpdateProgress: (callback: (event: any, progress: any) => void) => void
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => void
  onUpdateError: (callback: (event: any, error: any) => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
