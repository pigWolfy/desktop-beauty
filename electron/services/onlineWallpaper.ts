import { net } from 'electron'
import Store from 'electron-store'

export interface WallpaperItem {
  id: string
  url: string
  thumbnailUrl: string
  downloadUrl: string
  author: string
  authorUrl: string
  description: string
  width: number
  height: number
  source: 'unsplash' | 'pexels' | 'picsum' | 'bing' | 'wallhaven'
  color?: string
}

export interface SearchOptions {
  query?: string
  page?: number
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'squarish'
  color?: string
  resolution?: string  // 如 "1920x1080"
  minWidth?: number
  minHeight?: number
}

interface UnsplashPhoto {
  id: string
  description: string | null
  alt_description: string | null
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    links: { html: string }
  }
  width: number
  height: number
  color: string
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string
}

export class OnlineWallpaperService {
  private store: Store
  private unsplashAccessKey: string = ''
  private pexelsApiKey: string = ''

  constructor() {
    this.store = new Store({ name: 'online-wallpaper' })
    this.loadApiKeys()
  }

  private loadApiKeys(): void {
    this.unsplashAccessKey = this.store.get('unsplashAccessKey', '') as string
    this.pexelsApiKey = this.store.get('pexelsApiKey', '') as string
  }

  setUnsplashApiKey(key: string): void {
    this.unsplashAccessKey = key
    this.store.set('unsplashAccessKey', key)
  }

  setPexelsApiKey(key: string): void {
    this.pexelsApiKey = key
    this.store.set('pexelsApiKey', key)
  }

  hasApiKeys(): { unsplash: boolean; pexels: boolean } {
    return {
      unsplash: !!this.unsplashAccessKey,
      pexels: !!this.pexelsApiKey
    }
  }

  // ==================== 免费壁纸源（无需API密钥）====================

  // Picsum Photos - 完全免费的随机图片
  async getPicsumWallpapers(page = 1, perPage = 20): Promise<WallpaperItem[]> {
    try {
      const response = await this.fetchWithNet(`https://picsum.photos/v2/list?page=${page}&limit=${perPage}`)
      const photos = JSON.parse(response)
      
      return photos.map((photo: any) => ({
        id: `picsum_${photo.id}`,
        url: `https://picsum.photos/id/${photo.id}/1920/1080`,
        thumbnailUrl: `https://picsum.photos/id/${photo.id}/400/225`,
        downloadUrl: photo.download_url,
        author: photo.author,
        authorUrl: photo.url,
        description: `Photo by ${photo.author}`,
        width: photo.width,
        height: photo.height,
        source: 'picsum' as const
      }))
    } catch (error) {
      console.error('Picsum fetch failed:', error)
      return []
    }
  }

  // Bing 每日壁纸 - 完全免费
  async getBingWallpapers(): Promise<WallpaperItem[]> {
    try {
      // 获取最近8天的Bing壁纸
      const response = await this.fetchWithNet(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN'
      )
      const data = JSON.parse(response)
      
      return data.images.map((image: any, index: number) => ({
        id: `bing_${image.startdate}`,
        url: `https://www.bing.com${image.url}`,
        thumbnailUrl: `https://www.bing.com${image.url.replace('1920x1080', '400x240')}`,
        downloadUrl: `https://www.bing.com${image.url}`,
        author: image.copyright.split('(')[0].trim(),
        authorUrl: image.copyrightlink || 'https://www.bing.com',
        description: image.title || image.copyright,
        width: 1920,
        height: 1080,
        source: 'bing' as const
      }))
    } catch (error) {
      console.error('Bing fetch failed:', error)
      return []
    }
  }

