# Chrome 媒体资源捕获器 - 快速入门指南

## 🚀 5 分钟快速上手

### 第一步：安装前置要求（可选但推荐）

如果你想要**自动转换流媒体为 MP4**，需要安装：

#### 1. 安装 FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Windows
# 访问 https://ffmpeg.org/download.html 下载并安装
```

验证安装：
```bash
ffmpeg -version
```

#### 2. 验证 Python 3

```bash
python3 --version
```

（macOS 和 Linux 通常已预装，Windows 需要单独安装）

### 第二步：安装 Chrome 扩展

1. 下载或克隆项目
   ```bash
   cd /Users/menglingfei/Public/code/vue/chrome-media-catcher
   ```

2. 打开 Chrome 浏览器，访问：
   ```
   chrome://extensions/
   ```

3. 打开右上角的 **"开发者模式"**

4. 点击 **"加载已解压的扩展程序"**

5. 选择项目目录：
   ```
   /Users/menglingfei/Public/code/vue/chrome-media-catcher
   ```

6. 复制扩展ID（类似 `abcdefghijklmnopabcdefghijlkmnop`）

### 第三步：安装 Native Host（重要！）

为了让扩展能够调用本地 FFmpeg，需要安装 Native Host：

```bash
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host
chmod +x install.sh
./install.sh
```

按照提示输入你的扩展ID（从第二步复制）

**安装成功的标志：**
```
✅ 安装完成！
📋 安装摘要：
   FFmpeg: 6.0.0...
   Python: Python 3.11...
   Native Host: /Users/menglingfei/Library/Application Support/...
   扩展ID: abcdefghijklmnop...
```

### 第四步：测试功能

1. 刷新扩展页面（`chrome://extensions/`）
2. 访问任意包含图片或视频的网页
3. 点击浏览器工具栏中的插件图标
4. 尝试捕获媒体

## 📸 快速测试图片捕获

### 测试网站
- Unsplash: https://unsplash.com
- Pexels: https://www.pexels.com

### 操作步骤
1. 打开测试网站
2. 点击插件图标
3. 在"图片"标签页点击"开始捕获"
4. 滚动页面浏览图片
5. 查看捕获的图片列表
6. 尝试预览、下载、删除功能

## 🎬 快速测试视频捕获

### 测试网站（流媒体）
- HLS Demo: https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
- 其他在线视频网站

### 操作步骤
1. 打开包含视频的网页
2. 切换到"视频"标签页
3. 点击"开始捕获"
4. 播放视频
5. 查看捕获的视频
6. 点击下载按钮

### 期望结果

**✅ 如果安装了 Native Host 和 FFmpeg：**
- 显示进度："正在调用本地FFmpeg..."
- 实时进度：10% → 50% → 100%
- 最终下载：`output.mp4` 文件

**⚠️ 如果没有安装 Native Host：**
- 显示提示："本地FFmpeg不可用，使用打包下载..."
- 最终下载：ZIP 文件（包含 m3u8 + TS 分片）

## 🔧 常见问题排查

### 问题1：下载视频时提示"无法连接到Native Host"

**原因：** Native Host 未安装或配置错误

**解决方案：**
```bash
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host
./install.sh  # 重新安装
```

### 问题2：FFmpeg 转换失败

**检查 FFmpeg 是否安装：**
```bash
ffmpeg -version
```

**如果未安装：**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

### 问题3：扩展无法加载

**检查步骤：**
1. 确保 manifest.json 在项目根目录
2. 检查是否有语法错误（Chrome 会显示具体错误）
3. 尝试重新加载扩展（点击"重新加载"按钮）

### 问题4：图片或视频无法捕获

**可能原因：**
1. 网站有反爬虫机制
2. 内容是通过 JavaScript 动态加载的
3. CORS 限制

**解决方案：**
1. 滚动页面确保内容已加载
2. 刷新页面重新捕获
3. 检查浏览器控制台是否有错误

### 问题5：转换进度卡住不动

