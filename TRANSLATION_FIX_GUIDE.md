# 翻译框修复功能说明

## ⚠️ 功能已移除

**此功能已被移除，现在使用浏览器默认的翻译行为。**

## 🔄 变更历史

### 2025-02-01
- ❌ 移除了所有翻译干预代码
- ✅ 恢复浏览器默认翻译功能
- 移除的文件和功能：
  - `translation-fixer.js` - 不再使用
  - `popup.html` 中的 `translate="no"` 和 `class="notranslate"` 属性
  - `popup.js` 中的 `disableTranslation()` 函数

---

## 原有功能说明（已废弃）

以下内容仅供参考，功能已不再使用。

## 🌐 功能概述

修复浏览器内置翻译功能的显示问题，提供更好的用户体验。

## ❌ 原有问题

1. **位置不居中**：翻译悬浮框不在屏幕中央
2. **不可拖拽**：无法移动翻译框位置
3. **显示位置错误**：翻译结果显示在悬浮框内，而不是原文字下方

## ✅ 解决方案

### 1. 禁用页面翻译（推荐）
在 HTML `<head>` 中添加：
```html
<meta name="google" content="notranslate">
```

在 `<body>` 标签上添加：
```html
<body translate="no" class="notranslate">
```

### 2. 修复翻译框样式
如果用户确实需要使用翻译功能，会自动：
- ✅ 将翻译框居中显示
- ✅ 使翻译框可拖拽
- ✅ 优化翻译框的 z-index 和阴影
- ✅ 自动监听并修复新出现的翻译元素

### 3. 动态移除翻译元素
定期检查并移除：
- `.goog-te-banner` - Google 翻译横幅
- `.skiptranslate` - 跳过翻译按钮
- `#goog-gt-tt` - 翻译工具栏

## 🔧 技术实现

### translation-fixer.js

核心功能：
- `repositionTranslationTooltip()` - 重新定位翻译提示框
- `makeTranslationDraggable()` - 使翻译框可拖拽
- `observeTranslationChanges()` - 监听 DOM 变化

### 使用方法

```javascript
// 自动初始化
const translationFixer = new TranslationFixer();
```

## 🎨 样式修复

### 翻译框居中
```css
.goog-te-balloon-frame {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 999999 !important;
}
```

### 翻译框拖拽
```javascript
// 实现了完整的拖拽功能
// mousedown -> 开始拖拽
// mousemove -> 移动位置
// mouseup -> 结束拖拽
```

## 📝 注意事项

1. **性能优化**：使用 MutationObserver 监听 DOM 变化，而不是频繁查询
2. **定期检查**：每 2 秒检查一次翻译元素
3. **自动修复**：发现翻译元素立即修复位置和样式

## 🎯 用户体验

### 禁用翻译（默认）
- ✅ 页面不会被翻译
- ✅ 界面保持原样
- ✅ 避免翻译破坏布局

### 启用翻译（可选）
- ✅ 翻译框居中显示
- ✅ 可以拖拽调整位置
- ✅ 视觉效果更佳

## 🔗 相关文件

- `translation-fixer.js` - 核心修复逻辑
- `popup.html` - 添加 notranslate 属性
- `popup.css` - 翻译框样式修复
- `popup.js` - 集成修复功能

## 🚀 使用建议

对于媒体捕获器扩展：
- **推荐**：完全禁用翻译功能（因为不需要翻译）
- **可选**：修复翻译框样式（如果用户需要翻译）

当前实现：
- 默认禁用页面翻译
- 如果用户使用翻译，会自动修复样式
- 提供拖拽功能，用户可以调整翻译框位置
