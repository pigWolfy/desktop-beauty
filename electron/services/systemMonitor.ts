import si from 'systeminformation'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 缓存网络速度数据
let cachedNetworkSpeeds: Map<string, { rx: number; tx: number }> = new Map()
let lastNetworkSpeedUpdate = 0

// 获取 Windows 网络速度（使用性能计数器）
async function getWindowsNetworkSpeeds(): Promise<Map<string, { rx: number; tx: number }>> {
  const now = Date.now()
  // 缓存 500ms，避免频繁调用
  if (now - lastNetworkSpeedUpdate < 500 && cachedNetworkSpeeds.size > 0) {
    return cachedNetworkSpeeds
  }
  
  try {
    // 使用 Network Adapter 而不是 Network Interface，因为前者包含虚拟网卡
    const { stdout } = await execAsync(
      `powershell -Command "Get-Counter '\\Network Adapter(*)\\Bytes Received/sec', '\\Network Adapter(*)\\Bytes Sent/sec' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty CounterSamples | Select-Object InstanceName, Path, CookedValue | ConvertTo-Json"`,
      { timeout: 3000 }
    )
    
    if (stdout.trim()) {
      const samples = JSON.parse(stdout)
      const sampleArray = Array.isArray(samples) ? samples : [samples]
      
      const speeds = new Map<string, { rx: number; tx: number }>()
      
      for (const sample of sampleArray) {
        const name = (sample.InstanceName || '').toLowerCase()
        const path = (sample.Path || '').toLowerCase()
        const value = sample.CookedValue || 0
        
        if (!speeds.has(name)) {
          speeds.set(name, { rx: 0, tx: 0 })
        }
        
        const entry = speeds.get(name)!
        if (path.includes('received')) {
          entry.rx = value
        } else if (path.includes('sent')) {
          entry.tx = value
        }
      }
      
      cachedNetworkSpeeds = speeds
      lastNetworkSpeedUpdate = now
      return speeds
    }
  } catch {
    // 忽略错误
  }
  
  return cachedNetworkSpeeds
}

// 检查 HWiNFO64 是否正在运行
async function isHWiNFORunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `powershell -Command "(Get-Process -Name 'HWiNFO64','HWiNFO32' -ErrorAction SilentlyContinue | Measure-Object).Count"`,
      { timeout: 3000 }
    )
    return parseInt(stdout.trim()) > 0
  } catch {
    return false
  }
}

// 尝试从 HWiNFO64 共享内存获取传感器数据
// HWiNFO 需要在设置中启用 "Shared Memory Support" 才能工作
async function getHWiNFOData(): Promise<{ voltage?: number; temperature?: number; hwInfoRunning?: boolean } | null> {
  try {
    // 首先检查 HWiNFO 是否运行
    const running = await isHWiNFORunning()
    if (!running) {
      return null
    }
    
    // 尝试通过注册表读取传感器数据（HWiNFO 在注册表中存储传感器值）
    const { stdout } = await execAsync(
      `powershell -Command "
        $result = @{}
        try {
          $sensors = Get-ChildItem 'HKCU:\\Software\\HWiNFO64\\VSB' -ErrorAction Stop 2>$null
          foreach ($sensor in $sensors) {
            $name = (Get-ItemProperty $sensor.PSPath -ErrorAction SilentlyContinue).Label
            $value = (Get-ItemProperty $sensor.PSPath -ErrorAction SilentlyContinue).Value
            if ($name -like '*CPU*' -and $name -like '*Temp*' -and $value) {
              $result['temperature'] = [float]$value
            }
            if ($name -like '*Vcore*' -and $value) {
              $result['voltage'] = [float]$value
            }
          }
        } catch {}
        $result | ConvertTo-Json
      "`,
      { timeout: 5000 }
    )
    
    if (stdout.trim() && stdout.trim() !== '{}') {
      const data = JSON.parse(stdout)
      if (data.temperature || data.voltage) {
        return data
      }
    }
    
    // HWiNFO 运行但没有数据可用 - 可能需要启用共享内存
    return { hwInfoRunning: true }
  } catch {
    return null
  }
}

