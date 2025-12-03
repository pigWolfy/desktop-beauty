import { app } from 'electron'
import Store from 'electron-store'
import { randomUUID } from 'crypto'
import * as os from 'os'

// 定义遥测事件接口
export interface TelemetryEvent {
  category: string
  action: string
  label?: string
  value?: number
  timestamp: number
  userId: string
  appVersion: string
  os: string
}

export class TelemetryService {
  private store: Store
  private userId: string
  // 替换为您服务器的实际API地址
  private apiEndpoint = 'https://desktop.ruifeis.net/api/analytics'
  private enabled = true

  constructor() {
    this.store = new Store({ name: 'telemetry' })
    this.userId = this.getOrCreateUserId()
  }

  private getOrCreateUserId(): string {
    let id = this.store.get('userId') as string
    if (!id) {
      id = randomUUID()
      this.store.set('userId', id)
    }
    return id
  }

  // 设置API地址
  setApiEndpoint(url: string) {
    this.apiEndpoint = url
  }

  // 发送事件
  trackEvent(category: string, action: string, label?: string, value?: number) {
    console.log('[Telemetry] Tracking event:', category, action)
    if (!this.enabled) return

    const event: TelemetryEvent = {
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      userId: this.userId,
      appVersion: app.getVersion(),
      os: `${os.platform()} ${os.release()}`
    }

    this.sendData(event)
  }

  // 发送页面访问（模块使用）
  trackPage(path: string) {
    this.trackEvent('Navigation', 'View', path)
  }

  // 发送数据到服务器
  private async sendData(data: TelemetryEvent) {
    console.log('[Telemetry] Sending data to:', this.apiEndpoint)
    
    // 如果没有配置服务器，仅在控制台打印（开发模式）
    if (this.apiEndpoint.includes('your-server.com')) {
      console.log('[Telemetry] Mock send:', data)
      return
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        console.error(`[Telemetry] Server error: ${response.status} ${response.statusText}`)
        const text = await response.text()
        console.error(`[Telemetry] Response body: ${text}`)
      } else {
        console.log('[Telemetry] Data sent successfully')
      }
    } catch (error) {
      console.error('[Telemetry] Network error:', error)
    }
  }
}
