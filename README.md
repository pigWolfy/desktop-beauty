# Desktop Beauty ✨

一个优雅的桌面管理工具，帮助你更好地管理 Windows 桌面。

![Desktop Beauty](./screenshot.png)

## ✨ 功能特色

### 🖥️ 桌面管理
- 自动整理桌面图标
- 按类型/日期/名称/大小排序
- 一键隐藏/显示桌面图标
- 创建自定义图标分组

### 🖼️ 壁纸管理
- 壁纸收藏管理
- 一键切换壁纸
- 自动轮换壁纸（支持自定义间隔）
- 支持多种图片格式

### 🚀 快捷启动器
- 快速搜索已安装应用
- 收藏常用应用
- 全局快捷键启动（Alt + Space）
- 最近使用记录

### 📊 系统监控
- 实时 CPU 使用率监控
- 内存使用情况
- 磁盘空间监控
- 网络流量统计

## 🛠️ 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理
- **SCSS** - CSS 预处理器

## 📦 安装

### 开发环境

```bash
# 克隆项目
git clone https://github.com/your-username/desktop-beauty.git
cd desktop-beauty

# 安装依赖
npm install

# 启动开发服务
npm run electron:dev
```

### 构建

```bash
# 构建应用
npm run electron:build
```

构建完成后，安装包将在 `release` 目录中生成。

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt + D` | 显示/隐藏主窗口 |
| `Alt + Space` | 打开快捷启动器 |
| `ESC` | 关闭启动器弹窗 |

## 📁 项目结构

```
desktop-beauty/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   └── services/            # 服务模块
│       ├── desktopManager.ts   # 桌面管理
│       ├── wallpaperManager.ts # 壁纸管理
│       ├── systemMonitor.ts    # 系统监控
│       └── appLauncher.ts      # 应用启动
├── src/                     # Vue 渲染进程
│   ├── components/          # 组件
│   ├── views/               # 页面视图
│   ├── router/              # 路由配置
│   ├── styles/              # 样式文件
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
├── public/                  # 静态资源
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎨 界面预览

- **首页** - 快速操作和系统状态概览
- **桌面管理** - 查看和整理桌面图标
- **壁纸管理** - 管理和切换壁纸
- **应用启动** - 搜索和启动应用
- **系统监控** - 查看系统资源使用情况
- **设置** - 自定义应用配置

## 📝 开发计划

- [ ] 多显示器支持
- [ ] 主题切换（深色/浅色）
- [ ] 插件系统
- [ ] 动态壁纸支持
- [ ] 桌面布局备份/恢复
- [ ] 国际化支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](./LICENSE)

---

Made with ❤️ by Desktop Beauty Team