// 尝试从 Open Hardware Monitor / LibreHardwareMonitor WMI 获取传感器数据
async function getHardwareMonitorData(): Promise<{ voltage?: number; temperature?: number; hwInfoRunning?: boolean } | null> {
  // 首先尝试 HWiNFO（推荐，不会触发 Defender）
  const hwInfoResult = await getHWiNFOData()
  if (hwInfoResult && (hwInfoResult.voltage || hwInfoResult.temperature)) {
    return hwInfoResult
  }
  
  // 备选：尝试外部运行的 OpenHardwareMonitor / LibreHardwareMonitor
  try {
    const namespaces = ['root\\OpenHardwareMonitor', 'root\\LibreHardwareMonitor']
    
    for (const ns of namespaces) {
      try {
        const { stdout } = await execAsync(
          `powershell -Command "Get-CimInstance -Namespace ${ns} -ClassName Sensor -ErrorAction Stop | Where-Object { ($_.SensorType -eq 'Voltage' -and $_.Name -like '*CPU*Core*') -or ($_.SensorType -eq 'Temperature' -and $_.Name -like '*CPU Package*') } | Select-Object Name, SensorType, Value | ConvertTo-Json"`,
          { timeout: 5000 }
        )
        
        if (stdout.trim()) {
          const sensors = JSON.parse(stdout)
          const sensorArray = Array.isArray(sensors) ? sensors : [sensors]
          
          const result: { voltage?: number; temperature?: number } = {}
          
          for (const sensor of sensorArray) {
            if (sensor.SensorType === 'Voltage' && !result.voltage) {
              result.voltage = sensor.Value
            }
            if (sensor.SensorType === 'Temperature' && !result.temperature) {
              result.temperature = sensor.Value
            }
          }
          
          return Object.keys(result).length > 0 ? result : null
        }
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

// 获取 Windows 实时 CPU 频率
async function getWindowsRealTimeSpeed(): Promise<{ speed: number; baseSpeed: number } | null> {
  try {
    // 使用性能计数器获取 CPU 性能百分比
    const { stdout: perfOutput } = await execAsync(
      'powershell -Command "(Get-Counter \'\\Processor Information(_Total)\\% Processor Performance\').CounterSamples.CookedValue"',
      { timeout: 3000 }
    )
    const perfPercent = parseFloat(perfOutput.trim())
    
    // 获取基础频率
    const { stdout: baseOutput } = await execAsync(
      'powershell -Command "(Get-CimInstance -ClassName Win32_Processor).MaxClockSpeed"',
      { timeout: 3000 }
    )
    const baseSpeedMhz = parseInt(baseOutput.trim())
    
    if (!isNaN(perfPercent) && !isNaN(baseSpeedMhz)) {
      const baseSpeed = baseSpeedMhz / 1000 // 转换为 GHz
      const realSpeed = (baseSpeed * perfPercent) / 100
      return { speed: realSpeed, baseSpeed }
    }
    return null
  } catch {
    return null
  }
}

interface SystemInfo {
  os: {
    platform: string
    distro: string
    release: string
    arch: string
    hostname: string
  }
  cpu: {
    manufacturer: string
    brand: string
    speed: number
    cores: number
  }
  memory: {
    total: number
    used: number
    free: number
  }
  graphics: {
    controllers: Array<{
      vendor: string
      model: string
      vram: number
    }>
  }
}

interface CpuUsage {
  currentLoad: number
  cores: number[]
  temperature?: number
  speed?: number         // 当前频率 GHz
  speedMin?: number      // 最小频率
  speedMax?: number      // 最大频率
  voltage?: number       // 核心电压 V
  hwInfoRunning?: boolean // HWiNFO 是否运行但没有共享数据
}

interface MemoryUsage {
  total: number
  used: number
  free: number
  usedPercent: number
  swapTotal: number
  swapUsed: number
}

interface DiskUsage {
  devices: Array<{
    name: string
    mount: string
    type: string
    size: number
    used: number
    available: number
    usedPercent: number
    diskType?: 'SSD' | 'HDD' | 'Unknown'
  }>
}

interface NetworkStats {
  interfaces: Array<{
    name: string
    ip4: string
    ip6: string
    mac: string
    rxBytes: number
    txBytes: number
    rxSpeed: number
    txSpeed: number
  }>
}

export class SystemMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null
  private lastNetworkStats: any = null

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const [osInfo, cpuInfo, memInfo, graphics] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.graphics()
      ])

      return {
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
          hostname: osInfo.hostname
        },
        cpu: {
          manufacturer: cpuInfo.manufacturer,
          brand: cpuInfo.brand,
          speed: cpuInfo.speed,
          cores: cpuInfo.cores
        },
        memory: {
          total: memInfo.total,
          used: memInfo.used,
          free: memInfo.free
        },
        graphics: {
          controllers: graphics.controllers.map(c => ({
            vendor: c.vendor,
            model: c.model,
            vram: c.vram || 0
          }))
        }
      }
    } catch (error) {
      console.error('Failed to get system info:', error)
      throw error
    }
  }

  async getCpuUsage(): Promise<CpuUsage> {
    try {
      const [load, speed, realTimeSpeed, hwMonitor] = await Promise.all([
        si.currentLoad(),
        si.cpuCurrentSpeed().catch(() => null),
        getWindowsRealTimeSpeed().catch(() => null),
        getHardwareMonitorData().catch(() => null)
      ])

      // 优先使用 Windows 实时频率，否则使用 systeminformation 的值
      const currentSpeed = realTimeSpeed?.speed ?? speed?.avg
      const baseSpeed = realTimeSpeed?.baseSpeed ?? speed?.min
      
      // 温度和电压只信任专业硬件监控软件的数据
      // systeminformation 的温度数据在很多情况下不准确，不使用

      return {
        currentLoad: load.currentLoad,
        cores: load.cpus.map(cpu => cpu.load),
        temperature: hwMonitor?.temperature,  // 只使用硬件监控软件的数据
        speed: currentSpeed,
        speedMin: baseSpeed,
        speedMax: speed?.max,
        voltage: hwMonitor?.voltage,
        hwInfoRunning: hwMonitor?.hwInfoRunning  // HWiNFO 运行但无数据
      }
    } catch (error) {
      console.error('Failed to get CPU usage:', error)
      throw error
    }
  }

  async getMemoryUsage(): Promise<MemoryUsage> {
    try {
      const mem = await si.mem()

      return {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: (mem.used / mem.total) * 100,
        swapTotal: mem.swaptotal,
        swapUsed: mem.swapused
      }
    } catch (error) {
      console.error('Failed to get memory usage:', error)
      throw error
    }
  }

  async getDiskUsage(): Promise<DiskUsage> {
    try {
      const [disks, diskLayout] = await Promise.all([
        si.fsSize(),
        si.diskLayout()
      ])
      
      // 创建磁盘类型映射（根据设备名或序号）
      const diskTypeMap = new Map<number, 'SSD' | 'HDD' | 'Unknown'>()
      diskLayout.forEach((disk, index) => {
        const type = disk.type?.toUpperCase()
        if (type?.includes('SSD') || type?.includes('NVME') || type?.includes('SOLID')) {
          diskTypeMap.set(index, 'SSD')
        } else if (type?.includes('HDD') || type?.includes('HD')) {
          diskTypeMap.set(index, 'HDD')
        } else {
          // 根据转速判断：SSD没有转速或转速为0
          diskTypeMap.set(index, disk.type === 'SSD' ? 'SSD' : (disk.interfaceType?.includes('NVMe') ? 'SSD' : 'Unknown'))
        }
      })

      return {
        devices: disks.map((disk, index) => ({
          name: disk.fs,
          mount: disk.mount,
          type: disk.type,
          size: disk.size,
          used: disk.used,
          available: disk.available,
          usedPercent: disk.use,
          diskType: diskTypeMap.get(index) || 'Unknown'
        }))
      }
    } catch (error) {
      console.error('Failed to get disk usage:', error)
      throw error
    }
  }

  async getNetworkStats(): Promise<NetworkStats> {
    try {
      const [interfaces, stats, windowsSpeeds] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats(),
        getWindowsNetworkSpeeds()
      ])

      const interfaceArray = Array.isArray(interfaces) ? interfaces : [interfaces]
      const statsArray = Array.isArray(stats) ? stats : [stats]

      // 计算网速
      const now = Date.now()
      const result: NetworkStats = {
        interfaces: interfaceArray.map((iface: any) => {
          const ifaceStats = statsArray.find((s: any) => s.iface === iface.iface) || {} as any
          
          let rxSpeed = 0
          let txSpeed = 0
          
          // 优先使用 Windows 性能计数器的速率（更准确）
          // 使用 ifaceName（硬件名称）来匹配，而不是 iface（友好名称）
          const ifaceName = (iface.ifaceName || iface.iface || '').toLowerCase()
            .replace(/#/g, '_')  // Windows 用 # 表示编号，性能计数器用 _
            .replace(/\s+/g, ' ') // 规范化空格
          
          // 尝试匹配网络接口名称
          let matchedSpeed: { rx: number; tx: number } | undefined
          let bestMatchScore = 0
          
          for (const [name, speeds] of windowsSpeeds.entries()) {
            const counterName = name.toLowerCase()
            let score = 0
            
            // 精确匹配得最高分
            if (counterName === ifaceName) {
              score = 1000
            }
            // 完全包含匹配（较长的包含较短的）
            else if (counterName.includes(ifaceName) && ifaceName.length > 10) {
              // counterName 比 ifaceName 长，扣分（避免 "adapter _2" 匹配到 "adapter"）
              score = ifaceName.length - (counterName.length - ifaceName.length) * 10
            }
            else if (ifaceName.includes(counterName) && counterName.length > 10) {
              // ifaceName 比 counterName 长，扣分
              score = counterName.length - (ifaceName.length - counterName.length) * 10
            }
            
            // 只有正分且比之前的匹配更好才更新
            if (score > bestMatchScore && score > 0) {
              bestMatchScore = score
              matchedSpeed = speeds
            }
          }
          
          if (matchedSpeed && (matchedSpeed.rx > 0 || matchedSpeed.tx > 0)) {
            rxSpeed = matchedSpeed.rx
            txSpeed = matchedSpeed.tx
          } else if (ifaceStats.rx_sec !== null && ifaceStats.rx_sec !== undefined) {
            // 备选：使用 systeminformation 提供的速率
            rxSpeed = ifaceStats.rx_sec
            txSpeed = ifaceStats.tx_sec || 0
          } else if (this.lastNetworkStats) {
            // 最后备选：手动计算速率
            const lastStats = this.lastNetworkStats.stats.find((s: any) => s.iface === iface.iface)
            if (lastStats && lastStats.rx_bytes !== undefined) {
              const timeDiff = (now - this.lastNetworkStats.time) / 1000
              if (timeDiff > 0) {
                rxSpeed = Math.max(0, ((ifaceStats.rx_bytes || 0) - (lastStats.rx_bytes || 0)) / timeDiff)
                txSpeed = Math.max(0, ((ifaceStats.tx_bytes || 0) - (lastStats.tx_bytes || 0)) / timeDiff)
              }
            }
          }

          return {
            name: iface.iface,
            ip4: iface.ip4 || '',
            ip6: iface.ip6 || '',
            mac: iface.mac || '',
            rxBytes: ifaceStats.rx_bytes || 0,
            txBytes: ifaceStats.tx_bytes || 0,
            rxSpeed: Math.max(0, rxSpeed),
            txSpeed: Math.max(0, txSpeed)
          }
        })
      }

      this.lastNetworkStats = {
        time: now,
        stats: statsArray
      }

      return result
    } catch (error) {
      console.error('Failed to get network stats:', error)
      throw error
    }
  }

  startMonitoring(callback: (data: any) => void, interval: number = 1000): void {
    this.stopMonitoring()
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const [cpu, memory, network] = await Promise.all([
          this.getCpuUsage(),
          this.getMemoryUsage(),
          this.getNetworkStats()
        ])
        
        callback({ cpu, memory, network })
      } catch (error) {
        console.error('Monitoring error:', error)
      }
    }, interval)
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
}
