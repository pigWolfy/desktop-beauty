import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'

const execAsync = promisify(exec)

// 执行 PowerShell 命令
async function execPowerShell(script: string, timeout = 30000): Promise<string> {
  const tempFile = path.join(app.getPath('temp'), `cpu_check_${Date.now()}.ps1`)
  const fullScript = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
${script}`
  
  fs.writeFileSync(tempFile, fullScript, 'utf-8')
  
  try {
    const { stdout } = await execAsync(
      `chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout, encoding: 'utf8' }
    )
    fs.unlinkSync(tempFile)
    return stdout
  } catch (error) {
    try { fs.unlinkSync(tempFile) } catch {}
    throw error
  }
}

// 受影响的 Intel CPU 型号（13/14代桌面级）
const AFFECTED_CPUS = [
  // 14代 Raptor Lake Refresh
  'i9-14900K', 'i9-14900KF', 'i9-14900KS',
  'i7-14700K', 'i7-14700KF',
  // 13代 Raptor Lake
  'i9-13900K', 'i9-13900KF', 'i9-13900KS',
  'i7-13700K', 'i7-13700KF',
  'i5-13600K', 'i5-13600KF',
  // 特别版
  'i9-14900', 'i7-14700', 'i9-13900', 'i7-13700'
]

// 已修复问题的微码版本（Intel 2024年9月发布 0x12B）
const FIXED_MICROCODE_VERSIONS: Record<string, number> = {
  // Raptor Lake / Raptor Lake Refresh 修复微码
  // 0x129 (297): 限制电压请求 (2024/08)
  // 0x12B (299): 修复空闲/轻负载电压偏移 (2024/09) - 推荐版本
  'B0': 0x0129,  // 基础修复阈值
  'C0': 0x0125,  // i7/i5 非K系列通常不受影响或阈值较低
  'default': 0x0129
}

const LATEST_MICROCODE_THRESHOLD = 0x012B // 最佳版本阈值

export interface CpuInfo {
  name: string
  manufacturer: string
  cores: number
  threads: number
  baseSpeed: number
  maxSpeed: number
  architecture: string
  family: number
  model: number
  stepping: number
  revision: string
  socketDesignation: string
  l2Cache: number
  l3Cache: number
}

export interface MicrocodeInfo {
  version: string
  versionHex: number
  updateDate: string
  isFixed: boolean
  recommendation: string
}

export interface WheaError {
  timeCreated: string
  errorType: string
  errorSource: string
  description: string
  processorNumber?: number
}

export interface CpuHealthReport {
  timestamp: string
  cpuInfo: CpuInfo
  isAffectedCpu: boolean
  affectedReason: string
  microcodeInfo: MicrocodeInfo
  wheaErrors: WheaError[]
  wheaErrorCount: number
  recentCrashes: number
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  recommendations: string[]
  detailedAnalysis: string[]
}

// 获取 CPU 详细信息
export async function getCpuInfo(): Promise<CpuInfo> {
  const script = `
$cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
[PSCustomObject]@{
  name = $cpu.Name
  manufacturer = $cpu.Manufacturer
  cores = $cpu.NumberOfCores
  threads = $cpu.NumberOfLogicalProcessors
  baseSpeed = $cpu.MaxClockSpeed
  maxSpeed = $cpu.MaxClockSpeed
  architecture = $cpu.Architecture
  family = $cpu.Family
  model = $cpu.Model  
  stepping = $cpu.Stepping
  revision = $cpu.Revision
  socket = $cpu.SocketDesignation
  l2 = $cpu.L2CacheSize
  l3 = $cpu.L3CacheSize
} | ConvertTo-Json
`
  const result = await execPowerShell(script)
  const data = JSON.parse(result.trim())
  
  return {
    name: data.name || 'Unknown',
    manufacturer: data.manufacturer || 'Unknown',
    cores: data.cores || 0,
    threads: data.threads || 0,
    baseSpeed: data.baseSpeed || 0,
    maxSpeed: data.maxSpeed || 0,
    architecture: data.architecture?.toString() || 'Unknown',
    family: data.family || 0,
    model: data.model || 0,
    stepping: data.stepping || 0,
    revision: data.revision?.toString() || 'Unknown',
    socketDesignation: data.socket || 'Unknown',
    l2Cache: data.l2 || 0,
    l3Cache: data.l3 || 0
  }
}