  // Wallhaven - 高质量壁纸（免费，可选API密钥）
  async getWallhavenWallpapers(options: SearchOptions = {}): Promise<WallpaperItem[]> {
    try {
      const { query = '', page = 1, resolution, minWidth, minHeight } = options
      
      // 如果有搜索关键词，按相关性排序；否则使用随机/热门排序
      const sorting = query ? 'relevance' : 'random'
      // categories=111 表示启用所有分类 (General/Anime/People)
      // purity=100 表示只显示 SFW 内容
      let url = `https://wallhaven.cc/api/v1/search?page=${page}&categories=111&purity=100&sorting=${sorting}&order=desc`
      
      if (query) {
        url += `&q=${encodeURIComponent(query)}`
      }
      
      // 添加分辨率过滤（Wallhaven支持的分辨率格式）
      if (resolution) {
        url += `&resolutions=${resolution}`
      } else if (minWidth && minHeight) {
        // 使用最小分辨率过滤
        url += `&atleast=${minWidth}x${minHeight}`
      }
      
      const response = await this.fetchWithNet(url)
      const data = JSON.parse(response)
      
      return data.data.map((wallpaper: any) => ({
        id: `wallhaven_${wallpaper.id}`,
        url: wallpaper.thumbs.large,
        thumbnailUrl: wallpaper.thumbs.small,
        downloadUrl: wallpaper.path,
        author: wallpaper.uploader?.username || 'Wallhaven',
        authorUrl: `https://wallhaven.cc/user/${wallpaper.uploader?.username || ''}`,
        description: wallpaper.category,
        width: wallpaper.dimension_x,
        height: wallpaper.dimension_y,
        source: 'wallhaven' as const,
        color: wallpaper.colors?.[0]
      }))
    } catch (error) {
      console.error('Wallhaven fetch failed:', error)
      return []
    }
  }

  // 获取常见分辨率列表
  getCommonResolutions(): { label: string; value: string; width: number; height: number }[] {
    return [
      { label: '4K UHD (3840×2160)', value: '3840x2160', width: 3840, height: 2160 },
      { label: '2K QHD (2560×1440)', value: '2560x1440', width: 2560, height: 1440 },
      { label: 'Full HD (1920×1080)', value: '1920x1080', width: 1920, height: 1080 },
      { label: 'HD+ (1600×900)', value: '1600x900', width: 1600, height: 900 },
      { label: 'HD (1366×768)', value: '1366x768', width: 1366, height: 768 },
      { label: 'WXGA+ (1440×900)', value: '1440x900', width: 1440, height: 900 },
      { label: 'WUXGA (1920×1200)', value: '1920x1200', width: 1920, height: 1200 },
      { label: '超宽屏 (2560×1080)', value: '2560x1080', width: 2560, height: 1080 },
      { label: '超宽屏 (3440×1440)', value: '3440x1440', width: 3440, height: 1440 },
      { label: '5K (5120×2880)', value: '5120x2880', width: 5120, height: 2880 },
    ]
  }

  // 根据屏幕分辨率获取最佳匹配的壁纸
  async getWallpapersForResolution(
    screenWidth: number, 
    screenHeight: number, 
    options: SearchOptions = {}
  ): Promise<WallpaperItem[]> {
    // 找到最接近的标准分辨率
    const resolutions = this.getCommonResolutions()
    let bestMatch = resolutions[2] // 默认1080p
    let minDiff = Infinity
    
    for (const res of resolutions) {
      // 计算分辨率差异
      const diff = Math.abs(res.width - screenWidth) + Math.abs(res.height - screenHeight)
      if (diff < minDiff) {
        minDiff = diff
        bestMatch = res
      }
    }
    
    console.log(`Screen: ${screenWidth}x${screenHeight}, Best match: ${bestMatch.value}`)
    
    // 使用最佳分辨率获取壁纸
    const wallhavenWallpapers = await this.getWallhavenWallpapers({
      ...options,
      minWidth: bestMatch.width,
      minHeight: bestMatch.height
    })
    
    // 获取Picsum壁纸（按分辨率生成）
    const picsumWallpapers = await this.getPicsumWallpapersWithResolution(
      options.page || 1, 
      10, 
      bestMatch.width, 
      bestMatch.height
    )
    
    // 合并并按匹配度排序
    const allWallpapers = [...wallhavenWallpapers, ...picsumWallpapers]
    
    // 按分辨率匹配度排序（更大的分辨率优先，但不要太大浪费带宽）
    return allWallpapers.sort((a, b) => {
      const scoreA = this.calculateResolutionScore(a.width, a.height, screenWidth, screenHeight)
      const scoreB = this.calculateResolutionScore(b.width, b.height, screenWidth, screenHeight)
      return scoreB - scoreA
    })
  }

