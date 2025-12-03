const fs = require('fs');
const path = require('path');

// 创建一个简单的 ICO 文件
// ICO 文件格式: ICONDIR + ICONDIRENTRY[] + 图像数据

// 创建一个 32x32 的简单几维鸟图标（BMP格式，嵌入ICO）
function createKiwiIcon() {
  const size = 256;
  const bpp = 32; // 32位色深 (BGRA)
  
  // 创建像素数据
  const pixels = Buffer.alloc(size * size * 4);
  
  // 背景色 (深蓝色 #1a1a2e)
  const bgColor = { r: 0x1a, g: 0x1a, b: 0x2e, a: 255 };
  // 身体色 (棕色渐变)
  const bodyColor = { r: 0x6B, g: 0x53, b: 0x44, a: 255 };
  const bodyDark = { r: 0x5D, g: 0x4E, b: 0x37, a: 255 };
  // 喙的颜色
  const beakColor = { r: 0x4A, g: 0x4A, b: 0x4A, a: 255 };
  // 眼睛
  const eyeColor = { r: 0x1a, g: 0x1a, b: 0x2e, a: 255 };
  const eyeHighlight = { r: 255, g: 255, b: 255, a: 255 };
  
  // 辅助函数：检查点是否在椭圆内
  function inEllipse(x, y, cx, cy, rx, ry) {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  
  // 辅助函数：检查点是否在圆内
  function inCircle(x, y, cx, cy, r) {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }
  
  // 辅助函数：检查点是否在圆角矩形内
  function inRoundRect(x, y, rx, ry, w, h, radius) {
    if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
    // 简化：不检查圆角
    return true;
  }
  
  // 缩放因子 (原始设计是128x128，现在是256x256)
  const scale = size / 128;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 转换到原始坐标系
      const ox = x / scale;
      const oy = y / scale;
      
      let color = bgColor;
      
      // 检查是否在圆角矩形背景边界外（透明）
      const cornerRadius = 24;
      let inBackground = true;
      if (ox < cornerRadius && oy < cornerRadius) {
        inBackground = inCircle(ox, oy, cornerRadius, cornerRadius, cornerRadius);
      } else if (ox > 128 - cornerRadius && oy < cornerRadius) {
        inBackground = inCircle(ox, oy, 128 - cornerRadius, cornerRadius, cornerRadius);
      } else if (ox < cornerRadius && oy > 128 - cornerRadius) {
        inBackground = inCircle(ox, oy, cornerRadius, 128 - cornerRadius, cornerRadius);
      } else if (ox > 128 - cornerRadius && oy > 128 - cornerRadius) {
        inBackground = inCircle(ox, oy, 128 - cornerRadius, 128 - cornerRadius, cornerRadius);
      }
      
      if (!inBackground) {
        color = { r: 0, g: 0, b: 0, a: 0 }; // 透明
      } else {
        // 身体 - 椭圆
        if (inEllipse(ox, oy, 58, 72, 30, 28)) {
          color = bodyColor;
          // 内部纹理
          if (inEllipse(ox, oy, 58, 72, 20, 18)) {
            color = bodyDark;
          }
        }
        
        // 头部 - 圆
        if (inCircle(ox, oy, 75, 52, 18)) {
          color = bodyColor;
        }
        
        // 喙
        if (ox >= 88 && ox <= 112 && oy >= 52 && oy <= 62) {
          const beakCenterY = 57;
          const distFromCenter = Math.abs(oy - beakCenterY);
          const beakWidth = (112 - ox) / 24 * 4; // 越靠近尖端越细
          if (distFromCenter < beakWidth + 2) {
            color = beakColor;
          }
        }
        
        // 眼睛
        if (inCircle(ox, oy, 80, 48, 4)) {
          color = eyeColor;
        }
        // 眼睛高光
        if (inCircle(ox, oy, 81, 47, 1.5)) {
          color = eyeHighlight;
        }
        
        // 腿（简化为两条线）
        if (oy >= 95 && oy <= 111) {
          if ((ox >= 41 && ox <= 44) || (ox >= 49 && ox <= 52)) {
            color = bodyDark;
          }
        }
        
        // 小翅膀
        if (inEllipse(ox, oy, 40, 68, 8, 12)) {
          color = { r: 0x7A, g: 0x6B, b: 0x5A, a: 200 };
        }
      }
      
      // ICO/BMP 是 BGRA 格式，且是从下到上存储
      const idx = ((size - 1 - y) * size + x) * 4;
      pixels[idx] = color.b;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.r;
      pixels[idx + 3] = color.a;
    }
  }
  
  // 创建 BMP 信息头 (BITMAPINFOHEADER)
  const bmpInfoHeader = Buffer.alloc(40);
  bmpInfoHeader.writeUInt32LE(40, 0);           // biSize
  bmpInfoHeader.writeInt32LE(size, 4);          // biWidth
  bmpInfoHeader.writeInt32LE(size * 2, 8);      // biHeight (ICO中是双倍高度，包含mask)
  bmpInfoHeader.writeUInt16LE(1, 12);           // biPlanes
  bmpInfoHeader.writeUInt16LE(bpp, 14);         // biBitCount
  bmpInfoHeader.writeUInt32LE(0, 16);           // biCompression (BI_RGB)
  bmpInfoHeader.writeUInt32LE(pixels.length, 20); // biSizeImage
  bmpInfoHeader.writeInt32LE(0, 24);            // biXPelsPerMeter
  bmpInfoHeader.writeInt32LE(0, 28);            // biYPelsPerMeter
  bmpInfoHeader.writeUInt32LE(0, 32);           // biClrUsed
  bmpInfoHeader.writeUInt32LE(0, 36);           // biClrImportant
  
  // AND mask (全0表示不透明，但我们用alpha通道)
  const maskRowSize = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(maskRowSize * size);
  
  // ICONDIR
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);     // Reserved
  iconDir.writeUInt16LE(1, 2);     // Type (1 = ICO)
  iconDir.writeUInt16LE(1, 4);     // Count
  
  // ICONDIRENTRY
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
const ico = createKiwiIcon();
const outputPath = path.join(__dirname, 'build', 'icon.ico');

// 确保 build 目录存在
if (!fs.existsSync(path.join(__dirname, 'build'))) {
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
}

fs.writeFileSync(outputPath, ico);
console.log(`Icon saved to: ${outputPath}`);
console.log(`Size: ${ico.length} bytes`);
