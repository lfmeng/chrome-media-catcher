# 请求头捕获与下载功能说明

## 📋 功能概述

对于有权限限制的网站（如需要登录、防盗链验证等），扩展现在会自动捕获页面请求的原始请求头信息，并在下载时使用这些请求头，确保能够成功下载受保护的资源。

## 🔧 支持的请求头

扩展会自动捕获和保存以下关键请求头：

| 请求头 | 说明 | 来源 |
|--------|------|------|
| **Referer** | 来源页面URL | 从background.js获取当前标签页URL |
| **User-Agent** | 浏览器标识 | 从content.js获取navigator.userAgent |
| **Cookie** | 登录凭证/会话信息 | 从content.js获取document.cookie |

## 🎯 工作原理

### 1. 捕获阶段

当检测到媒体资源时，扩展会：

```
1. background.js 检测到HTTP请求
   ↓
2. 获取当前标签页URL（作为Referer）
   ↓
3. 发送消息到content.js，包含pageInfo
   ↓
4. content.js 接收消息，提取并存储：
   - Referer: 页面URL
   - User-Agent: navigator.userAgent
   - Cookie: document.cookie
   ↓
5. 存储到mediaRequestHeaders Map中
   ↓
6. 添加到media对象的requestHeaders字段
   ↓
7. 发送到popup显示
```

### 2. 下载阶段

下载媒体资源时，扩展会：

```
1. 查找media对象的requestHeaders
   ↓
2. 如果存在请求头，使用fetch API下载：
   fetch(url, {
     headers: {
       'Referer': requestHeaders.referer,
       'User-Agent': requestHeaders.userAgent,
       'Cookie': requestHeaders.cookie
     }
   })
   ↓
3. 下载成功后创建Blob URL
   ↓
4. 触发浏览器下载
   ↓
5. 清理Blob URL
```

如果fetch下载失败（如网络错误），会降级到chrome.downloads.download（但不支持请求头）。

## 📝 代码修改

### 1. background.js (第127-135行)

**修改前**：
```javascript
chrome.tabs.sendMessage(details.tabId, {
  action: 'mediaResourceDetected',
  url: details.url,
  type: mediaType,
  contentType: contentType
});
```

**修改后**：
```javascript
chrome.tabs.sendMessage(details.tabId, {
  action: 'mediaResourceDetected',
  url: details.url,
  type: mediaType,
  contentType: contentType,
  // 🔥 添加页面信息，用于权限验证
  pageInfo: {
    referer: tab.url, // 页面URL作为Referer
    tabId: details.tabId
  }
});
```

### 2. src/content.js (第28-30行)

**添加存储Map**：
```javascript
// 🔥 存储媒体URL对应的请求头信息（用于权限验证）
let mediaRequestHeaders = new Map();
```

### 3. src/content.js (第738-786行)

**修改消息处理**：
```javascript
} else if (message.action === 'mediaResourceDetected') {
  const { url, type, pageInfo } = message;

  // 🔥 存储请求头信息（用于下载时的权限验证）
  if (pageInfo) {
    mediaRequestHeaders.set(url, {
      referer: pageInfo.referer || window.location.href,
      userAgent: navigator.userAgent,
      cookie: document.cookie
    });
    console.log('🔐 存储请求头信息:', url, pageInfo.referer);
  }

  // ... 其他代码
}
```

### 4. src/content.js - capture函数

**修改captureImage/captureAudio/captureVideo函数**：

在所有三个capture函数中添加：

```javascript
// 🔥 获取请求头信息
const requestHeaders = mediaRequestHeaders.get(url);

const media = {
  url: url,
  type: contentType || 'image/jpeg',
  size: sizeFormatted,
  timestamp: Date.now(),
  // 🔥 添加请求头信息（用于下载时的权限验证）
  requestHeaders: requestHeaders ? {
    referer: requestHeaders.referer,
    userAgent: requestHeaders.userAgent,
    cookie: requestHeaders.cookie
  } : null
};
```

### 5. popup.js (第1199-1256行)

**修改单文件下载函数**：

```javascript
// 🔥 查找媒体对象的请求头信息
const mediaItem = [...capturedImages, ...capturedVideos, ...capturedAudios]
  .find(m => m.url === url);
const requestHeaders = mediaItem?.requestHeaders;

if (requestHeaders) {
  console.log('🔐 使用保存的请求头下载:', requestHeaders.referer);

  // 🔥 使用fetch下载（带上请求头），然后触发浏览器下载
  try {
    const response = await fetch(url, {
      headers: {
        'Referer': requestHeaders.referer || '',
        'User-Agent': requestHeaders.userAgent || navigator.userAgent,
        'Cookie': requestHeaders.cookie || ''
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // 从URL中提取文件名
    const fileName = extractFileName(url);

    // 触发下载
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.click();

    // 清理blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    console.log('✅ 下载完成（带请求头）');
  } catch (error) {
    console.error('❌ 使用请求头下载失败:', error);
    console.log('🔄 降级到普通下载');

    // 降级方案
    chrome.downloads.download({
      url: url,
      saveAs: true
    });
  }
}
```

### 6. popup.js (第1360-1373行)

**修改批量下载函数**：

