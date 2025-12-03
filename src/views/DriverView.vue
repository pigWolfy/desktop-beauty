<template>
  <div class="driver-view">
    <!-- 顶部标题和操作栏 -->
    <header class="header">
      <div class="title-section">
        <h1>驱动管理</h1>
        <span class="scan-status" v-if="lastScanTime">
          上次扫描: {{ formatScanTime(lastScanTime) }}
        </span>
      </div>
      <button 
        class="btn-scan" 
        :disabled="isScanning"
        @click="handleScan"
      >
        <span v-if="isScanning" class="spinner"></span>
        {{ isScanning ? '扫描中...' : '扫描驱动' }}
      </button>
    </header>

    <!-- 扫描进度条 -->
    <div v-if="isScanning" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :class="{ indeterminate: !scanProgress.total }" :style="{ width: progressPercent + '%' }"></div>
        <div class="progress-shine"></div>
      </div>
      <div class="progress-text">
        <span class="scanning-icon">🔍</span>
        正在扫描驱动... {{ scanProgress.total ? `${scanProgress.current} / ${scanProgress.total}` : '正在获取...' }}
      </div>
    </div>

    <!-- 选项卡 -->
    <div class="tabs-row">
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span class="tab-count">{{ getTabCount(tab.key) }}</span>
        </button>
      </div>
    </div>

    <!-- 驱动列表 -->
    <div class="driver-content">
      <!-- 加载状态 -->
      <div v-if="isScanning && drivers.length === 0" class="loading-state">
        <div class="spinner large"></div>
        <p>正在扫描系统驱动...</p>
        <p class="loading-hint">首次扫描可能需要 10-20 秒</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="currentDrivers.length === 0" class="empty-state">
        <span class="empty-icon">{{ getEmptyIcon() }}</span>
        <p>{{ getEmptyText() }}</p>
      </div>

      <!-- 驱动分类列表 -->
      <div v-else class="driver-groups">
        <div 
          v-for="(group, category) in groupedCurrentDrivers" 
          :key="category"
          class="driver-group"
        >
          <div class="group-header" @click="toggleGroup(category as string)">
            <span class="group-icon">{{ getCategoryIcon(category as string) }}</span>
            <span class="group-name">{{ getCategoryName(category as string) }}</span>
            <span class="group-count">{{ group.length }}</span>
            <span class="expand-icon">{{ expandedGroups[category as string] ? '▼' : '▶' }}</span>
          </div>
          
          <div v-show="expandedGroups[category as string]" class="group-drivers">
            <div 
              v-for="driver in group" 
              :key="driver.deviceId"
              class="driver-item"
              :class="getDriverClass(driver)"
            >
              <div class="driver-status">
                <span class="status-dot" :class="getStatusClass(driver)"></span>
              </div>
              <div class="driver-info">
                <div class="driver-name">{{ driver.friendlyName || driver.deviceName }}</div>
                <div class="driver-meta">
                  <span>版本: {{ driver.driverVersion || 'N/A' }}</span>
                  <span>日期: {{ formatDate(driver.driverDate) }}</span>
                  <span v-if="driver.manufacturer">厂商: {{ driver.manufacturer }}</span>
                </div>
                <div v-if="driver.problemCode && driver.problemCode !== 0" class="driver-problem">
                  ⚠️ {{ getProblemReason(driver.problemCode) }}
                </div>
              </div>
              <div class="driver-actions">
                <button 
                  v-if="driver.hasUpdate"
                  class="btn-update"
                  :disabled="installingId === driver.deviceId"
                  @click.stop="installUpdate(driver)"
                >
                  {{ installingId === driver.deviceId ? '安装中...' : '更新' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 消息 -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'

interface Driver {
  deviceId: string
  deviceName: string
  friendlyName?: string
  deviceClass: string
  manufacturer?: string
  driverVersion?: string
  driverDate?: string
  status: string
  problemCode?: number
  hasUpdate?: boolean
}

// 状态
const drivers = ref<Driver[]>([])
const isScanning = ref(false)
const lastScanTime = ref<number | null>(null)
const activeTab = ref('all')
const expandedGroups = ref<Record<string, boolean>>({})
const installingId = ref<string | null>(null)
const toast = reactive({ show: false, message: '', type: 'info' })
const scanProgress = reactive({ current: 0, total: 0 })

// 进度百分比
const progressPercent = computed(() => {
  if (!scanProgress.total) return 0
  return Math.round((scanProgress.current / scanProgress.total) * 100)
})

// 5分钟缓存时间
const CACHE_DURATION = 5 * 60 * 1000

// 选项卡配置
const tabs = [
  { key: 'all', label: '全部驱动' },
  { key: 'problems', label: '问题驱动' },
  { key: 'updates', label: '可更新驱动' }
]

// 分类映射
const categoryMap: Record<string, { name: string; icon: string }> = {
  'Display': { name: '显示适配器', icon: '🖥️' },
  'Net': { name: '网络适配器', icon: '🌐' },
  'MEDIA': { name: '音频设备', icon: '🔊' },
  'AudioEndpoint': { name: '音频端点', icon: '🎧' },
  'USB': { name: 'USB 控制器', icon: '🔌' },
  'Bluetooth': { name: '蓝牙设备', icon: '📶' },
  'Keyboard': { name: '键盘', icon: '⌨️' },
  'Mouse': { name: '鼠标', icon: '🖱️' },
  'HIDClass': { name: 'HID 设备', icon: '🎮' },
  'Processor': { name: '处理器', icon: '⚡' },
  'DiskDrive': { name: '磁盘驱动器', icon: '💾' },
  'System': { name: '系统设备', icon: '⚙️' },
  'Monitor': { name: '显示器', icon: '🖵' },
  'Battery': { name: '电池', icon: '🔋' },
  'Camera': { name: '摄像头', icon: '📷' },
  'Image': { name: '图像设备', icon: '📸' },
  'PrintQueue': { name: '打印机', icon: '🖨️' },
  'SoftwareDevice': { name: '软件设备', icon: '📦' },
  'Volume': { name: '存储卷', icon: '💿' },
  'CDROM': { name: '光驱', icon: '💿' },
  'SCSIAdapter': { name: 'SCSI 适配器', icon: '🔗' },
  'HDC': { name: '硬盘控制器', icon: '💽' }
}

// 计算属性
const problemDrivers = computed(() => 
  drivers.value.filter(d => d.problemCode && d.problemCode !== 0)
)

const updatableDrivers = computed(() => 
  drivers.value.filter(d => d.hasUpdate)
)

const currentDrivers = computed(() => {
  switch (activeTab.value) {
    case 'problems':
      return problemDrivers.value
    case 'updates':
      return updatableDrivers.value
    default:
      return drivers.value
  }
})

const groupedCurrentDrivers = computed(() => {
  const groups: Record<string, Driver[]> = {}
  currentDrivers.value.forEach(driver => {
    const category = driver.deviceClass || 'Unknown'
    if (!groups[category]) {
      groups[category] = []
      // 默认展开
      if (expandedGroups.value[category] === undefined) {
        expandedGroups.value[category] = true
      }
    }
    groups[category].push(driver)
  })
  
  // 按分类名称排序
  const sorted: Record<string, Driver[]> = {}
  Object.keys(groups).sort((a, b) => {
    const nameA = categoryMap[a]?.name || a
    const nameB = categoryMap[b]?.name || b
    return nameA.localeCompare(nameB)
  }).forEach(key => {
    sorted[key] = groups[key]
  })
  
  return sorted
})

// 方法
function getCategoryIcon(category: string): string {
  return categoryMap[category]?.icon || '📁'
}

function getCategoryName(category: string): string {
  return categoryMap[category]?.name || category
}

function toggleGroup(category: string): void {
  expandedGroups.value[category] = !expandedGroups.value[category]
}

function getTabCount(tabKey: string): number {
  switch (tabKey) {
    case 'problems':
      return problemDrivers.value.length
    case 'updates':
      return updatableDrivers.value.length
    default:
      return drivers.value.length
  }
}

function getDriverClass(driver: Driver): string {
  if (driver.problemCode && driver.problemCode !== 0) return 'has-problem'
  if (driver.hasUpdate) return 'has-update'
  return ''
}

function getStatusClass(driver: Driver): string {
  if (driver.problemCode && driver.problemCode !== 0) return 'error'
  if (driver.hasUpdate) return 'warning'
  return 'ok'
}

// 问题代码对应的原因描述
const problemCodeMap: Record<number, string> = {
  1: '设备配置不正确',
  3: '驱动程序可能已损坏',
  10: '设备无法启动',
  12: '没有足够的可用资源',
  14: '需要重启计算机',
  16: '无法识别设备使用的所有资源',
  18: '需要重新安装驱动程序',
  19: '注册表信息不完整或已损坏',
  21: 'Windows 正在删除此设备',
  22: '设备已被禁用',
  24: '设备不存在或未正常工作',
  28: '未安装设备驱动程序',
  29: '设备固件未提供所需资源',
  31: '设备运行不正常',
  32: '此设备的驱动程序已被阻止',
  33: 'Windows 无法确定所需资源',
  34: 'Windows 无法确定此设备的设置',
  35: '系统固件信息不足',
  36: '设备正在请求 PCI 中断',
  37: 'Windows 无法初始化设备驱动程序',
  38: '无法加载设备驱动程序',
  39: 'Windows 无法加载驱动程序',
  40: '注册表中的服务键信息不正确',
  41: 'Windows 已加载驱动程序但找不到设备',
  42: '系统中已运行重复设备',
  43: 'Windows 已停止此设备',
  44: '应用程序或服务已关闭此设备',
  45: '设备当前未连接',
  46: 'Windows 无法访问此设备',
  47: 'Windows 正在准备设备安全弹出',
  48: '设备驱动软件已被阻止',
  49: '系统注册表配置单元大小超限',
  50: 'Windows 无法应用设备属性',
  51: '设备正在等待另一设备启动',
  52: 'Windows 无法验证驱动程序签名',
  53: '设备已被 ARM 保留',
  54: 'UEFI 固件已禁用设备',
}

function getProblemReason(code: number): string {
  return problemCodeMap[code] || `未知错误 (代码: ${code})`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  // WMI 日期格式 YYYYMMDD...
  if (/^\d{8}/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  return dateStr
}

function formatScanTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

function getEmptyIcon(): string {
  switch (activeTab.value) {
    case 'problems': return '✅'
    case 'updates': return '👍'
    default: return '📭'
  }
}

function getEmptyText(): string {
  switch (activeTab.value) {
    case 'problems': return '没有发现问题驱动'
    case 'updates': return '所有驱动都是最新的'
    default: return '点击"扫描驱动"开始检测'
  }
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 3000)
}

async function handleScan(): Promise<void> {
  await scanDrivers()
}

async function scanDrivers(): Promise<void> {
  if (isScanning.value) return
  
  isScanning.value = true
  drivers.value = []
  scanProgress.current = 0
  scanProgress.total = 0
  
  try {
    // 使用流式扫描
    await window.electronAPI.scanDriversStreaming()
  } catch (error: any) {
    showToast(`扫描出错: ${error.message}`, 'error')
    isScanning.value = false
  }
}

// 处理扫描进度
function handleScanProgress(data: { current: number; total: number; drivers: Driver[] }) {
  scanProgress.current = data.current
  scanProgress.total = data.total
  // 追加新扫描到的驱动
  drivers.value = [...drivers.value, ...data.drivers]
}

// 处理扫描完成
function handleScanComplete(data: { total: number }) {
  isScanning.value = false
  lastScanTime.value = Date.now()
  showToast(`扫描完成，共 ${data.total} 个驱动`, 'success')
  
  // 同时检查更新
  checkUpdates()
}

async function checkUpdates(): Promise<void> {
  try {
    const result = await window.electronAPI.checkDriverUpdates()
    if (result.success && result.data) {
      const updateSet = new Set(result.data.map((u: any) => u.deviceId || u.DeviceID))
      drivers.value = drivers.value.map(d => ({
        ...d,
        hasUpdate: updateSet.has(d.deviceId)
      }))
    }
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}

async function installUpdate(driver: Driver): Promise<void> {
  installingId.value = driver.deviceId
  showToast(`正在更新 ${driver.friendlyName || driver.deviceName}...`, 'info')
  
  try {
    const result = await window.electronAPI.installDriverUpdate(driver.friendlyName || driver.deviceName)
    if (result.success) {
      driver.hasUpdate = false
      showToast('驱动更新成功', 'success')
    } else {
      showToast(result.error || '更新失败', 'error')
    }
  } catch (error: any) {
    showToast(`更新出错: ${error.message}`, 'error')
  } finally {
    installingId.value = null
  }
}

// 页面挂载时设置监听器并自动扫描
onMounted(() => {
  // 监听扫描进度
  window.electronAPI.onDriverScanProgress(handleScanProgress)
  window.electronAPI.onDriverScanComplete(handleScanComplete)
  
  const now = Date.now()
  // 如果没有扫描过，或距上次扫描超过5分钟，则自动扫描
  if (!lastScanTime.value || (now - lastScanTime.value) > CACHE_DURATION) {
    scanDrivers()
  }
})

// 页面卸载时移除监听器
onUnmounted(() => {
  window.electronAPI.removeDriverScanListeners()
})
</script>

<style scoped>
.driver-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 20px;
  overflow: hidden;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title-section h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
}

.scan-status {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  display: block;
}

.btn-scan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-scan:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-scan:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 进度条 */
.progress-section {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
  background-size: 200% 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  animation: shimmer 1.5s infinite linear;
}

.progress-fill.indeterminate {
  width: 30% !important;
  animation: indeterminate 1.5s infinite ease-in-out, shimmer 1.5s infinite linear;
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shine 2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(250%); }
  100% { transform: translateX(-100%); }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.progress-text {
  font-size: 13px;
  color: #aaa;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.scanning-icon {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

/* 选项卡行 */
.tabs-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 8px;
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: #fff;
  background: rgba(102, 126, 234, 0.3);
}

.tab-count {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.tab-btn.active .tab-count {
  background: rgba(102, 126, 234, 0.5);
}

/* 驱动内容区 */
.driver-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #888;
}

.loading-state p {
  margin-top: 16px;
  font-size: 14px;
}

.loading-hint {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #666;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

/* 驱动分组 */
.driver-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.driver-group {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.2);
  transition: background 0.15s;
}

.group-header:hover {
  background: rgba(0, 0, 0, 0.3);
}

.group-icon {
  font-size: 18px;
}

.group-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.group-count {
  font-size: 12px;
  color: #888;
  padding: 2px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.expand-icon {
  font-size: 10px;
  color: #666;
}

/* 驱动列表 */
.group-drivers {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.driver-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
}

.driver-item:last-child {
  border-bottom: none;
}

.driver-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.driver-item.has-problem {
  background: rgba(239, 68, 68, 0.08);
}

.driver-item.has-update {
  background: rgba(59, 130, 246, 0.08);
}

.driver-status {
  width: 24px;
  display: flex;
  justify-content: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.ok {
  background: #34d399;
}

.status-dot.warning {
  background: #fbbf24;
}

.status-dot.error {
  background: #ef4444;
}

.driver-info {
  flex: 1;
  min-width: 0;
}

.driver-name {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.driver-meta {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  font-size: 11px;
  color: #666;
}

.driver-meta span {
  white-space: nowrap;
}

.driver-problem {
  margin-top: 4px;
  font-size: 12px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.driver-actions {
  flex-shrink: 0;
}

.btn-update {
  padding: 6px 14px;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-update:hover:not(:disabled) {
  background: #2563eb;
}

.btn-update:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加载动画 */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.large {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #1e2139;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
}

.toast.success {
  border-color: rgba(52, 211, 153, 0.5);
}

.toast.error {
  border-color: rgba(239, 68, 68, 0.5);
}

/* 滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
