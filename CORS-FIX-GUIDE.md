# CORS 跨域问题修复指南

## 问题描述

用户报告无法预览图片，控制台显示以下错误：

```
Access to fetch at 'https://ttthhh.tulegetu.cc/pic111/1111_11_11/[XiuRen秀人网] 杨晨晨 Vol.10977/13247.webp!xt1'
from origin 'https://www.xiurenwang.cc' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 问题原因

### 1. CORS 预检问题
原代码在 `<img>` 标签中使用了 `crossorigin="anonymous"` 属性：
```html
<img src="..." crossorigin="anonymous" referrerpolicy="no-referrer">
```

这会导致浏览器在加载图片前先发送一个 CORS 预检请求（OPTIONS），如果服务器没有返回正确的 `Access-Control-Allow-Origin` 头，就会阻止加载。

### 2. Referer 防盗链
许多图片服务器会检查 `Referer` 头，如果请求来自非授权网站，会拒绝访问。原代码使用了 `referrerpolicy="no-referrer"`，这会移除 Referer 头，导致部分服务器拒绝请求。

### 3. HttpOnly Cookie 问题
某些网站使用 HttpOnly Cookie 来进行权限验证。原代码通过 `document.cookie` 只能获取非 HttpOnly 的 Cookie，导致权限验证失败。

## 修复方案

### 修改 1: popup.js - 优化图片加载逻辑

#### 移除 crossorigin 属性
```javascript
// 修改前
<img src="${img.url}" alt="${fileName}" crossorigin="anonymous" referrerpolicy="no-referrer" ...>

// 修改后
<img src="" alt="${fileName}" data-actual-src="${img.url}" ...>
```

#### 延迟加载机制
```javascript
// 🔥 延迟加载图片（避免阻塞渲染）
setTimeout(() => {
  const actualSrc = img.dataset.actualSrc;
  if (actualSrc) {
    img.src = actualSrc;
  }
}, 100);
```

**优点**：
- 避免阻塞页面渲染
- 给浏览器时间处理其他资源
- 不触发 CORS 预检

### 修改 2: background.js - 增强 fetchBlob 函数

#### 添加完整的请求头
```javascript
const headers = {
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'cors',  // 从 'no-cors' 改为 'cors'
  'Sec-Fetch-Site': 'cross-site',
  'Referer': requestHeaders?.referer || `${urlObj.protocol}//${urlObj.host}/`,
  'Origin': urlObj.origin,  // 新增
  'User-Agent': requestHeaders?.userAgent || 'Mozilla/5.0 ...',
  'Cookie': fullCookie  // 包括 HttpOnly Cookie
};
```

#### 获取完整的 Cookie（包括 HttpOnly）
```javascript
try {
  const urlObj = new URL(url);
  const cookies = await chrome.cookies.getAll({ domain: urlObj.hostname });

  if (cookies && cookies.length > 0) {
    fullCookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`🍪 获取到 ${cookies.length} 个 Cookie`);
  }
} catch (err) {
  console.warn('获取 Cookie 失败:', err);
}
```

**关键改进**：
- ✅ 使用 Chrome API 获取所有 Cookie（包括 HttpOnly）
- ✅ 自动从 URL 提取 Referer
- ✅ 添加 Origin 头
- ✅ 使用 'cors' 模式而不是 'no-cors'
- ✅ 添加默认 User-Agent

## 工作原理

### 方案 1: 直接加载（无 CORS 限制）
1. 图片不使用 `crossorigin` 属性
2. 浏览器直接加载图片，不发送预检请求
3. 适用于允许跨域访问的图片

### 方案 2: 通过 Background.js（绕过 CORS）
如果直接加载失败：
1. 用户点击"点击加载"按钮
2. 调用 `loadImagePreview()` 函数
3. 发送消息到 background.js
4. background.js 使用 fetch API 获取图片
5. 自动获取完整的 Cookie（包括 HttpOnly）
6. 添加正确的 Referer 和其他请求头
7. 将图片转换为 base64 返回
8. popup.js 创建 Blob URL 并显示

**关键优势**：
- ✅ Background script 不受 CORS 限制
- ✅ 可以访问 HttpOnly Cookie
- ✅ 可以自定义任意请求头
- ✅ 完全绕过浏览器安全策略

## 测试步骤

### 1. 重新加载插件
```
1. 打开 chrome://extensions/
2. 找到"媒体资源捕获器"
3. 点击"重新加载"按钮
```

### 2. 访问测试网站
```
1. 访问包含跨域图片的网站
2. 打开插件，点击"开始捕获"
3. 浏览页面，让插件捕获图片
```

### 3. 测试图片加载
```
1. 观察图片缩略图：
   - ✅ 能直接加载的图片会正常显示
   - ❌ 加载失败的图片会显示占位符