// 获取微码信息
export async function getMicrocodeInfo(): Promise<MicrocodeInfo> {
  const script = `
# 从注册表获取微码版本
$microcode = $null
try {
  $key = "HKLM:\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0"
  $update = Get-ItemProperty -Path $key -Name "Update Revision" -ErrorAction SilentlyContinue
  if ($update) {
    $bytes = $update."Update Revision"
    if ($bytes -is [byte[]] -and $bytes.Length -ge 4) {
      # 微码版本在前4字节，小端序
      $microcode = [BitConverter]::ToUInt32($bytes, 0)
    } elseif ($bytes -is [int]) {
      $microcode = $bytes
    }
  }
  
  # 备选：从 Previous Update Revision 获取
  if (-not $microcode -or $microcode -eq 0) {
    $prev = Get-ItemProperty -Path $key -Name "Previous Update Revision" -ErrorAction SilentlyContinue
    if ($prev) {
      $bytes = $prev."Previous Update Revision"
      if ($bytes -is [byte[]] -and $bytes.Length -ge 4) {
        $microcode = [BitConverter]::ToUInt32($bytes, 0)
      } elseif ($bytes -is [int]) {
        $microcode = $bytes
      }
    }
  }
} catch {}

# 获取 BIOS 日期作为参考
$biosDateStr = $null
try {
  $bios = Get-CimInstance -ClassName Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($bios -and $bios.ReleaseDate) {
    $biosDateStr = $bios.ReleaseDate.ToString("yyyy-MM-dd")
  }
} catch {}

[PSCustomObject]@{
  microcode = $microcode
  biosDate = $biosDateStr
} | ConvertTo-Json
`
  try {
    const result = await execPowerShell(script)
    const data = JSON.parse(result.trim())
    
    const version = data.microcode || 0
    const versionHex = `0x${version.toString(16).toUpperCase().padStart(4, '0')}`
    
    // 判断是否为修复版本
    const threshold = FIXED_MICROCODE_VERSIONS['default']
    const isFixed = version >= threshold
    const isLatest = version >= LATEST_MICROCODE_THRESHOLD
    
    let recommendation = ''
    if (version === 0) {
      recommendation = '无法读取微码版本，请确保以管理员权限运行'
    } else if (isLatest) {
      recommendation = '微码版本已更新至最新 (0x12B+)，包含完整的电压稳定性修复 ✓'
    } else if (isFixed) {
      recommendation = '微码已包含基础修复 (0x129)，建议更新至 0x12B 以获得最佳保护'
    } else {
      recommendation = '⚠️ 微码版本较旧，建议立即更新BIOS以获取Intel稳定性修复'
    }
    
    return {
      version: versionHex,
      versionHex: version,
      updateDate: data.biosDate || 'Unknown',
      isFixed,
      recommendation
    }
  } catch (error) {
    console.error('Failed to get microcode info:', error)
    return {
      version: '0x0000',
      versionHex: 0,
      updateDate: 'Unknown',
      isFixed: false,
      recommendation: '无法读取微码版本，请确保以管理员权限运行'
    }
  }
}

// 获取 WHEA 错误日志（Windows Hardware Error Architecture）
export async function getWheaErrors(days: number = 30): Promise<WheaError[]> {
  const script = `
$startDate = (Get-Date).AddDays(-${days})
$errors = @()

try {
  # 查询 WHEA 错误事件
  $wheaEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    ProviderName = 'Microsoft-Windows-WHEA-Logger'
    StartTime = $startDate
  } -MaxEvents 100 -ErrorAction SilentlyContinue

  foreach ($event in $wheaEvents) {
    $errors += [PSCustomObject]@{
      time = $event.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
      id = $event.Id
      type = switch ($event.Id) {
        17 { "硬件错误已更正" }
        18 { "硬件错误 - 致命" }
        19 { "硬件错误 - 已更正 (缓存)" }
        20 { "硬件错误 - 致命 (处理器)" }
        47 { "处理器核心错误" }
        default { "硬件错误 (ID: $($event.Id))" }
      }
      source = "WHEA"
      desc = $event.Message.Substring(0, [Math]::Min(200, $event.Message.Length))
    }
  }
  
  # 查询 Machine Check Exception 事件
  $mceEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    Id = 41, 1001, 6008
    StartTime = $startDate
  } -MaxEvents 50 -ErrorAction SilentlyContinue
  
  foreach ($event in $mceEvents) {
    $errors += [PSCustomObject]@{
      time = $event.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
      id = $event.Id
      type = switch ($event.Id) {
        41 { "系统意外重启 (Kernel-Power)" }
        1001 { "蓝屏错误 (BugCheck)" }
        6008 { "意外关机" }
        default { "系统错误" }
      }
      source = $event.ProviderName
      desc = if ($event.Message) { $event.Message.Substring(0, [Math]::Min(200, $event.Message.Length)) } else { "" }
    }
  }
} catch {
  # 忽略错误
}

$errors | ConvertTo-Json -Compress
`
  
  try {
    const result = await execPowerShell(script, 60000)
    if (!result.trim() || result.trim() === 'null') {
      return []
    }
    
    const errors = JSON.parse(result.trim())
    return (Array.isArray(errors) ? errors : [errors]).map(e => ({
      timeCreated: e.time || '',
      errorType: e.type || 'Unknown',
      errorSource: e.source || '',
      description: e.desc || ''
    }))
  } catch {
    return []
  }
}

