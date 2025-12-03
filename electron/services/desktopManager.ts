import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
import { app } from 'electron'
import Store from 'electron-store'

const execAsync = promisify(exec)

interface DesktopIcon {
  name: string
  path: string
  type: 'file' | 'folder' | 'shortcut'
  extension: string
  size: number
  modifiedTime: Date
}

interface OrganizeOptions {
  sortBy?: 'name' | 'type' | 'date' | 'size'
  groupBy?: 'type' | 'none'
  layout?: 'grid' | 'list'
}

interface IconGroup {
  name: string
  icons: string[]
}

export class DesktopManager {
  private desktopPath: string
  private store: Store
  private iconsHidden: boolean = false

  constructor() {
    this.desktopPath = join(app.getPath('home'), 'Desktop')
    this.store = new Store({ name: 'desktop-manager' })
    // 从存储中恢复状态
    this.iconsHidden = this.store.get('iconsHidden', false) as boolean
  }

  async getDesktopIcons(): Promise<DesktopIcon[]> {
    try {
      const files = await readdir(this.desktopPath)
      const icons: DesktopIcon[] = []

      for (const file of files) {
        const filePath = join(this.desktopPath, file)
        try {
          const fileStat = await stat(filePath)
          const extension = extname(file).toLowerCase()
          
          icons.push({
            name: file,
            path: filePath,
            type: fileStat.isDirectory() ? 'folder' : (extension === '.lnk' ? 'shortcut' : 'file'),
            extension: extension,
            size: fileStat.size,
            modifiedTime: fileStat.mtime
          })
        } catch (e) {
          // 跳过无法访问的文件
        }
      }

      return icons
    } catch (error) {
      console.error('Failed to get desktop icons:', error)
      return []
    }
  }