2. 点击占位符上的"点击加载"按钮
3. 等待几秒，图片应该会显示出来
```

### 4. 查看调试日志
打开 Chrome DevTools（F12）→ Console 标签，应该能看到：

```
📥 获取Blob: https://...
🍪 获取到 3 个 Cookie
🔐 实际请求头: { Accept: "...", Referer: "...", Cookie: "..." }
📊 响应状态: 200 OK
📊 响应类型: image/webp
✅ Blob 类型: image/webp 大小: 123456
```

## 调试技巧

### 1. 检查请求头
在 background.js 的日志中查看"实际请求头"，确保：
- ✅ Referer 正确（应该是图片所在网站的域名）
- ✅ Cookie 存在（如果网站需要登录）
- ✅ User-Agent 合理
- ✅ Origin 和 Referer 一致

### 2. 检查 Cookie 数量
如果"获取到 0 个 Cookie"，可能是因为：
- 网站不需要 Cookie
- 还没有登录该网站
- Cookie 的域名不匹配

### 3. 检查响应状态
- `200 OK` - 成功
- `403 Forbidden` - 权限不足，可能需要 Cookie 或 Referer
- `404 Not Found` - 图片不存在
- `500 Server Error` - 服务器错误

### 4. 检查图片 URL
确保图片 URL 完整且正确：
```
✅ https://example.com/images/photo.jpg
❌ /images/photo.jpg (相对路径)
❌ //example.com/images/photo.jpg (协议相对路径)
```

## 常见问题

### Q1: 点击"点击加载"后仍然失败
**A**: 可能的原因：
1. 网站需要登录，请先登录再捕获图片
2. 图片 URL 已经过期或失效
3. 网站有更复杂的反爬虫机制（如 IP 限制、User-Agent 检测等）

**解决方法**：
- 打开开发者工具，查看具体的错误信息
- 检查 background.js 中的日志
- 尝试手动访问图片 URL 确认是否可用

### Q2: 图片加载很慢
**A**: 正常情况，因为：
1. 图片需要通过 background.js 转换为 base64
2. 大图片转换需要时间
3. 网络速度影响

**解决方法**：
- 耐心等待，通常会成功
- 检查图片大小（可能超过 10MB）

### Q3: 部分图片能加载，部分不能
**A**: 正常情况，可能是因为：
1. 不同图片服务器有不同的 CORS 策略
2. 部分图片需要特殊权限
3. 部分图片 URL 已经过期

**解决方法**：
- 对加载失败的图片点击"点击加载"
- 如果还是失败，可能是图片本身的问题

## 相关文件

- `popup.js` - 图片加载逻辑
- `background.js` - fetchBlob 函数（CORS 绕过）
- `src/content.js` - 媒体捕获和请求头收集

## 总结

通过这次修复，插件现在可以：
- ✅ 直接加载无 CORS 限制的图片
- ✅ 通过 background.js 绕过 CORS 限制
- ✅ 自动获取完整的 Cookie（包括 HttpOnly）
- ✅ 智能添加 Referer 防止防盗链
- ✅ 提供友好的占位符和重试机制

**核心原理**：利用 Chrome extension 的 background script 不受浏览器 CORS 策略限制的特性，在后台获取跨域资源，然后转换为 base64 返回给前台显示。

---

**修改日期**：2026-02-05
**测试状态**：✅ 已测试
**兼容性**：Chrome 88+
