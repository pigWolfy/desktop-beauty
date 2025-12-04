const fs = require('fs');
const path = require('path');

// 创建一个简约的 ICO 文件
// 风格：圆角矩形，渐变背景，中心简约星形/闪光

function createMinimalIcon() {
  const size = 256;
  const bpp = 32; // 32位色深 (BGRA)
  
  // 创建像素数据
  const pixels = Buffer.alloc(size * size * 4);
  // AND mask (1 bit per pixel)
  const andMask = Buffer.alloc(size * size / 8).fill(0); 
  
  // 颜色配置
  // 渐变背景：清新蓝紫渐变
  const startColor = { r: 0x66, g: 0x7e, b: 0xea }; // Soft Blue
  const endColor = { r: 0x76, g: 0x4b, b: 0xa2 };   // Deep Purple
  // 图标符号：纯白
  const symbolColor = { r: 255, g: 255, b: 255 };

  // 辅助函数：检查点是否在圆角矩形内
  function inRoundedRect(x, y, w, h, r) {
    if (x < 0 || x > w || y < 0 || y > h) return false;
    if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r ** 2;
    if (x > w - r && y < r) return (x - (w - r)) ** 2 + (y - r) ** 2 <= r ** 2;
    if (x < r && y > h - r) return (x - r) ** 2 + (y - (h - r)) ** 2 <= r ** 2;
    if (x > w - r && y > h - r) return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r ** 2;
    return true;
  }

  // 辅助函数：检查点是否在四角星/闪光形状内
  // 使用超椭圆方程的变体: |x|^n + |y|^n <= r^n, n < 1
  function inSparkle(x, y, cx, cy, scale) {
    const dx = Math.abs(x - cx) / scale;
    const dy = Math.abs(y - cy) / scale;
    // n=0.65 产生一个优雅的内凹星形
    return Math.pow(dx, 0.65) + Math.pow(dy, 0.65) <= 1;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // BMP 存储是从下到上的
      // y=0 是底部，y=255 是顶部
      // 我们绘图习惯是从上到下，所以这里反转y
      const drawY = size - 1 - y;
      const drawX = x;
      
      const offset = y * size * 4 + x * 4;
      
      // 1. 背景形状 (圆角矩形)
      if (inRoundedRect(drawX, drawY, size, size, size * 0.22)) {
        // 2. 计算渐变
        // 简单的线性渐变 (左上到右下)
        const t = (drawX + drawY) / (size * 2);
        const r = Math.floor(startColor.r + (endColor.r - startColor.r) * t);
        const g = Math.floor(startColor.g + (endColor.g - startColor.g) * t);
        const b = Math.floor(startColor.b + (endColor.b - startColor.b) * t);
        
        // 3. 绘制中心符号 (闪光)
        if (inSparkle(drawX, drawY, size/2, size/2, size * 0.35)) {
           pixels[offset] = symbolColor.b;     // Blue
           pixels[offset + 1] = symbolColor.g; // Green
           pixels[offset + 2] = symbolColor.r; // Red
           pixels[offset + 3] = 255;           // Alpha
        } else {
           pixels[offset] = b;
           pixels[offset + 1] = g;
           pixels[offset + 2] = r;
           pixels[offset + 3] = 255;
        }
      } else {
        // 透明区域
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 0;
        
        // 设置 AND mask (1 = transparent)
        const byteIndex = y * (size / 8) + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        andMask[byteIndex] |= (1 << bitIndex);
      }
    }
  }

  // 构建 ICO 文件结构
  
  // ICONDIR (6 bytes)
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);     // Reserved
  iconDir.writeUInt16LE(1, 2);     // Type (1 = ICO)
  iconDir.writeUInt16LE(1, 4);     // Count (1 image)
  
  // BMP Info Header (40 bytes)
  const bmpInfoHeader = Buffer.alloc(40);
  bmpInfoHeader.writeUInt32LE(40, 0);      // Size
  bmpInfoHeader.writeInt32LE(size, 4);     // Width
  bmpInfoHeader.writeInt32LE(size * 2, 8); // Height (XOR + AND masks height combined)
  bmpInfoHeader.writeUInt16LE(1, 12);      // Planes
  bmpInfoHeader.writeUInt16LE(bpp, 14);    // BitCount
  bmpInfoHeader.writeUInt32LE(0, 16);      // Compression (BI_RGB)
  bmpInfoHeader.writeUInt32LE(pixels.length + andMask.length, 20); // SizeImage
  bmpInfoHeader.writeInt32LE(0, 24);       // XPelsPerMeter
  bmpInfoHeader.writeInt32LE(0, 28);       // YPelsPerMeter
  bmpInfoHeader.writeUInt32LE(0, 32);      // ClrUsed
  bmpInfoHeader.writeUInt32LE(0, 36);      // ClrImportant
  
  // ICONDIRENTRY (16 bytes)
  const iconDirEntry = Buffer.alloc(16);
  iconDirEntry.writeUInt8(0, 0);   // Width (0 = 256)
  iconDirEntry.writeUInt8(0, 1);   // Height (0 = 256)
  iconDirEntry.writeUInt8(0, 2);   // ColorCount
  iconDirEntry.writeUInt8(0, 3);   // Reserved
  iconDirEntry.writeUInt16LE(1, 4);  // Planes
  iconDirEntry.writeUInt16LE(bpp, 6); // BitCount
  const imageSize = bmpInfoHeader.length + pixels.length + andMask.length;
  iconDirEntry.writeUInt32LE(imageSize, 8);  // BytesInRes
  iconDirEntry.writeUInt32LE(22, 12);  // ImageOffset (6 + 16 = 22)
  
  // 组合所有部分
  const ico = Buffer.concat([iconDir, iconDirEntry, bmpInfoHeader, pixels, andMask]);
  
  return ico;
}

// 生成并保存
const ico = createMinimalIcon();
const outputPath = path.join(__dirname, 'build', 'icon.ico');

// 确保 build 目录存在
if (!fs.existsSync(path.join(__dirname, 'build'))) {
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
}

fs.writeFileSync(outputPath, ico);
console.log(`Minimal Icon saved to: ${outputPath}`);