  async organizeDesktop(options: OrganizeOptions = {}): Promise<{ success: boolean; movedCount: number; message: string }> {
    const { sortBy = 'type', groupBy = 'type' } = options

    try {
      const icons = await this.getDesktopIcons()
      let movedCount = 0
      
      // 按类型分组的文件夹映射
      const typeGroups: Record<string, string[]> = {
        '文档': ['.doc', '.docx', '.pdf', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf', '.odt'],
        '图片': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.raw'],
        '视频': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
        '音乐': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
        '压缩包': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
        '程序': ['.exe', '.msi', '.bat', '.cmd', '.ps1'],
        '快捷方式': ['.lnk', '.url'],
        '其他': []
      }

      // 过滤出可以移动的文件（排除文件夹和已分类的文件夹）
      const filesToOrganize = icons.filter(icon => 
        icon.type === 'file' || icon.type === 'shortcut'
      )

      if (filesToOrganize.length === 0) {
        return { 
          success: true, 
          movedCount: 0, 
          message: '桌面上没有需要整理的文件' 
        }
      }

      if (groupBy === 'type') {
        for (const [groupName, extensions] of Object.entries(typeGroups)) {
          const groupPath = join(this.desktopPath, `[${groupName}]`)
          
          // 找到匹配的文件
          const filesToMove = filesToOrganize.filter(icon => {
            // 标准化扩展名（处理特殊情况如 .jpg&pid=hp）
            const ext = icon.extension.split('&')[0].split('?')[0].toLowerCase()
            return extensions.includes(ext)
          })

          if (filesToMove.length > 0) {
            // 创建文件夹
            try {
              await execAsync(`if not exist "${groupPath}" mkdir "${groupPath}"`)
            } catch (e) {
              console.log('Folder may already exist:', groupPath)
            }
            
            // 移动文件
            for (const file of filesToMove) {
              try {
                // 检查目标文件是否已存在
                const fileName = file.name
                const destPath = join(groupPath, fileName)
                await execAsync(`move /Y "${file.path}" "${groupPath}\\"`)
                movedCount++
                console.log(`Moved: ${file.name} -> [${groupName}]`)
              } catch (e) {
                console.error(`Failed to move ${file.name}:`, e)
              }
            }
          }
        }
      }

      // 刷新桌面
      await this.refreshDesktop()
      
      return { 
        success: true, 
        movedCount, 
        message: movedCount > 0 
          ? `已整理 ${movedCount} 个文件` 
          : '没有文件需要整理'
      }
    } catch (error) {
      console.error('Failed to organize desktop:', error)
      return { 
        success: false, 
        movedCount: 0, 
        message: '整理失败: ' + error 
      }
    }
  }

  async hideIcons(): Promise<boolean> {
    try {
      // Windows: 通过注册表隐藏桌面图标
      await execAsync('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideIcons /t REG_DWORD /d 1 /f')
      // 使用温和的刷新方式，不重启 Explorer
      await this.toggleDesktopIcons(false)
      this.iconsHidden = true
      this.store.set('iconsHidden', true)
      return true
    } catch (error) {
      console.error('Failed to hide icons:', error)
      return false
    }
  }

  async showIcons(): Promise<boolean> {
    try {
      await execAsync('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideIcons /t REG_DWORD /d 0 /f')
      // 使用温和的刷新方式，不重启 Explorer
      await this.toggleDesktopIcons(true)
      this.iconsHidden = false
      this.store.set('iconsHidden', false)
      return true
    } catch (error) {
      console.error('Failed to show icons:', error)
      return false
    }
  }

  // 通过发送消息切换桌面图标显示状态（更温和，不会影响应用窗口）
  private async toggleDesktopIcons(show: boolean): Promise<void> {
    try {
      // 使用 PowerShell 发送消息给桌面窗口切换图标显示
      const script = `
$source = @"
using System;
using System.Runtime.InteropServices;
public class DesktopToggle {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
    [DllImport("user32.dll")]
    static extern int SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    const uint WM_COMMAND = 0x0111;
    const int TOGGLE_DESKTOP_ICONS = 0x7402;
    
    public static void Toggle() {
        IntPtr hProgman = FindWindow("Progman", "Program Manager");
        if (hProgman != IntPtr.Zero) {
            IntPtr hDefView = FindWindowEx(hProgman, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (hDefView != IntPtr.Zero) {
                SendMessage(hDefView, WM_COMMAND, (IntPtr)TOGGLE_DESKTOP_ICONS, IntPtr.Zero);
            }
        }
    }
}
"@
Add-Type -TypeDefinition $source -Language CSharp
[DesktopToggle]::Toggle()
`
      const fs = require('fs')
      const os = require('os')
      const path = require('path')
      const tempScript = path.join(os.tmpdir(), 'toggle_icons.ps1')
      fs.writeFileSync(tempScript, script)
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`)
      fs.unlinkSync(tempScript)
    } catch (error) {
      console.error('Toggle desktop icons failed:', error)
      // 回退到重启 Explorer
      await this.restartExplorer()
    }
  }

  // 获取当前图标隐藏状态
  async getIconsHiddenState(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideIcons')
      // 解析输出，查找 HideIcons 的值
      const match = stdout.match(/HideIcons\s+REG_DWORD\s+0x([0-9a-fA-F]+)/)
      if (match) {
        const value = parseInt(match[1], 16)
        this.iconsHidden = value === 1
        return this.iconsHidden
      }
    } catch (error) {
      // 注册表项可能不存在，默认为显示状态
    }
    return false
  }

  async createGroup(name: string, iconPaths: string[]): Promise<boolean> {
    try {
      const groupPath = join(this.desktopPath, name)
      await execAsync(`if not exist "${groupPath}" mkdir "${groupPath}"`)
      
      for (const iconPath of iconPaths) {
        await execAsync(`move "${iconPath}" "${groupPath}\\"`)
      }

      // 保存分组信息
      const groups = this.store.get('iconGroups', []) as IconGroup[]
      groups.push({ name, icons: iconPaths })
      this.store.set('iconGroups', groups)

      await this.refreshDesktop()
      return true
    } catch (error) {
      console.error('Failed to create group:', error)
      return false
    }
  }

  async getGroups(): Promise<IconGroup[]> {
    return this.store.get('iconGroups', []) as IconGroup[]
  }

  private async refreshDesktop(): Promise<void> {
    try {
      // 使用简单的方法刷新桌面
      // 方法1: 使用 ie4uinit 命令刷新桌面
      await execAsync('ie4uinit.exe -show')
    } catch (error) {
      // 如果 ie4uinit 失败，尝试使用 rundll32
      try {
        await execAsync('rundll32.exe user32.dll,UpdatePerUserSystemParameters ,1 ,True')
      } catch (e) {
        console.error('Failed to refresh desktop:', e)
      }
    }
  }

  // 通过重启 Explorer 来强制刷新桌面（效果更好但会闪烁）
  async restartExplorer(): Promise<boolean> {
    try {
      await execAsync('taskkill /f /im explorer.exe')
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 500))
      await execAsync('start explorer.exe')
      return true
    } catch (error) {
      console.error('Failed to restart explorer:', error)
      // 确保 explorer 重新启动
      try {
        await execAsync('start explorer.exe')
      } catch {}
      return false
    }
  }

  isIconsHidden(): boolean {
    return this.iconsHidden
  }
}
