# Chrome 媒体资源捕获器

一个强大的 Chrome 浏览器插件，用于捕获网页中的图片和视频资源，**支持本地 FFmpeg 自动转换流媒体为 MP4 格式**。

## ✨ 功能特性

### 📸 媒体捕获
- **图片捕获** - 自动捕获网页中的所有图片
- **视频捕获** - 自动捕获网页中的所有视频
- **音频捕获** - 捕获网页中的音频资源
- **网络请求拦截** - 通过拦截网络请求实时捕获媒体资源
- **去重机制** - 智能去重，避免重复捕获

### 🎥 视频流转换（新功能）
- **本地 FFmpeg 集成** - 自动调用本地 FFmpeg 转换视频流
- **支持多种流媒体格式**：
  - HLS (m3u8) - HTTP Live Streaming
  - MPEG-TS (.ts) - 传输流
  - M4S - DASH 分片
- **实时进度显示** - 转换进度实时反馈
- **自动降级** - FFmpeg 不可用时自动降级为打包下载

### 📥 下载管理
- **单个下载** - 点击按钮直接下载
- **批量下载** - 一键打包下载所有媒体（ZIP格式）
- **批量选择** - 支持多选图片批量下载或删除
- **预览功能** - 快速预览捕获的图片和视频
- **流式下载** - 支持大文件的流式下载

### 🎨 界面设计
- **精美界面** - 现代化的 UI 设计，使用渐变色和动画效果
- **九宫格布局** - 图片采用九宫格展示，美观大方
- **分组显示** - 按图片类型自动分组（JPG、PNG、GIF等）
- **类型筛选** - 快速筛选特定类型的图片
- **视频预览** - 内置视频播放器，直接预览视频内容

### 💾 数据持久化
- **本地存储** - 捕获的媒体资源自动保存到 Chrome 本地存储
- **跨会话** - 关闭浏览器后数据不丢失
- **流关联** - 智能关联音视频流（HLS 流）

## 🚀 安装方法

### 前置要求

如果要使用 **FFmpeg 自动转换功能**，需要先安装：

1. **FFmpeg**（必需，用于视频流转 MP4）
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg

   # Windows
   # 下载并安装: https://ffmpeg.org/download.html
   ```

2. **Python 3**（必需，用于 Native Host）
   ```bash
   # macOS
   # 系统自带或使用 Homebrew 安装

   # Ubuntu/Debian
   sudo apt install python3

   # Windows
   # 下载并安装: https://www.python.org/downloads/
   ```

### 方式一：开发者模式安装（推荐）

1. 克隆或下载此项目
   ```bash
   git clone <repository-url>
   cd chrome-media-catcher
   ```

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`

3. 启用右上角的"开发者模式"

4. 点击"加载已解压的扩展程序"

5. 选择项目根目录 `chrome-media-catcher`

6. **重要：安装 Native Host**（用于 FFmpeg 转换）
   ```bash
   cd native_host
   chmod +x install.sh
   ./install.sh
   ```

   按照提示输入你的扩展ID（在 `chrome://extensions/` 页面查看）

7. 插件安装完成！

### 方式二：打包安装

1. 在 `chrome://extensions/` 页面点击"打包扩展程序"

2. 选择项目根目录

3. 生成 `.crx` 文件后拖拽到浏览器安装

4. 同样需要运行 Native Host 安装脚本

### 🔧 Native Host 作用说明

Native Host 是连接 Chrome 扩展和本地 FFmpeg 的桥梁：

- **扩展** → **Native Host** → **FFmpeg**
- 允许扩展调用本地程序
- 实现视频流的自动转换
- 支持实时进度反馈

如果不安装 Native Host，插件仍然可以工作，但流媒体视频只能打包下载，无法自动转换为 MP4。

## 📖 使用指南

### 捕获图片

1. 打开包含图片的网页
2. 点击浏览器工具栏中的插件图标
3. 在"图片"标签页点击"开始捕获"按钮
4. 浏览网页，插件会自动捕获所有图片
5. 点击"停止捕获"结束捕获
6. 功能操作：
   - **预览** - 点击预览按钮查看大图
   - **下载** - 单个下载或批量下载（使用复选框选择）
   - **删除** - 单个删除或批量删除
   - **筛选** - 按图片类型筛选（JPG、PNG、GIF等）
   - **分组** - 图片按类型自动分组显示

### 捕获视频

1. 打开包含视频的网页
2. 切换到"视频"标签页
3. 点击"开始捕获"按钮
4. 播放视频或浏览页面，插件会自动捕获视频

**流媒体视频处理（重点功能）：**

#### 🎬 支持 FFmpeg 自动转换的视频格式：
- **HLS (m3u8)** - HTTP Live Streaming
- **MPEG-TS (.ts)** - 传输流
- **M4S** - DASH 分片

