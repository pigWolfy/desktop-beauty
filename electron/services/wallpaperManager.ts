import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, copyFile, unlink, stat } from 'fs/promises'
import { join, extname } from 'path'
import { app, dialog } from 'electron'
import Store from 'electron-store'

const execAsync = promisify(exec)

interface Wallpaper {
  path: string
  name: string
  thumbnail?: string
}

export class WallpaperManager {
  private store: Store
  private wallpapersDir: string
  private slideshowInterval: NodeJS.Timeout | null = null
  private currentIndex: number = 0

  constructor() {
    this.store = new Store({ name: 'wallpaper-manager' })
    this.wallpapersDir = join(app.getPath('userData'), 'wallpapers')
    this.initWallpapersDir()
  }

  private async initWallpapersDir(): Promise<void> {
    try {
      await execAsync(`if not exist "${this.wallpapersDir}" mkdir "${this.wallpapersDir}"`)
    } catch (error) {
      console.error('Failed to create wallpapers directory:', error)
    }
  }

  async cleanupOldWallpapers(maxCount: number = 50): Promise<void> {
    try {
      const files = await readdir(this.wallpapersDir)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']
      
      const wallpaperFiles = []
      for (const file of files) {
        if (imageExtensions.includes(extname(file).toLowerCase())) {
          const filePath = join(this.wallpapersDir, file)
          const stats = await stat(filePath)
          wallpaperFiles.push({
            path: filePath,
            time: stats.mtime.getTime()
          })
        }
      }

      // Sort by time descending (newest first)
      wallpaperFiles.sort((a, b) => b.time - a.time)

      // Remove files exceeding maxCount
      if (wallpaperFiles.length > maxCount) {
        const filesToRemove = wallpaperFiles.slice(maxCount)
        for (const file of filesToRemove) {
          // Don't delete the current wallpaper
          const currentWallpaper = this.store.get('currentWallpaper')
          if (file.path !== currentWallpaper) {
             await unlink(file.path)
             console.log('Cleaned up old wallpaper:', file.path)
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup wallpapers:', error)
    }
  }

  async getWallpapers(): Promise<Wallpaper[]> {
    try {
      const files = await readdir(this.wallpapersDir)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']
      
      return files
        .filter(file => imageExtensions.includes(extname(file).toLowerCase()))
        .map(file => ({
          path: join(this.wallpapersDir, file),
          name: file
        }))
    } catch (error) {
      console.error('Failed to get wallpapers:', error)
      return []
    }
  }

  async setWallpaper(imagePath: string): Promise<boolean> {
    try {
      // 确保路径使用正确的格式
      const normalizedPath = imagePath.replace(/\//g, '\\')
      
      // 使用 PowerShell 设置壁纸 - 更可靠的方法
      const script = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
    
    public const int SPI_SETDESKWALLPAPER = 0x0014;
    public const int SPIF_UPDATEINIFILE = 0x0001;
    public const int SPIF_SENDWININICHANGE = 0x0002;
    
    public static void SetWallpaper(string path) {
        SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, path, SPIF_UPDATEINIFILE | SPIF_SENDWININICHANGE);
    }
}
'@
[Wallpaper]::SetWallpaper('${normalizedPath.replace(/'/g, "''")}')
`
      
      // 将脚本写入临时文件执行，避免命令行转义问题
      const fs = await import('fs/promises')
      const os = await import('os')
      const path = await import('path')
      const tempScript = path.join(os.tmpdir(), `set_wallpaper_${Date.now()}.ps1`)
      
      await fs.writeFile(tempScript, script, 'utf-8')
      
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`)
      
      // 清理临时文件
      try {
        await fs.unlink(tempScript)
      } catch {}
      
      this.store.set('currentWallpaper', imagePath)
      console.log('Wallpaper set successfully:', imagePath)
      return true
    } catch (error) {
      console.error('Failed to set wallpaper:', error)
      return false
    }
  }

  async addWallpaper(sourcePath?: string): Promise<string | null> {
    try {
      let filePath = sourcePath

      if (!filePath) {
        // 打开文件选择对话框
        const result = await dialog.showOpenDialog({
          title: '选择壁纸',
          filters: [
            { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'] }
          ],
          properties: ['openFile', 'multiSelections']
        })

        if (result.canceled || result.filePaths.length === 0) {
          return null
        }
        
        filePath = result.filePaths[0]
      }

      const fileName = `wallpaper_${Date.now()}${extname(filePath)}`
      const destPath = join(this.wallpapersDir, fileName)
      
      await copyFile(filePath, destPath)
      
      return destPath
    } catch (error) {
      console.error('Failed to add wallpaper:', error)
      return null
    }
  }

  async removeWallpaper(wallpaperPath: string): Promise<boolean> {
    try {
      await unlink(wallpaperPath)
      return true
    } catch (error) {
      console.error('Failed to remove wallpaper:', error)
      return false
    }
  }

  async removeAllWallpapers(): Promise<boolean> {
    try {
      const wallpapers = await this.getWallpapers()
      for (const wallpaper of wallpapers) {
        await unlink(wallpaper.path)
      }
      return true
    } catch (error) {
      console.error('Failed to remove all wallpapers:', error)
      return false
    }
  }

  // intervalMs: 间隔时间（毫秒）
  async startSlideshow(intervalMs: number = 1800000): Promise<boolean> {
    try {
      this.stopSlideshow()
      
      const wallpapers = await this.getWallpapers()
      if (wallpapers.length === 0) {
        return false
      }

      // 确保间隔至少1分钟，防止过快切换
      const safeInterval = Math.max(intervalMs, 60000)
      console.log(`[Slideshow] Starting with interval: ${safeInterval}ms (${safeInterval / 60000} minutes)`)
      
      this.slideshowInterval = setInterval(async () => {
        await this.nextWallpaper()
      }, safeInterval)

      this.store.set('slideshowEnabled', true)
      this.store.set('slideshowInterval', safeInterval)
      
      return true
    } catch (error) {
      console.error('Failed to start slideshow:', error)
      return false
    }
  }

  stopSlideshow(): void {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval)
      this.slideshowInterval = null
    }
    this.store.set('slideshowEnabled', false)
  }

  async nextWallpaper(): Promise<boolean> {
    try {
      const wallpapers = await this.getWallpapers()
      if (wallpapers.length === 0) {
        return false
      }

      this.currentIndex = (this.currentIndex + 1) % wallpapers.length
      return await this.setWallpaper(wallpapers[this.currentIndex].path)
    } catch (error) {
      console.error('Failed to set next wallpaper:', error)
      return false
    }
  }

  async getCurrentWallpaper(): Promise<string | null> {
    return this.store.get('currentWallpaper', null) as string | null
  }

  isSlideshowEnabled(): boolean {
    return this.store.get('slideshowEnabled', false) as boolean
  }

  getSlideshowInterval(): number {
    return this.store.get('slideshowInterval', 30) as number
  }
}
