import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export type Locale = 'zh-CN' | 'en-US'

// 检测系统语言
function detectSystemLocale(): Locale {
  // 优先从 localStorage 读取用户保存的语言偏好
  const savedLocale = localStorage.getItem('app-locale')
  if (savedLocale === 'zh-CN' || savedLocale === 'en-US') {
    return savedLocale
  }
  
  // 获取系统语言
  const systemLang = navigator.language || (navigator as any).userLanguage || 'en-US'
  
  // 如果是中文（包括 zh、zh-CN、zh-TW、zh-HK 等）
  if (systemLang.toLowerCase().startsWith('zh')) {
    return 'zh-CN'
  }
  
  // 其他语言默认使用英文
  return 'en-US'
}

const detectedLocale = detectSystemLocale()

export const i18n = createI18n({
  legacy: false,
  locale: detectedLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export const availableLocales: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' }
]

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  // 保存用户的语言偏好到 localStorage
  localStorage.setItem('app-locale', locale)
}

export function getLocale(): Locale {
  return i18n.global.locale.value as Locale
}
