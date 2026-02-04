# 图标文件说明

需要添加以下尺寸的图标：

- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## 临时解决方案

可以使用以下在线工具生成图标：
1. 访问 https://www.favicon-generator.org/
2. 上传一个图片
3. 下载生成的图标包
4. 将图标文件放到此目录

## 图标设计建议

- 使用 📷 或 🎬 作为图标主题
- 主色调使用渐变紫色 (#667eea → #764ba2)
- 简洁的设计风格

## SVG 格式

如果需要矢量图标，可以使用以下 SVG 代码：

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" fill="url(#grad)"/>
  <text x="64" y="64" font-size="64" text-anchor="middle" dy=".3em">📷</text>
</svg>
```
