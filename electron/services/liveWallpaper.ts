import { BrowserWindow, screen, app } from 'electron'
import Store from 'electron-store'
import { spawn } from 'child_process'
import path from 'path'

interface LiveWallpaperConfig {
  type: 'video' | 'web' | 'image'
  source: string
  volume: number
  playbackRate: number
}

export class LiveWallpaperManager {
  private store: Store
  private wallpaperWindow: BrowserWindow | null = null
  private isPlaying: boolean = false
  private currentConfig: LiveWallpaperConfig | null = null

  constructor() {
    this.store = new Store({ name: 'live-wallpaper' })
  }

  // 将窗口嵌入到桌面
  private embedToDesktop(hwnd: Buffer, x: number, y: number, width: number, height: number): Promise<boolean> {
    return new Promise((resolve) => {
      // 获取窗口句柄值
      const hwndValue = hwnd.readBigUInt64LE ? hwnd.readBigUInt64LE(0) : BigInt(hwnd.readUInt32LE(0))
      
      // 获取脚本路径
      const isDev = !app.isPackaged
      const scriptPath = isDev 
        ? path.join(__dirname, '../../electron/scripts/embed-wallpaper.ps1')
        : path.join(process.resourcesPath, 'scripts/embed-wallpaper.ps1')
      
      console.log('Embed script path:', scriptPath)
      console.log('Window handle:', hwndValue.toString())
      console.log('Position:', x, ',', y, 'Size:', width, 'x', height)
      
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-hwnd', hwndValue.toString(),
        '-width', width.toString(),
        '-height', height.toString(),
        '-x', x.toString(),
        '-y', y.toString()
      ])
      
      let output = ''
      let error = ''
      
      ps.stdout.on('data', (data) => {
        output += data.toString()
        console.log('PS stdout:', data.toString())
      })
      
      ps.stderr.on('data', (data) => {
        error += data.toString()
        console.log('PS stderr:', data.toString())
      })
      
      ps.on('close', (code) => {
        console.log('PS exit code:', code)
        console.log('PS output:', output.trim())
        if (code === 0 && output.includes('SUCCESS')) {
          console.log('Embed succeeded!')
          resolve(true)
        } else {
          console.log('Embed failed:', error || output)
          resolve(false)
        }
      })
      
      ps.on('error', (err) => {
        console.log('PS spawn error:', err)
        resolve(false)
      })
    })
  }

  async start(config: LiveWallpaperConfig): Promise<boolean> {
    try {
      await this.stop()

      // 获取所有显示器，计算总的虚拟屏幕区域
      const allDisplays = screen.getAllDisplays()
      let minX = 0, minY = 0, maxX = 0, maxY = 0
      
      allDisplays.forEach(display => {
        const { x, y } = display.bounds
        const { width, height } = display.size
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + width)
        maxY = Math.max(maxY, y + height)
      })
      
      const totalWidth = maxX - minX
      const totalHeight = maxY - minY
      
      console.log(`Multi-monitor setup: ${allDisplays.length} displays`)
      console.log(`Virtual screen: ${minX},${minY} to ${maxX},${maxY} (${totalWidth}x${totalHeight})`)

      // 创建覆盖所有显示器的窗口
      this.wallpaperWindow = new BrowserWindow({
        width: totalWidth,
        height: totalHeight,
        x: minX,
        y: minY,
        frame: false,
        transparent: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: true,
        focusable: false,
        alwaysOnTop: false,
        fullscreenable: false,
        show: false,
        backgroundColor: '#000000',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          backgroundThrottling: false
        }
      })

      // 监听窗口关闭事件
      this.wallpaperWindow.on('closed', () => {
        this.wallpaperWindow = null
        this.isPlaying = false
      })

      // 加载壁纸内容
      const htmlContent = this.generateWallpaperHTML(config)
      
      // 使用 loadURL 并等待加载完成
      await this.wallpaperWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
      
      // 等待视频开始加载
      await new Promise(resolve => setTimeout(resolve, 500))

      // 显示窗口
      this.wallpaperWindow.show()
      
      // 嵌入到桌面
      const hwnd = this.wallpaperWindow.getNativeWindowHandle()
      const embedded = await this.embedToDesktop(hwnd, minX, minY, totalWidth, totalHeight)
      
      if (!embedded) {
        console.log('Failed to embed to desktop')
      }
      
      // 将主窗口移到前面
      const mainWindow = BrowserWindow.getAllWindows().find(w => w !== this.wallpaperWindow && !w.isDestroyed())
      if (mainWindow) {
        mainWindow.focus()
      }

      this.isPlaying = true
      this.currentConfig = config
      this.store.set('lastConfig', config)

      console.log('Live wallpaper started successfully:', config.source)
      return true
    } catch (error) {
      console.error('Failed to start live wallpaper:', error)
      return false
    }
  }

  async stop(): Promise<void> {
    if (this.wallpaperWindow && !this.wallpaperWindow.isDestroyed()) {
      this.wallpaperWindow.destroy()
      this.wallpaperWindow = null
    }
    this.isPlaying = false
    this.currentConfig = null
  }

  async pause(): Promise<void> {
    if (this.wallpaperWindow) {
      this.wallpaperWindow.webContents.executeJavaScript('document.querySelector("video")?.pause()')
    }
  }

  async resume(): Promise<void> {
    if (this.wallpaperWindow) {
      this.wallpaperWindow.webContents.executeJavaScript('document.querySelector("video")?.play()')
    }
  }

  setVolume(volume: number): void {
    if (this.wallpaperWindow) {
      this.wallpaperWindow.webContents.executeJavaScript(
        `document.querySelector("video").volume = ${volume / 100}`
      )
    }
    if (this.currentConfig) {
      this.currentConfig.volume = volume
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.wallpaperWindow) {
      this.wallpaperWindow.webContents.executeJavaScript(
        `document.querySelector("video").playbackRate = ${rate}`
      )
    }
    if (this.currentConfig) {
      this.currentConfig.playbackRate = rate
    }
  }

  isActive(): boolean {
    return this.isPlaying
  }

  getCurrentConfig(): LiveWallpaperConfig | null {
    return this.currentConfig
  }

  private generateWallpaperHTML(config: LiveWallpaperConfig): string {
    const commonStyles = `
      * { margin: 0; padding: 0; }
      body { overflow: hidden; background: #000; }
      #wallpaper {
        position: fixed;
        top: 50%;
        left: 50%;
        min-width: 100%;
        min-height: 100%;
        transform: translate(-50%, -50%);
        object-fit: cover;
      }
    `

    if (config.type === 'video') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>${commonStyles}</style>
        </head>
        <body>
          <video id="wallpaper" autoplay loop muted playsinline crossorigin="anonymous">
            <source src="${config.source}" type="video/mp4">
          </video>
          <div id="status" style="position:fixed;top:10px;left:10px;color:#fff;font-size:14px;z-index:999;background:rgba(0,0,0,0.7);padding:10px;display:none;"></div>
          <script>
            const video = document.getElementById('wallpaper');
            const status = document.getElementById('status');
            
            function showStatus(msg) {
              status.style.display = 'block';
              status.textContent = msg;
              console.log(msg);
            }
            
            video.volume = ${config.volume / 100};
            video.playbackRate = ${config.playbackRate};
            video.muted = true;  // 先静音确保能自动播放
            
            video.addEventListener('loadstart', () => showStatus('开始加载视频...'));
            video.addEventListener('loadedmetadata', () => showStatus('视频元数据已加载'));
            video.addEventListener('canplay', () => {
              showStatus('视频可以播放');
              setTimeout(() => { status.style.display = 'none'; }, 2000);
            });
            video.addEventListener('playing', () => {
              showStatus('正在播放');
              setTimeout(() => { status.style.display = 'none'; }, 1000);
            });
            video.addEventListener('error', (e) => {
              const err = video.error;
              showStatus('视频加载错误: ' + (err ? err.message : '未知错误') + ' (code: ' + (err ? err.code : 'N/A') + ')');
            });
            video.addEventListener('stalled', () => showStatus('视频加载停滞...'));
            video.addEventListener('waiting', () => showStatus('等待数据...'));
            
            // 尝试播放
            video.play().then(() => {
              console.log('视频开始播放');
            }).catch(e => {
              showStatus('播放失败: ' + e.message);
              // 如果自动播放失败，添加点击播放
              document.body.addEventListener('click', () => {
                video.play();
              }, { once: true });
            });
          </script>
        </body>
        </html>
      `
    } else if (config.type === 'web') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body { overflow: hidden; }
            iframe {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              border: none;
            }
          </style>
        </head>
        <body>
          <iframe src="${config.source}" allowfullscreen></iframe>
        </body>
        </html>
      `
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            ${commonStyles}
            #wallpaper { object-fit: cover; }
          </style>
        </head>
        <body>
          <img id="wallpaper" src="${config.source}" />
        </body>
        </html>
      `
    }
  }

  getLastConfig(): LiveWallpaperConfig | null {
    return this.store.get('lastConfig', null) as LiveWallpaperConfig | null
  }
}
