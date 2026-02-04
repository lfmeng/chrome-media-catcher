# Twitter 图片格式抓取测试指南

## 测试 URL 列表

### Twitter 图片（使用 format 参数）
1. `https://pbs.twimg.com/media/HAJxpGPa4AAO_g9?format=jpg&name=900x900`
2. `https://pbs.twimg.com/media/HAJxpGPa4AAO_g9?format=png&name=large`
3. `https://pbs.twimg.com/media/HAJxpGPa4AAO_g9?format=webp&name=medium`

### Twitter 视频缩略图
4. `https://pbs.twimg.com/tweet_video_thumb/ABC123?format=jpg&name=large`
5. `https://pbs.twimg.com/media/DEF456?format=mp4&name=hd`

## 测试步骤

### 1. 重新加载扩展
1. 打开 Chrome，访问 `chrome://extensions/`
2. 找到 "Chrome Media Catcher" 扩展
3. 点击刷新按钮 🔄
4. 或者先关闭再启用扩展

### 2. 打开 Twitter/X 页面
1. 访问 https://twitter.com 或 https://x.com
2. 找到包含图片的推文
3. 点击扩展图标

### 3. 检查抓取结果
**预期结果**：
- ✅ 所有 Twitter 图片都应该出现在列表中
- ✅ 图片类型应该正确识别为 "image"
- ✅ 图片 URL 应该包含 `format` 参数

**调试方法**：
1. 右键点击扩展图标 -> "检查弹出窗口"
2. 打开开发者工具的 Console 标签
3. 查看是否有以下日志：
   ```
   ✅ 通过 Twitter 域名识别为图片
   🔍 检查图片 URL: https://pbs.twimg.com/media/...
     - format: jpg
   ✅ 通过 format 参数识别为图片
   ```

### 4. Background 调试
如果还是有问题，检查 Background 日志：
1. 访问 `chrome://extensions/`
2. 找到 "Chrome Media Catcher"
3. 点击 "Service Worker" 查看后台日志
4. 查找以下日志：
   ```
   🔍 检测请求: https://pbs.twimg.com/media/...
   ✅ 通过 Twitter 域名识别为图片
   ```

### 5. 常见问题

**问题 1：图片还是没有抓取到**
- 检查 Network 面板，看图片是否真的被加载
- 确认扩展是否有权限访问该页面
- 刷新页面重新测试

**问题 2：图片被重复抓取**
- 这是正常的，可能是不同尺寸的图片
- 例如 `?name=900x900` 和 `?name=large` 是不同的图片

**问题 3：只抓取到部分图片**
- 可能是图片延迟加载（懒加载）
- 滚动页面等待所有图片加载完成
- 点击扩展的 "刷新" 按钮

## 修复细节

### background.js 修改
```javascript
// 🔥 优先检查特殊域名（Twitter等使用查询参数的网站）
const urlLower = details.url.toLowerCase();
if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
  mediaType = 'image';
  console.log('✅ 通过 Twitter 域名识别为图片');
}
```

### src/content.js 修改
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
  // ...
  normalizedUrl = urlObj.origin + urlObj.pathname + '?' + queryString;
}
```

## 支持的其他平台

这个修复不仅支持 Twitter，还支持所有使用类似格式的网站：
- Facebook 图片
- Instagram 图片
- 微博图片
- 所有使用 `?format=` 或 `?type=` 参数的图片资源

## 预期效果

修复后，应该能够：
1. ✅ 抓取所有 Twitter 图片（不管使用什么格式参数）
2. ✅ 抓取 Twitter 视频缩略图
3. ✅ 支持所有使用查询参数指定格式的图片
4. ✅ 不会因为移除查询参数而导致格式信息丢失
5. ✅ 正确去重（同一图片的不同尺寸会被视为不同资源）
