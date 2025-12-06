# Desktop Beauty 官网

这是 Desktop Beauty 应用的官方网站，用于展示应用功能和提供下载。

## 部署说明

### 方法 1: 使用 Vercel / Netlify（推荐）

1. 将此文件夹部署到 Vercel 或 Netlify
2. 在域名服务商处将 `desktop.ruifeis.net` 的 CNAME 记录指向 Vercel/Netlify 提供的地址

### 方法 2: 使用 GitHub Pages

1. 在 GitHub 仓库设置中启用 GitHub Pages
2. 选择 `docs/website` 文件夹作为源
3. 在域名服务商处设置 CNAME 记录

### 方法 3: 传统服务器

将整个 `website` 文件夹上传到服务器的 web 根目录即可。

## 文件结构

```
website/
├── index.html      # 主页面（包含所有样式和脚本）
├── favicon.svg     # 网站图标
├── README.md       # 说明文档
└── screenshots/    # 截图文件夹（需要添加）
    ├── screenshot-main.png
    ├── screenshot-home.png
    ├── screenshot-wallpaper.png
    ├── screenshot-monitor.png
    ├── screenshot-cpu.png
    └── screenshot-settings.png
```

## 添加截图

请将应用截图添加到网站目录：

1. `screenshot-main.png` - 应用主界面截图（用于 Hero 区域）
2. `screenshot-home.png` - 首页截图
3. `screenshot-wallpaper.png` - 壁纸管理截图
4. `screenshot-monitor.png` - 系统监控截图
5. `screenshot-cpu.png` - CPU健康检测截图
6. `screenshot-settings.png` - 设置页面截图

建议截图尺寸：1280x800 或 1920x1080

## 功能特性

- 🌐 中英双语支持（自动检测系统语言）
- 📱 响应式设计，支持移动端
- ✨ 现代化 UI，渐变背景动画
- ⬇️ 直接链接到 GitHub Releases 下载
- 🔗 平滑滚动导航

## 自定义

### 修改下载链接

在 `index.html` 中搜索以下 URL 并替换为实际的下载链接：

```
https://github.com/pigWolfy/desktop-beauty/releases/latest/download/Desktop.Beauty.Setup.1.3.9.exe
```

### 更新版本号

搜索 `v1.3.9` 和 `1.3.9` 并替换为新版本号。

## DNS 配置示例

在你的 DNS 服务商处添加以下记录：

| 类型 | 名称 | 值 |
|------|------|---|
| CNAME | desktop | your-deployment-url |

或者使用 A 记录指向服务器 IP。

## 许可证

MIT License - 与 Desktop Beauty 应用相同
