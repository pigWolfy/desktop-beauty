import { app, BrowserWindow, ipcMain, shell, globalShortcut, Tray, Menu, nativeImage, dialog, screen, protocol, net } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import { DesktopManager } from './services/desktopManager'
import { WallpaperManager } from './services/wallpaperManager'
import { SystemMonitor } from './services/systemMonitor'
import { AppLauncher } from './services/appLauncher'
import { LiveWallpaperManager } from './services/liveWallpaper'
import { OnlineWallpaperService, AutoWallpaperService } from './services/onlineWallpaper'
import * as DriverManager from './services/driverManager'
import * as CpuHealthChecker from './services/cpuHealthChecker'
import { TelemetryService } from './services/telemetry'
import { UpdateService } from './services/updater'

// Vite 开发服务器 URL（由 vite-plugin-electron 注入）
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 服务实例
const desktopManager = new DesktopManager()
const wallpaperManager = new WallpaperManager()
const systemMonitor = new SystemMonitor()
const appLauncher = new AppLauncher()
const liveWallpaperManager = new LiveWallpaperManager()
const onlineWallpaperService = new OnlineWallpaperService()
const autoWallpaperService = new AutoWallpaperService(onlineWallpaperService)
const telemetryService = new TelemetryService()
let updateService: UpdateService | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    icon: join(__dirname, '../../public/icon.png')
  })

  // 开发环境加载本地服务，生产环境加载打包文件
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../index.html'))
  }

  // 初始化更新服务
  updateService = new UpdateService(mainWindow)

  // 记录应用启动
  telemetryService.trackEvent('App', 'Start')

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(join(__dirname, '../../public/icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => mainWindow?.show() },
    { label: '整理桌面', click: () => desktopManager.organizeDesktop() },
    { label: '切换壁纸', click: () => wallpaperManager.nextWallpaper() },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('Desktop Beauty')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow?.show())
}

function registerShortcuts() {
  // 全局快捷键：显示/隐藏主窗口
  globalShortcut.register('Alt+D', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
    }
  })

  // 快速启动器
  globalShortcut.register('Alt+Space', () => {
    mainWindow?.webContents.send('toggle-launcher')
    mainWindow?.show()
  })
}

// 下载并应用壁纸的辅助函数（供自动更换服务使用）
async function downloadAndApplyWallpaper(downloadUrl: string): Promise<string | null> {
  try {
    const wallpapersDir = join(app.getPath('userData'), 'wallpapers')
    
    // 确保目录存在
    if (!existsSync(wallpapersDir)) {
      const fs = await import('fs')
      fs.mkdirSync(wallpapersDir, { recursive: true })
    }
    
    // 下载壁纸
    const filePath = await onlineWallpaperService.downloadWallpaper(downloadUrl, wallpapersDir)
    
    // 应用壁纸
    if (filePath) {
      const success = await wallpaperManager.setWallpaper(filePath)
      return success ? filePath : null
    }
    return null
  } catch (error) {
    console.error('Download and apply failed:', error)
    return null
  }
}

