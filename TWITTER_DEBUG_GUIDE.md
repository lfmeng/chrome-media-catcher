# Twitter 图片抓取调试指南

## 📋 问题分析

**URL 格式**：`https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium`

**可能的问题**：
1. ✅ Twitter 域名识别 - 已修复
2. ✅ format 参数处理 - 已修复
3. ✅ srcset 属性支持 - 新增修复
4. ✅ URL 标准化保留 format 参数 - 已修复

## 🔧 已实施的修复

### 1. background.js (第75-91行)
```javascript
// 🔥 优先检查特殊域名（Twitter等使用查询参数的网站）
const urlLower = details.url.toLowerCase();
if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
  mediaType = 'image';
  console.log('✅ 通过 Twitter 域名识别为图片');
}
```

### 2. src/content.js (第201-237行)
```javascript
// 🔥 检查是否有重要的格式相关查询参数
const formatParam = urlObj.searchParams.get('format');
const typeParam = urlObj.searchParams.get('type');
const extParam = urlObj.searchParams.get('ext');
const idParam = urlObj.searchParams.get('id');

// 如果有格式参数，保留这些重要参数
if (formatParam || typeParam || extParam || idParam) {
  const importantParams = new URLSearchParams();
  if (formatParam) importantParams.set('format', formatParam);
  if (typeParam) importantParams.set('type', typeParam);
  if (extParam) importantParams.set('ext', extParam);
  if (idParam) importantParams.set('id', idParam);

  const queryString = importantParams.toString();
  normalizedUrl = urlObj.origin + urlObj.pathname + (queryString ? '?' + queryString : '');
}
```

### 3. src/content.js - srcset 支持 (新增)
```javascript
// 🔥 检查 srcset 属性（Twitter 可能使用 srcset 加载不同尺寸的图片）
if (img.srcset) {
  const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
  srcsetUrls.forEach(srcsetUrl => {
    if (srcsetUrl && !capturedUrls.has(srcsetUrl)) {
      checkMediaResource(srcsetUrl, 'image');
    }
  });
}
```

**修改位置**：
- MutationObserver 的 IMG 标签检查（第746-761行）
- MutationObserver 的 PICTURE 标签检查（第771-798行）
- MutationObserver 的后代元素检查（第788-812行）
- captureExistingMedia 函数（第904-921行）

## 🧪 测试步骤

### 步骤 1：重新加载扩展
1. 打开 Chrome，访问 `chrome://extensions/`
2. 找到 "媒体资源捕获器" 扩展
3. 点击刷新按钮 🔄

### 步骤 2：清理缓存
1. 在 `chrome://extensions/` 页面
2. 点击扩展的"详细信息"
3. 点击"清除存储空间"

### 步骤 3：测试 Twitter 图片

**测试 URL**：
- https://twitter.com （任意包含图片的推文）
- https://x.com （任意包含图片的推文）

**测试步骤**：
1. 打开 Twitter/X
2. 找到包含图片的推文
3. 等待图片完全加载
4. 点击扩展图标
5. 检查图片列表

### 步骤 4：调试日志

#### 4.1 检查 Background 日志
1. 访问 `chrome://extensions/`
2. 找到 "媒体资源捕获器"
3. 点击 "Service Worker" 链接
4. 查看控制台日志

**应该看到**：
```
🔍 检测请求: https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium image/jpeg
✅ 通过 Content-Type 识别为图片: image/jpeg
🎯 捕获到媒体资源: image https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium
```

或者：
```
🔍 检测请求: https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium
✅ 通过 Twitter 域名识别为图片
🎯 捕获到媒体资源: image https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium
```

#### 4.2 检查 Content Script 日志
1. 在 Twitter 页面上，右键点击扩展图标
2. 选择"检查弹出窗口"
3. 切换到 "Console" 标签
4. 刷新 Twitter 页面

**应该看到**：
```
✅ 通过 Twitter 域名识别
```

或者：
```
📋 查询参数:
  - format: jpg
✅ 通过 format 参数识别: jpg
```

#### 4.3 检查网络请求
1. 在 Twitter 页面上，按 F12 打开开发者工具
2. 切换到 "Network" 标签
3. 刷新页面
4. 过滤 "pbs.twimg.com"
5. 检查图片请求的 Response Headers

**应该看到**：
```
Content-Type: image/jpeg
```

## 🔍 高级调试

### 1. 手动测试 URL 识别
运行测试脚本：
```bash
node test-twitter-url.js
```

**预期输出**：
```
✅ 通过 Twitter 域名识别
✅ 识别为图片
✅ 保留重要参数
标准化后的 URL: https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg
```

### 2. 在控制台测试
在 Twitter 页面的控制台中运行：
```javascript
// 检查页面上所有图片
const images = document.querySelectorAll('img');
images.forEach((img, i) => {
  console.log(i, img.src);
  if (img.srcset) {
    console.log('  srcset:', img.srcset);
  }
});

// 检查是否有 Twitter 图片
const twitterImages = Array.from(images).filter(img =>
  img.src.includes('pbs.twimg.com') || img.src.includes('twimg.com')
);
console.log('Twitter 图片数量:', twitterImages.length);
twitterImages.forEach(img => console.log(img.src));
```

