<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <div class="logo">
        <span class="logo-icon">✨</span>
        <span class="logo-text">Desktop Beauty</span>
      </div>
    </div>
    
    <div class="titlebar-controls">
      <button class="control-btn" @click="minimize" title="最小化">
        <span>─</span>
      </button>
      <button class="control-btn" @click="maximize" title="最大化">
        <span>□</span>
      </button>
      <button class="control-btn close" @click="close" title="关闭">
        <span>×</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const minimize = () => {
  window.electronAPI?.windowMinimize()
}

const maximize = () => {
  window.electronAPI?.windowMaximize()
}

const close = () => {
  window.electronAPI?.windowClose()
}
</script>

<style lang="scss" scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $titlebar-height;
  background: $bg-primary;
  border-bottom: 1px solid $border-color;
  -webkit-app-region: drag;
}

.titlebar-drag {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;

  &-icon {
    font-size: 18px;
  }

  &-text {
    font-size: 14px;
    font-weight: 600;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.titlebar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: $titlebar-height;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-secondary;
  transition: all $transition-fast;

  span {
    font-size: 14px;
    line-height: 1;
  }

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }

  &.close:hover {
    background: $accent-primary;
    color: white;
  }
}
</style>
