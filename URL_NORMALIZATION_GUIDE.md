# 图片URL标准化逻辑说明

## 📋 问题说明

用户反馈：新浪微博图片URL在抓取时出现异常

**问题URL示例**：
```
https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg?KID=imgbed,tva&Expires=1770210780&ssig=ZVB5f00iHX
```

**问题分析**：
- URL有明确的 `.jpg` 文件扩展名
- 后面的查询参数（`KID`, `Expires`, `ssig`）是临时授权/签名参数
- 这些参数会导致同一张图片因为每次加载时参数不同而被识别为不同的资源
- 应该忽略这些临时参数，只保留核心URL路径

## 🔧 修复方案

### 新的URL标准化逻辑（三级优先级）

#### ✅ 优先级1：有明确扩展名 → 忽略所有查询参数

**适用情况**：URL路径以 `.jpg`, `.png`, `.mp4`, `.mp3` 等扩展名结尾

**示例**：
```
原始URL:
https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg?KID=imgbed,tva&Expires=1770210780&ssig=ZVB5f00iHX

标准化后:
https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg
```

**支持的扩展名**：
- 图片：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`, `.avif`, `.apng`, `.tiff`, `.tif`, `.psd`, `.raw`, `.heif`, `.heic`, `.jxl`
- 视频：`.mp4`, `.webm`, `.ogg`, `.avi`, `.mov`, `.wmv`, `.flv`, `.m4v`, `.mkv`, `.3gp`, `.m3u8`, `.m3u`, `.ts`, `.mpd`
- 音频：`.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.wma`, `.opus`, `.ogg`

#### ✅ 优先级2：无扩展名但有format参数 → 保留格式参数

**适用情况**：URL没有文件扩展名，但通过 `format`, `type`, `ext`, `id` 参数指定格式

**示例**：
```
原始URL:
https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium

标准化后:
https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg
```

**保留的参数**：
- `format` - 格式（如 jpg, png, webp）
- `type` - 类型（如 image/png）
- `ext` - 扩展名
- `id` - 资源ID

**移除的参数**：
- `name` - 尺寸名称（如 medium, large）
- `quality` - 质量参数
- 其他临时参数

#### ✅ 优先级3：既无扩展名也无格式参数 → 移除所有参数

**示例**：
```
原始URL:
https://example.com/resource/page?param1=value1&param2=value2

标准化后:
https://example.com/resource/page
```

## 📊 去重效果对比

### 新浪微博图片（有扩展名）

**不同临时参数的同一张图片**：
```
URL 1: https://tvax4.sinaimg.cn/.../img.jpg?KID=imgbed,tva&Expires=1770210780&ssig=ZVB5f00iHX
URL 2: https://tvax4.sinaimg.cn/.../img.jpg?KID=imgbed,tva&Expires=1770210781&ssig=ZVB5f00iYY

标准化后:
https://tvax4.sinaimg.cn/.../img.jpg
https://tvax4.sinaimg.cn/.../img.jpg

✅ 去重成功：识别为同一张图片
```

### Twitter图片（无扩展名）

**不同尺寸的同一张图片**：
```
URL 1: https://pbs.twimg.com/media/XXX?format=jpg&name=medium
URL 2: https://pbs.twimg.com/media/XXX?format=jpg&name=large

标准化后:
https://pbs.twimg.com/media/XXX?format=jpg
https://pbs.twimg.com/media/XXX?format=jpg

✅ 去重成功：识别为同一张图片
```

**不同格式的同一张图片**：
```
URL 1: https://pbs.twimg.com/media/XXX?format=jpg&name=medium
URL 2: https://pbs.twimg.com/media/XXX?format=png&name=medium

标准化后:
https://pbs.twimg.com/media/XXX?format=jpg
https://pbs.twimg.com/media/XXX?format=png

