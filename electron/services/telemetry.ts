import { app, screen } from 'electron'
import Store from 'electron-store'
import { randomUUID } from 'crypto'
import * as os from 'os'
import * as si from 'systeminformation'

// ==================== 类型定义 ====================

// 基础事件接口
export interface BaseTelemetryEvent {
  eventType: string
  timestamp: number
  sessionId: string
  userId: string
  appVersion: string
  platform: string
  osVersion: string
  arch: string
  locale: string
}

// 应用生命周期事件
export interface AppLifecycleEvent extends BaseTelemetryEvent {
  eventType: 'app_start' | 'app_quit' | 'app_focus' | 'app_blur' | 'app_crash'
  sessionDuration?: number  // 会话时长（毫秒）
  isFirstLaunch?: boolean
  launchCount?: number
}

// 页面访问事件
export interface PageViewEvent extends BaseTelemetryEvent {
  eventType: 'page_view'
  pageName: string
  previousPage?: string
  timeOnPreviousPage?: number  // 在上一页停留时间
}

// 功能使用事件
export interface FeatureUsageEvent extends BaseTelemetryEvent {
  eventType: 'feature_use'
  category: string        // 功能类别：wallpaper, desktop, monitor, etc.
  action: string          // 具体操作：set, download, organize, etc.
  label?: string          // 额外标签
  value?: number          // 数值（如下载大小、耗时等）
  success?: boolean       // 操作是否成功
  duration?: number       // 操作耗时
}

// 性能指标事件
export interface PerformanceEvent extends BaseTelemetryEvent {
  eventType: 'performance'
  metricName: string      // 指标名称
  value: number           // 指标值
  unit: string            // 单位：ms, MB, etc.
  context?: string        // 上下文
}

// 错误事件
export interface ErrorEvent extends BaseTelemetryEvent {
  eventType: 'error'
  errorType: 'crash' | 'exception' | 'network' | 'validation' | 'unknown'
  errorMessage: string
  errorStack?: string
  componentName?: string  // 发生错误的组件
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// 用户偏好/设置事件
export interface SettingsEvent extends BaseTelemetryEvent {
  eventType: 'settings_change'
  settingName: string
  oldValue?: string
  newValue: string
}

// 系统信息事件（启动时收集一次）
export interface SystemInfoEvent extends BaseTelemetryEvent {
  eventType: 'system_info'
  cpuModel: string
  cpuCores: number
  cpuSpeed: number
  totalMemory: number
  gpuModel: string
  screenResolution: string
  screenCount: number
}

// 联合类型
export type TelemetryEvent = 
  | AppLifecycleEvent 
  | PageViewEvent 
  | FeatureUsageEvent 
  | PerformanceEvent 
  | ErrorEvent 
  | SettingsEvent
  | SystemInfoEvent

// ==================== 遥测服务 ====================

export class TelemetryService {
  private store: Store
  private userId: string
  private sessionId: string
  private sessionStartTime: number
  private currentPage: string = ''
  private pageEnterTime: number = 0
  private launchCount: number
  private isFirstLaunch: boolean
  
  private apiEndpoint = 'https://desktop.ruifeis.net/api/analytics'
  private enabled = true
  private eventQueue: TelemetryEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly FLUSH_INTERVAL = 10000  // 10秒批量发送一次
  private readonly MAX_QUEUE_SIZE = 50     // 队列最大50条

  constructor() {
    this.store = new Store({ name: 'telemetry' })
    this.userId = this.getOrCreateUserId()
    this.sessionId = randomUUID()
    this.sessionStartTime = Date.now()
    
    // 统计启动次数
    this.launchCount = (this.store.get('launchCount', 0) as number) + 1
    this.isFirstLaunch = this.launchCount === 1
    this.store.set('launchCount', this.launchCount)
    
    // 启动批量发送定时器
    this.startFlushTimer()
  }

  // ==================== 基础方法 ====================

  private getOrCreateUserId(): string {
    let id = this.store.get('userId') as string
    if (!id) {
      id = randomUUID()
      this.store.set('userId', id)
    }
    return id
  }

