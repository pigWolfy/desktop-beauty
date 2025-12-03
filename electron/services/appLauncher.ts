import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { readdir } from 'fs/promises'
import { join, basename } from 'path'
import { app } from 'electron'
import Store from 'electron-store'

const execAsync = promisify(exec)

interface AppInfo {
  name: string
  path: string
  icon?: string
  category?: string
}

export class AppLauncher {
  private store: Store
  private appsCache: AppInfo[] = []
  private cacheTime: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  constructor() {
    this.store = new Store({ name: 'app-launcher' })
  }

  async getInstalledApps(): Promise<AppInfo[]> {
    // 检查缓存
    if (this.appsCache.length > 0 && Date.now() - this.cacheTime < this.CACHE_DURATION) {
      return this.appsCache
    }

    const apps: AppInfo[] = []

    try {
      // 扫描开始菜单
      const startMenuPaths = [
        join(process.env.PROGRAMDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs'),
        join(app.getPath('home'), 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs')
      ]

      for (const menuPath of startMenuPaths) {
        await this.scanDirectory(menuPath, apps)
      }

      // 扫描桌面快捷方式
      const desktopPath = join(app.getPath('home'), 'Desktop')
      await this.scanDirectory(desktopPath, apps, false)

      // 去重
      const uniqueApps = apps.reduce((acc: AppInfo[], app) => {
        if (!acc.find(a => a.name === app.name)) {
          acc.push(app)
        }
        return acc
      }, [])

      // 按名称排序
      uniqueApps.sort((a, b) => a.name.localeCompare(b.name))

      this.appsCache = uniqueApps
      this.cacheTime = Date.now()

      return uniqueApps
    } catch (error) {
      console.error('Failed to get installed apps:', error)
      return []
    }
  }

  private async scanDirectory(dirPath: string, apps: AppInfo[], recursive: boolean = true): Promise<void> {
    try {
      const files = await readdir(dirPath, { withFileTypes: true })

      for (const file of files) {
        const fullPath = join(dirPath, file.name)

        if (file.isDirectory() && recursive) {
          await this.scanDirectory(fullPath, apps, true)
        } else if (file.name.endsWith('.lnk') || file.name.endsWith('.exe')) {
          const name = basename(file.name, file.name.endsWith('.lnk') ? '.lnk' : '.exe')
          
          // 过滤掉一些系统程序和卸载程序
          if (!name.toLowerCase().includes('uninstall') && 
              !name.toLowerCase().includes('卸载') &&
              !name.toLowerCase().includes('readme') &&
              !name.toLowerCase().includes('help')) {
            apps.push({
              name,
              path: fullPath
            })
          }
        }
      }
    } catch (error) {
      // 目录不存在或无权访问
    }
  }

  async launchApp(appPath: string): Promise<boolean> {
    try {
      // 使用 spawn 启动应用，不等待其退出
      spawn('cmd', ['/c', 'start', '', appPath], {
        detached: true,
        stdio: 'ignore'
      }).unref()

      // 记录最近使用
      this.addToRecent(appPath)

      return true
    } catch (error) {
      console.error('Failed to launch app:', error)
      return false
    }
  }

  async searchApps(query: string): Promise<AppInfo[]> {
    if (!query || query.length < 1) {
      return this.getFavorites()
    }

    const apps = await this.getInstalledApps()
    const lowerQuery = query.toLowerCase()

    return apps.filter(app => 
      app.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10)
  }

  addFavorite(app: AppInfo): void {
    const favorites = this.getFavorites()
    if (!favorites.find(f => f.path === app.path)) {
      favorites.push(app)
      this.store.set('favorites', favorites)
    }
  }

  removeFavorite(appPath: string): void {
    const favorites = this.getFavorites()
    const updated = favorites.filter(f => f.path !== appPath)
    this.store.set('favorites', updated)
  }

  getFavorites(): AppInfo[] {
    return this.store.get('favorites', []) as AppInfo[]
  }

  private addToRecent(appPath: string): void {
    const recent = this.store.get('recent', []) as string[]
    const updated = [appPath, ...recent.filter(p => p !== appPath)].slice(0, 10)
    this.store.set('recent', updated)
  }

  getRecent(): string[] {
    return this.store.get('recent', []) as string[]
  }

  clearRecent(): void {
    this.store.set('recent', [])
  }
}