function setupIPC() {
  // 窗口控制
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow?.hide())

  // 桌面图标管理
  ipcMain.handle('get-desktop-icons', () => desktopManager.getDesktopIcons())
  ipcMain.handle('organize-desktop', (_, options) => desktopManager.organizeDesktop(options))
  ipcMain.handle('hide-desktop-icons', () => desktopManager.hideIcons())
  ipcMain.handle('show-desktop-icons', () => desktopManager.showIcons())
  ipcMain.handle('get-icons-hidden-state', () => desktopManager.getIconsHiddenState())
  ipcMain.handle('create-icon-group', (_, name, icons) => desktopManager.createGroup(name, icons))

  // 壁纸管理
  ipcMain.handle('get-wallpapers', () => wallpaperManager.getWallpapers())
  ipcMain.handle('set-wallpaper', (_, path) => wallpaperManager.setWallpaper(path))
  ipcMain.handle('add-wallpaper', (_, path) => wallpaperManager.addWallpaper(path))
  ipcMain.handle('remove-wallpaper', (_, path) => wallpaperManager.removeWallpaper(path))
  ipcMain.handle('start-wallpaper-slideshow', (_, interval) => wallpaperManager.startSlideshow(interval))
  ipcMain.handle('stop-wallpaper-slideshow', () => wallpaperManager.stopSlideshow())

  // 系统监控
  ipcMain.handle('get-system-info', () => systemMonitor.getSystemInfo())
  ipcMain.handle('get-cpu-usage', () => systemMonitor.getCpuUsage())
  ipcMain.handle('get-memory-usage', () => systemMonitor.getMemoryUsage())
  ipcMain.handle('get-disk-usage', () => systemMonitor.getDiskUsage())
  ipcMain.handle('get-network-stats', () => systemMonitor.getNetworkStats())

  // 驱动管理
  ipcMain.handle('get-all-drivers', async () => {
    try {
      const data = await DriverManager.getAllDrivers()
      return { success: true, data }
    } catch (error: any) {
      console.error('获取驱动列表失败:', error)
      return { success: false, error: error.message || '获取驱动列表失败' }
    }
  })
  ipcMain.handle('scan-drivers-streaming', async () => {
    try {
      await DriverManager.scanDriversStreaming()
      return { success: true }
    } catch (error: any) {
      console.error('流式扫描驱动失败:', error)
      return { success: false, error: error.message || '扫描失败' }
    }
  })
  ipcMain.handle('get-problematic-drivers', async () => {
    try {
      const data = await DriverManager.getProblematicDrivers()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('get-drivers-by-category', async () => {
    try {
      const data = await DriverManager.getDriversByCategory()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('get-driver-stats', async () => {
    try {
      const data = await DriverManager.getDriverStats()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('check-driver-updates', async () => {
    try {
      const data = await DriverManager.checkDriverUpdates()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('install-driver-update', async (_, driverTitle) => {
    try {
      const result = await DriverManager.installDriverUpdate(driverTitle)
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('scan-hardware-changes', async () => {
    try {
      const result = await DriverManager.scanForHardwareChanges()
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('export-drivers', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: '选择驱动备份保存位置'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return DriverManager.exportDrivers(result.filePaths[0])
    }
    return { success: false, message: '已取消' }
  })
  ipcMain.handle('disable-device', (_, deviceId) => DriverManager.disableDevice(deviceId))
  ipcMain.handle('enable-device', (_, deviceId) => DriverManager.enableDevice(deviceId))

  // CPU健康检测（Intel 13/14代缩缸问题）
  ipcMain.handle('cpu-health-check', async () => {
    try {
      const report = await CpuHealthChecker.runCpuHealthCheck()
      return { success: true, data: report }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
  ipcMain.handle('get-cpu-info', async () => {
    try {
      const data = await CpuHealthChecker.getCpuInfo()
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 应用启动器
  ipcMain.handle('get-installed-apps', () => appLauncher.getInstalledApps())
  ipcMain.handle('launch-app', (_, path) => appLauncher.launchApp(path))
  ipcMain.handle('search-apps', (_, query) => appLauncher.searchApps(query))
  ipcMain.handle('add-favorite-app', (_, app) => appLauncher.addFavorite(app))
  ipcMain.handle('remove-favorite-app', (_, appPath) => appLauncher.removeFavorite(appPath))
  ipcMain.handle('get-favorite-apps', () => appLauncher.getFavorites())

  // 动态壁纸
  ipcMain.handle('live-wallpaper-start', (_, config) => liveWallpaperManager.start(config))
  ipcMain.handle('live-wallpaper-stop', () => liveWallpaperManager.stop())
  ipcMain.handle('live-wallpaper-pause', () => liveWallpaperManager.pause())
  ipcMain.handle('live-wallpaper-resume', () => liveWallpaperManager.resume())
  ipcMain.handle('live-wallpaper-set-volume', (_, volume) => liveWallpaperManager.setVolume(volume))
  ipcMain.handle('live-wallpaper-set-playback-rate', (_, rate) => liveWallpaperManager.setPlaybackRate(rate))
  ipcMain.handle('live-wallpaper-is-active', () => liveWallpaperManager.isActive())
  ipcMain.handle('live-wallpaper-get-config', () => liveWallpaperManager.getCurrentConfig())

  // 在线壁纸
  ipcMain.handle('online-wallpaper-search', (_, options) => onlineWallpaperService.search(options))
  ipcMain.handle('online-wallpaper-search-unsplash', (_, options) => onlineWallpaperService.searchUnsplash(options))
  ipcMain.handle('online-wallpaper-search-pexels', (_, options) => onlineWallpaperService.searchPexels(options))
  ipcMain.handle('online-wallpaper-get-popular', () => onlineWallpaperService.getPopular())
  ipcMain.handle('online-wallpaper-get-categories', () => onlineWallpaperService.getCategories())
  ipcMain.handle('online-wallpaper-get-category', (_, category, page) => onlineWallpaperService.getCategoryWallpapers(category, page))
  // 免费壁纸源
  ipcMain.handle('online-wallpaper-get-bing', () => onlineWallpaperService.getBingWallpapers())
  ipcMain.handle('online-wallpaper-get-wallhaven', (_, options) => onlineWallpaperService.getWallhavenWallpapers(options))
  ipcMain.handle('online-wallpaper-get-picsum', (_, page, perPage) => onlineWallpaperService.getPicsumWallpapers(page, perPage))
  
  // 获取屏幕信息（使用实际物理分辨率）
  ipcMain.handle('get-screen-info', () => {
    const primaryDisplay = screen.getPrimaryDisplay()
    const allDisplays = screen.getAllDisplays()
    // 计算实际物理分辨率 = 逻辑分辨率 × 缩放比例
    const physicalWidth = Math.round(primaryDisplay.size.width * primaryDisplay.scaleFactor)
    const physicalHeight = Math.round(primaryDisplay.size.height * primaryDisplay.scaleFactor)
    return {
      primary: {
        width: physicalWidth,
        height: physicalHeight,
        logicalWidth: primaryDisplay.size.width,
        logicalHeight: primaryDisplay.size.height,
        scaleFactor: primaryDisplay.scaleFactor
      },
      all: allDisplays.map(d => ({
        id: d.id,
        width: Math.round(d.size.width * d.scaleFactor),
        height: Math.round(d.size.height * d.scaleFactor),
        logicalWidth: d.size.width,
        logicalHeight: d.size.height,
        scaleFactor: d.scaleFactor,
        bounds: d.bounds
      }))
    }
  })
  
  // 获取适配分辨率的壁纸（使用实际物理分辨率）
  ipcMain.handle('online-wallpaper-get-for-resolution', async (_, options) => {
    const primaryDisplay = screen.getPrimaryDisplay()
    // 计算实际物理分辨率
    const width = Math.round(primaryDisplay.size.width * primaryDisplay.scaleFactor)
    const height = Math.round(primaryDisplay.size.height * primaryDisplay.scaleFactor)
    return onlineWallpaperService.getWallpapersForResolution(width, height, options)
  })
  
  // 下载壁纸到用户选择的目录
  ipcMain.handle('online-wallpaper-download', async (_, downloadUrl) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: '选择保存位置'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return onlineWallpaperService.downloadWallpaper(downloadUrl, result.filePaths[0])
    }
    return null
  })
  
  // 下载壁纸并直接应用（下载到应用数据目录）
  ipcMain.handle('online-wallpaper-download-and-apply', async (_, downloadUrl) => {
    try {
      const { join } = await import('path')
      const wallpapersDir = join(app.getPath('userData'), 'wallpapers')
      
      // 确保目录存在
      const fs = await import('fs')
      if (!fs.existsSync(wallpapersDir)) {
        fs.mkdirSync(wallpapersDir, { recursive: true })
      }
      
      // 下载壁纸
      const filePath = await onlineWallpaperService.downloadWallpaper(downloadUrl, wallpapersDir)
      
      // 应用壁纸
      if (filePath) {
        const success = await wallpaperManager.setWallpaper(filePath)
        return success ? filePath : null
      }
      return null
    } catch (error) {
      console.error('Download and apply failed:', error)
      return null
    }
  })
  ipcMain.handle('online-wallpaper-set-unsplash-key', (_, key) => onlineWallpaperService.setUnsplashApiKey(key))
  ipcMain.handle('online-wallpaper-set-pexels-key', (_, key) => onlineWallpaperService.setPexelsApiKey(key))
  ipcMain.handle('online-wallpaper-has-keys', () => onlineWallpaperService.hasApiKeys())
  ipcMain.handle('online-wallpaper-get-favorites', () => onlineWallpaperService.getFavorites())
  ipcMain.handle('online-wallpaper-add-favorite', (_, wallpaper) => onlineWallpaperService.addFavorite(wallpaper))
  ipcMain.handle('online-wallpaper-remove-favorite', (_, id) => onlineWallpaperService.removeFavorite(id))
  ipcMain.handle('online-wallpaper-is-favorite', (_, id) => onlineWallpaperService.isFavorite(id))
  ipcMain.handle('online-wallpaper-get-history', () => onlineWallpaperService.getHistory())
  ipcMain.handle('online-wallpaper-add-history', (_, wallpaper) => onlineWallpaperService.addToHistory(wallpaper))
  ipcMain.handle('online-wallpaper-clear-history', () => onlineWallpaperService.clearHistory())

  // 自动更换壁纸
  ipcMain.handle('auto-wallpaper-get-config', () => autoWallpaperService.getConfig())
  ipcMain.handle('auto-wallpaper-save-config', (_, config) => autoWallpaperService.saveConfig(config))
  ipcMain.handle('auto-wallpaper-get-status', () => autoWallpaperService.getStatus())
  ipcMain.handle('auto-wallpaper-change-now', () => autoWallpaperService.changeWallpaper())

  // 遥测相关
  ipcMain.on('telemetry-event', (_, { category, action, label, value }) => {
    telemetryService.trackEvent(category, action, label, value)
  })
  ipcMain.on('telemetry-page', (_, path) => {
    telemetryService.trackPage(path)
  })

  // 打开外部链接
  ipcMain.on('open-external', (_, url) => shell.openExternal(url))
  ipcMain.on('open-path', (_, path) => shell.openPath(path))

  // 获取系统架构
  ipcMain.handle('get-system-arch', () => {
    return process.arch // 'x64', 'ia32', 'arm64' 等
  })

  // 下载文件
  ipcMain.handle('download-file', async (event, options: { url: string, filename: string }) => {
    try {
      const { url, filename } = options
      
      // 选择保存位置，默认下载目录
      const downloadsPath = app.getPath('downloads')
      const result = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: join(downloadsPath, filename),
        filters: [
          { name: '可执行文件', extensions: ['exe', 'msi', 'zip'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })
      
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      const savePath = result.filePath

      // 发送下载开始事件
      mainWindow?.webContents.send('download-progress', { 
        filename, 
        progress: 0, 
        status: 'starting' 
      })

      // 使用 https/http 模块下载
      const https = await import('https')
      const http = await import('http')
      const urlModule = await import('url')
      
      const downloadWithRedirect = (downloadUrl: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const parsedUrl = new URL(downloadUrl)
          const client = parsedUrl.protocol === 'https:' ? https : http
          
          const request = client.get(downloadUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }, (response) => {
            // 处理重定向
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              downloadWithRedirect(response.headers.location).then(resolve).catch(reject)
              return
            }

            if (response.statusCode !== 200) {
              reject(new Error(`下载失败: HTTP ${response.statusCode}`))
              return
            }

            const totalSize = parseInt(response.headers['content-length'] || '0', 10)
            let downloadedSize = 0

            const fileStream = createWriteStream(savePath)
            
            response.on('data', (chunk) => {
              downloadedSize += chunk.length
              const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0
              mainWindow?.webContents.send('download-progress', { 
                filename, 
                progress,
                downloaded: downloadedSize,
                total: totalSize,
                status: 'downloading' 
              })
            })

            response.pipe(fileStream)

            fileStream.on('finish', () => {
              fileStream.close()
              mainWindow?.webContents.send('download-progress', { 
                filename, 
                progress: 100, 
                status: 'completed',
                path: savePath
              })
              resolve()
            })

            fileStream.on('error', (err) => {
              fileStream.close()
              reject(err)
            })
          })

          request.on('error', reject)
        })
      }

      await downloadWithRedirect(url)
      
      return { success: true, path: savePath }
    } catch (error: any) {
      mainWindow?.webContents.send('download-progress', { 
        filename: options.filename, 
        progress: 0, 
        status: 'error',
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  })
  
  // 获取本地图片的 base64 数据（用于显示本地壁纸缩略图）
  ipcMain.handle('get-local-image', async (_, imagePath: string) => {
    try {
      if (!existsSync(imagePath)) {
        return null
      }
      const data = await readFile(imagePath)
      const ext = imagePath.toLowerCase().split('.').pop()
      const mimeType = ext === 'png' ? 'image/png' 
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : ext === 'bmp' ? 'image/bmp'
        : 'image/jpeg'
      return `data:${mimeType};base64,${data.toString('base64')}`
    } catch (error) {
      console.error('Failed to read local image:', error)
      return null
    }
  })
}

// 扩展 app 类型
declare module 'electron' {
  interface App {
    isQuiting?: boolean
  }
}

// 注册自定义协议（在 app ready 之前）
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } }
])

app.whenReady().then(() => {
  // 注册 local-file 协议处理本地文件
  protocol.handle('local-file', async (request) => {
    try {
      // URL 格式: local-file://E:/path/to/file.jpg
      const filePath = decodeURIComponent(request.url.replace('local-file://', ''))
      return net.fetch('file://' + filePath)
    } catch (error) {
      console.error('Protocol handler error:', error)
      return new Response('File not found', { status: 404 })
    }
  })
  
  createWindow()
  createTray()
  registerShortcuts()
  setupIPC()
  
  // 初始化自动壁纸服务
  autoWallpaperService.setWallpaperSetter(async (url: string) => {
    return await downloadAndApplyWallpaper(url)
  })
  autoWallpaperService.init()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  systemMonitor.stopMonitoring()
  liveWallpaperManager.stop()
})
