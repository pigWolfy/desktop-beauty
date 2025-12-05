import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'

export class UpdateService {
  private mainWindow: BrowserWindow | null = null
  private isDev: boolean

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow
    this.isDev = !app.isPackaged
    this.init()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  init() {
    // 配置自动更新
    autoUpdater.autoDownload = false // 默认不自动下载，让用户决定
    autoUpdater.autoInstallOnAppQuit = true

    // 开发环境提示
    if (this.isDev) {
      console.log('[Updater] Running in development mode - update check will be simulated')
    }

    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      this.sendToWindow('update-message', { type: 'checking', message: '正在检查更新...' })
    })

    autoUpdater.on('update-available', (info) => {
      this.sendToWindow('update-available', info)
    })

    autoUpdater.on('update-not-available', () => {
      this.sendToWindow('update-message', { type: 'not-available', message: '当前已是最新版本' })
    })

    autoUpdater.on('error', (err) => {
      console.error('[Updater] Error:', err.message)
      this.sendToWindow('update-error', err.message)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToWindow('update-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.sendToWindow('update-downloaded', info)
    })

    // 注册IPC监听
    ipcMain.handle('check-for-update', async () => {
      // 开发环境下模拟检查结果
      if (this.isDev) {
        console.log('[Updater] Dev mode - simulating update check')
        this.sendToWindow('update-message', { type: 'checking', message: '正在检查更新...' })
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 开发环境显示"已是最新版本"
        this.sendToWindow('update-message', { type: 'not-available', message: '当前已是最新版本（开发模式）' })
        return { updateAvailable: false, isDev: true }
      }

      try {
        return await autoUpdater.checkForUpdates()
      } catch (err) {
        console.error('[Updater] Check failed:', err)
        this.sendToWindow('update-error', (err as Error).message)
        return null
      }
    })

    ipcMain.handle('download-update', async () => {
      if (this.isDev) {
        console.log('[Updater] Dev mode - download not available')
        this.sendToWindow('update-error', '开发模式下无法下载更新')
        return null
      }

      try {
        console.log('[Updater] Starting download...')
        return await autoUpdater.downloadUpdate()
      } catch (err) {
        console.error('[Updater] Download failed:', err)
        this.sendToWindow('update-error', (err as Error).message || '下载失败')
        return null
      }
    })

    ipcMain.handle('quit-and-install', () => {
      if (!this.isDev) {
        autoUpdater.quitAndInstall()
      }
    })
  }

  private sendToWindow(channel: string, ...args: any[]) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
    }
  }
}
