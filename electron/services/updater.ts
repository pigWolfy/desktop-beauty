import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'

export class UpdateService {
  private mainWindow: BrowserWindow | null = null

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow
    this.init()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  init() {
    // 配置自动更新
    autoUpdater.autoDownload = false // 默认不自动下载，让用户决定
    autoUpdater.autoInstallOnAppQuit = true

    // 开发环境下调试配置（可选）
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true
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
      this.sendToWindow('update-error', err.message)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToWindow('update-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.sendToWindow('update-downloaded', info)
    })

    // 注册IPC监听
    ipcMain.handle('check-for-update', () => {
      autoUpdater.checkForUpdates()
    })

    ipcMain.handle('download-update', () => {
      autoUpdater.downloadUpdate()
    })

    ipcMain.handle('quit-and-install', () => {
      autoUpdater.quitAndInstall()
    })
  }

  private sendToWindow(channel: string, ...args: any[]) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
    }
  }
}
