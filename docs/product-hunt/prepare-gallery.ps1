# Product Hunt Gallery Image Preparation Script
# Requires ImageMagick: winget install ImageMagick.ImageMagick

$sourceDir = "e:\Repos\desktop-beauty\docs\images"
$outputDir = "e:\Repos\desktop-beauty\docs\product-hunt"

# Create output directory
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force
}

# Product Hunt recommended size
$targetWidth = 1270
$targetHeight = 760

# Screenshots to process
$screenshots = @(
    @{ source = "screenshot-home-en.png"; output = "gallery-1-hero.png"; title = "Home" },
    @{ source = "screenshot-wallpaper-en.png"; output = "gallery-2-wallpaper.png"; title = "Wallpaper" },
    @{ source = "screenshot-monitor-en.png"; output = "gallery-3-monitor.png"; title = "Monitor" },
    @{ source = "screenshot-cpu-en.png"; output = "gallery-4-cpu.png"; title = "CPU Health" },
    @{ source = "screenshot-settings-en.png"; output = "gallery-5-settings.png"; title = "Settings" }
)

Write-Host "========================================"
Write-Host "  Product Hunt Gallery Preparation"
Write-Host "========================================"
Write-Host ""

# Check if ImageMagick is installed
$magick = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magick) {
    Write-Host "[X] ImageMagick not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install ImageMagick:" -ForegroundColor Yellow
    Write-Host "  winget install ImageMagick.ImageMagick"
    Write-Host ""
    Write-Host "Or use online tools:" -ForegroundColor Yellow
    Write-Host "  https://www.iloveimg.com/resize-image"
    Write-Host ""
    
    Write-Host "Screenshots to process:" -ForegroundColor Cyan
    foreach ($img in $screenshots) {
        $srcPath = Join-Path $sourceDir $img.source
        if (Test-Path $srcPath) {
            Write-Host "  [OK] $($img.source) -> $($img.output)" -ForegroundColor Green
        } else {
            Write-Host "  [MISSING] $($img.source)" -ForegroundColor Red
        }
    }
    exit 1
}

Write-Host "[OK] ImageMagick installed" -ForegroundColor Green
Write-Host ""

# Process each screenshot
foreach ($img in $screenshots) {
    $srcPath = Join-Path $sourceDir $img.source
    $outPath = Join-Path $outputDir $img.output
    
    if (-not (Test-Path $srcPath)) {
        Write-Host "[SKIP] $($img.source) (file not found)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing: $($img.source)..." -NoNewline
    
    # Use ImageMagick to resize and add background
    & magick $srcPath `
        -resize "${targetWidth}x${targetHeight}>" `
        -gravity center `
        -background "#0f0f23" `
        -extent "${targetWidth}x${targetHeight}" `
        $outPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [FAILED]" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Done!"
Write-Host "========================================"
Write-Host ""
Write-Host "Output: $outputDir"
Write-Host ""

# List generated files
Get-ChildItem $outputDir -Filter "gallery-*.png" | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1024, 1)
    Write-Host "  $($_.Name) - $sizeKB KB" -ForegroundColor Cyan
}
