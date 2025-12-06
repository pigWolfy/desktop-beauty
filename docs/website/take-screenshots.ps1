# Desktop Beauty 自动截图脚本
# 需要先运行应用: npm run dev

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 创建截图输出目录
$outputDir = "e:\Repos\desktop-beauty\docs\website"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force
}

function Take-WindowScreenshot {
    param(
        [string]$WindowTitle,
        [string]$OutputPath
    )
    
    # 获取窗口句柄
    $process = Get-Process | Where-Object { $_.MainWindowTitle -like "*$WindowTitle*" } | Select-Object -First 1
    
    if ($process) {
        # 激活窗口
        $sig = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
        Add-Type -MemberDefinition $sig -Name Win32 -Namespace Native
        [Native.Win32]::SetForegroundWindow($process.MainWindowHandle)
        
        Start-Sleep -Milliseconds 500
        
        # 获取窗口位置和大小
        $sig2 = @'
[DllImport("user32.dll")]
public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}
'@
        Add-Type -MemberDefinition $sig2 -Name Win32Rect -Namespace Native2
        $rect = New-Object Native2.RECT
        [Native2.Win32Rect]::GetWindowRect($process.MainWindowHandle, [ref]$rect)
        
        $width = $rect.Right - $rect.Left
        $height = $rect.Bottom - $rect.Top
        
        # 创建位图并截图
        $bitmap = New-Object System.Drawing.Bitmap($width, $height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, [System.Drawing.Size]::new($width, $height))
        
        # 保存截图
        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $bitmap.Dispose()
        
        Write-Host "✓ 截图已保存: $OutputPath" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ 未找到窗口: $WindowTitle" -ForegroundColor Red
        return $false
    }
}

Write-Host "Desktop Beauty 自动截图工具" -ForegroundColor Cyan
Write-Host "============================`n"

# 检查应用是否运行
$app = Get-Process | Where-Object { $_.MainWindowTitle -like "*Desktop Beauty*" }
if (-not $app) {
    Write-Host "请先启动 Desktop Beauty 应用 (npm run dev)" -ForegroundColor Yellow
    exit
}

Write-Host "找到应用窗口，开始截图...`n"

# 截取当前页面作为主图
Write-Host "1. 截取主界面..."
Take-WindowScreenshot -WindowTitle "Desktop Beauty" -OutputPath "$outputDir\screenshot-main.png"

Write-Host "`n请手动切换到不同页面后按 Enter 继续截图:"
Write-Host "  - 切换到「首页」后按 Enter"
Read-Host
Take-WindowScreenshot -WindowTitle "Desktop Beauty" -OutputPath "$outputDir\screenshot-home.png"

Write-Host "  - 切换到「壁纸」页面后按 Enter"
Read-Host
Take-WindowScreenshot -WindowTitle "Desktop Beauty" -OutputPath "$outputDir\screenshot-wallpaper.png"

Write-Host "  - 切换到「系统监控」页面后按 Enter"
Read-Host
Take-WindowScreenshot -WindowTitle "Desktop Beauty" -OutputPath "$outputDir\screenshot-monitor.png"

Write-Host "  - 切换到「CPU健康」页面后按 Enter"
Read-Host
Take-WindowScreenshot -WindowTitle "Desktop Beauty" -OutputPath "$outputDir\screenshot-cpu.png"

Write-Host "  - 切换到「设置」页面后按 Enter"
Read-Host
Take-WindowScreenshot -WindowTitle "Desktop Beauty" -OutputPath "$outputDir\screenshot-settings.png"

Write-Host "`n============================`n"
Write-Host "截图完成！文件保存在: $outputDir" -ForegroundColor Green
Write-Host "`n截图列表:"
Get-ChildItem "$outputDir\screenshot-*.png" | ForEach-Object {
    Write-Host "  - $($_.Name) ($([math]::Round($_.Length/1KB, 1)) KB)"
}
