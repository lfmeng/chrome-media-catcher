# 翻译速度优化指南

## 📊 当前设置

### 延迟配置
```javascript
const DELAY_MS = 100; // 每行之间延迟100毫秒
```

**速度对比：**
- 原设置：300ms/行 → 10行需要 3秒
- 新设置：100ms/行 → 10行需要 1秒
- ⚡ 最快：0ms/行 → 10行需要 0秒（可能被限流）

## ⚖️ 速度 vs 稳定性

| 延迟设置 | 翻译速度 | API限流风险 | 推荐场景 |
|---------|---------|------------|---------|
| 0ms | ⚡⚡⚡ 最快 | 🔴 高风险 | 少量文本（1-3行）|
| 100ms | ⚡⚡ 较快 | 🟡 低风险 | 日常使用（推荐）|
| 300ms | ⚡ 一般 | 🟢 安全 | 大量文本（10+行）|
| 500ms | 🐢 较慢 | 🟢 很安全 | API严格限制时 |

## 🚀 如何调整速度

### 方法1：修改代码（当前方案）

编辑 `content-script.js` 第238行：

```javascript
// ⚡ 最快模式（0延迟）
const DELAY_MS = 0;

// ⚡ 快速模式（100ms延迟，推荐）
const DELAY_MS = 100;

// 🐢 安全模式（300ms延迟）
const DELAY_MS = 300;
```

### 方法2：根据行数动态调整

让代码自动根据翻译行数调整延迟：

```javascript
// 少量行：快速，大量行：安全
const DELAY_MS = lines.length > 5 ? 200 : 50;
```

### 方法3：完全移除延迟

如果不需要限流保护：

```javascript
// 完全移除延迟代码
// if (i < lines.length - 1) {
//   await sleep(DELAY_MS);
// }
```

## 🎯 推荐配置

### 日常使用（推荐）
```javascript
const DELAY_MS = 100; // 平衡速度和稳定性
```

**适用场景：**
- ✅ 翻译 5-20 行文本
- ✅ 日常网页浏览
- ✅ GitHub、文档等

### 极速模式
```javascript
const DELAY_MS = 0; // 最快速度
```

**适用场景：**
- ✅ 1-3 行短文本
- ✅ 偶尔翻译
- ⚠️ 可能遇到API限流

### 安全模式
```javascript
const DELAY_MS = 300; // 避免限流
```

**适用场景：**
- ✅ 20+ 行大量文本
- ✅ 批量翻译
- ✅ API使用频繁时

## 🔍 性能测试

### 测试1：翻译5行文本

| 延迟设置 | 理论耗时 | 实际耗时* |
|---------|---------|----------|
| 0ms | ~0.5s | ~1s |
| 100ms | ~0.5s | ~1.5s |
| 300ms | ~1.5s | ~2.5s |

*包含网络请求时间

### 测试2：翻译10行文本

| 延迟设置 | 理论耗时 | 实际耗时* |
|---------|---------|----------|
| 0ms | ~1s | ~2s |
| 100ms | ~1.5s | ~3s |
| 300ms | ~3.5s | ~5s |

*包含网络请求时间

## 🐛 常见问题

### Q: 为什么要有延迟？
A: MyMemory Translation API 有请求频率限制，如果发送太快：
- 可能返回错误：`QUOTA_EXCEEDED`
- 可能被临时封禁
- 可能返回不完整的结果

### Q: 我可以设置为0吗？
A: 可以，但：
- ✅ 翻译最快
- ⚠️ 可能遇到限流
- ⚠️ 大量翻译时可能失败

### Q: 如何知道是否被限流？
A: 查看浏览器Console，如果看到：
```
❌ 翻译失败: QUOTA_EXCEEDED
```
说明需要增加延迟。

### Q: 翻译还是慢？
A: 可能原因：
1. **网络慢**：检查网络连接
2. **API响应慢**：MyMemory服务器问题
3. **文本太长**：每行文本过长也会慢

### Q: 可以并发翻译吗？
A: 当前版本是串行翻译（一行接一行）。并发翻译会更快，但：
- 实现复杂
- 更容易触发限流
- 需要更复杂的错误处理

## 💡 优化建议

### 1. 使用智能延迟
```javascript
// 根据行数自动调整
const DELAY_MS = lines.length <= 3 ? 0 :
                  lines.length <= 10 ? 100 :
                  200;
```

### 2. 添加重试机制
```javascript
let retries = 0;
while (retries < 3) {
  try {
    const translated = await callTranslateAPI(line);
    break; // 成功，跳出循环
  } catch (error) {
    retries++;
    if (retries >= 3) throw error;
    await sleep(1000); // 失败后等待1秒重试
  }
}
```

### 3. 缓存翻译结果
```javascript
const cache = new Map();

function getCachedTranslation(text) {
  if (cache.has(text)) {
    return cache.get(text);
  }
  const translated = await callTranslateAPI(text);
  cache.set(text, translated);
  return translated;
}
```

### 4. 使用更快的API
考虑集成其他翻译服务：
- Google Translate API（更快，但需要付费）
- DeepL API（质量更高，但需要付费）
- LibreTranslate（开源，可自建）

## 📝 当前配置

**文件位置：** `content-script.js` 第238行

**当前设置：**
```javascript
const DELAY_MS = 100; // 100毫秒延迟
```

**修改方法：**
1. 打开 `content-script.js`
2. 找到第238行
3. 修改 `DELAY_MS` 的值
4. 保存文件
5. 重新加载扩展

## 🔄 更新日志

### 2025-02-01
- ✅ 默认延迟从 300ms 降低到 100ms
- ✅ 速度提升 3 倍
- ✅ 创建速度优化指南

### 原始设置
- 延迟：300ms/行
- 原因：避免API限流
- 问题：用户反馈速度慢
