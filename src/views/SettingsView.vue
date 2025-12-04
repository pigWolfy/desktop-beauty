<template>
  <div class="settings-view">
    <h1 class="page-title">设置 ⚙️</h1>

    <!-- 通用设置 -->
    <div class="settings-section">
      <h3 class="section-title">🔧 通用设置</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">开机自启动</span>
            <span class="setting-desc">系统启动时自动运行 Desktop Beauty</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.autoStart">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">最小化到托盘</span>
            <span class="setting-desc">关闭窗口时最小化到系统托盘</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.minimizeToTray">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">启动时隐藏窗口</span>
            <span class="setting-desc">程序启动后直接最小化到托盘</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.startMinimized">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">桌面小组件</span>
            <span class="setting-desc">在桌面上显示快捷操作小组件</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.showWidget">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 快捷键设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">⌨️ 快捷键</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">显示/隐藏主窗口</span>
            <span class="setting-desc">快速切换主窗口的显示状态</span>
          </div>
          <kbd class="shortcut-key">Alt + D</kbd>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">快捷启动器</span>
            <span class="setting-desc">打开应用快捷启动器</span>
          </div>
          <kbd class="shortcut-key">Alt + Space</kbd>
        </div>
      </div>
    </div>

    <!-- 桌面管理设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">🖥️ 桌面管理</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">默认排序方式</span>
            <span class="setting-desc">整理桌面时的默认排序规则</span>
          </div>
          <select v-model="settings.defaultSort" class="select-box">
            <option value="name">按名称</option>
            <option value="type">按类型</option>
            <option value="date">按日期</option>
            <option value="size">按大小</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动分组</span>
            <span class="setting-desc">整理时自动按类型创建文件夹</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.autoGroup">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 壁纸设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">🖼️ 壁纸设置</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动轮换</span>
            <span class="setting-desc">自动切换壁纸</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.wallpaperSlideshow">
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">轮换间隔</span>
            <span class="setting-desc">自动切换壁纸的时间间隔</span>
          </div>
          <select v-model="settings.wallpaperInterval" class="select-box" :disabled="!settings.wallpaperSlideshow">
            <option :value="5">5 分钟</option>
            <option :value="15">15 分钟</option>
            <option :value="30">30 分钟</option>
            <option :value="60">1 小时</option>
            <option :value="120">2 小时</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 监控设置 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">📊 系统监控</h3>
      <div class="settings-card card">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">刷新间隔</span>
            <span class="setting-desc">系统监控数据的刷新频率</span>
          </div>
          <select v-model="settings.monitorInterval" class="select-box">
            <option :value="1000">1 秒</option>
            <option :value="2000">2 秒</option>
            <option :value="5000">5 秒</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">侧边栏显示系统状态</span>
            <span class="setting-desc">在侧边栏底部显示 CPU 和内存使用率</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settings.showSidebarStats">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div class="settings-section mt-lg">
      <h3 class="section-title">ℹ️ 关于</h3>
      <div class="about-card card">
        <div class="about-logo">✨</div>
        <h2>Desktop Beauty</h2>
        <p class="version">版本 1.0.0</p>
        <p class="desc">一个优雅的桌面管理工具</p>
        <div class="developer-info">
          <p>开发者：<a href="#" @click.prevent="openAuthorGithub">pigWolfy</a></p>
          <p>邮箱：happywangruifei@gmail.com</p>
        </div>
        <div class="about-links">
          <a href="#" @click.prevent="openGithub">GitHub</a>
          <span>·</span>
          <a href="#" @click.prevent="openFeedback">反馈问题</a>
        </div>
        <p class="copyright">© 2024 Desktop Beauty Team</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

onMounted(() => {
  settingsStore.init()
})

const openGithub = () => {
  window.electronAPI?.openExternal('https://github.com/pigWolfy/desktop-beauty')
}

const openFeedback = () => {
  window.electronAPI?.openExternal('https://github.com/pigWolfy/desktop-beauty/issues')
}

const openAuthorGithub = () => {
  window.electronAPI?.openExternal('https://github.com/pigWolfy')
}
</script>

<style lang="scss" scoped>
.settings-view {
  animation: fadeIn 0.3s ease;
  max-width: 800px;
}

.settings-card {
  padding: 0;
  overflow: hidden;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;

  &:last-child {
    border-bottom: none;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .setting-label {
      font-weight: 500;
    }

    .setting-desc {
      font-size: 12px;
      color: $text-muted;
    }
  }
}

.switch {
  position: relative;
  width: 48px;
  height: 24px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background: $accent-primary;

      &::before {
        transform: translateX(24px);
      }
    }
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: $bg-secondary;
    border-radius: 24px;
    transition: all $transition-fast;

    &::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      left: 2px;
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: all $transition-fast;
    }
  }
}

.select-box {
  padding: 8px 12px;
  background: $bg-secondary;
  color: $text-primary;
  border: 1px solid $border-color;
  border-radius: $border-radius-sm;
  cursor: pointer;
  min-width: 120px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    border-color: $accent-primary;
  }
}

.shortcut-key {
  padding: 6px 12px;
  background: $bg-secondary;
  border: 1px solid $border-color;
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
}

.about-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;

  .about-logo {
    font-size: 64px;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .version {
    font-size: 14px;
    color: $text-muted;
    margin-top: 8px;
  }

  .desc {
    font-size: 14px;
    color: $text-secondary;
    margin-top: 4px;
  }

  .developer-info {
    margin-top: 16px;
    font-size: 14px;
    color: $text-secondary;
    
    p {
      margin: 4px 0;
    }

    a {
      color: $accent-primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .about-links {
    display: flex;
    gap: 12px;
    margin-top: 24px;

    a {
      color: $accent-primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    span {
      color: $text-muted;
    }
  }

  .copyright {
    font-size: 12px;
    color: $text-muted;
    margin-top: 24px;
  }
}
</style>
