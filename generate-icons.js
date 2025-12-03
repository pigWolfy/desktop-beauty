const fs = require('fs');
const path = require('path');

// 辅助函数
function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function inCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inRoundedRect(x, y, left, top, w, h, r) {
  if (x < left || x > left + w || y < top || y > top + h) return false;
  if (x < left + r && y < top + r) return inCircle(x, y, left + r, top + r, r);
  if (x > left + w - r && y < top + r) return inCircle(x, y, left + w - r, top + r, r);
  if (x < left + r && y > top + h - r) return inCircle(x, y, left + r, top + h - r, r);
  if (x > left + w - r && y > top + h - r) return inCircle(x, y, left + w - r, top + h - r, r);
  return true;
}

function lerp(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: a.a + (b.a - a.a) * t };
}

function createIcon(style) {
  const size = 256;
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 128;
  
  const styles = {
    // 风格1: 可爱卡通风（圆润Q版）
    cute: {
      bg1: { r: 0x2D, g: 0x1B, b: 0x69, a: 255 },  // 紫色背景
      bg2: { r: 0x1A, g: 0x0D, b: 0x42, a: 255 },
      body: { r: 0x8B, g: 0x5C, b: 0x42, a: 255 }, // 温暖棕色
      bodyDark: { r: 0x6D, g: 0x45, b: 0x32, a: 255 },
      beak: { r: 0xFF, g: 0xA5, b: 0x00, a: 255 }, // 橙色喙
      eye: { r: 0x00, g: 0x00, b: 0x00, a: 255 },
      cheek: { r: 0xFF, g: 0x8C, b: 0x94, a: 150 }, // 腮红
      accent: { r: 0xFF, g: 0x6B, b: 0x9D, a: 255 } // 粉色装饰
    },
    // 风格2: 极简线条风
    minimal: {
      bg1: { r: 0x0A, g: 0x0A, b: 0x0A, a: 255 },  // 纯黑背景
      bg2: { r: 0x0A, g: 0x0A, b: 0x0A, a: 255 },
      body: { r: 0x00, g: 0xD9, b: 0xFF, a: 255 }, // 青色
      bodyDark: { r: 0x00, g: 0x99, b: 0xCC, a: 255 },
      beak: { r: 0xFF, g: 0xFF, b: 0xFF, a: 255 }, // 白色喙
      eye: { r: 0xFF, g: 0xFF, b: 0xFF, a: 255 },
      cheek: { r: 0, g: 0, b: 0, a: 0 },
      accent: { r: 0x00, g: 0xD9, b: 0xFF, a: 255 }
    },
    // 风格3: 自然写实风
    natural: {
      bg1: { r: 0x1B, g: 0x4D, b: 0x3E, a: 255 },  // 森林绿背景
      bg2: { r: 0x0D, g: 0x2F, b: 0x24, a: 255 },
      body: { r: 0x5C, g: 0x41, b: 0x33, a: 255 }, // 深棕色
      bodyDark: { r: 0x3E, g: 0x2C, b: 0x23, a: 255 },
      beak: { r: 0x2F, g: 0x2F, b: 0x2F, a: 255 }, // 灰黑喙
      eye: { r: 0x1A, g: 0x1A, b: 0x1A, a: 255 },
      cheek: { r: 0, g: 0, b: 0, a: 0 },
      accent: { r: 0x7C, g: 0xB3, b: 0x42, a: 255 } // 绿叶装饰
    },
    // 风格4: 霓虹赛博风
    neon: {
      bg1: { r: 0x0F, g: 0x0F, b: 0x1A, a: 255 },  // 深蓝黑
      bg2: { r: 0x0A, g: 0x0A, b: 0x12, a: 255 },
      body: { r: 0xFF, g: 0x00, b: 0x80, a: 255 }, // 霓虹粉
      bodyDark: { r: 0xCC, g: 0x00, b: 0x66, a: 255 },
      beak: { r: 0x00, g: 0xFF, b: 0xFF, a: 255 }, // 青色喙
      eye: { r: 0x00, g: 0xFF, b: 0x00, a: 255 },  // 绿色眼睛
      cheek: { r: 0, g: 0, b: 0, a: 0 },
      accent: { r: 0xFF, g: 0xFF, b: 0x00, a: 255 } // 黄色
    },
    // 风格5: 渐变彩虹风
    rainbow: {
      bg1: { r: 0x1A, g: 0x1A, b: 0x2E, a: 255 },
      bg2: { r: 0x16, g: 0x21, b: 0x3E, a: 255 },
      body: { r: 0xE9, g: 0x45, b: 0x60, a: 255 }, // 会被渐变覆盖
      bodyDark: { r: 0x00, g: 0x77, b: 0xB6, a: 255 },
      beak: { r: 0xFF, g: 0xD7, b: 0x00, a: 255 }, // 金色喙
      eye: { r: 0x1A, g: 0x1A, b: 0x2E, a: 255 },
      cheek: { r: 0, g: 0, b: 0, a: 0 },
      accent: { r: 0xFF, g: 0xD7, b: 0x00, a: 255 }
    }
  };
  
  const s = styles[style];
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ox = x / scale;
      const oy = y / scale;
      
      // 渐变背景
      const t = (ox + oy) / 256;
      let color = lerp(s.bg1, s.bg2, t);
      
      // 圆角背景边界
      if (!inRoundedRect(ox, oy, 0, 0, 128, 128, 24)) {
        color = { r: 0, g: 0, b: 0, a: 0 };
      } else {
        // 装饰圆环
        const distToCenter = Math.sqrt((ox - 64) ** 2 + (oy - 65) ** 2);
        if (distToCenter >= 44 && distToCenter <= 48) {
          color = { ...s.accent, a: 80 };
        }
        
        // 身体
        if (inEllipse(ox, oy, 55, 70, 32, 30)) {
          if (style === 'rainbow') {
            // 彩虹渐变身体
            const hue = ((ox - 23) / 64) * 360;
            color = hsvToRgb(hue, 0.8, 0.9);
          } else if (style === 'minimal') {
            // 极简风格 - 只画轮廓
            if (!inEllipse(ox, oy, 55, 70, 28, 26)) {
              color = s.body;
            }
          } else {
            color = s.body;
            // 羽毛纹理
            if (inEllipse(ox, oy, 55, 72, 24, 20)) {
              color = s.bodyDark;
            }
          }
        }
        
        // 头部
        if (inCircle(ox, oy, 72, 50, 20)) {
          if (style === 'rainbow') {
            const hue = ((ox - 52) / 40) * 360 + 180;
            color = hsvToRgb(hue, 0.8, 0.9);
          } else if (style === 'minimal') {
            if (!inCircle(ox, oy, 72, 50, 17)) {
              color = s.body;
            }
          } else {
            color = s.body;
          }
        }
        
        // 喙 - 根据风格调整形状
        if (style === 'cute') {
          // 可爱风格 - 短胖喙
          if (ox >= 86 && ox <= 105 && oy >= 52 && oy <= 60) {
            const beakWidth = Math.max(0, 4 - (ox - 86) * 0.15);
            if (Math.abs(oy - 56) < beakWidth + 1) {
              color = s.beak;
            }
          }
        } else {
          // 其他风格 - 长喙
          if (ox >= 88 && ox <= 115 && oy >= 50 && oy <= 62) {
            const beakWidth = Math.max(0.5, 5 - (ox - 88) * 0.15);
            if (Math.abs(oy - 56) < beakWidth) {
              color = s.beak;
            }
          }
        }
        
        // 眼睛
        if (inCircle(ox, oy, 78, 46, style === 'cute' ? 5 : 4)) {
          color = s.eye;
        }
        // 眼睛高光
        if (inCircle(ox, oy, 79, 45, 2)) {
          color = { r: 255, g: 255, b: 255, a: 255 };
        }
        
        // 可爱风格腮红
        if (style === 'cute' && s.cheek.a > 0) {
          if (inEllipse(ox, oy, 65, 58, 6, 4)) {
            color = lerp(color, s.cheek, 0.5);
          }
        }
        
        // 腿
        if (oy >= 94 && oy <= 110) {
          if ((ox >= 42 && ox <= 46) || (ox >= 52 && ox <= 56)) {
            color = s.bodyDark;
          }
        }
        // 脚趾
        if (oy >= 108 && oy <= 113) {
          if ((ox >= 38 && ox <= 50) || (ox >= 48 && ox <= 60)) {
            if ((ox % 4 < 2)) {
              color = s.bodyDark;
            }
          }
        }
        
        // 小翅膀
        if (inEllipse(ox, oy, 38, 66, 9, 14)) {
          if (style === 'minimal') {
            if (!inEllipse(ox, oy, 38, 66, 6, 11)) {
              color = { ...s.body, a: 180 };
            }
          } else {
            color = { ...s.bodyDark, a: 200 };
          }
        }
      }
      
      const idx = ((size - 1 - y) * size + x) * 4;
      pixels[idx] = Math.round(color.b);
      pixels[idx + 1] = Math.round(color.g);
      pixels[idx + 2] = Math.round(color.r);
      pixels[idx + 3] = Math.round(color.a);
    }
  }
  
  return createIcoBuffer(pixels, size);
}