// 获取最近蓝屏次数
export async function getRecentCrashCount(days: number = 30): Promise<number> {
  const script = `
$count = 0
try {
  $startDate = (Get-Date).AddDays(-${days})
  $crashes = Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    Id = 41, 1001
    StartTime = $startDate
  } -ErrorAction SilentlyContinue
  $count = ($crashes | Measure-Object).Count
} catch {}
$count
`
  try {
    const result = await execPowerShell(script)
    return parseInt(result.trim(), 10) || 0
  } catch {
    return 0
  }
}

// 检查CPU是否为受影响型号
function checkIfAffectedCpu(cpuName: string): { isAffected: boolean; reason: string } {
  const name = cpuName.toUpperCase()
  
  // 检查是否为 Intel
  if (!name.includes('INTEL')) {
    return { isAffected: false, reason: '非Intel处理器，不受此问题影响' }
  }
  
  // 检查是否为 K 系列（高性能版，主要受影响）
  const isKSeries = /I[579]-1[34]\d{3}K[FS]?/i.test(name)
  
  // 检查是否为桌面级 13/14 代
  const is13thGen = /I[579]-13\d{3}/i.test(name)
  const is14thGen = /I[579]-14\d{3}/i.test(name)
  
  if (!is13thGen && !is14thGen) {
    return { isAffected: false, reason: '非13/14代处理器，不受"缩缸"问题影响' }
  }
  
  // 提取具体型号
  const modelMatch = name.match(/I[579]-1[34]\d{3}[A-Z]*/i)
  const modelName = modelMatch ? modelMatch[0] : ''
  
  // K/KF/KS 系列是主要受影响的
  if (isKSeries) {
    return { 
      isAffected: true, 
      reason: `检测到 ${modelName}，这是受"缩缸"问题影响的K系列高性能处理器！` 
    }
  }
  
  // 非K系列的13/14代（低功耗版/移动版风险较低）
  // i5-13400/14400 及以下通常是 Alder Lake 架构马甲，不受影响
  // i5-13600/14600 及以上非K版受影响
  if (is13thGen || is14thGen) {
    // i9/i7 非K版也有一定风险
    if (name.includes('I9') || name.includes('I7')) {
      return { 
        isAffected: true, 
        reason: `检测到 ${modelName}，属于13/14代处理器，存在一定风险` 
      }
    }
    // i5-13600 / 14600 (非K)
    if (/I5-1[34]600/.test(name)) {
       return { 
        isAffected: true, 
        reason: `检测到 ${modelName}，属于13/14代处理器，存在一定风险` 
      }
    }

    return { 
      isAffected: false, 
      reason: `检测到 ${modelName}，为13/14代低功耗版本，风险较低` 
    }
  }
  
  return { isAffected: false, reason: '未识别为受影响型号' }
}

// 计算风险等级
function calculateRiskLevel(
  isAffectedCpu: boolean,
  isFixed: boolean,
  wheaCount: number,
  crashCount: number
): { level: 'safe' | 'low' | 'medium' | 'high' | 'critical'; score: number } {
  let score = 0
  
  // 基础分数
  if (!isAffectedCpu) {
    return { level: 'safe', score: 0 }
  }
  
  // 受影响CPU基础分 30
  score += 30
  
  // 微码未修复 +20
  if (!isFixed) {
    score += 20
  }
  
  // WHEA错误计分
  if (wheaCount > 0) {
    score += Math.min(wheaCount * 5, 25)
  }
  
  // 崩溃次数计分  
  if (crashCount > 0) {
    score += Math.min(crashCount * 8, 25)
  }
  
  let level: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  if (score <= 20) level = 'safe'
  else if (score <= 40) level = 'low'
  else if (score <= 60) level = 'medium'
  else if (score <= 80) level = 'high'
  else level = 'critical'
  
  return { level, score }
}

