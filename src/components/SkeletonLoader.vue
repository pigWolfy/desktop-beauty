<template>
  <div class="skeleton-wrapper">
    <!-- 卡片骨架 -->
    <div v-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>

    <!-- 信息卡片骨架 -->
    <div v-else-if="type === 'info-card'" class="skeleton-info-card">
      <div class="skeleton-icon"></div>
      <div class="skeleton-content">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>

    <!-- 列表项骨架 -->
    <div v-else-if="type === 'list-item'" class="skeleton-list-item">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-content">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>

    <!-- 进度条骨架 -->
    <div v-else-if="type === 'progress'" class="skeleton-progress">
      <div class="skeleton-line short"></div>
      <div class="skeleton-bar"></div>
    </div>

    <!-- 网格骨架 -->
    <div v-else-if="type === 'grid'" class="skeleton-grid">
      <div v-for="i in count" :key="i" class="skeleton-grid-item"></div>
    </div>

    <!-- 文本行骨架 -->
    <div v-else class="skeleton-text">
      <div v-for="i in lines" :key="i" class="skeleton-line" :class="{ short: i === lines }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type?: 'card' | 'info-card' | 'list-item' | 'progress' | 'grid' | 'text'
  lines?: number
  count?: number
}>()
</script>

<style lang="scss" scoped>
@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

$skeleton-base: rgba(255, 255, 255, 0.05);
$skeleton-shine: rgba(255, 255, 255, 0.1);

@mixin skeleton-animation {
  background: linear-gradient(
    90deg,
    $skeleton-base 25%,
    $skeleton-shine 50%,
    $skeleton-base 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite ease-in-out;
}

.skeleton-wrapper {
  width: 100%;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  margin-bottom: 10px;
  @include skeleton-animation;

  &.title {
    height: 20px;
    width: 60%;
    margin-bottom: 16px;
  }

  &.short {
    width: 40%;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.skeleton-card {
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.skeleton-info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);

  .skeleton-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    flex-shrink: 0;
    @include skeleton-animation;
  }

  .skeleton-content {
    flex: 1;

    .skeleton-line {
      &:first-child {
        width: 30%;
        height: 12px;
        margin-bottom: 8px;
      }
      &:last-child {
        width: 80%;
        height: 16px;
        margin-bottom: 0;
      }
    }
  }
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  .skeleton-avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    flex-shrink: 0;
    @include skeleton-animation;
  }

  .skeleton-content {
    flex: 1;

    .skeleton-line {
      &:first-child {
        width: 50%;
        margin-bottom: 8px;
      }
      &:last-child {
        width: 30%;
        height: 12px;
        margin-bottom: 0;
      }
    }
  }
}

.skeleton-progress {
  .skeleton-line {
    width: 20%;
    height: 12px;
    margin-bottom: 8px;
  }

  .skeleton-bar {
    height: 12px;
    border-radius: 6px;
    @include skeleton-animation;
  }
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;

  .skeleton-grid-item {
    aspect-ratio: 1;
    border-radius: 12px;
    @include skeleton-animation;
  }
}

.skeleton-text {
  .skeleton-line {
    &:nth-child(1) { width: 100%; }
    &:nth-child(2) { width: 90%; }
    &:nth-child(3) { width: 70%; }
  }
}
</style>
