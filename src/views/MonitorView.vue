<template>
  <div class="monitor-view">
    <h1 class="page-title">{{ t('monitor.title') }}</h1>

    <!-- 系统信息概览 -->
    <div class="info-section">
      <h3 class="section-title">{{ t('monitor.systemInfo') }}</h3>
      <div class="grid grid-4 gap-md">
        <!-- 加载状态骨架屏 -->
        <template v-if="isLoadingInfo">
          <div v-for="i in 4" :key="i" class="info-card skeleton-card">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
            </div>
          </div>
        </template>
        <!-- 实际数据 -->
        <template v-else>
          <div class="info-card">
            <span class="info-icon">🖥️</span>
            <div class="info-content">
              <span class="info-label">{{ t('monitor.os') }}</span>
              <span class="info-value">{{ systemInfo.os?.distro || '-' }}</span>
            </div>
          </div>
          <div class="info-card">
            <span class="info-icon">⚙️</span>
            <div class="info-content">
              <span class="info-label">{{ t('monitor.processor') }}</span>
              <span class="info-value">{{ systemInfo.cpu?.brand || '-' }}</span>
            </div>
          </div>
          <div class="info-card">
            <span class="info-icon">📊</span>
            <div class="info-content">
              <span class="info-label">{{ t('monitor.memory') }}</span>
              <span class="info-value">{{ formatBytes(systemInfo.memory?.total) }}</span>
            </div>
          </div>
          <div class="info-card">
            <span class="info-icon">🎮</span>
            <div class="info-content">
              <span class="info-label">{{ t('monitor.gpu') }}</span>
              <span class="info-value">{{ systemInfo.graphics?.controllers?.[0]?.model || '-' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 实时监控 -->
    <div class="monitor-section mt-lg">
      <h3 class="section-title">{{ t('monitor.realTimeMonitor') }}</h3>
      <div class="grid grid-2 gap-lg">
        <!-- 加载状态骨架屏 -->
        <template v-if="isLoadingMonitor">
          <div class="monitor-card card skeleton-monitor">
            <div class="skeleton-header">
              <div class="skeleton-line title-line"></div>
              <div class="skeleton-line value-line"></div>
            </div>
            <div class="skeleton-progress"></div>
            <div class="skeleton-stats">
              <div class="skeleton-stat" v-for="i in 4" :key="i"></div>
            </div>
            <div class="skeleton-cores">
              <div class="skeleton-core" v-for="i in 8" :key="i"></div>
            </div>
          </div>
          <div class="monitor-card card skeleton-monitor">
            <div class="skeleton-header">
              <div class="skeleton-line title-line"></div>
              <div class="skeleton-line value-line"></div>
            </div>
            <div class="skeleton-progress"></div>
            <div class="skeleton-details">
              <div class="skeleton-detail" v-for="i in 3" :key="i">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
              </div>
            </div>
          </div>
        </template>

        <!-- 实际数据 -->
        <template v-else>
          <!-- CPU 使用率 -->
          <div class="monitor-card card">
            <div class="monitor-header">
              <span class="monitor-title">{{ t('monitor.cpuUsage') }}</span>
              <span class="monitor-value" :class="getCpuClass(cpuUsage.currentLoad)">
                {{ cpuUsage.currentLoad?.toFixed(1) || 0 }}%
              </span>
            </div>
            <div class="progress-bar large">
              <div 
                class="progress-fill cpu" 
                :style="{ width: (cpuUsage.currentLoad || 0) + '%' }"
              ></div>
            </div>
            
            <!-- CPU 频率 -->
            <div class="cpu-stats">
              <div class="cpu-stat-item">
                <span class="stat-icon">⚡</span>
                <span class="stat-label">{{ t('monitor.currentFreq') }}</span>
                <span class="stat-value">{{ cpuUsage.speed?.toFixed(2) || '-' }} GHz</span>
              </div>
              <div class="cpu-stat-item" v-if="cpuUsage.speedMin">
                <span class="stat-icon">📉</span>
                <span class="stat-label">{{ t('monitor.baseFreq') }}</span>
                <span class="stat-value">{{ cpuUsage.speedMin?.toFixed(2) }} GHz</span>
              </div>
            </div>

          <div class="core-grid" v-if="cpuUsage.cores?.length">
            <div 
              v-for="(core, index) in cpuUsage.cores" 
              :key="index" 
              class="core-item"
            >
              <span class="core-label">{{ t('monitor.cores') }} {{ index + 1 }}</span>
              <div class="core-bar">
                <div class="core-fill" :style="{ width: core + '%' }"></div>
              </div>
              <span class="core-value">{{ core.toFixed(0) }}%</span>
            </div>
          </div>
        </div>

        <!-- 内存使用率 -->
        <div class="monitor-card card">
          <div class="monitor-header">
            <span class="monitor-title">{{ t('monitor.memoryUsage') }}</span>
            <span class="monitor-value" :class="getMemoryClass(memoryUsage.usedPercent)">
              {{ memoryUsage.usedPercent?.toFixed(1) || 0 }}%
            </span>
          </div>
          <div class="progress-bar large">
            <div 
              class="progress-fill memory" 
              :style="{ width: (memoryUsage.usedPercent || 0) + '%' }"
            ></div>
          </div>
          <div class="memory-details">
            <div class="memory-item">
              <span class="label">{{ t('monitor.used') }}</span>
              <span class="value">{{ formatBytes(memoryUsage.used) }}</span>
            </div>
            <div class="memory-item">
              <span class="label">{{ t('monitor.available') }}</span>
              <span class="value">{{ formatBytes(memoryUsage.free) }}</span>
            </div>
            <div class="memory-item">
              <span class="label">{{ t('monitor.total') }}</span>
              <span class="value">{{ formatBytes(memoryUsage.total) }}</span>
            </div>
          </div>
        </div>
        </template>
      </div>
    </div>

    <!-- 磁盘使用 -->
    <div class="disk-section mt-lg">
      <h3 class="section-title">{{ t('monitor.diskInfo') }}</h3>
      <div class="disk-list">
        <div 
          v-for="disk in diskUsage.devices" 
          :key="disk.mount" 
          class="disk-item card"
        >
          <div class="disk-icon">💿</div>
          <div class="disk-info">
            <div class="disk-header">
              <span class="disk-name">{{ disk.mount }}</span>
              <span class="disk-type">{{ disk.type }}</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill disk" 
                :style="{ width: disk.usedPercent + '%' }"
                :class="{ warning: disk.usedPercent > 80, danger: disk.usedPercent > 90 }"
              ></div>
            </div>
            <div class="disk-stats">
              <span>{{ formatBytes(disk.used) }} / {{ formatBytes(disk.size) }}</span>
              <span class="disk-percent">{{ disk.usedPercent?.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 网络状态 -->
    <div class="network-section mt-lg">
      <h3 class="section-title">{{ t('monitor.networkInfo') }}</h3>
      <div class="network-grid">
        <div 
          v-for="iface in networkStats.interfaces?.filter(i => i.ip4)" 
          :key="iface.name" 
          class="network-card card"
        >
          <div class="network-header">
            <span class="network-name">{{ iface.name }}</span>
            <span class="network-ip">{{ iface.ip4 }}</span>
          </div>
          <div class="network-stats">
            <div class="stat-item">
              <span class="stat-icon">⬇️</span>
              <span class="stat-label">{{ t('monitor.download') }}</span>
              <span class="stat-value">{{ formatSpeed(iface.rxSpeed) }}/s</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">⬆️</span>
              <span class="stat-label">{{ t('monitor.upload') }}</span>
              <span class="stat-value">{{ formatSpeed(iface.txSpeed) }}/s</span>
            </div>
          </div>
          <div class="network-total">
            <span>{{ t('monitor.received') }}: {{ formatBytes(iface.rxBytes) }}</span>
            <span>{{ t('monitor.sent') }}: {{ formatBytes(iface.txBytes) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface SystemInfo {
  os?: { platform: string; distro: string; release: string }
  cpu?: { manufacturer: string; brand: string; cores: number }
  memory?: { total: number; used: number; free: number }
  graphics?: { controllers: Array<{ model: string }> }
}

interface CpuUsage {
  currentLoad: number
  cores: number[]
  temperature?: number
  speed?: number
  speedMin?: number
  speedMax?: number
  voltage?: number
  hwInfoRunning?: boolean
}

interface MemoryUsage {
  total: number
  used: number
  free: number
  usedPercent: number
}

interface DiskUsage {
  devices: Array<{
    mount: string
    type: string
    size: number
    used: number
    usedPercent: number
  }>
}

interface NetworkStats {
  interfaces: Array<{
    name: string
    ip4: string
    rxBytes: number
    txBytes: number
    rxSpeed: number
    txSpeed: number
  }>
}

const systemInfo = reactive<SystemInfo>({})
const cpuUsage = reactive<CpuUsage>({ currentLoad: 0, cores: [] })
const memoryUsage = reactive<MemoryUsage>({ total: 0, used: 0, free: 0, usedPercent: 0 })
const diskUsage = reactive<DiskUsage>({ devices: [] })
const networkStats = reactive<NetworkStats>({ interfaces: [] })
const isLoadingInfo = ref(true)
const isLoadingMonitor = ref(true)

let refreshTimer: number

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${units[i]}`
}

const formatSpeed = (bytesPerSec?: number): string => {
  return formatBytes(bytesPerSec)
}

const getCpuClass = (load?: number): string => {
  if (!load) return ''
  if (load > 90) return 'danger'
  if (load > 70) return 'warning'
  return 'good'
}

const getMemoryClass = (percent?: number): string => {
  if (!percent) return ''
  if (percent > 90) return 'danger'
  if (percent > 75) return 'warning'
  return 'good'
}

const loadSystemInfo = async () => {
  try {
    const info = await window.electronAPI?.getSystemInfo()
    if (info) {
      Object.assign(systemInfo, info)
    }
  } catch (e) {
    console.error('Failed to load system info:', e)
  } finally {
    isLoadingInfo.value = false
  }
}

const updateMonitorData = async () => {
  try {
    const [cpu, memory, disk, network] = await Promise.all([
      window.electronAPI?.getCpuUsage(),
      window.electronAPI?.getMemoryUsage(),
      window.electronAPI?.getDiskUsage(),
      window.electronAPI?.getNetworkStats()
    ])

    if (cpu) Object.assign(cpuUsage, cpu)
    if (memory) Object.assign(memoryUsage, memory)
    if (disk) Object.assign(diskUsage, disk)
    if (network) Object.assign(networkStats, network)
    
    isLoadingMonitor.value = false
  } catch (e) {
    console.error('Failed to update monitor data:', e)
    isLoadingMonitor.value = false
  }
}

onMounted(async () => {
  await loadSystemInfo()
  await updateMonitorData()
  refreshTimer = window.setInterval(updateMonitorData, 1500)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})
</script>

<style lang="scss" scoped>
.monitor-view {
  animation: fadeIn 0.3s ease;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: $bg-card;
  border-radius: $border-radius;

  .info-icon {
    font-size: 28px;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    .info-label {
      font-size: 12px;
      color: $text-muted;
    }

    .info-value {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

// 骨架屏样式
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-card {
  display: flex;
  align-items: center;
  gap: 16px;

  .skeleton-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }

  .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-line {
    height: 14px;
    border-radius: 4px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;

    &.short {
      width: 40%;
      height: 12px;
    }
  }
}

// 实时监控骨架屏
.skeleton-monitor {
  .skeleton-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .title-line {
      width: 100px;
      height: 18px;
    }

    .value-line {
      width: 60px;
      height: 24px;
    }
  }

  .skeleton-progress {
    height: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }

  .skeleton-stats {
    display: flex;
    gap: 24px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    margin-bottom: 16px;

    .skeleton-stat {
      width: 80px;
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }
  }

  .skeleton-cores {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;

    .skeleton-core {
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }
  }

  .skeleton-details {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;

    .skeleton-detail {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .skeleton-line {
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;

        &.short {
          width: 50%;
          height: 12px;
        }
      }
    }
  }
}

.monitor-card {
  .monitor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .monitor-title {
      font-size: 16px;
      font-weight: 600;
    }

    .monitor-value {
      font-size: 24px;
      font-weight: 700;

      &.good { color: #00b894; }
      &.warning { color: #fdcb6e; }
      &.danger { color: $accent-primary; }
    }
  }
}

.progress-bar {
  height: 8px;
  background: $bg-secondary;
  border-radius: 4px;
  overflow: hidden;

  &.large {
    height: 12px;
    border-radius: 6px;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    transition: width 0.5s ease;

    &.cpu {
      background: linear-gradient(90deg, #00b894, #00cec9);
    }

    &.memory {
      background: linear-gradient(90deg, #6c5ce7, #a29bfe);
    }

    &.disk {
      background: linear-gradient(90deg, #0984e3, #74b9ff);

      &.warning {
        background: linear-gradient(90deg, #fdcb6e, #f39c12);
      }

      &.danger {
        background: linear-gradient(90deg, #e17055, $accent-primary);
      }
    }
  }
}

.cpu-stats {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding: 12px 16px;
  background: $bg-secondary;
  border-radius: $border-radius-sm;

  .cpu-stat-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .stat-icon {
      font-size: 16px;
    }

    .stat-label {
      font-size: 12px;
      color: $text-muted;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;

      &.good {
        color: $success-color;
      }

      &.warning {
        color: $warning-color;
      }

      &.danger {
        color: $accent-primary;
      }
    }
  }
}

.core-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.core-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: $bg-secondary;
  border-radius: $border-radius-sm;

  .core-label {
    font-size: 11px;
    color: $text-muted;
    width: 50px;
  }

  .core-bar {
    flex: 1;
    height: 4px;
    background: $bg-card;
    border-radius: 2px;
    overflow: hidden;

    .core-fill {
      height: 100%;
      background: $accent-primary;
      transition: width 0.3s ease;
    }
  }

  .core-value {
    font-size: 11px;
    width: 32px;
    text-align: right;
  }
}

.memory-details {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid $border-color;

  .memory-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label {
      font-size: 12px;
      color: $text-muted;
    }

    .value {
      font-size: 14px;
      font-weight: 600;
    }
  }
}

.disk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disk-item {
  display: flex;
  gap: 16px;
  padding: 16px;

  .disk-icon {
    font-size: 32px;
  }

  .disk-info {
    flex: 1;

    .disk-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      .disk-name {
        font-weight: 600;
      }

      .disk-type {
        font-size: 12px;
        color: $text-muted;
      }
    }

    .disk-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: $text-secondary;

      .disk-percent {
        font-weight: 600;
        color: $text-primary;
      }
    }
  }
}

.network-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.network-card {
  padding: 16px;

  .network-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;

    .network-name {
      font-weight: 600;
    }

    .network-ip {
      font-size: 12px;
      color: $text-muted;
      font-family: monospace;
    }
  }

  .network-stats {
    display: flex;
    gap: 24px;
    margin-bottom: 12px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .stat-icon {
        font-size: 14px;
      }

      .stat-label {
        font-size: 12px;
        color: $text-muted;
      }

      .stat-value {
        font-size: 14px;
        font-weight: 600;
        color: $accent-primary;
      }
    }
  }

  .network-total {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: $text-muted;
    padding-top: 12px;
    border-top: 1px solid $border-color;
  }
}
</style>