// 生成建议
function generateRecommendations(
  isAffected: boolean,
  isFixed: boolean,
  wheaCount: number,
  crashCount: number,
  riskLevel: string
): string[] {
  const recommendations: string[] = []
  
  if (!isAffected) {
    recommendations.push('✅ 您的CPU不属于受"缩缸"问题影响的型号，无需担心')
    return recommendations
  }
  
  if (!isFixed) {
    recommendations.push('🔴 【重要】请尽快更新BIOS以获取Intel最新微码修复（0x129或更高）')
    recommendations.push('💡 访问主板制造商官网下载最新BIOS')
  } else {
    // 检查是否为最新 0x12B
    // 注意：这里我们需要传入具体的微码版本来判断，但为了简化，我们假设 isFixed 为 true 时
    // 如果需要更精细的建议，可以在参数中增加 microcodeVersion
    recommendations.push('✅ 微码已更新到修复版本，可以防止进一步损坏')
  }
  
  if (wheaCount > 0 || crashCount > 0) {
    recommendations.push('⚠️ 检测到硬件错误/系统崩溃记录，建议进行稳定性测试')
    recommendations.push('💡 可使用 Prime95、OCCT 等工具进行CPU压力测试')
  }
  
  if (riskLevel === 'high' || riskLevel === 'critical') {
    recommendations.push('🔴 风险较高，如频繁崩溃建议联系Intel申请RMA更换')
    recommendations.push('💡 Intel已延长受影响CPU的保修期至5年')
  }
  
  recommendations.push('📋 建议定期运行此检测，监控系统稳定性')
  
  if (isAffected && !isFixed) {
    recommendations.push('⚡ 临时缓解：在BIOS中启用Intel Default Settings可降低风险')
  }
  
  return recommendations
}

// 生成详细分析
function generateDetailedAnalysis(
  cpuInfo: CpuInfo,
  microcodeInfo: MicrocodeInfo,
  wheaErrors: WheaError[],
  crashCount: number,
  isAffected: boolean
): string[] {
  const analysis: string[] = []
  
  analysis.push(`📊 CPU型号: ${cpuInfo.name}`)
  analysis.push(`📊 核心/线程: ${cpuInfo.cores}核${cpuInfo.threads}线程`)
  analysis.push(`📊 微码版本: ${microcodeInfo.version}`)
  analysis.push(`📊 BIOS日期: ${microcodeInfo.updateDate}`)
  
  if (isAffected) {
    analysis.push('')
    analysis.push('--- Intel 13/14代"缩缸"问题说明 ---')
    analysis.push('问题原因: 过高的电压导致CPU内部电路退化')
    analysis.push('主要表现: 游戏崩溃、蓝屏、系统不稳定')
    analysis.push('Intel应对: 发布微码更新限制电压，延长保修')
  }
  
  if (wheaErrors.length > 0) {
    analysis.push('')
    analysis.push(`⚠️ 近30天检测到 ${wheaErrors.length} 条硬件错误日志`)
    // 只显示最近5条
    wheaErrors.slice(0, 5).forEach(e => {
      analysis.push(`  - [${e.timeCreated}] ${e.errorType}`)
    })
  }
  
  if (crashCount > 0) {
    analysis.push('')
    analysis.push(`⚠️ 近30天系统意外重启/崩溃: ${crashCount} 次`)
  }
  
  return analysis
}

// 完整健康检查
export async function runCpuHealthCheck(): Promise<CpuHealthReport> {
  // 并行获取所有信息
  const [cpuInfo, microcodeInfo, wheaErrors, crashCount] = await Promise.all([
    getCpuInfo(),
    getMicrocodeInfo(),
    getWheaErrors(30),
    getRecentCrashCount(30)
  ])
  
  // 检查是否为受影响CPU
  const { isAffected, reason } = checkIfAffectedCpu(cpuInfo.name)
  
  // 计算风险等级
  const { level, score } = calculateRiskLevel(
    isAffected,
    microcodeInfo.isFixed,
    wheaErrors.length,
    crashCount
  )
  
  // 生成建议
  const recommendations = generateRecommendations(
    isAffected,
    microcodeInfo.isFixed,
    wheaErrors.length,
    crashCount,
    level
  )
  
  // 生成详细分析
  const detailedAnalysis = generateDetailedAnalysis(
    cpuInfo,
    microcodeInfo,
    wheaErrors,
    crashCount,
    isAffected
  )
  
  return {
    timestamp: new Date().toISOString(),
    cpuInfo,
    isAffectedCpu: isAffected,
    affectedReason: reason,
    microcodeInfo,
    wheaErrors,
    wheaErrorCount: wheaErrors.length,
    recentCrashes: crashCount,
    riskLevel: level,
    riskScore: score,
    recommendations,
    detailedAnalysis
  }
}
