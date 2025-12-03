import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import { app, BrowserWindow } from 'electron'

const execAsync = promisify(exec)

// 执行 PowerShell 脚本并正确处理 UTF-8 编码
async function execPowerShell(scriptPath: string, options: { timeout?: number; maxBuffer?: number } = {}): Promise<string> {
  const { stdout } = await execAsync(
    `chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
    { 
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024, 
      timeout: options.timeout || 60000,
      encoding: 'utf8'
    }
  )
  return stdout
}

// 获取 UTF-8 编码设置的 PowerShell 脚本头
function getUtf8Header(): string {
  return `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
`
}

// 驱动信息接口
export interface DriverInfo {
  deviceName: string
  deviceId: string
  driverVersion: string
  driverDate: string
  manufacturer: string
  deviceClass: string
  status: DriverStatus
  problemCode?: number
  infName?: string
  hardwareIds?: string[]
  compatibleIds?: string[]
}

export type DriverStatus = 'ok' | 'problem' | 'missing' | 'outdated' | 'unknown'

export interface DriverUpdate {
  deviceName: string
  deviceId: string
  currentVersion: string
  newVersion: string
  downloadUrl?: string
  updateSource: 'windows_update' | 'manufacturer' | 'third_party'
  size?: string
  releaseDate?: string
}

export interface DriverCategory {
  name: string
  icon: string
  count: number
  drivers: DriverInfo[]
}

const deviceClassMap: Record<string, { name: string; icon: string }> = {
  'Display': { name: '显示适配器', icon: '🖥️' },
  'Net': { name: '网络适配器', icon: '🌐' },
  'Media': { name: '声音设备', icon: '🔊' },
  'USB': { name: 'USB 控制器', icon: '🔌' },
  'Bluetooth': { name: '蓝牙设备', icon: '📶' },
  'Keyboard': { name: '键盘', icon: '⌨️' },
  'Mouse': { name: '鼠标', icon: '🖱️' },
  'Processor': { name: '处理器', icon: '💻' },
  'DiskDrive': { name: '磁盘驱动器', icon: '💾' },
  'CDROM': { name: '光驱', icon: '💿' },
  'HIDClass': { name: 'HID 设备', icon: '🎮' },
  'Image': { name: '图像设备', icon: '📷' },
  'PrintQueue': { name: '打印机', icon: '🖨️' },
  'System': { name: '系统设备', icon: '⚙️' },
  'Battery': { name: '电池', icon: '🔋' },
  'Monitor': { name: '显示器', icon: '🖵' },
  'SCSIAdapter': { name: 'SCSI 适配器', icon: '🔗' },
  'HDC': { name: '硬盘控制器', icon: '💽' },
  'Unknown': { name: '其他设备', icon: '❓' }
}

function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (e) {
    console.log('Failed to delete temp file:', e)
  }
}

// 发送扫描进度到渲染进程
function sendScanProgress(current: number, total: number, drivers: DriverInfo[]) {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('driver-scan-progress', { current, total, drivers })
  }
}

// 发送扫描完成消息
function sendScanComplete(total: number) {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('driver-scan-complete', { total })
  }
}

// 流式扫描所有驱动 - 一次查询，分批发送
export async function scanDriversStreaming(): Promise<void> {
  const tempFile = path.join(app.getPath('temp'), `scan_drivers_${Date.now()}.ps1`)
  
  try {
    // 一次性获取所有驱动数据
    const script = getUtf8Header() + `
$err = @{}
Get-CimInstance -Query "SELECT DeviceID,ConfigManagerErrorCode FROM Win32_PnPEntity WHERE ConfigManagerErrorCode<>0" -ErrorAction SilentlyContinue | ForEach-Object { $err[$_.DeviceID]=$_.ConfigManagerErrorCode }

Get-CimInstance -Query "SELECT DeviceName,DeviceID,DriverVersion,DriverDate,Manufacturer,DeviceClass,InfName FROM Win32_PnPSignedDriver WHERE DeviceName IS NOT NULL" -ErrorAction SilentlyContinue | ForEach-Object {
  [PSCustomObject]@{
    n=$_.DeviceName
    id=$_.DeviceID
    v=$_.DriverVersion
    d=$(if($_.DriverDate){$_.DriverDate.ToString("yyyyMMdd")}else{$null})
    m=$_.Manufacturer
    c=$_.DeviceClass
    inf=$_.InfName
    p=$err[$_.DeviceID]
  }
} | ConvertTo-Json -Compress
`
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    // 发送初始进度（不确定模式）
    sendScanProgress(0, 0, [])
    
    const stdout = await execPowerShell(tempFile, { timeout: 60000 })
    safeUnlink(tempFile)
    
    if (!stdout.trim()) {
      sendScanComplete(0)
      return
    }
    
    const items = JSON.parse(stdout)
    const allDrivers = (Array.isArray(items) ? items : [items])
      .filter((d: any) => d.n && d.id)
      .map((d: any) => ({
        deviceName: d.n || 'Unknown Device',
        deviceId: d.id || '',
        driverVersion: d.v || 'N/A',
        driverDate: formatDriverDate(d.d),
        manufacturer: d.m || 'Unknown',
        deviceClass: d.c || 'Unknown',
        status: mapDriverStatus(d.p),
        problemCode: d.p,
        infName: d.inf || 'N/A',
        hardwareIds: [],
        compatibleIds: []
      }))
    
    const total = allDrivers.length
    const batchSize = 50
    
    // 分批发送给前端，用 setTimeout 模拟异步以避免阻塞
    for (let i = 0; i < total; i += batchSize) {
      const batch = allDrivers.slice(i, i + batchSize)
      sendScanProgress(Math.min(i + batchSize, total), total, batch)
      // 给UI一点时间渲染
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    sendScanComplete(total)
  } catch (error) {
    console.error('Failed to scan drivers:', error)
    safeUnlink(tempFile)
    throw error
  }
}

export async function getAllDrivers(): Promise<DriverInfo[]> {
  const tempFile = path.join(app.getPath('temp'), `get_drivers_${Date.now()}.ps1`)
  try {
    const script = getUtf8Header() + `
$err = @{}
Get-CimInstance -Query "SELECT DeviceID,ConfigManagerErrorCode FROM Win32_PnPEntity WHERE ConfigManagerErrorCode<>0" -ErrorAction SilentlyContinue | ForEach-Object { $err[$_.DeviceID]=$_.ConfigManagerErrorCode }

Get-CimInstance -Query "SELECT DeviceName,DeviceID,DriverVersion,DriverDate,Manufacturer,DeviceClass,InfName FROM Win32_PnPSignedDriver WHERE DeviceName IS NOT NULL" -ErrorAction SilentlyContinue | ForEach-Object {
  [PSCustomObject]@{
    n=$_.DeviceName
    id=$_.DeviceID
    v=$_.DriverVersion
    d=$(if($_.DriverDate){$_.DriverDate.ToString("yyyyMMdd")}else{$null})
    m=$_.Manufacturer
    c=$_.DeviceClass
    inf=$_.InfName
    p=$err[$_.DeviceID]
  }
} | ConvertTo-Json -Compress
`
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile, { timeout: 60000 })
    
    safeUnlink(tempFile)
    
    if (!stdout.trim()) {
      return []
    }
    
    const devices = JSON.parse(stdout)
    const deviceArray = Array.isArray(devices) ? devices : [devices]
    
    return deviceArray
      .filter((d: any) => d.n && d.id)
      .map((d: any) => ({
        deviceName: d.n || 'Unknown Device',
        deviceId: d.id || '',
        driverVersion: d.v || 'N/A',
        driverDate: formatDriverDate(d.d),
        manufacturer: d.m || 'Unknown',
        deviceClass: d.c || 'Unknown',
        status: mapDriverStatus(d.p),
        problemCode: d.p,
        infName: d.inf || 'N/A',
        hardwareIds: [],
        compatibleIds: []
      }))
  } catch (error) {
    console.error('Failed to get drivers:', error)
    safeUnlink(tempFile)
    throw error
  }
}

export async function getProblematicDrivers(): Promise<DriverInfo[]> {
  const tempFile = path.join(app.getPath('temp'), `get_problem_drivers_${Date.now()}.ps1`)
  try {
    // 只查询有问题的设备，速度很快
    const script = getUtf8Header() + `
$drv = @{}
Get-CimInstance -Query "SELECT DeviceID,DriverVersion,DriverDate,Manufacturer,DeviceClass,InfName FROM Win32_PnPSignedDriver" -ErrorAction SilentlyContinue | ForEach-Object { $drv[$_.DeviceID]=$_ }

Get-CimInstance -Query "SELECT Name,DeviceID,PNPClass,ConfigManagerErrorCode FROM Win32_PnPEntity WHERE ConfigManagerErrorCode<>0" -ErrorAction SilentlyContinue | ForEach-Object {
  $d=$drv[$_.DeviceID]
  [PSCustomObject]@{
    n=$_.Name
    id=$_.DeviceID
    v=$(if($d){$d.DriverVersion}else{"N/A"})
    d=$(if($d -and $d.DriverDate){$d.DriverDate.ToString("yyyyMMdd")}else{$null})
    m=$(if($d){$d.Manufacturer}else{"Unknown"})
    c=$_.PNPClass
    p=$_.ConfigManagerErrorCode
    inf=$(if($d){$d.InfName}else{"N/A"})
  }
} | ConvertTo-Json -Compress
`
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile, { timeout: 60000 })
    
    safeUnlink(tempFile)
    
    if (!stdout.trim() || stdout.trim() === '[]') {
      return []
    }
    
    const devices = JSON.parse(stdout)
    const deviceArray = Array.isArray(devices) ? devices : [devices]
    
    return deviceArray.map((d: any) => ({
      deviceName: d.n || 'Unknown Device',
      deviceId: d.id || '',
      driverVersion: d.v || 'N/A',
      driverDate: formatDriverDate(d.d),
      manufacturer: d.m || 'Unknown',
      deviceClass: d.c || 'Unknown',
      status: mapDriverStatus(d.p),
      problemCode: d.p,
      infName: d.inf
    }))
  } catch (error) {
    console.error('Failed to get problematic drivers:', error)
    safeUnlink(tempFile)
    return []
  }
}

export async function getDriversByCategory(): Promise<DriverCategory[]> {
  const drivers = await getAllDrivers()
  const categories: Map<string, DriverInfo[]> = new Map()
  
  for (const driver of drivers) {
    const className = driver.deviceClass || 'Unknown'
    if (!categories.has(className)) {
      categories.set(className, [])
    }
    categories.get(className)!.push(driver)
  }
  
  return Array.from(categories.entries())
    .map(([className, drivers]) => {
      const classInfo = deviceClassMap[className] || { name: className, icon: '❓' }
      return {
        name: classInfo.name,
        icon: classInfo.icon,
        count: drivers.length,
        drivers
      }
    })
    .sort((a, b) => b.count - a.count)
}

export async function checkDriverUpdates(): Promise<DriverUpdate[]> {
  const tempFile = path.join(app.getPath('temp'), `check_driver_updates_${Date.now()}.ps1`)
  try {
    const script = getUtf8Header() + `
      $UpdateSession = New-Object -ComObject Microsoft.Update.Session
      $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
      
      $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Driver'")
      
      $result = @()
      foreach ($Update in $SearchResult.Updates) {
        $obj = @{
          Title = $Update.Title
          Description = $Update.Description
          DriverClass = $Update.DriverClass
          DriverHardwareID = $Update.DriverHardwareID
          DriverManufacturer = $Update.DriverManufacturer
          DriverModel = $Update.DriverModel
          DriverProvider = $Update.DriverProvider
          DriverVerDate = if ($Update.DriverVerDate) { $Update.DriverVerDate.ToString("yyyy-MM-dd") } else { "N/A" }
          MaxDownloadSize = $Update.MaxDownloadSize
          MinDownloadSize = $Update.MinDownloadSize
        }
        $result += $obj
      }
      
      $result | ConvertTo-Json -Depth 3
    `
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile, { timeout: 120000 })
    
    safeUnlink(tempFile)
    
    if (!stdout.trim() || stdout.trim() === '[]') {
      return []
    }
    
    const updates = JSON.parse(stdout)
    const updateArray = Array.isArray(updates) ? updates : [updates]
    
    return updateArray.map((u: any) => ({
      deviceName: u.Title || u.DriverModel || 'Unknown Driver',
      deviceId: u.DriverHardwareID || '',
      currentVersion: 'Current',
      newVersion: u.DriverVerDate || 'New',
      updateSource: 'windows_update' as const,
      size: formatBytes(u.MaxDownloadSize || 0),
      releaseDate: u.DriverVerDate
    }))
  } catch (error) {
    console.error('Failed to check driver updates:', error)
    safeUnlink(tempFile)
    return []
  }
}

export async function installDriverUpdate(driverTitle: string): Promise<{ success: boolean; message: string }> {
  console.log('Installing driver update:', driverTitle)
  const tempFile = path.join(app.getPath('temp'), `install_driver_${Date.now()}.ps1`)
  try {
    // 使用英文消息避免编码问题，然后在前端翻译
    const script = getUtf8Header() + `
      try {
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        
        Write-Host "Searching for driver updates..."
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Driver'")
        
        $UpdateToInstall = $null
        foreach ($Update in $SearchResult.Updates) {
          if ($Update.Title -like "*${driverTitle.replace(/'/g, "''")}*") {
            $UpdateToInstall = $Update
            break
          }
        }
        
        if ($UpdateToInstall -eq $null) {
          Write-Output '{"success": false, "code": "NOT_FOUND"}'
          exit
        }
        
        Write-Host "Found update: $($UpdateToInstall.Title)"
        
        # Check if already downloaded
        if (-not $UpdateToInstall.IsDownloaded) {
          $UpdatesToDownload = New-Object -ComObject Microsoft.Update.UpdateColl
          $UpdatesToDownload.Add($UpdateToInstall) | Out-Null
          
          Write-Host "Downloading..."
          $Downloader = $UpdateSession.CreateUpdateDownloader()
          $Downloader.Updates = $UpdatesToDownload
          $DownloadResult = $Downloader.Download()
          
          # ResultCode: 0=NotStarted, 1=InProgress, 2=Succeeded, 3=SucceededWithErrors, 4=Failed, 5=Aborted
          if ($DownloadResult.ResultCode -eq 4) {
            Write-Output '{"success": false, "code": "DOWNLOAD_FAILED_ADMIN"}'
            exit
          } elseif ($DownloadResult.ResultCode -ne 2 -and $DownloadResult.ResultCode -ne 3) {
            Write-Output ('{"success": false, "code": "DOWNLOAD_FAILED", "detail": ' + $DownloadResult.ResultCode + '}')
            exit
          }
        }
        
        Write-Host "Installing..."
        $UpdatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
        $UpdatesToInstall.Add($UpdateToInstall) | Out-Null
        
        $Installer = $UpdateSession.CreateUpdateInstaller()
        $Installer.Updates = $UpdatesToInstall
        $InstallResult = $Installer.Install()
        
        if ($InstallResult.ResultCode -eq 2 -or $InstallResult.ResultCode -eq 3) {
          Write-Output '{"success": true, "code": "SUCCESS"}'
        } elseif ($InstallResult.ResultCode -eq 4) {
          Write-Output '{"success": false, "code": "INSTALL_FAILED_ADMIN"}'
        } else {
          Write-Output ('{"success": false, "code": "INSTALL_FAILED", "detail": ' + $InstallResult.ResultCode + '}')
        }
      } catch {
        $errMsg = $_.Exception.Message -replace '[\\r\\n]', ' ' -replace '"', "'"
        Write-Output ('{"success": false, "code": "ERROR", "detail": "' + $errMsg + '"}')
      }
    `
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    console.log('Executing PowerShell script for driver installation...')
    
    const stdout = await execPowerShell(tempFile, { timeout: 300000 })
    console.log('PowerShell output:', stdout)
    
    safeUnlink(tempFile)
    
    // 解析结果并翻译消息
    const lines = stdout.trim().split('\n')
    const jsonLine = lines.find(line => line.startsWith('{'))
    if (jsonLine) {
      const result = JSON.parse(jsonLine)
      return {
        success: result.success,
        message: translateResultCode(result.code, result.detail)
      }
    }
    
    return { success: false, message: '无法解析安装结果' }
  } catch (error) {
    console.error('Failed to install driver:', error)
    safeUnlink(tempFile)
    return { success: false, message: `安装失败: ${error}` }
  }
}

function translateResultCode(code: string, detail?: any): string {
  const messages: Record<string, string> = {
    'SUCCESS': '驱动安装成功，可能需要重启计算机',
    'NOT_FOUND': '未找到指定的驱动更新',
    'DOWNLOAD_FAILED_ADMIN': '下载失败，请以管理员身份运行程序',
    'DOWNLOAD_FAILED': `下载失败 (错误码: ${detail})`,
    'INSTALL_FAILED_ADMIN': '安装失败，请以管理员身份运行程序',
    'INSTALL_FAILED': `安装失败 (错误码: ${detail})`,
    'ERROR': `错误: ${detail}`
  }
  return messages[code] || '未知错误'
}

export async function scanForHardwareChanges(): Promise<{ success: boolean; message: string }> {
  const tempFile = path.join(app.getPath('temp'), `scan_hardware_${Date.now()}.ps1`)
  try {
    const script = getUtf8Header() + `
      $result = pnputil /scan-devices
      
      if ($LASTEXITCODE -eq 0) {
        Write-Output '{"success": true, "message": "硬件扫描完成"}'
      } else {
        Write-Output '{"success": false, "message": "硬件扫描失败"}'
      }
    `
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile)
    
    safeUnlink(tempFile)
    
    return JSON.parse(stdout.trim())
  } catch (error) {
    console.error('Failed to scan hardware:', error)
    safeUnlink(tempFile)
    return { success: false, message: `扫描失败: ${error}` }
  }
}

export async function exportDrivers(exportPath: string): Promise<{ success: boolean; message: string }> {
  const tempFile = path.join(app.getPath('temp'), `export_drivers_${Date.now()}.ps1`)
  try {
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true })
    }
    
    const escapedPath = exportPath.replace(/\\/g, '\\\\')
    const script = getUtf8Header() + `
      $exportPath = "${escapedPath}"
      
      try {
        dism /online /export-driver /destination:"$exportPath"
        
        if ($LASTEXITCODE -eq 0) {
          $driverCount = (Get-ChildItem -Path $exportPath -Filter "*.inf" -Recurse).Count
          Write-Output ('{"success": true, "message": "已导出 ' + $driverCount + ' 个驱动程序"}')
        } else {
          Write-Output '{"success": false, "message": "驱动导出失败"}'
        }
      } catch {
        $errMsg = $_.Exception.Message -replace '"', "'"
        Write-Output ('{"success": false, "message": "错误: ' + $errMsg + '"}')
      }
    `
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile, { timeout: 300000 })
    
    safeUnlink(tempFile)
    
    return JSON.parse(stdout.trim())
  } catch (error) {
    console.error('Failed to export drivers:', error)
    safeUnlink(tempFile)
    return { success: false, message: `导出失败: ${error}` }
  }
}

export async function getDriverStats(): Promise<{
  total: number
  healthy: number
  problematic: number
  updatesAvailable: number
}> {
  try {
    const [allDrivers, problemDrivers] = await Promise.all([
      getAllDrivers(),
      getProblematicDrivers()
    ])
    
    return {
      total: allDrivers.length,
      healthy: allDrivers.length - problemDrivers.length,
      problematic: problemDrivers.length,
      updatesAvailable: 0
    }
  } catch (error) {
    console.error('Failed to get driver stats:', error)
    return { total: 0, healthy: 0, problematic: 0, updatesAvailable: 0 }
  }
}

export async function getDeviceTree(): Promise<DriverCategory[]> {
  return getDriversByCategory()
}

export async function disableDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
  const tempFile = path.join(app.getPath('temp'), `disable_device_${Date.now()}.ps1`)
  try {
    const escapedId = deviceId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const script = getUtf8Header() + `
      $device = Get-WmiObject Win32_PnPEntity | Where-Object { $_.DeviceID -eq "${escapedId}" }
      if ($device) {
        $result = $device.Disable()
        if ($result.ReturnValue -eq 0) {
          Write-Output '{"success": true, "message": "设备已禁用"}'
        } else {
          Write-Output '{"success": false, "message": "禁用设备失败"}'
        }
      } else {
        Write-Output '{"success": false, "message": "未找到设备"}'
      }
    `
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile)
    
    safeUnlink(tempFile)
    
    return JSON.parse(stdout.trim())
  } catch (error) {
    safeUnlink(tempFile)
    return { success: false, message: `操作失败: ${error}` }
  }
}

export async function enableDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
  const tempFile = path.join(app.getPath('temp'), `enable_device_${Date.now()}.ps1`)
  try {
    const escapedId = deviceId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const script = getUtf8Header() + `
      $device = Get-WmiObject Win32_PnPEntity | Where-Object { $_.DeviceID -eq "${escapedId}" }
      if ($device) {
        $result = $device.Enable()
        if ($result.ReturnValue -eq 0) {
          Write-Output '{"success": true, "message": "设备已启用"}'
        } else {
          Write-Output '{"success": false, "message": "启用设备失败"}'
        }
      } else {
        Write-Output '{"success": false, "message": "未找到设备"}'
      }
    `
    
    fs.writeFileSync(tempFile, script, 'utf-8')
    
    const stdout = await execPowerShell(tempFile)
    
    safeUnlink(tempFile)
    
    return JSON.parse(stdout.trim())
  } catch (error) {
    safeUnlink(tempFile)
    return { success: false, message: `操作失败: ${error}` }
  }
}

export function getProblemCodeDescription(code: number): string {
  const problemCodes: Record<number, string> = {
    0: '设备运行正常',
    1: '设备配置不正确',
    3: '设备驱动程序可能已损坏',
    10: '设备无法启动',
    12: '找不到足够的可用资源',
    14: '需要重新启动计算机',
    16: '无法识别设备所需的所有资源',
    18: '重新安装此设备的驱动程序',
    19: '注册表返回未知结果',
    21: 'Windows 正在删除此设备',
    22: '设备已被禁用',
    24: '设备不存在',
    28: '设备的驱动程序未安装',
    29: '设备已被禁用',
    31: '设备未正常工作',
    32: '设备驱动程序已被阻止',
    33: 'Windows 无法确定哪些资源是必需的',
    34: 'Windows 无法确定此设备的设置',
    35: '系统固件没有为此设备提供足够信息',
    36: '设备请求 PCI 中断',
    37: 'Windows 无法初始化此硬件的设备驱动程序',
    38: '无法加载设备驱动程序',
    39: 'Windows 无法加载设备驱动程序',
    40: '无法访问硬件',
    41: 'Windows 已成功加载此设备的驱动程序，但找不到硬件',
    42: '设备的驱动程序重复',
    43: 'Windows 已停止响应此设备',
    44: '应用程序或服务已关闭此硬件设备',
    45: '设备目前未连接到计算机',
    46: 'Windows 无法访问此设备',
    47: 'Windows 无法使用此硬件设备',
    48: '设备驱动程序已被阻止',
    49: '系统配置单元太大',
    50: 'Windows 无法应用此设备的所有属性',
    51: '设备等待另一个设备',
    52: 'Windows 无法验证此设备的驱动程序签名',
    53: '设备已被 ARM 设备保留',
    54: 'UEFI 固件已禁用此设备'
  }
  
  return problemCodes[code] || `未知错误 (代码: ${code})`
}

function formatDriverDate(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return 'N/A'
  
  try {
    if (dateStr.length >= 8) {
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      return `${year}-${month}-${day}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

function mapDriverStatus(problemCode: number | undefined | null): DriverStatus {
  // problemCode 为 undefined、null 或 0 都表示正常
  if (problemCode === undefined || problemCode === null || problemCode === 0) return 'ok'
  if (problemCode === 28) return 'missing'
  if ([1, 3, 10, 18, 19, 31, 39, 40, 43].includes(problemCode)) return 'problem'
  return 'problem' // 其他非0错误码也视为问题
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