  // 计算分辨率匹配分数
  private calculateResolutionScore(
    wallpaperWidth: number, 
    wallpaperHeight: number, 
    screenWidth: number, 
    screenHeight: number
  ): number {
    // 壁纸分辨率应该 >= 屏幕分辨率
    if (wallpaperWidth < screenWidth || wallpaperHeight < screenHeight) {
      // 分辨率不够，给较低分数
      return (wallpaperWidth * wallpaperHeight) / (screenWidth * screenHeight) * 50
    }
    
    // 计算比例匹配
    const screenRatio = screenWidth / screenHeight
    const wallpaperRatio = wallpaperWidth / wallpaperHeight
    const ratioDiff = Math.abs(screenRatio - wallpaperRatio)
    
    // 比例越接近分数越高
    const ratioScore = Math.max(0, 100 - ratioDiff * 100)
    
    // 分辨率越接近（但不小于）屏幕越好
    const resolutionRatio = (wallpaperWidth * wallpaperHeight) / (screenWidth * screenHeight)
    // 1.0-2.0倍是理想范围，超过2倍开始扣分
    const resScore = resolutionRatio <= 2 ? 100 : Math.max(0, 100 - (resolutionRatio - 2) * 25)
    
    return ratioScore * 0.6 + resScore * 0.4
  }

  // Picsum Photos - 支持自定义分辨率
  async getPicsumWallpapersWithResolution(
    page = 1, 
    perPage = 20, 
    width = 1920, 
    height = 1080
  ): Promise<WallpaperItem[]> {
    try {
      const response = await this.fetchWithNet(`https://picsum.photos/v2/list?page=${page}&limit=${perPage}`)
      const photos = JSON.parse(response)
      
      return photos.map((photo: any) => ({
        id: `picsum_${photo.id}_${width}x${height}`,
        url: `https://picsum.photos/id/${photo.id}/${width}/${height}`,
        thumbnailUrl: `https://picsum.photos/id/${photo.id}/400/225`,
        downloadUrl: `https://picsum.photos/id/${photo.id}/${width}/${height}`,
        author: photo.author,
        authorUrl: photo.url,
        description: `Photo by ${photo.author}`,
        width: width,
        height: height,
        source: 'picsum' as const
      }))
    } catch (error) {
      console.error('Picsum fetch failed:', error)
      return []
    }
  }

  // ==================== 需要API密钥的源 ====================