**可能原因：**
1. 网络连接不稳定
2. 视频文件过大
3. FFmpeg 进程卡住

**解决方案：**
1. 使用独立的转换脚本：
   ```bash
   cd /Users/menglingfei/Public/code/vue/chrome-media-catcher
   python3 stream-to-mp4.py <视频URL> -o output.mp4
   ```

2. 检查视频 URL 是否可访问

## 📊 功能对照表

| 功能 | 无 FFmpeg | 有 FFmpeg + Native Host |
|------|----------|---------------------|
| 图片捕获 | ✅ | ✅ |
| 视频捕获 | ✅ | ✅ |
| 音频捕获 | ✅ | ✅ |
| HLS (m3u8) 下载 | ⚠️ ZIP 打包 | ✅ 自动转 MP4 |
| TS 下载 | ⚠️ 原始 TS | ✅ 自动转 MP4 |
| M4S 下载 | ❌ 不支持 | ✅ 自动转 MP4 |
| 实时进度 | ❌ | ✅ |
| 批量下载 | ✅ | ✅ |

## 💡 使用技巧

### 技巧1：快速筛选图片类型
使用"图片类型"下拉菜单快速筛选 JPG、PNG、GIF 等格式

### 技巧2：批量下载
1. 勾选需要的图片（或全选）
2. 点击"下载选中"
3. 自动打包为 ZIP 下载

### 技巧3：查看流媒体关联
捕获的视频和音频会显示关联信息：
- 🔗 关联音频: X 个
- 🔗 关联视频: X 个

### 技巧4：独立转换脚本
如果浏览器转换失败，可以使用独立的 Python 脚本：

```bash
# 转换单个视频
python3 stream-to-mp4.py https://example.com/video.m3u8

# 指定输出文件名
python3 stream-to-mp4.py https://example.com/video.m3u8 -o myvideo.mp4

# 批量转换
python3 stream-to-mp4.py --batch urls.txt
```

### 技巧5：查看转换日志
打开 Chrome 开发者工具（F12），查看 Console 标签页：
- `🎬 检测到流媒体` - 检测成功
- `✅ 转换成功` - 转换完成
- `❌ 转换失败` - 错误信息

## 🎓 进阶使用

### 使用独立的转换工具

项目提供了 `stream-to-mp4.py` 脚本，可以在命令行直接使用：

```bash
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher

# 查看帮助
python3 stream-to-mp4.py --help

# 转换 m3u8
python3 stream-to-mp4.py https://example.com/video.m3u8

# 转换本地 TS 文件
python3 stream-to-mp4.py ./video.ts -o output.mp4

# 批量转换（创建 urls.txt，每行一个URL）
python3 stream-to-mp4.py --batch urls.txt -d ./output
```

### 更新扩展ID

如果重新加载了扩展，扩展ID会变化，需要更新 Native Host 配置：

```bash
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host
./update_extension_id.sh
```

## 📞 获取帮助

遇到问题？

1. **查看日志** - 打开 Chrome 开发者工具（F12）查看 Console
2. **检查 FFmpeg** - 运行 `ffmpeg -version` 确认已安装
3. **检查 Native Host** - 运行 `./install.sh` 重新安装
4. **查看 README** - 阅读主 README.md 了解详细功能
5. **提 Issue** - 在项目仓库提交问题

## ✅ 安装检查清单

使用此清单确认所有组件已正确安装：

- [ ] Chrome 已安装
- [ ] 项目已下载到 `/Users/menglingfei/Public/code/vue/chrome-media-catcher`
- [ ] 扩展已加载到 Chrome（`chrome://extensions/`）
- [ ] FFmpeg 已安装（运行 `ffmpeg -version`）
- [ ] Python 3 已安装（运行 `python3 --version`）
- [ ] Native Host 已安装（运行 `./install.sh`）
- [ ] 扩展ID 已配置到 Native Host

全部打勾？恭喜，可以开始使用了！

---

**下一步：** 阅读 [README.md](./README.md) 了解完整功能
