# Desktop Beauty AI 开发指南

本文档记录开发过程中的重要设计原则和最佳实践，供 AI 助手参考。

---

## 🎯 用户体验原则

### 1. 加载状态动效（重要！）

**问题**：当界面加载数据时，如果没有视觉反馈，用户会认为应用卡住了。

**原则**：所有界面在加载数据期间但尚未完成时，必须提供良好的加载动效。

#### 实现方式

1. **骨架屏 (Skeleton)** ✅ 已实现
   - 适用于：列表、卡片等结构化内容
   - 使用灰色占位块 + 闪烁动画
   - 组件位置：`src/components/SkeletonLoader.vue`
   ```scss
   @keyframes skeleton-loading {
     0% { background-position: 200% 0; }
     100% { background-position: -200% 0; }
   }
   
   .skeleton {
     background: linear-gradient(90deg, 
       rgba(255,255,255,0.05) 25%, 
       rgba(255,255,255,0.1) 50%, 
       rgba(255,255,255,0.05) 75%
     );
     background-size: 200% 100%;
     animation: skeleton-loading 1.5s infinite;
   }
   ```

2. **加载指示器 (Spinner)**
   - 适用于：按钮操作、小区域加载
   - 提供明确的"正在处理"视觉
   ```vue
   <button :disabled="isLoading">
     {{ isLoading ? '加载中...' : '确定' }}
   </button>
   ```

3. **进度条 (Progress Bar)**
   - 适用于：文件下载、长时间操作
   - 显示具体进度百分比

4. **渐入动画 (Fade In)**
   - 适用于：数据加载完成后的展示
   - 避免内容突然出现的突兀感
   ```scss
   @keyframes fadeIn {
     from { opacity: 0; transform: translateY(10px); }
     to { opacity: 1; transform: translateY(0); }
   }
   ```

#### 已优化的页面

| 页面 | 加载状态 | 实现方式 |
|------|----------|----------|
| HomeView | ✅ 系统状态 | 骨架屏 |
| MonitorView | ✅ 系统信息卡片 | 骨架屏 |
| DesktopView | ✅ 桌面图标 | 骨架屏 |
| AppsView | ✅ 应用列表 | 骨架屏 |
| WallpaperView | ✅ 壁纸网格 | 骨架屏 |
| DriverView | ✅ 驱动扫描 | Spinner + 进度条 |
| CpuHealthView | ✅ CPU检测 | 动画 + 扫描效果 |

#### 骨架屏标准结构

```vue
<!-- 加载状态 -->
<template v-if="isLoading">
  <div class="skeleton-item">
    <div class="skeleton-icon"></div>
    <div class="skeleton-content">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  </div>
</template>

<!-- 实际内容 -->
<template v-else>
  <!-- 真实数据 -->
</template>
```

#### 反面示例（避免）

❌ 空白页面等待数据  
❌ 按钮点击后无任何反馈  
❌ 数据突然出现/消失  
❌ 只显示 "加载中..." 文字而无动画  
❌ 使用 `N/A` 或 `-` 作为加载中的占位符

---

## 🔧 其他开发原则

### 2. 错误处理

- 提供友好的错误提示，而非技术性错误信息
- 错误发生时给出可操作的解决方案
- 示例：下载失败时提供"访问官网"的备选方案

### 3. 可点击元素

- 所有可交互元素必须有明确的视觉提示
- hover 状态变化
- cursor 样式（pointer）
- 避免让用户猜测哪些是可点击的

### 4. 数据准确性

- 不显示不准确或误导性的数据
- 如果数据不可用，明确说明原因并提供解决方案
- 示例：温度/电压数据需要硬件监控软件支持

---

## 📝 更新记录

- 2025-12-02: 创建文档，添加加载状态动效原则
- 2025-12-02: 完成所有页面骨架屏优化（HomeView, MonitorView, DesktopView, AppsView, WallpaperView）