#### 自动转换流程：
1. **检测流媒体** - 插件自动检测视频格式
2. **调用 FFmpeg** - 如果已安装 Native Host，自动调用本地 FFmpeg
3. **实时进度** - 转换进度实时显示（5%、10%...100%）
4. **下载 MP4** - 转换完成后自动下载标准 MP4 文件

#### 如果 FFmpeg 不可用：
- **HLS 视频** - 自动降级为打包下载（包含 m3u8 + TS 分片 + README说明）
- **TS 视频** - 直接下载 TS 文件（附带转换说明）
- **M4S 视频** - 提示安装 FFmpeg（无降级方案）

#### 转换说明：
如果下载的是 ZIP 文件或 TS 文件，可以使用以下方法转换为 MP4：

**方法1：使用项目提供的 Python 脚本**
```bash
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher
python3 stream-to-mp4.py https://example.com/video.m3u8 -o output.mp4
```

**方法2：直接使用 FFmpeg**
```bash
# 转换 m3u8
ffmpeg -i video.m3u8 -c copy output.mp4

# 转换 TS
ffmpeg -i input.ts -c copy output.mp4

# 转换 M4S
ffmpeg -i input.m4s -c copy -bsf:a aac_adtstoasc output.mp4
```

**方法3：使用 VLC 播放器**
- 直接播放 m3u8 或 TS 文件
- 或使用 VLC 的转换功能

### 捕获音频

1. 切换到"音频"标签页
2. 点击"开始捕获"
3. 音频会自动关联到相关视频（如果存在）

### 批量下载

- **下载全部** - 点击"下载全部"按钮，自动打包为 ZIP
- **批量选择** - 勾选复选框，点击"下载选中"
- **批量删除** - 勾选复选框，点击"删除选中"

## 🛠️ 技术实现

### 核心技术

- **Manifest V3** - 使用最新的 Chrome 扩展 API
- **Native Messaging** - 连接本地 FFmpeg 程序
- **Web Request API** - 拦截网络请求
- **Content Scripts** - 注入网页监听 DOM 变化
- **Fetch/XHR 拦截** - 重写原生 API 拦截异步请求
- **MutationObserver** - 监听 DOM 变化捕获动态加载的媒体
- **Python Native Host** - Python 脚本桥接 Chrome 和 FFmpeg

### FFmpeg 集成架构

```
┌─────────────────┐
│  Chrome 扩展    │
│ (popup.js)      │
└────────┬────────┘
         │ chrome.runtime.connectNative()
         ▼
┌─────────────────────────┐
│  Native Host            │
│  (ffmpeg_host.py)       │
└────────┬────────────────┘
         │ subprocess.call()
         ▼
┌─────────────────┐
│  本地 FFmpeg    │
│  (视频转换)     │
└─────────────────┘
```

**工作流程：**
1. 用户下载流媒体视频
2. 扩展检测到流媒体格式（m3u8、ts、m4s）
3. 连接到 Native Host
4. Native Host 调用本地 FFmpeg 转换视频
5. 实时返回转换进度
6. 转换完成后返回 MP4 数据
7. 扩展触发浏览器下载

### 捕获原理

#### 1. 网络请求拦截
- 拦截 XMLHttpRequest 和 Fetch API
- 使用 WebRequest API 监听所有网络请求
- 根据响应头 Content-Type 判断媒体类型
- 智能过滤非媒体内容（JS bundle、CSS等）

#### 2. DOM 监听
- 使用 MutationObserver 监听 DOM 变化
- 检测新添加的 `<img>`、`<video>`、`<audio>` 标签
- 提取媒体资源 URL

#### 3. 流媒体关联
- 分析 HLS 流的组成（视频分片、音频分片）
- 智能关联相关的音视频流
- 显示关联关系

#### 4. 去重机制
- 使用 Set 数据结构避免重复捕获
- 基于 URL 去重
- 自动过滤 JavaScript bundle 文件

## 📁 项目结构

```
chrome-media-catcher/
├── manifest.json              # 插件配置文件
├── popup.html                 # 弹窗界面
├── popup.css                  # 样式文件
├── popup.js                   # 弹窗逻辑（主控制器）
├── stream-downloader.js       # 流媒体下载和转换核心
├── stream-group-helper.js     # 流媒体分组助手
├── stream-to-mp4.py           # 独立的流转换脚本（可直接使用）
├── src/
│   ├── background.js          # 后台服务
│   └── content.js             # 内容脚本（注入网页）
├── native_host/               # Native Host 相关文件
│   ├── ffmpeg_host.py         # Python Native Host 主程序
│   ├── com.chrome.media.catcher.ffmpeg.json  # Native Host 配置
│   ├── install.sh             # Native Host 安装脚本
│   ├── update_extension_id.sh # 更新扩展ID脚本
│   └── setup.sh               # 设置脚本
├── icons/                     # 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # 项目说明（本文件）
```

### 核心文件说明