  async searchUnsplash(options: SearchOptions = {}): Promise<WallpaperItem[]> {
    if (!this.unsplashAccessKey) {
      return []
    }

    const { query = 'wallpaper', page = 1, perPage = 20, orientation = 'landscape' } = options

    try {
      const url = query
        ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${orientation}`
        : `https://api.unsplash.com/photos?page=${page}&per_page=${perPage}`

      const response = await this.fetchWithNet(url, {
        headers: {
          Authorization: `Client-ID ${this.unsplashAccessKey}`
        }
      })

      const data = JSON.parse(response)
      const photos: UnsplashPhoto[] = query ? data.results : data

      return photos.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.small,
        downloadUrl: photo.urls.full,
        author: photo.user.name,
        authorUrl: photo.user.links.html,
        description: photo.description || photo.alt_description || '',
        width: photo.width,
        height: photo.height,
        source: 'unsplash' as const,
        color: photo.color
      }))
    } catch (error) {
      console.error('Unsplash search failed:', error)
      return []
    }
  }

  async searchPexels(options: SearchOptions = {}): Promise<WallpaperItem[]> {
    if (!this.pexelsApiKey) {
      return []
    }

    const { query = 'wallpaper', page = 1, perPage = 20, orientation = 'landscape' } = options

    try {
      const url = query
        ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${orientation}`
        : `https://api.pexels.com/v1/curated?page=${page}&per_page=${perPage}`

      const response = await this.fetchWithNet(url, {
        headers: {
          Authorization: this.pexelsApiKey
        }
      })

      const data = JSON.parse(response)
      const photos: PexelsPhoto[] = data.photos

      return photos.map((photo) => ({
        id: photo.id.toString(),
        url: photo.src.large,
        thumbnailUrl: photo.src.medium,
        downloadUrl: photo.src.original,
        author: photo.photographer,
        authorUrl: photo.photographer_url,
        description: photo.alt || '',
        width: photo.width,
        height: photo.height,
        source: 'pexels' as const,
        color: photo.avg_color
      }))
    } catch (error) {
      console.error('Pexels search failed:', error)
      return []
    }
  }

  // 简单的翻译功能 (使用 Google Translate API)
  private async translateToEnglish(text: string): Promise<string> {
    // 如果包含中文字符
    if (/[\u4e00-\u9fa5]/.test(text)) {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`
        const response = await this.fetchWithNet(url)
        const data = JSON.parse(response)
        // data[0][0][0] 是翻译后的文本
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          const translated = data[0][0][0]
          console.log(`[Translation] '${text}' -> '${translated}'`)
          return translated
        }
      } catch (error) {
        console.error('Translation failed:', error)
      }
    }
    return text
  }

  // ==================== 统一搜索接口 ====================

  async search(options: SearchOptions = {}): Promise<WallpaperItem[]> {
    const { query } = options
    
    // 如果有搜索关键词，只使用支持搜索的源
    if (query && query.trim()) {
      // 尝试翻译中文搜索词
      const translatedQuery = await this.translateToEnglish(query)
      const searchOptions = translatedQuery !== query ? { ...options, query: translatedQuery } : options

      const results = await Promise.all([
        this.getWallhavenWallpapers(searchOptions),  // Wallhaven 支持搜索
        this.searchUnsplash(searchOptions),          // Unsplash 支持搜索（需要 API key）
        this.searchPexels(searchOptions)             // Pexels 支持搜索（需要 API key）
      ])

      // 合并结果，交替排列
      const merged: WallpaperItem[] = []
      const maxLength = Math.max(...results.map(r => r.length))
      
      for (let i = 0; i < maxLength; i++) {
        for (const result of results) {
          if (result[i]) merged.push(result[i])
        }
      }

      return merged
    }
    
    // 没有搜索关键词时，使用所有源
    const results = await Promise.all([
      this.getWallhavenWallpapers(options),
      this.getPicsumWallpapers(options.page || 1, options.perPage || 20),
      this.searchUnsplash(options),
      this.searchPexels(options)
    ])

    // 合并结果
    const merged: WallpaperItem[] = []
    const maxLength = Math.max(...results.map(r => r.length))
    
    for (let i = 0; i < maxLength; i++) {
      for (const result of results) {
        if (result[i]) merged.push(result[i])
      }
    }

    return merged
  }

  async getPopular(): Promise<WallpaperItem[]> {
    // 使用随机页码让每次获取的壁纸不同
    const randomPage = Math.floor(Math.random() * 10) + 1
    
    // 获取免费源的热门壁纸
    const [bing, wallhaven, picsum] = await Promise.all([
      this.getBingWallpapers(),
      this.getWallhavenWallpapers({ page: randomPage }),
      this.getPicsumWallpapers(randomPage, 12)
    ])
    
    return [...bing, ...wallhaven.slice(0, 12), ...picsum]
  }

  async getCategories(): Promise<string[]> {
    return [
      '自然风景',
      '城市建筑',
      '抽象艺术',
      '动物世界',
      '太空星际',
      '极简主义',
      '暗黑风格',
      '动漫插画',
      '科技数码',
      '风景摄影'
    ]
  }

  async getCategoryWallpapers(category: string, page = 1): Promise<WallpaperItem[]> {
    const categoryMap: Record<string, string> = {
      '自然风景': 'nature landscape',
      '城市建筑': 'city architecture',
      '抽象艺术': 'abstract art',
      '动物世界': 'animals wildlife',
      '太空星际': 'space galaxy stars',
      '极简主义': 'minimal',
      '暗黑风格': 'dark',
      '动漫插画': 'anime',
      '科技数码': 'technology',
      '风景摄影': 'landscape photography'
    }

    const query = categoryMap[category] || category
    return this.getWallhavenWallpapers({ query, page })
  }

  async downloadWallpaper(downloadUrl: string, targetPath: string): Promise<string> {
    const fs = await import('fs')
    const path = await import('path')
    
    try {
      const response = await this.fetchWithNetBuffer(downloadUrl)
      
      // 从URL或响应确定文件扩展名
      let ext = path.extname(new URL(downloadUrl).pathname)
      
      // 如果URL没有扩展名，根据内容类型判断或默认使用.jpg
      if (!ext || ext.length > 5) {
        // 检查文件头来判断格式
        const header = response.slice(0, 8)
        if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
          ext = '.png'
        } else if (header[0] === 0xFF && header[1] === 0xD8) {
          ext = '.jpg'
        } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
          ext = '.gif'
        } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
          ext = '.webp'
        } else {
          ext = '.jpg' // 默认为jpg
        }
      }
      
      const fileName = `wallpaper_${Date.now()}${ext}`
      const filePath = path.join(targetPath, fileName)
      
      fs.writeFileSync(filePath, response)
      return filePath
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  }

  private fetchWithNet(url: string, options: { headers?: Record<string, string> } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = net.request(url)
      
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          request.setHeader(key, value)
        })
      }

      let data = ''

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          data += chunk.toString()
        })

        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data)
          } else {
            reject(new Error(`HTTP ${response.statusCode}`))
          }
        })

        response.on('error', reject)
      })

      request.on('error', reject)
      request.end()
    })
  }

  private fetchWithNetBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const request = net.request(url)
      const chunks: Buffer[] = []

      request.on('response', (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          const location = response.headers.location
          if (location) {
            const redirectUrl = Array.isArray(location) ? location[0] : location
            this.fetchWithNetBuffer(redirectUrl).then(resolve).catch(reject)
            return
          }
        }

        response.on('data', (chunk) => {
          chunks.push(chunk)
        })

        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(Buffer.concat(chunks))
          } else {
            reject(new Error(`HTTP ${response.statusCode}`))
          }
        })

        response.on('error', reject)
      })

      request.on('error', reject)
      request.end()
    })
  }

  // 收藏管理
  getFavorites(): WallpaperItem[] {
    return this.store.get('favorites', []) as WallpaperItem[]
  }

  addFavorite(wallpaper: WallpaperItem): void {
    const favorites = this.getFavorites()
    if (!favorites.find(f => f.id === wallpaper.id)) {
      favorites.unshift(wallpaper)
      this.store.set('favorites', favorites)
    }
  }

  removeFavorite(id: string): void {
    const favorites = this.getFavorites()
    this.store.set('favorites', favorites.filter(f => f.id !== id))
  }

  isFavorite(id: string): boolean {
    return this.getFavorites().some(f => f.id === id)
  }

  // 历史记录
  getHistory(): WallpaperItem[] {
    return this.store.get('history', []) as WallpaperItem[]
  }

  addToHistory(wallpaper: WallpaperItem): void {
    const history = this.getHistory()
    const filtered = history.filter(h => h.id !== wallpaper.id)
    filtered.unshift(wallpaper)
    this.store.set('history', filtered.slice(0, 100))
  }

  clearHistory(): void {
    this.store.set('history', [])
  }
}

// 自动更换壁纸配置接口
export interface AutoChangeConfig {
  enabled: boolean
  interval: number  // 毫秒
  intervalUnit: 'minutes' | 'hours' | 'days'
  intervalValue: number  // 用户设置的原始值
  resolution: string  // '1080p' | '2k' | '4k' | 'auto'
  categories: string[]  // 分类列表
}

// 自动更换壁纸服务
export class AutoWallpaperService {
  private store: Store
  private timer: NodeJS.Timeout | null = null
  private onlineService: OnlineWallpaperService
  private wallpaperSetter: ((url: string) => Promise<string | null>) | null = null

  constructor(onlineService: OnlineWallpaperService) {
    this.store = new Store({ name: 'auto-wallpaper' })
    this.onlineService = onlineService
  }

  // 设置壁纸下载并应用的回调
  setWallpaperSetter(setter: (url: string) => Promise<string | null>): void {
    this.wallpaperSetter = setter
  }

  // 获取默认配置
  getDefaultConfig(): AutoChangeConfig {
    return {
      enabled: false,
      interval: 3600000,  // 1小时
      intervalUnit: 'hours',
      intervalValue: 1,
      resolution: 'auto',
      categories: []
    }
  }

  // 获取当前配置
  getConfig(): AutoChangeConfig {
    const config = this.store.get('config', this.getDefaultConfig()) as AutoChangeConfig
    
    // 确保 interval 已计算（兼容旧配置）
    if (!config.interval || config.interval === 0) {
      let intervalMs = config.intervalValue || 1
      switch (config.intervalUnit) {
        case 'minutes':
          intervalMs = intervalMs * 60 * 1000
          break
        case 'hours':
          intervalMs = intervalMs * 60 * 60 * 1000
          break
        case 'days':
          intervalMs = intervalMs * 24 * 60 * 60 * 1000
          break
        default:
          intervalMs = 3600000 // 默认1小时
      }
      config.interval = intervalMs
    }
    
    return config
  }

  // 保存配置
  saveConfig(config: AutoChangeConfig): void {
    console.log('[AutoWallpaper] saveConfig called with:', config)
    
    // 计算实际间隔毫秒数
    let intervalMs = config.intervalValue || 1
    switch (config.intervalUnit) {
      case 'minutes':
        intervalMs = intervalMs * 60 * 1000
        break
      case 'hours':
        intervalMs = intervalMs * 60 * 60 * 1000
        break
      case 'days':
        intervalMs = intervalMs * 24 * 60 * 60 * 1000
        break
      default:
        intervalMs = 3600000 // 默认1小时
    }
    
    // 创建一个新的配置对象，确保它是纯对象且包含所有必要字段
    const newConfig: AutoChangeConfig = {
      enabled: Boolean(config.enabled), // 确保是布尔值
      interval: intervalMs,
      intervalUnit: config.intervalUnit || 'hours',
      intervalValue: config.intervalValue || 1,
      resolution: config.resolution || 'auto',
      categories: Array.isArray(config.categories) ? [...config.categories] : []
    }

    this.store.set('config', newConfig)
    console.log('[AutoWallpaper] Config saved, interval:', intervalMs, 'enabled:', newConfig.enabled)
    
    // 如果启用了，重新启动定时器
    if (newConfig.enabled) {
      this.start()
    } else {
      this.stop()
    }
  }

  // 启动自动更换
  start(): boolean {
    const config = this.getConfig()
    if (!config.enabled) {
      return false
    }

    // 停止现有定时器
    this.stop()

    console.log(`[AutoWallpaper] Starting with interval: ${config.interval}ms`)

    // 设置新定时器
    this.timer = setInterval(async () => {
      await this.changeWallpaper()
    }, config.interval)

    // 保存最后启动时间
    this.store.set('lastStartTime', Date.now())

    return true
  }

  // 停止自动更换
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      console.log('[AutoWallpaper] Stopped')
    }
  }

  // 立即更换壁纸
  async changeWallpaper(): Promise<boolean> {
    if (!this.wallpaperSetter) {
      console.error('[AutoWallpaper] No wallpaper setter configured')
      return false
    }

    try {
      const config = this.getConfig()
      console.log('[AutoWallpaper] Changing wallpaper...', config)

      // 构建搜索选项
      const searchOptions: SearchOptions = {
        page: Math.floor(Math.random() * 10) + 1  // 随机页
      }

      // 设置分辨率
      const resolutionMap: Record<string, { minWidth: number; minHeight: number }> = {
        '1080p': { minWidth: 1920, minHeight: 1080 },
        '2k': { minWidth: 2560, minHeight: 1440 },
        '4k': { minWidth: 3840, minHeight: 2160 },
        'auto': { minWidth: 1920, minHeight: 1080 }  // 默认至少1080p
      }

      const resolution = resolutionMap[config.resolution] || resolutionMap['auto']
      searchOptions.minWidth = resolution.minWidth
      searchOptions.minHeight = resolution.minHeight

      // 如果有分类，随机选择一个分类作为搜索词
      if (config.categories.length > 0) {
        const randomCategory = config.categories[Math.floor(Math.random() * config.categories.length)]
        searchOptions.query = randomCategory
      }

      // 获取壁纸
      const wallpapers = await this.onlineService.getWallhavenWallpapers(searchOptions)
      
      if (wallpapers.length === 0) {
        console.log('[AutoWallpaper] No wallpapers found, trying without category')
        // 如果没找到，尝试不带分类
        const fallbackWallpapers = await this.onlineService.getWallhavenWallpapers({
          page: Math.floor(Math.random() * 10) + 1,
          minWidth: resolution.minWidth,
          minHeight: resolution.minHeight
        })
        
        if (fallbackWallpapers.length === 0) {
          console.error('[AutoWallpaper] Still no wallpapers found')
          return false
        }
        
        // 随机选择一张
        const randomWallpaper = fallbackWallpapers[Math.floor(Math.random() * fallbackWallpapers.length)]
        const path = await this.wallpaperSetter(randomWallpaper.downloadUrl)
        
        if (path) {
          this.store.set('lastChangeTime', Date.now())
          this.store.set('lastWallpaper', randomWallpaper)
          console.log('[AutoWallpaper] Wallpaper changed successfully:', path)
          return true
        }
        return false
      }

      // 随机选择一张
      const randomWallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)]
      const path = await this.wallpaperSetter(randomWallpaper.downloadUrl)

      if (path) {
        this.store.set('lastChangeTime', Date.now())
        this.store.set('lastWallpaper', randomWallpaper)
        console.log('[AutoWallpaper] Wallpaper changed successfully:', path)
        return true
      }

      return false
    } catch (error) {
      console.error('[AutoWallpaper] Failed to change wallpaper:', error)
      return false
    }
  }

  // 获取状态信息
  getStatus(): {
    enabled: boolean
    lastChangeTime: number | null
    lastWallpaper: WallpaperItem | null
    nextChangeIn: number | null
  } {
    const config = this.getConfig()
    const lastChangeTime = this.store.get('lastChangeTime', null) as number | null
    const lastWallpaper = this.store.get('lastWallpaper', null) as WallpaperItem | null
    const lastStartTime = this.store.get('lastStartTime', null) as number | null

    console.log('[AutoWallpaper] getStatus:', { 
      enabled: config.enabled, 
      interval: config.interval,
      lastChangeTime, 
      lastStartTime 
    })

    let nextChangeIn: number | null = null
    if (config.enabled) {
      // 使用最近的一个时间点作为基准
      // 如果刚启动(lastStartTime > lastChangeTime)，则以启动时间为准
      // 如果刚更换过(lastChangeTime > lastStartTime)，则以上次更换时间为准
      const t1 = lastChangeTime || 0
      const t2 = lastStartTime || 0
      const baseTime = Math.max(t1, t2)

      if (baseTime > 0) {
        const elapsed = Date.now() - baseTime
        nextChangeIn = Math.max(0, config.interval - elapsed)
      } else {
        // 如果都没有，说明刚启用，下次更换就是间隔时间后
        nextChangeIn = config.interval
      }
      console.log('[AutoWallpaper] nextChangeIn:', nextChangeIn)
    }

    return {
      enabled: config.enabled,
      lastChangeTime,
      lastWallpaper,
      nextChangeIn
    }
  }

  // 初始化 - 在应用启动时调用
  init(): void {
    const config = this.getConfig()
    if (config.enabled) {
      this.start()
    }
  }
}
