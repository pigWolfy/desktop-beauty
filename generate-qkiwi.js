const fs = require('fs');
const path = require('path');

function createQKiwi(style) {
  const size = 256;
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 128;
  
  // 预定义颜色方案
  const themes = {
    // 风格1: 奶茶色系 - 温暖可爱
    milk: {
      bg: { r: 0xFE, g: 0xF9, b: 0xEF, a: 255 },      // 奶白色背景
      bgRing: { r: 0xD4, g: 0xA5, b: 0x74, a: 100 },  // 奶茶色圈
      body: { r: 0x8B, g: 0x5A, b: 0x2B, a: 255 },    // 咖啡棕身体
      bodyLight: { r: 0xA0, g: 0x6E, b: 0x3B, a: 255 },
      belly: { r: 0xF5, g: 0xE6, b: 0xD3, a: 255 },   // 奶油色肚子
      beak: { r: 0xFF, g: 0x8C, b: 0x00, a: 255 },    // 橙色喙
      eye: { r: 0x2D, g: 0x1B, b: 0x0E, a: 255 },     // 深棕眼睛
      blush: { r: 0xFF, g: 0xB6, b: 0xC1, a: 180 },   // 粉色腮红
      feet: { r: 0xD4, g: 0x8C, b: 0x4A, a: 255 }     // 脚
    },
    // 风格2: 薄荷绿系 - 清新软萌
    mint: {
      bg: { r: 0xE8, g: 0xF5, b: 0xF0, a: 255 },      // 薄荷白背景
      bgRing: { r: 0x7F, g: 0xD4, b: 0xB8, a: 100 },
      body: { r: 0x5D, g: 0x9B, b: 0x84, a: 255 },    // 薄荷绿身体
      bodyLight: { r: 0x7F, g: 0xB8, b: 0x9E, a: 255 },
      belly: { r: 0xE0, g: 0xF2, b: 0xE9, a: 255 },   // 浅绿肚子
      beak: { r: 0xFF, g: 0xD9, b: 0x3D, a: 255 },    // 黄色喙
      eye: { r: 0x2B, g: 0x4D, b: 0x3F, a: 255 },
      blush: { r: 0xFF, g: 0xC0, b: 0xCB, a: 150 },
      feet: { r: 0xFF, g: 0xB3, b: 0x47, a: 255 }
    },
    // 风格3: 樱花粉系 - 甜美梦幻
    sakura: {
      bg: { r: 0xFF, g: 0xF0, b: 0xF5, a: 255 },      // 樱花白背景
      bgRing: { r: 0xFF, g: 0xB7, b: 0xC5, a: 100 },
      body: { r: 0xDE, g: 0x8E, b: 0x9E, a: 255 },    // 樱花粉身体
      bodyLight: { r: 0xF0, g: 0xA0, b: 0xB0, a: 255 },
      belly: { r: 0xFF, g: 0xE4, b: 0xE9, a: 255 },   // 浅粉肚子
      beak: { r: 0xFF, g: 0xA0, b: 0x50, a: 255 },
      eye: { r: 0x5D, g: 0x3A, b: 0x4A, a: 255 },
      blush: { r: 0xFF, g: 0x69, b: 0x90, a: 180 },
      feet: { r: 0xE8, g: 0x8E, b: 0x5A, a: 255 }
    },
    // 风格4: 星空紫系 - 神秘可爱
    galaxy: {
      bg: { r: 0x1A, g: 0x1A, b: 0x2E, a: 255 },      // 深紫背景
      bgRing: { r: 0x9D, g: 0x65, b: 0xC9, a: 120 },
      body: { r: 0x7B, g: 0x68, b: 0xEE, a: 255 },    // 紫色身体
      bodyLight: { r: 0x93, g: 0x82, b: 0xF5, a: 255 },
      belly: { r: 0xB8, g: 0xA9, b: 0xFA, a: 255 },   // 浅紫肚子
      beak: { r: 0xFF, g: 0xD7, b: 0x00, a: 255 },    // 金色喙
      eye: { r: 0x1A, g: 0x1A, b: 0x2E, a: 255 },
      blush: { r: 0xFF, g: 0x85, b: 0xB3, a: 150 },
      feet: { r: 0xDA, g: 0xA5, b: 0x20, a: 255 },
      stars: true  // 特殊效果：星星
    },
    // 风格5: 经典棕系 - 真实可爱
    classic: {
      bg: { r: 0xF5, g: 0xF5, b: 0xDC, a: 255 },      // 米色背景
      bgRing: { r: 0x8B, g: 0x73, b: 0x55, a: 80 },
      body: { r: 0x6B, g: 0x4E, b: 0x31, a: 255 },    // 棕色身体
      bodyLight: { r: 0x85, g: 0x64, b: 0x40, a: 255 },
      belly: { r: 0xD2, g: 0xB4, b: 0x8C, a: 255 },   // 浅棕肚子
      beak: { r: 0x4A, g: 0x4A, b: 0x4A, a: 255 },    // 灰黑喙（真实）
      eye: { r: 0x1A, g: 0x1A, b: 0x1A, a: 255 },
      blush: { r: 0xE8, g: 0xA0, b: 0xA0, a: 120 },
      feet: { r: 0x5A, g: 0x4A, b: 0x3A, a: 255 }
    }
  };
  
  const t = themes[style];
  
  // 辅助函数
  const inCircle = (x, y, cx, cy, r) => (x-cx)**2 + (y-cy)**2 <= r**2;
  const inEllipse = (x, y, cx, cy, rx, ry) => ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1;
  const dist = (x, y, cx, cy) => Math.sqrt((x-cx)**2 + (y-cy)**2);
  const lerp = (a, b, t) => ({ r: a.r+(b.r-a.r)*t, g: a.g+(b.g-a.g)*t, b: a.b+(b.b-a.b)*t, a: a.a+(b.a-a.a)*t });
  
  // 圆角矩形
  const inRoundRect = (x, y, r) => {
    if (x >= r && x <= 128-r) return y >= 0 && y <= 128;
    if (y >= r && y <= 128-r) return x >= 0 && x <= 128;
    if (x < r && y < r) return inCircle(x, y, r, r, r);
    if (x > 128-r && y < r) return inCircle(x, y, 128-r, r, r);
    if (x < r && y > 128-r) return inCircle(x, y, r, 128-r, r);
    if (x > 128-r && y > 128-r) return inCircle(x, y, 128-r, 128-r, r);
    return false;
  };
  
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = px / scale;
      const y = py / scale;
      
      let color = { ...t.bg };
      
      if (!inRoundRect(x, y, 20)) {
        color = { r: 0, g: 0, b: 0, a: 0 };
      } else {
        // 背景装饰圆环
        const d = dist(x, y, 64, 62);
        if (d >= 48 && d <= 52) {
          color = lerp(color, t.bgRing, 0.5);
        }
        
        // 星空效果（仅galaxy风格）
        if (t.stars) {
          const starPositions = [[20,25],[95,20],[108,45],[15,80],[100,90],[30,105],[85,108]];
          for (const [sx, sy] of starPositions) {
            if (dist(x, y, sx, sy) < 2) {
              color = { r: 255, g: 255, b: 200, a: 255 };
            }
          }
        }
        
        // ===== 几维鸟身体（大圆润椭圆）=====
        if (inEllipse(x, y, 60, 68, 36, 32)) {
          // 渐变效果
          const grad = (y - 36) / 64;
          color = lerp(t.bodyLight, t.body, Math.min(1, Math.max(0, grad)));
          
          // 肚子（浅色椭圆）
          if (inEllipse(x, y, 58, 75, 22, 20)) {
            color = t.belly;
          }
          
          // 羽毛纹理线条
          for (let i = 0; i < 5; i++) {
            const lineY = 55 + i * 8;
            if (Math.abs(y - lineY) < 1 && x > 35 && x < 80) {
              color = lerp(color, t.body, 0.3);
            }
          }
        }
        
        // ===== 头部（大圆）=====
        if (inCircle(x, y, 72, 42, 22)) {
          const grad = (y - 20) / 44;
          color = lerp(t.bodyLight, t.body, Math.min(1, Math.max(0, grad)));
        }
        
        // ===== 可爱的喙（短而圆润）=====
        // 上喙
        if (x >= 90 && x <= 110) {
          const beakY = 40 + (x - 90) * 0.1;
          const beakH = Math.max(0.5, 4 - (x - 90) * 0.15);
          if (y >= beakY - beakH && y <= beakY + 1) {
            color = t.beak;
          }
        }
        // 下喙
        if (x >= 90 && x <= 108) {
          const beakY = 44 - (x - 90) * 0.05;
          const beakH = Math.max(0.5, 3 - (x - 90) * 0.12);
          if (y >= beakY && y <= beakY + beakH) {
            color = lerp(t.beak, { r: 0, g: 0, b: 0, a: 255 }, 0.15);
          }
        }
        
        // ===== 大眼睛（Q版特征）=====
        // 眼白
        if (inCircle(x, y, 80, 38, 8)) {
          color = { r: 255, g: 255, b: 255, a: 255 };
        }
        // 眼珠
        if (inCircle(x, y, 82, 38, 5)) {
          color = t.eye;
        }
        // 眼睛高光（大）
        if (inCircle(x, y, 84, 36, 2.5)) {
          color = { r: 255, g: 255, b: 255, a: 255 };
        }
        // 眼睛高光（小）
        if (inCircle(x, y, 80, 40, 1)) {
          color = { r: 255, g: 255, b: 255, a: 255 };
        }
        
        // ===== 腮红 =====
        if (inEllipse(x, y, 68, 50, 7, 4)) {
          color = lerp(color, t.blush, 0.6);
        }
        
        // ===== 小翅膀 =====
        if (inEllipse(x, y, 32, 62, 10, 16)) {
          color = lerp(t.body, { r: 0, g: 0, b: 0, a: 255 }, 0.1);
        }
        
        // ===== 小短腿 =====
        // 左腿
        if (x >= 45 && x <= 52 && y >= 94 && y <= 108) {
          color = t.feet;
        }
        // 右腿
        if (x >= 60 && x <= 67 && y >= 94 && y <= 108) {
          color = t.feet;
        }
        // 左脚掌
        if (inEllipse(x, y, 48, 110, 8, 4)) {
          color = t.feet;
        }
        // 右脚掌
        if (inEllipse(x, y, 63, 110, 8, 4)) {
          color = t.feet;
        }
        
        // ===== 头顶小呆毛 =====
        if (x >= 65 && x <= 70) {
          const tuftY = 20 + Math.sin((x - 65) * 0.8) * 3;
          if (y >= tuftY && y <= tuftY + 8 && y < 28) {
            color = t.body;
          }
        }
      }
      
      const idx = ((size - 1 - py) * size + px) * 4;
      pixels[idx] = Math.round(color.b);
      pixels[idx + 1] = Math.round(color.g);
      pixels[idx + 2] = Math.round(color.r);
      pixels[idx + 3] = Math.round(color.a);
    }
  }
  
  return createIcoBuffer(pixels, size);
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

// 主程序
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('🥝 Q版几维鸟图标生成器 v2\n');
console.log('═'.repeat(50));

const styles = [
  { id: 'milk', name: '☕ 奶茶棕', desc: '温暖治愈的奶茶色系，软萌可爱' },
  { id: 'mint', name: '🌿 薄荷绿', desc: '清新自然的薄荷色系，清爽软萌' },
  { id: 'sakura', name: '🌸 樱花粉', desc: '甜美梦幻的樱花色系，少女心满满' },
  { id: 'galaxy', name: '✨ 星空紫', desc: '神秘可爱的紫色系，带闪烁星星' },
  { id: 'classic', name: '🥝 经典棕', desc: '真实几维鸟配色，经典耐看' }
];

styles.forEach((s, i) => {
  const ico = createQKiwi(s.id);
  const filename = `kiwi-${s.id}.ico`;
  fs.writeFileSync(path.join(buildDir, filename), ico);
  console.log(`\n${i + 1}. ${s.name}`);
  console.log(`   ${s.desc}`);
  console.log(`   📁 build/${filename}`);
});

console.log('\n' + '═'.repeat(50));
console.log('💡 告诉我你喜欢哪个，我帮你设置为应用图标！');