### 3. 检查 srcset
```javascript
// 查找使用 srcset 的 Twitter 图片
const imagesWithSrcset = Array.from(document.querySelectorAll('img'))
  .filter(img => img.srcset && (img.src.includes('pbs.twimg.com') || img.src.includes('twimg.com')));

console.log('使用 srcset 的 Twitter 图片:', imagesWithSrcset.length);
imagesWithSrcset.forEach(img => {
  console.log('src:', img.src);
  console.log('srcset:', img.srcset);
});
```

## ❓ 故障排除

### 问题 1：扩展图标没有反应
**原因**：扩展没有正确加载
**解决**：
1. 检查 `chrome://extensions/` 中是否有错误
2. 重新启用扩展
3. 重启浏览器

### 问题 2：图片列表为空
**原因**：权限问题或 Content Script 未注入
**解决**：
1. 检查扩展是否有权限访问 Twitter
2. 刷新 Twitter 页面
3. 检查控制台是否有错误

### 问题 3：只抓取到部分图片
**原因**：懒加载或延迟加载
**解决**：
1. 滚动页面，确保所有图片都已加载
2. 等待 3-5 秒
3. 点击扩展的"刷新"按钮

### 问题 4：图片被重复抓取
**原因**：同一图片的不同尺寸
**说明**：这是正常现象
- `?name=900x900` 和 `?name=large` 是不同的图片
- 扩展会分别捕获这些不同尺寸的图片

### 问题 5：某些特定图片抓取不到
**可能原因**：
1. 图片通过特殊的 JavaScript 加载（如 Blob URL）
2. 图片通过 WebSocket 加载
3. 图片通过 Data URI 加载

**调试方法**：
```javascript
// 检查页面上所有图片资源
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('pbs.twimg.com') || r.name.includes('twimg.com'))
  .forEach(r => {
    console.log('Resource:', r.name, r.initiatorType);
  });
```

## 📊 验证清单

- [ ] 扩展已重新加载
- [ ] 缓存已清除
- [ ] 测试 Twitter 页面可以访问
- [ ] 扩展图标可以点击
- [ ] 图片列表正常显示
- [ ] 控制台没有错误
- [ ] Background 日志显示"通过 Twitter 域名识别"
- [ ] Content 日志显示"通过 format 参数识别"
- [ ] 不同尺寸的图片都能被抓取
- [ ] srcset 图片也能被抓取

## 🎯 预期结果

修复后，应该能够：
1. ✅ 抓取所有 `pbs.twimg.com` 域名的图片
2. ✅ 抓取所有使用 `format=jpg/png/webp` 参数的图片
3. ✅ 抓取通过 `srcset` 加载的所有尺寸的图片
4. ✅ 正确处理不同 `name` 参数（如 `?name=medium`、`?name=large`）
5. ✅ 不会因为 URL 标准化而丢失 format 参数

## 📝 技术细节

### Twitter 图片 URL 格式
```
https://pbs.twimg.com/media/{MEDIA_ID}?format={FORMAT}&name={SIZE}

示例：
- format: jpg, png, webp, gif
- name: thumb, small, medium, large, 900x900, etc.
```

### 检测流程
```
1. Background Service Worker 检测 HTTP 请求
   ↓
2. 检查 Twitter 域名 (pbs.twimg.com)
   ↓
3. 或检查 format 参数
   ↓
4. 或检查 Content-Type (image/*)
   ↓
5. 发送到 Content Script
   ↓
6. Content Script 检查 DOM 中的 <img> 标签
   ↓
7. 检查 src 和 srcset 属性
   ↓
8. 标准化 URL（保留 format 参数）
   ↓
9. 去重并添加到列表
   ↓
10. 显示在 Popup 中
```

## 🆘 如果还是不行

如果按照以上步骤调试后还是抓取不到图片，请提供以下信息：

1. **Background Service Worker 日志**（完整的控制台输出）
2. **Content Script 日志**（完整的控制台输出）
3. **Network 请求信息**：
   - 请求 URL
   - Response Headers
   - Content-Type
4. **DOM 检查结果**：
   ```javascript
   // 在控制台运行并截图
   const images = document.querySelectorAll('img');
   const twitterImages = Array.from(images).filter(img =>
     img.src.includes('pbs.twimg.com')
   );
   console.log('Twitter images:', twitterImages.map(img => ({
     src: img.src,
     srcset: img.srcset,
     currentSrc: img.currentSrc
   })));
   ```
5. **扩展版本号**：在 `chrome://extensions/` 中查看
6. **Chrome 版本号**：在 `chrome://version/` 中查看

有了这些信息，我可以进一步诊断问题所在。
