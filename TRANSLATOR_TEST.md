# 多行翻译测试示例

## 📝 测试步骤

### 1. 复制以下测试文本（英语翻中文）

```
Hello, world!
This is a test.
Thank you very much.
Have a nice day!
```

### 2. 粘贴到翻译工具

1. 打开 Chrome Media Catcher 扩展
2. 点击"翻译"标签
3. 将上面的4行文本粘贴到左侧输入框

### 3. 配置翻译选项

- 源语言：自动检测（或选择"英语"）
- 目标语言：中文

### 4. 点击"翻译"按钮

### 5. 预期结果

右侧应该显示为：

```
Hello, world!
你好，世界！

This is a test.
这是一个测试。

Thank you very much.
非常感谢！

Have a nice day!
祝你度过愉快的一天！
```

**每一行应该：**
- ✅ 原文显示在上（灰色，较小字体）
- ✅ 译文显示在下（黑色，正常字体）
- ✅ 每两行之间有边框分隔
- ✅ 鼠标悬停时有背景色变化

---

## 🎯 更多测试示例

### 示例2：中文翻英语

```
你好世界
这是一个测试
谢谢
再见
```

### 示例3：日文翻中文

```
こんにちは
ありがとう
さようなら
```

### 示例4：长文本测试

```
The quick brown fox jumps over the lazy dog.
Pack my box with five dozen liquor jugs.
How vexingly quick daft zebras jump!
The five boxing wizards jump quickly.
```

---

## 🐛 调试步骤

如果多行翻译没有正确显示，请：

### 1. 打开开发者工具
- 右键点击扩展popup
- 选择"检查"或"审查元素"
- 打开Console标签

### 2. 查看日志输出
应该看到类似这样的日志：

```
📝 输入文本行数: 4
📝 分割后的行: ["Hello, world!", "This is a test.", "Thank you very much.", "Have a nice day!"]
🎯 开始逐行翻译，共 4 行
翻译进度: 1/4 (25%)
翻译进度: 2/4 (50%)
翻译进度: 3/4 (75%)
翻译进度: 4/4 (100%)
✅ 翻译完成，结果行数: 4
✅ 翻译结果: ["你好，世界！", "这是一个测试。", "非常感谢！", "祝你度过愉快的一天！"]
🎨 开始渲染翻译结果
📊 原文行数: 4
📊 译文行数: 4
第 1 行: {original: "Hello, world!", translated: "你好，世界！"}
第 2 行: {original: "This is a test.", translated: "这是一个测试。"}
第 3 行: {original: "Thank you very much.", translated: "非常感谢！"}
第 4 行: {original: "Have a nice day!", translated: "祝你度过愉快的一天！"}
🖼️ 生成的HTML长度: 615
🖼️ HTML预览（前500字符）: <div class="translation-line"><div class="original-line">Hello, world!</div><div class="translated-line">你好，世界！</div></div><div class="translation-line"><div class="original-line">This is a test.</div><div class="translated-line">这是一个测试。</div></div>...
✅ 翻译结果渲染完成
```

### 3. 检查HTML结构

在Elements标签中，找到 `translation-result` 元素，应该看到类似这样的结构：

```html
<div id="translation-result" class="translator-result">
  <div class="translation-line">
    <div class="original-line">Hello, world!</div>
    <div class="translated-line">你好，世界！</div>
  </div>
  <div class="translation-line">
    <div class="original-line">This is a test.</div>
    <div class="translated-line">这是一个测试。</div>
  </div>
  <div class="translation-line">
    <div class="original-line">Thank you very much.</div>
    <div class="translated-line">非常感谢！</div>
  </div>
  <div class="translation-line">
    <div class="original-line">Have a nice day!</div>
    <div class="translated-line">祝你度过愉快的一天！</div>
  </div>
</div>
```

### 4. 检查CSS样式

确认 `.translation-line` 有以下样式：
- `display: block`
- `margin-bottom: 16px`
- `padding: 12px`
- `border: 1px solid #e0e0e0`

---

## 🔧 常见问题

### Q: 所有结果显示在一行？
A: 检查是否正确按Enter键换行，确保是真正的多行文本。

### Q: 没有看到原文和译文对照？
A: 检查浏览器Console是否有错误，确认CSS样式已正确加载。

### Q: 翻译速度很慢？
A: 正常现象，为避免API限流，每行之间有300ms延迟。

### Q: 某些行翻译失败？
A: 查看Console日志，可能有网络问题或API限制。

---

## ✅ 成功标志

多行翻译成功时，您应该看到：
- ✅ 控制台显示"翻译进度"日志
- ✅ 右侧显示白色卡片，每个卡片包含2行（原文+译文）
- ✅ 原文字体较小、颜色为灰色
- ✅ 译文字体正常、颜色为黑色
- ✅ 鼠标悬停时卡片有背景色变化
- ✅ 可以正常复制结果