ℹ️  不同格式：保留为两个不同的资源
```

## 🧪 测试结果

运行 `node test-url-normalization.js` 的结果：

```
✅ 通过: 10 / 10
❌ 失败: 0 / 10
📊 通过率: 100.0%
🎉 所有测试通过！
```

**测试用例包括**：
1. 新浪微博图片（有.jpg扩展名） ✅
2. 新浪微博图片（有.png扩展名） ✅
3. Twitter图片（无扩展名，format参数） ✅
4. Twitter图片（无扩展名，type参数） ✅
5. 普通图片（有.jpg扩展名） ✅
6. 普通视频（有.mp4扩展名） ✅
7. 音频文件（有.mp3扩展名） ✅
8. 无扩展名的资源（format参数） ✅
9. 无扩展名的资源（id参数） ✅
10. 无扩展名且无格式参数 ✅

## 🎯 优势

### 1. 正确去重
- 同一张图片的不同版本（不同临时参数）会被识别为同一资源
- 避免列表中出现大量重复项

### 2. 兼容多种格式
- 支持传统的文件扩展名（新浪微博、普通网站）
- 支持查询参数格式（Twitter/X）
- 支持混合模式

### 3. 智能参数保留
- 对于有扩展名的URL，移除所有参数（最安全）
- 对于无扩展名的URL，保留关键的格式参数
- 避免因参数丢失导致的下载失败

## 📝 实现代码

**位置**：`src/content.js` 第201-237行

```javascript
// 🔥 智能标准化URL（根据文件类型决定是否保留参数）
let normalizedUrl = url;
try {
  const urlObj = new URL(url, window.location.href);
  const pathname = urlObj.pathname.toLowerCase();

  // 媒体文件扩展名列表
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
                           '.avif', '.apng', '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic', '.jxl'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mkv',
                           '.3gp', '.m3u8', '.m3u', '.ts', '.mpd'];
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.wma', '.opus', '.ogg'];

  const hasImageExt = imageExtensions.some(ext => pathname.endsWith(ext));
  const hasVideoExt = videoExtensions.some(ext => pathname.endsWith(ext));
  const hasAudioExt = audioExtensions.some(ext => pathname.endsWith(ext));
  const hasMediaExt = hasImageExt || hasVideoExt || hasAudioExt;

  if (hasMediaExt) {
    // 有明确的媒体文件扩展名，移除所有查询参数
    normalizedUrl = urlObj.origin + urlObj.pathname;
    console.log('✅ 媒体文件（有扩展名），移除所有参数:', normalizedUrl);
  } else {
    // 没有扩展名，检查是否有格式相关查询参数
    const formatParam = urlObj.searchParams.get('format');
    const typeParam = urlObj.searchParams.get('type');
    const extParam = urlObj.searchParams.get('ext');
    const idParam = urlObj.searchParams.get('id');

    if (formatParam || typeParam || extParam || idParam) {
      // 保留重要的格式参数
      const importantParams = new URLSearchParams();
      if (formatParam) importantParams.set('format', formatParam);
      if (typeParam) importantParams.set('type', typeParam);
      if (extParam) importantParams.set('ext', extParam);
      if (idParam) importantParams.set('id', idParam);

      const queryString = importantParams.toString();
      normalizedUrl = urlObj.origin + urlObj.pathname + (queryString ? '?' + queryString : '');
      console.log('✅ 无扩展名，保留格式参数:', normalizedUrl);
    } else {
      // 既没有扩展名也没有格式参数，移除所有查询参数
      normalizedUrl = urlObj.origin + urlObj.pathname;
      console.log('✅ 无扩展名且无格式参数，移除所有参数:', normalizedUrl);
    }
  }
} catch (e) {
  console.log('⚠️ URL解析失败，使用原始URL:', url);
}
```

## 🔄 使用步骤

1. **重新加载扩展**：
   ```
   chrome://extensions/ → 找到扩展 → 点击刷新 🔄
   ```

2. **清除缓存**：
   ```
   chrome://extensions/ → 扩展详情 → 清除存储空间
   ```

3. **测试新浪微博**：
   - 访问包含图片的新浪微博页面
   - 点击扩展图标
   - 检查图片列表，应该不会有重复项

4. **测试Twitter**：
   - 访问包含图片的Twitter页面
   - 点击扩展图标
   - 检查图片列表，同一张图片的不同尺寸应该被识别为同一资源

## 💡 关键改进

| 场景 | 旧逻辑 | 新逻辑 | 优势 |
|------|--------|--------|------|
| 新浪微博图片 | 保留所有参数 | 移除所有参数 | ✅ 正确去重 |
| Twitter图片 | 移除所有参数 | 保留format参数 | ✅ 识别格式 |
| 普通图片 | 移除所有参数 | 移除所有参数 | ✅ 保持一致 |
| 下载链接 | 参数丢失 | 保留原始URL | ✅ 下载成功 |

## 📌 注意事项

1. **原始URL保留**：标准化后的URL仅用于去重，下载时仍使用原始URL
2. **格式识别**：对于无扩展名的URL，format参数是识别格式的关键
3. **兼容性**：新逻辑向后兼容所有已支持的网站和格式

## 🆘 如果遇到问题

如果发现图片没有被正确去重，请检查：

1. **控制台日志**：查看标准化逻辑是否正确执行
   ```javascript
   console.log('✅ 媒体文件（有扩展名），移除所有参数:', normalizedUrl);
   ```

2. **URL扩展名**：确认URL路径确实以媒体扩展名结尾

3. **参数差异**：确认不同URL只是参数不同，路径完全相同

4. **运行测试**：
   ```bash
   node test-url-normalization.js
   ```

如果仍有问题，请提供：
- 原始URL
- 预期的标准化URL
- 实际的标准化URL
- 控制台日志