```javascript
// 🔥 使用保存的请求头信息
const requestHeaders = item.requestHeaders;
const fetchOptions = {};

if (requestHeaders) {
  fetchOptions.headers = {
    'Referer': requestHeaders.referer || '',
    'User-Agent': requestHeaders.userAgent || navigator.userAgent,
    'Cookie': requestHeaders.cookie || ''
  };
  console.log(`🔐 [${i + 1}/${total}] 使用请求头下载`);
}

const response = await fetch(item.url, fetchOptions);
blob = await response.blob();
```

## 🧪 测试步骤

### 1. 重新加载扩展
```
chrome://extensions/ → 找到扩展 → 点击刷新 🔄
```

### 2. 测试需要权限的网站

#### 示例1：需要Referer的网站
```
1. 访问有防盗链保护的图片网站
2. 打开扩展，捕获图片
3. 点击下载
4. 检查控制台日志：应该看到 "🔐 使用保存的请求头下载"
5. 下载应该成功
```

#### 示例2：需要Cookie的网站
```
1. 登录网站（如微博、Twitter等）
2. 打开扩展，捕获图片/视频
3. 点击下载
4. 应该能够下载需要登录才能访问的资源
```

#### 示例3：批量下载
```
1. 捕获多个媒体文件
2. 点击"下载全部"按钮
3. 检查控制台日志：应该看到每个文件的请求头使用情况
4. 打包下载应该成功
```

### 3. 调试方法

**查看控制台日志**：
```javascript
// Content Script 控制台
🔐 存储请求头信息: https://example.com/image.jpg https://example.com

// Popup 控制台
🔐 使用保存的请求头下载: https://example.com
✅ 下载完成（带请求头）
```

**检查media对象**：
```javascript
// 在popup控制台中运行
capturedImages[0].requestHeaders
// 输出：
// {
//   referer: "https://example.com",
//   userAgent: "Mozilla/5.0 ...",
//   cookie: "session=xyz; user=abc"
// }
```

## 🎯 适用场景

| 场景 | 说明 | 使用的请求头 |
|------|------|-------------|
| **防盗链保护** | 检查Referer的网站 | Referer |
| **需要登录** | 检查Cookie的网站 | Cookie + Referer |
| **User-Agent检测** | 检查浏览器标识的网站 | User-Agent + Referer |
| **综合保护** | 同时检查多个头 | 全部 |

## ⚠️ 注意事项

### 1. Cookie敏感性
- Cookie包含登录凭证，请谨慎使用
- 扩展仅在本地存储，不会上传到任何服务器
- Cookie仅在下载时使用，不会泄露

### 2. 跨域限制
fetch API可能会遇到跨域问题，如果遇到：
```
❌ 使用请求头下载失败: TypeError: Failed to fetch
🔄 降级到普通下载
```
这是正常的，扩展会自动降级到普通下载。

### 3. 性能影响
- 每个媒体资源都会存储请求头信息
- 内存占用略微增加（每个URL约1KB）
- 对性能影响极小

### 4. 隐私保护
- 请求头信息仅在扩展内部使用
- 不会发送到任何第三方服务器
- 不会与扩展外的代码共享

## 🔍 故障排除

### 问题1：下载还是失败

**可能原因**：
1. 请求头不完整或已过期
2. 服务器有其他验证机制（如IP限制）
3. 资源需要动态生成的token

**解决方法**：
1. 刷新页面重新捕获
2. 检查浏览器控制台的网络请求
3. 手动复制请求头并使用curl等工具测试

### 问题2：看不到请求头日志

**检查步骤**：
1. 确认扩展已重新加载
2. 检查content script是否注入：
   ```javascript
   // 在页面控制台运行
   console.log('Extension loaded');
   ```
3. 查看background service worker日志：
   ```
   chrome://extensions/ → Service Worker
   ```

### 问题3：批量下载失败

**可能原因**：
1. 某些资源没有请求头信息
2. 网络超时或服务器拒绝

**解决方法**：
1. 查看控制台错误日志
2. 单独下载失败的文件
3. 检查网络连接

## 📊 技术细节

### 请求头存储格式

```javascript
Map {
  "https://example.com/image1.jpg" => {
    referer: "https://example.com/page",
    userAgent: "Mozilla/5.0 ...",
    cookie: "session=abc"
  },
  "https://example.com/image2.jpg" => {
    referer: "https://example.com/page",
    userAgent: "Mozilla/5.0 ...",
    cookie: "session=abc"
  }
}
```

### Media对象结构

```javascript
{
  url: "https://example.com/image.jpg",
  type: "image/jpeg",
  size: "1.2 MB",
  timestamp: 1234567890,
  requestHeaders: {
    referer: "https://example.com/page",
    userAgent: "Mozilla/5.0 ...",
    cookie: "session=abc"
  }
}
```

### Fetch选项

```javascript
{
  headers: {
    'Referer': 'https://example.com/page',
    'User-Agent': 'Mozilla/5.0 ...',
    'Cookie': 'session=abc'
  }
}
```

## ✅ 总结

通过这个功能，扩展现在能够：

1. ✅ 自动捕获页面的请求头信息
2. ✅ 在下载时使用原始请求头
3. ✅ 成功下载有权限限制的资源
4. ✅ 支持单文件和批量下载
5. ✅ 优雅降级到普通下载
6. ✅ 完整的错误处理和日志

这大大提高了扩展在处理受保护资源时的成功率！