| 文件 | 作用 | 关键功能 |
|------|------|---------|
| `popup.js` | 主控制器 | 媒体捕获、UI更新、批量操作 |
| `stream-downloader.js` | 流转换引擎 | FFmpeg集成、进度反馈、格式检测 |
| `ffmpeg_host.py` | Native Host | Python脚本、FFmpeg调用、进度解析 |
| `content.js` | 网页注入 | 网络拦截、DOM监听 |
| `stream-to-mp4.py` | 独立工具 | 可直接在命令行使用 |

## 🔧 配置选项

### 权限说明

- `activeTab` - 访问当前活动标签页
- `storage` - 本地存储捕获的媒体
- `downloads` - 下载媒体文件
- `webRequest` - 拦截网络请求
- `scripting` - 注入内容脚本
- `<all_urls>` - 访问所有网站

## 🎯 使用场景

- 收集网页上的设计素材
- 下载教学视频中的图片
- 批量下载相册图片
- 保存社交媒体图片
- 提取网页视频资源

## ⚠️ 注意事项

### 使用限制
1. 某些网站可能有反爬虫机制，无法直接下载媒体
2. 加密的视频流（DRM）无法捕获和转换
3. 建议遵守网站版权规定，合理使用捕获的媒体
4. 大量下载可能影响浏览器性能

### FFmpeg 转换限制
1. **大文件转换** - 超过 100MB 的视频转换可能需要较长时间
2. **网络超时** - 网络不稳定可能导致 m3u8 下载失败
3. **编码格式** - 某些特殊编码可能需要重新编码（增加转换时间）
4. **平台差异** - Windows/macOS/Linux 的 FFmpeg 行为可能略有不同

### 性能优化建议
1. 定期清理已下载的媒体列表
2. 使用筛选功能快速定位需要的媒体
3. 批量下载时避免选择过多文件
4. 关闭不需要的浏览器标签页以释放内存

## 🐛 已知问题

| 问题 | 影响 | 解决方案 |
|------|------|---------|
| 某些动态加载的媒体可能无法捕获 | 少数媒体无法下载 | 刷新页面或滚动到媒体位置 |
| CORS 限制可能导致部分资源无法获取 | 跨域资源下载失败 | 使用 Native Host FFmpeg 转换 |
| 视频缩略图生成可能失败 | 显示默认图标 | 不影响视频下载 |
| M4S 格式需要 FFmpeg | 无降级方案 | 安装 FFmpeg 和 Native Host |
| 长时间转换可能超时 | 大视频转换失败 | 使用独立的 `stream-to-mp4.py` 脚本 |

## 🎯 使用场景

### 设计素材收集
- 收集网页上的设计素材
- 下载教学视频中的图片
- 批量下载相册图片

### 视频资源提取
- 保存在线课程视频
- 提取新闻网站视频
- 下载社交媒体视频

### 开发调试
- 分析网页媒体加载
- 测试视频流格式
- 验证 CDN 配置

## 🔗 相关资源

### FFmpeg 相关
- [FFmpeg 官网](https://ffmpeg.org/)
- [FFmpeg 文档](https://ffmpeg.org/documentation.html)
- [FFmpeg 下载](https://ffmpeg.org/download.html)

### Chrome 扩展开发
- [Chrome 扩展官方文档](https://developer.chrome.com/docs/extensions/)
- [Native Messaging 详解](https://developer.chrome.com/docs/apps/nativeMessaging/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/mv3/intro/)

### 流媒体技术
- [HLS 规范](https://datatracker.ietf.org/doc/html/rfc8216)
- [MPEG-DASH 标准](https://dashif.org/)
- [VLC 播放器](https://www.videolan.org/)

## 🔄 更新日志

### v1.1.0 (2026-02-01)

- ✨ **新增 FFmpeg 本地集成**
  - 自动调用本地 FFmpeg 转换流媒体为 MP4
  - 支持 HLS (m3u8)、MPEG-TS、M4S 格式
  - 实时显示转换进度
  - FFmpeg 不可用时自动降级为打包下载

- ✨ **增强视频支持**
  - 添加 M4S 格式支持
  - 优化 TS 文件处理
  - 改进流媒体检测和关联

- 🐛 **修复问题**
  - 修复 JavaScript bundle 误识别为视频的问题
  - 优化图片类型过滤逻辑
  - 改进进度反馈机制

- 📚 **文档完善**
  - 添加详细的 FFmpeg 集成说明
  - 新增独立转换工具 `stream-to-mp4.py`
  - 完善 Native Host 安装指南

### v1.0.0 (2024-01-29)

- ✨ 首次发布
- ✅ 支持图片和视频捕获
- ✅ 网络请求拦截
- ✅ 批量下载功能
- ✅ 精美 UI 界面
- ✅ 音频捕获功能

## 📄 开源协议

MIT License

## 👨‍💻 作者

hyf0

## 🙏 致谢

感谢所有贡献者的支持！

---

**如有问题或建议，欢迎提 Issue！**
