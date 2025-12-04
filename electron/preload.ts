import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 设置管理
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSettings: (settings: any) => ipcRenderer.invoke('set-app-settings', settings),

  // 窗口控制
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  openMainWindow: () => ipcRenderer.send('open-main-window'),

  // 桌面图标管理
  getDesktopIcons: () => ipcRenderer.invoke('get-desktop-icons'),
  organizeDesktop: (options?: OrganizeOptions) => ipcRenderer.invoke('organize-desktop', options),
  hideDesktopIcons: () => ipcRenderer.invoke('hide-desktop-icons'),
  showDesktopIcons: () => ipcRenderer.invoke('show-desktop-icons'),
  getIconsHiddenState: () => ipcRenderer.invoke('get-icons-hidden-state'),
  createIconGroup: (name: string, icons: string[]) => ipcRenderer.invoke('create-icon-group', name, icons),

  // 壁纸管理
  getWallpapers: () => ipcRenderer.invoke('get-wallpapers'),
  setWallpaper: (path: string) => ipcRenderer.invoke('set-wallpaper', path),
  nextWallpaper: () => ipcRenderer.invoke('next-wallpaper'),
  addWallpaper: (path: string) => ipcRenderer.invoke('add-wallpaper', path),
  removeWallpaper: (path: string) => ipcRenderer.invoke('remove-wallpaper', path),
  removeAllWallpapers: () => ipcRenderer.invoke('remove-all-wallpapers'),
  startWallpaperSlideshow: (interval: number) => ipcRenderer.invoke('start-wallpaper-slideshow', interval),
  stopWallpaperSlideshow: () => ipcRenderer.invoke('stop-wallpaper-slideshow'),
  getWallpaperSlideshowStatus: () => ipcRenderer.invoke('get-wallpaper-slideshow-status'),
  getLocalImage: (path: string) => ipcRenderer.invoke('get-local-image', path),

  // 动态壁纸
  liveWallpaperStart: (config: LiveWallpaperConfig) => ipcRenderer.invoke('live-wallpaper-start', config),
  liveWallpaperStop: () => ipcRenderer.invoke('live-wallpaper-stop'),
  liveWallpaperPause: () => ipcRenderer.invoke('live-wallpaper-pause'),
  liveWallpaperResume: () => ipcRenderer.invoke('live-wallpaper-resume'),
  liveWallpaperSetVolume: (volume: number) => ipcRenderer.invoke('live-wallpaper-set-volume', volume),
  liveWallpaperSetPlaybackRate: (rate: number) => ipcRenderer.invoke('live-wallpaper-set-playback-rate', rate),
  liveWallpaperIsActive: () => ipcRenderer.invoke('live-wallpaper-is-active'),
  liveWallpaperGetConfig: () => ipcRenderer.invoke('live-wallpaper-get-config'),

  // 在线壁纸
  onlineWallpaperSearch: (options?: SearchOptions) => ipcRenderer.invoke('online-wallpaper-search', options),
  onlineWallpaperSearchUnsplash: (options?: SearchOptions) => ipcRenderer.invoke('online-wallpaper-search-unsplash', options),
  onlineWallpaperSearchPexels: (options?: SearchOptions) => ipcRenderer.invoke('online-wallpaper-search-pexels', options),
  onlineWallpaperGetPopular: () => ipcRenderer.invoke('online-wallpaper-get-popular'),
  onlineWallpaperGetCategories: () => ipcRenderer.invoke('online-wallpaper-get-categories'),
  onlineWallpaperGetCategory: (category: string, page?: number) => ipcRenderer.invoke('online-wallpaper-get-category', category, page),
  // 免费壁纸源
  onlineWallpaperGetBing: () => ipcRenderer.invoke('online-wallpaper-get-bing'),
  onlineWallpaperGetWallhaven: (options?: SearchOptions) => ipcRenderer.invoke('online-wallpaper-get-wallhaven', options),
  onlineWallpaperGetPicsum: (page?: number, perPage?: number) => ipcRenderer.invoke('online-wallpaper-get-picsum', page, perPage),
  onlineWallpaperGetForResolution: (options?: SearchOptions) => ipcRenderer.invoke('online-wallpaper-get-for-resolution', options),
  getScreenInfo: () => ipcRenderer.invoke('get-screen-info'),
  onlineWallpaperDownload: (downloadUrl: string) => ipcRenderer.invoke('online-wallpaper-download', downloadUrl),
  onlineWallpaperDownloadAndApply: (downloadUrl: string) => ipcRenderer.invoke('online-wallpaper-download-and-apply', downloadUrl),
  onlineWallpaperSetUnsplashKey: (key: string) => ipcRenderer.invoke('online-wallpaper-set-unsplash-key', key),
  onlineWallpaperSetPexelsKey: (key: string) => ipcRenderer.invoke('online-wallpaper-set-pexels-key', key),
  onlineWallpaperHasKeys: () => ipcRenderer.invoke('online-wallpaper-has-keys'),
  onlineWallpaperGetFavorites: () => ipcRenderer.invoke('online-wallpaper-get-favorites'),
  onlineWallpaperAddFavorite: (wallpaper: WallpaperItem) => ipcRenderer.invoke('online-wallpaper-add-favorite', wallpaper),
  onlineWallpaperRemoveFavorite: (id: string) => ipcRenderer.invoke('online-wallpaper-remove-favorite', id),
  onlineWallpaperIsFavorite: (id: string) => ipcRenderer.invoke('online-wallpaper-is-favorite', id),
  onlineWallpaperGetHistory: () => ipcRenderer.invoke('online-wallpaper-get-history'),
  onlineWallpaperAddHistory: (wallpaper: WallpaperItem) => ipcRenderer.invoke('online-wallpaper-add-history', wallpaper),
  onlineWallpaperClearHistory: () => ipcRenderer.invoke('online-wallpaper-clear-history'),

  // 自动更换壁纸
  autoWallpaperGetConfig: () => ipcRenderer.invoke('auto-wallpaper-get-config'),
  autoWallpaperSaveConfig: (config: any) => ipcRenderer.invoke('auto-wallpaper-save-config', config),
  autoWallpaperGetStatus: () => ipcRenderer.invoke('auto-wallpaper-get-status'),
  autoWallpaperChangeNow: () => ipcRenderer.invoke('auto-wallpaper-change-now'),

  // 系统监控
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),
  getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
  getDiskUsage: () => ipcRenderer.invoke('get-disk-usage'),
  getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),

  // 遥测
  trackEvent: (category: string, action: string, label?: string, value?: number) => 
    ipcRenderer.send('telemetry-event', { category, action, label, value }),
  trackPage: (path: string) => ipcRenderer.send('telemetry-page', path),

  // 更新
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateMessage: (callback: (event: any, message: any) => void) => ipcRenderer.on('update-message', callback),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => ipcRenderer.on('update-available', callback),
  onUpdateProgress: (callback: (event: any, progress: any) => void) => ipcRenderer.on('update-progress', callback),
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback: (event: any, error: any) => void) => ipcRenderer.on('update-error', callback),

  // 驱动管理
  getAllDrivers: () => ipcRenderer.invoke('get-all-drivers'),
  scanDriversStreaming: () => ipcRenderer.invoke('scan-drivers-streaming'),
  onDriverScanProgress: (callback: (data: { current: number; total: number; drivers: any[] }) => void) => {
    ipcRenderer.on('driver-scan-progress', (_, data) => callback(data))
  },
  onDriverScanComplete: (callback: (data: { total: number }) => void) => {
    ipcRenderer.on('driver-scan-complete', (_, data) => callback(data))
  },
  removeDriverScanListeners: () => {
    ipcRenderer.removeAllListeners('driver-scan-progress')
    ipcRenderer.removeAllListeners('driver-scan-complete')
  },
  getProblematicDrivers: () => ipcRenderer.invoke('get-problematic-drivers'),
  getDriversByCategory: () => ipcRenderer.invoke('get-drivers-by-category'),
  getDriverStats: () => ipcRenderer.invoke('get-driver-stats'),
  checkDriverUpdates: () => ipcRenderer.invoke('check-driver-updates'),
  installDriverUpdate: (driverTitle: string) => ipcRenderer.invoke('install-driver-update', driverTitle),
  scanForHardwareChanges: () => ipcRenderer.invoke('scan-hardware-changes'),
  exportDrivers: () => ipcRenderer.invoke('export-drivers'),
  disableDevice: (deviceId: string) => ipcRenderer.invoke('disable-device', deviceId),
  enableDevice: (deviceId: string) => ipcRenderer.invoke('enable-device', deviceId),

  // CPU健康检测（Intel 13/14代缩缸问题）
  cpuHealthCheck: () => ipcRenderer.invoke('cpu-health-check'),
  getCpuInfo: () => ipcRenderer.invoke('get-cpu-info'),

  // 应用启动器
  getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
  launchApp: (path: string) => ipcRenderer.invoke('launch-app', path),
  searchApps: (query: string) => ipcRenderer.invoke('search-apps', query),
  addFavoriteApp: (app: AppInfo) => ipcRenderer.invoke('add-favorite-app', app),
  removeFavoriteApp: (appPath: string) => ipcRenderer.invoke('remove-favorite-app', appPath),
  getFavoriteApps: () => ipcRenderer.invoke('get-favorite-apps'),

  // 事件监听
  onToggleLauncher: (callback: () => void) => {
    ipcRenderer.on('toggle-launcher', callback)
    return () => ipcRenderer.removeListener('toggle-launcher', callback)
  },

  // 打开外部链接
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  openPath: (path: string) => ipcRenderer.send('open-path', path),

  // 系统信息
  getSystemArch: () => ipcRenderer.invoke('get-system-arch'),
  
  // 下载文件
  downloadFile: (options: { url: string, filename: string }) => ipcRenderer.invoke('download-file', options),
  onDownloadProgress: (callback: (data: { filename: string, progress: number, status: string, downloaded?: number, total?: number, path?: string, error?: string }) => void) => {
    ipcRenderer.on('download-progress', (_, data) => callback(data))
    return () => ipcRenderer.removeListener('download-progress', callback as any)
  }
})

// 类型定义
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

interface LiveWallpaperConfig {
  type: 'video' | 'web' | 'image'
  source: string
  volume: number
  playbackRate: number
}

interface SearchOptions {
  query?: string
  page?: number
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'squarish'
  color?: string
  resolution?: string
  minWidth?: number
  minHeight?: number
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
}
