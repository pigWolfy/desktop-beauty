# Product Hunt 素材准备指南

## 📋 Product Hunt 素材要求

### 1. Logo（必需）
- **尺寸**: 240x240 像素（正方形）
- **格式**: PNG 或 JPG
- **建议**: 简洁、清晰、无文字

### 2. Gallery 图片（必需，最多 8 张）
- **尺寸**: 1270x760 像素（推荐）
- **格式**: PNG, JPG 或 GIF
- **建议**: 第一张最重要，会作为缩略图

### 3. 产品演示 GIF/视频（可选但强烈推荐）
- **GIF**: 最大 3MB
- **视频**: YouTube 链接

---

## 🎨 你的素材清单

### ✅ 已有素材
- [x] 应用图标: `build/icon.ico` (可转换为 PNG)
- [x] 中英文截图: `docs/images/screenshot-*-en.png`
- [x] 网站 favicon: `docs/website/favicon.svg`

### 📝 需要准备

#### 1. Logo (240x240 PNG)
使用现有图标转换：
```powershell
# 需要安装 ImageMagick 或使用在线工具
# 在线转换: https://convertio.co/ico-png/
```

#### 2. Gallery 图片 (1270x760)
建议内容：
1. **Hero 截图** - 首页全貌
2. **壁纸管理** - 核心功能
3. **系统监控** - 实用功能  
4. **桌面小组件** - 差异化亮点
5. **设置页面** - 可定制性

#### 3. 演示 GIF
展示核心流程：
- 切换壁纸的过程
- 桌面小组件交互
- 快捷启动器使用

---

## 🛠️ 素材制作步骤

### Step 1: 转换 Logo
1. 打开 https://convertio.co/ico-png/
2. 上传 `build/icon.ico`
3. 转换为 PNG
4. 调整为 240x240

### Step 2: 准备截图
现有截图需要调整尺寸到 1270x760：

**方法 A: 使用 PowerShell + 在线工具**
1. 使用截图 `docs/images/screenshot-*-en.png`
2. 在 https://www.iloveimg.com/resize-image 调整尺寸
3. 选择 1270x760，居中裁剪

**方法 B: 添加背景边框**
可以给截图添加好看的背景，显得更专业

### Step 3: 录制 GIF
推荐工具：
- **ScreenToGif** (免费): https://www.screentogif.com/
- **LICEcap** (免费): https://www.cockos.com/licecap/

录制内容建议：
1. 打开应用 → 浏览壁纸 → 设置壁纸 (10-15秒)
2. 桌面小组件操作 (5-10秒)

---

## 📁 最终素材文件夹结构

```
docs/product-hunt/
├── logo-240x240.png          # 产品 Logo
├── gallery-1-hero.png        # 首页截图 (1270x760)
├── gallery-2-wallpaper.png   # 壁纸管理 (1270x760)
├── gallery-3-monitor.png     # 系统监控 (1270x760)
├── gallery-4-widget.png      # 桌面小组件 (1270x760)
├── gallery-5-settings.png    # 设置页面 (1270x760)
└── demo.gif                  # 产品演示 GIF (< 3MB)
```

---

## 🚀 快速行动

### 如果你想快速发布：
1. **Logo**: 直接用 icon.ico 转 PNG
2. **截图**: 用现有英文截图，在线调整尺寸
3. **GIF**: 可以先不传，截图已经够用

### 专业级发布：
1. 给截图添加 Mockup（设备边框）
2. 添加渐变背景，显得更精致
3. 录制流畅的操作 GIF

---

## 🔗 推荐在线工具

| 用途 | 工具 | 链接 |
|------|------|------|
| ICO 转 PNG | Convertio | https://convertio.co/ico-png/ |
| 图片调整尺寸 | iLoveIMG | https://www.iloveimg.com/resize-image |
| 添加设备边框 | Mockup Photos | https://mockup.photos/freebies |
| 截图美化 | Screely | https://screely.com/ |
| 录制 GIF | ScreenToGif | https://www.screentogif.com/ |
| GIF 压缩 | EZGIF | https://ezgif.com/optimize |

