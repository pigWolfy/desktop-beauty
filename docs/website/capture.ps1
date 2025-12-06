# Desktop Beauty 简化截图脚本 - 中英双语版本

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$outputDir = "e:\Repos\desktop-beauty\docs\website"

function Capture-Screen {
    param([string]$filename)
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $fullPath = Join-Path $outputDir $filename
    $bitmap.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "Saved: $filename" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================"
Write-Host "   Desktop Beauty Screenshot Helper"
Write-Host "   (Bilingual Version - ZH & EN)"
Write-Host "========================================"
Write-Host ""
Write-Host "This script will capture TWO sets of screenshots:"
Write-Host "  1. Chinese interface (zh)"
Write-Host "  2. English interface (en)"
Write-Host ""
Write-Host "Instructions:"
Write-Host "1. Make sure Desktop Beauty app is open"
Write-Host "2. Resize and center the app window"
Write-Host "3. First capture Chinese version, then switch to English"
Write-Host ""

$pages = @(
    @{ name = "main"; page = "Home (hero)" },
    @{ name = "home"; page = "Home" },
    @{ name = "wallpaper"; page = "Wallpaper" },
    @{ name = "monitor"; page = "System Monitor" },
    @{ name = "cpu"; page = "CPU Health" },
    @{ name = "settings"; page = "Settings" }
)

# Chinese screenshots
Write-Host "========== CHINESE VERSION ==========" -ForegroundColor Cyan
Write-Host "Please set the app language to CHINESE first!"
Write-Host "Press Enter when ready..."
Read-Host

foreach ($p in $pages) {
    Write-Host ""
    Write-Host ">> Switch to [$($p.page)] page (Chinese), then press Enter..." -ForegroundColor Yellow
    Read-Host
    Capture-Screen -filename "screenshot-$($p.name)-zh.png"
}

# English screenshots
Write-Host ""
Write-Host "========== ENGLISH VERSION ==========" -ForegroundColor Cyan
Write-Host "Please switch the app language to ENGLISH!"
Write-Host "Press Enter when ready..."
Read-Host

foreach ($p in $pages) {
    Write-Host ""
    Write-Host ">> Switch to [$($p.page)] page (English), then press Enter..." -ForegroundColor Yellow
    Read-Host
    Capture-Screen -filename "screenshot-$($p.name)-en.png"
}

Write-Host ""
Write-Host "========================================"
Write-Host "Screenshots completed!" -ForegroundColor Green
Write-Host "Location: $outputDir"
Write-Host ""
Write-Host "Generated files:"
Get-ChildItem "$outputDir\screenshot-*-*.png" | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1024, 1)
    Write-Host "  - $($_.Name) ($sizeKB KB)"
}

Write-Host ""
Write-Host "Next: Upload to server with these commands:" -ForegroundColor Cyan
Write-Host 'scp "e:\Repos\desktop-beauty\docs\website\screenshot-*-*.png" wangruifei@desktop.ruifeis.net:~/'
Write-Host 'ssh wangruifei@desktop.ruifeis.net "sudo cp ~/screenshot-*-*.png /var/www/desktop.ruifeis.net/"'