  private getBaseEvent(eventType: string): BaseTelemetryEvent {
    return {
      eventType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      appVersion: app.getVersion(),
      platform: os.platform(),
      osVersion: os.release(),
      arch: os.arch(),
      locale: app.getLocale()
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setApiEndpoint(url: string) {
    this.apiEndpoint = url
  }

  // ==================== 应用生命周期 ====================

  async trackAppStart() {
    // 收集系统信息
    await this.collectSystemInfo()
    
    const event: AppLifecycleEvent = {
      ...this.getBaseEvent('app_start'),
      eventType: 'app_start',
      isFirstLaunch: this.isFirstLaunch,
      launchCount: this.launchCount
    }
    this.queueEvent(event)
  }

  trackAppQuit() {
    const event: AppLifecycleEvent = {
      ...this.getBaseEvent('app_quit'),
      eventType: 'app_quit',
      sessionDuration: Date.now() - this.sessionStartTime
    }
    // 退出时立即发送
    this.sendEventImmediately(event)
  }

  trackAppFocus() {
    const event: AppLifecycleEvent = {
      ...this.getBaseEvent('app_focus'),
      eventType: 'app_focus'
    }
    this.queueEvent(event)
  }

  trackAppBlur() {
    const event: AppLifecycleEvent = {
      ...this.getBaseEvent('app_blur'),
      eventType: 'app_blur'
    }
    this.queueEvent(event)
  }

  // ==================== 页面访问 ====================

  trackPageView(pageName: string) {
    const now = Date.now()
    const timeOnPreviousPage = this.pageEnterTime > 0 ? now - this.pageEnterTime : undefined
    
    const event: PageViewEvent = {
      ...this.getBaseEvent('page_view'),
      eventType: 'page_view',
      pageName,
      previousPage: this.currentPage || undefined,
      timeOnPreviousPage
    }
    
    this.currentPage = pageName
    this.pageEnterTime = now
    this.queueEvent(event)
  }

  // ==================== 功能使用 ====================

  trackFeature(
    category: string, 
    action: string, 
    options?: {
      label?: string
      value?: number
      success?: boolean
      duration?: number
    }
  ) {
    const event: FeatureUsageEvent = {
      ...this.getBaseEvent('feature_use'),
      eventType: 'feature_use',
      category,
      action,
      ...options
    }
    this.queueEvent(event)
  }

  // 便捷方法
  trackWallpaper(action: string, label?: string, value?: number) {
    this.trackFeature('wallpaper', action, { label, value })
  }

  trackDesktop(action: string, label?: string) {
    this.trackFeature('desktop', action, { label })
  }

  trackMonitor(action: string) {
    this.trackFeature('monitor', action)
  }

  trackWidget(action: string, label?: string) {
    this.trackFeature('widget', action, { label })
  }

  trackCpuHealth(action: string, label?: string) {
    this.trackFeature('cpu_health', action, { label })
  }

  trackSettings(action: string, label?: string) {
    this.trackFeature('settings', action, { label })
  }

  // ==================== 性能指标 ====================

  trackPerformance(metricName: string, value: number, unit: string, context?: string) {
    const event: PerformanceEvent = {
      ...this.getBaseEvent('performance'),
      eventType: 'performance',
      metricName,
      value,
      unit,
      context
    }
    this.queueEvent(event)
  }

  // 追踪操作耗时
  startTimer(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }

  // ==================== 错误追踪 ====================

  trackError(
    errorMessage: string,
    errorType: ErrorEvent['errorType'] = 'unknown',
    options?: {
      errorStack?: string
      componentName?: string
      severity?: ErrorEvent['severity']
    }
  ) {
    const event: ErrorEvent = {
      ...this.getBaseEvent('error'),
      eventType: 'error',
      errorType,
      errorMessage,
      errorStack: options?.errorStack,
      componentName: options?.componentName,
      severity: options?.severity || 'medium'
    }
    // 错误事件立即发送
    this.sendEventImmediately(event)
  }

  // ==================== 设置变更 ====================

  trackSettingsChange(settingName: string, newValue: string, oldValue?: string) {
    const event: SettingsEvent = {
      ...this.getBaseEvent('settings_change'),
      eventType: 'settings_change',
      settingName,
      newValue,
      oldValue
    }
    this.queueEvent(event)
  }

  // ==================== 系统信息 ====================

  private async collectSystemInfo() {
    try {
      const [cpu, mem, graphics] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.graphics()
      ])
      
      const displays = screen.getAllDisplays()
      const primaryDisplay = screen.getPrimaryDisplay()
      
      const event: SystemInfoEvent = {
        ...this.getBaseEvent('system_info'),
        eventType: 'system_info',
        cpuModel: cpu.brand,
        cpuCores: cpu.cores,
        cpuSpeed: cpu.speed,
        totalMemory: Math.round(mem.total / (1024 * 1024 * 1024)),  // GB
        gpuModel: graphics.controllers[0]?.model || 'Unknown',
        screenResolution: `${primaryDisplay.size.width}x${primaryDisplay.size.height}`,
        screenCount: displays.length
      }
      this.queueEvent(event)
    } catch (error) {
      console.error('[Telemetry] Failed to collect system info:', error)
    }
  }

  // ==================== 数据发送 ====================

  private queueEvent(event: TelemetryEvent) {
    if (!this.enabled) return
    
    this.eventQueue.push(event)
    
    // 队列满了立即发送
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush()
    }
  }

  private startFlushTimer() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL)
  }

  private async flush() {
    if (this.eventQueue.length === 0) return
    
    const eventsToSend = [...this.eventQueue]
    this.eventQueue = []
    
    await this.sendBatch(eventsToSend)
  }

  private async sendBatch(events: TelemetryEvent[]) {
    if (this.apiEndpoint.includes('your-server.com')) {
      console.log('[Telemetry] Mock batch send:', events.length, 'events')
      return
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      })

      if (!response.ok) {
        console.error(`[Telemetry] Batch send failed: ${response.status}`)
        // 失败时将事件放回队列（最多重试一次）
        this.eventQueue.unshift(...events.slice(0, 20))
      }
    } catch (error) {
      console.error('[Telemetry] Network error:', error)
    }
  }

  private async sendEventImmediately(event: TelemetryEvent) {
    if (!this.enabled) return
    
    if (this.apiEndpoint.includes('your-server.com')) {
      console.log('[Telemetry] Mock immediate send:', event.eventType)
      return
    }

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('[Telemetry] Immediate send error:', error)
    }
  }

  // 清理资源
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()  // 发送剩余事件
  }

  // ==================== 兼容旧版 API ====================

  // 保持向后兼容
  trackEvent(category: string, action: string, label?: string, value?: number) {
    this.trackFeature(category, action, { label, value })
  }

  trackPage(path: string) {
    this.trackPageView(path)
  }
}
