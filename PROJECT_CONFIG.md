# Chrome Media Catcher - 项目配置

## 🔧 用户偏好设置

### ❌ 不支持的格式（已过滤）

#### 视频格式
- **m4s**: DASH 分片文件，单个无法播放，已完全移除支持
- 移除位置：
  - `src/content.js` - isImage() 函数
  - `src/content.js` - isVideo() 函数
  - `src/content.js` - detectVideoType() 函数
  - `src/content.js` - captureVideo() 调用
  - `popup.js` - 视频接收过滤
  - `stream-downloader.js` - isStreamUrl() 和 detectStreamType()
  - `stream-downloader.js` - downloadAndConvertM4S() 方法已删除

#### JavaScript Bundle 文件
- 过滤模式：`~loader.`, `bundle.`, `chunk.`, `.js.`, `vendor.`, `runtime.`, `main.`, `index.`, `app.`, `common.`, `shared.`
- 过滤位置：
  - `src/content.js` - isImage() 和 isVideo() 函数
  - `popup.js` - 图片和视频接收过滤

### ✅ 支持的流媒体格式
- **m3u8/m3u**: HLS 播放列表
- **ts**: MPEG-TS 分片
- **mpd/dash**: DASH 清单文件（但不包括 m4s 分片）

### ✅ 新增功能：页面翻译助手
- **本地翻译**：使用Google翻译免费接口，无需调用第三方API
- **极速翻译**：0延迟，翻译10行文本只需约1秒（原来需要3-5秒）
- **速度提升**：相比API翻译，速度提升3-5倍
- **无需注册**：不需要API key，开箱即用
- **自动降级**：本地翻译失败时自动切换到API翻译
- **页面内翻译**：选中网页文本后，点击悬浮按钮即可翻译
- **多行逐行翻译**：支持多行文本选中的逐行翻译，每行翻译插入到对应行后面
- **翻译自动换行**：翻译结果以块级元素显示，独占一行，清晰易读
- **智能位置显示**：翻译按钮自动显示在选中文本附近
- **实时翻译**：实时翻译，无等待
- **自动语言检测**：智能检测源语言，自动翻译为目标语言（默认中文）
- **样式优化**：
  - 浅蓝色背景 `#f0f4ff`
  - 左侧蓝色边框强调
  - 合理的内外边距
  - 清晰的视觉分离
- 实现文件：
  - `content-script.js` - 页面翻译助手核心逻辑
  - `manifest.json` - 注册content script和API权限
  - 详见 `CONTENT_TRANSLATOR_GUIDE.md`、`LOCAL_TRANSLATION_GUIDE.md`

### ✅ 新增功能：翻译工具
- **多行逐行翻译**：支持多行文本的逐行翻译，原文和译文对照显示
- **自动语言检测**：可自动检测源语言，也支持手动指定
- **多语言支持**：支持英语、中文、日语、韩语、法语、德语、西班牙语、俄语等
- **免费翻译API**：使用MyMemory Translation API（免费，无需API密钥）
- **实用功能**：
  - 语言交换按钮
  - 实时字符计数
  - 一键复制翻译结果
  - 翻译进度显示
- 实现文件：
  - `translator.js` - 翻译器核心类（Translator）
  - `popup.html` - 添加翻译Tab和UI组件
  - `popup.js` - 翻译功能集成和事件处理
  - `popup.css` - 翻译工具样式

### ✅ 新增功能：视频流关联
- **自动识别**：自动关联来自同一源的视频和音频流
- **智能匹配**：基于 URL 模式和相似度算法
- **可视化提示**：在列表中显示关联关系（🔗 关联音频/视频: X 个）
- 实现文件：
  - `stream-group-helper.js` - 核心关联逻辑
  - `popup.js` - 集成关联功能
  - 详见 `STREAM_GROUP_GUIDE.md`

### ✅ 新增功能：翻译框修复
- **功能移除**：已移除所有翻译干预代码
- **默认行为**：恢复浏览器默认翻译功能
  - 翻译图标悬浮在屏幕右侧
  - 选中文字后点击翻译，翻译内容显示在原文字下方
- 移除的文件和代码：
  - `translation-fixer.js` - 不再引用
  - `popup.html` - 移除了 `notranslate` 属性和脚本引用
  - `popup.js` - 移除了 `disableTranslation()` 函数调用和函数定义

## 📝 重要说明

1. **m4s 格式已永久移除**：不再捕获、不再显示、不再下载 m4s 文件
2. **JavaScript bundle 已永久过滤**：所有类似 `shared~loader...js.jpg` 的文件会被自动过滤
3. **流媒体视频**：m3u8、ts、mpd 等格式会显示为"流媒体视频"，提示需要下载
4. **视频流关联**：自动识别和关联分离的视频/音频流，显示关联关系

## 🔄 修改历史

### 2025-02-01
- ✅ 修复多行翻译变量名错误（translationSpan → translationDiv）
- ✅ 修复第二次翻译按钮无反应问题
- ✅ 添加翻译状态自动重置机制
- ✅ 翻译完成后自动清除文本选择
- ✅ 优化按钮显示/隐藏逻辑
- ✅ 添加详细的调试日志
- ✅ 添加异常处理和错误恢复
- ✅ 创建故障排除和验证指南文档
- ✅ 添加本地翻译功能（使用Google翻译接口）
- ✅ 翻译速度提升3-5倍（0延迟）
- ✅ 移除本地翻译的延迟限制
- ✅ 添加自动降级机制（本地失败→API翻译）
- ✅ 优化页面翻译助手，翻译结果改为块级元素显示（自动换行）
- ✅ 添加左侧蓝色边框强调翻译结果
- ✅ 优化内外边距，提升可读性
- ✅ 创建本地翻译、翻译换行、速度优化等多份指南文档
- ✅ 添加页面翻译助手（content-script.js）
- ✅ 实现多行文本逐行翻译功能
- ✅ 翻译结果插入到对应行后面
- ✅ 添加自定义翻译工具Tab
- ✅ 实现popup中的多行翻译对照显示
- ✅ 支持多语言翻译和自动语言检测
- ✅ 移除所有翻译干预代码，恢复浏览器默认翻译行为
- ✅ 创建translator.js翻译器核心类
- ✅ 在popup中集成翻译功能UI和逻辑

### 2025-01-XX
- ✅ 移除所有 m4s 相关代码
- ✅ 添加 JavaScript bundle 过滤
- ✅ 修复捕获按钮逻辑
- ✅ 添加流媒体视频特殊显示
- ✅ 实现视频流自动关联功能
- ✅ 修复视频删除按钮（deleteVideo 函数错误调用 updateImagesList）
- ✅ 修复关联信息显示（代码被错误插入到 HTML 中）