function hsvToRgb(h, s, v) {
  h = h % 360;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: 255 };
}

function createIcoBuffer(pixels, size) {
  const bmpInfoHeader = Buffer.alloc(40);
  bmpInfoHeader.writeUInt32LE(40, 0);
  bmpInfoHeader.writeInt32LE(size, 4);
  bmpInfoHeader.writeInt32LE(size * 2, 8);
  bmpInfoHeader.writeUInt16LE(1, 12);
  bmpInfoHeader.writeUInt16LE(32, 14);
  bmpInfoHeader.writeUInt32LE(0, 16);
  bmpInfoHeader.writeUInt32LE(pixels.length, 20);
  
  const maskRowSize = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(maskRowSize * size);
  
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);
  iconDir.writeUInt16LE(1, 2);
  iconDir.writeUInt16LE(1, 4);
  
  const iconDirEntry = Buffer.alloc(16);
  iconDirEntry.writeUInt8(0, 0);
  iconDirEntry.writeUInt8(0, 1);
  iconDirEntry.writeUInt8(0, 2);
  iconDirEntry.writeUInt8(0, 3);
  iconDirEntry.writeUInt16LE(1, 4);
  iconDirEntry.writeUInt16LE(32, 6);
  const imageSize = bmpInfoHeader.length + pixels.length + andMask.length;
  iconDirEntry.writeUInt32LE(imageSize, 8);
  iconDirEntry.writeUInt32LE(22, 12);
  
  return Buffer.concat([iconDir, iconDirEntry, bmpInfoHeader, pixels, andMask]);
}

// 确保目录存在
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 生成所有风格
const styleNames = ['cute', 'minimal', 'natural', 'neon', 'rainbow'];

console.log('🥝 几维鸟图标生成器\n');
console.log('生成以下风格的图标:\n');

styleNames.forEach((style, i) => {
  const ico = createIcon(style);
  const filename = `icon-${style}.ico`;
  fs.writeFileSync(path.join(buildDir, filename), ico);
  
  const descriptions = {
    cute: '💕 可爱卡通风 - 圆润Q版，橙色小喙，粉色腮红',
    minimal: '⚡ 极简线条风 - 黑底青色轮廓，现代简约',
    natural: '🌿 自然写实风 - 森林绿背景，真实棕色羽毛',
    neon: '🌈 霓虹赛博风 - 深色背景，霓虹粉+青色',
    rainbow: '✨ 渐变彩虹风 - 彩虹渐变羽毛，绚丽夺目'
  };
  
  console.log(`${i + 1}. ${descriptions[style]}`);
  console.log(`   文件: build/${filename}\n`);
});

console.log('----------------------------------------');
console.log('选择喜欢的风格后，将对应文件重命名为 icon.ico 即可使用');
console.log('或告诉我你喜欢哪个风格，我帮你设置！');
