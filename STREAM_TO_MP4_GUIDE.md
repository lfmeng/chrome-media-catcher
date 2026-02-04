# 视频流转 MP4 转换工具使用指南

## 📖 简介

`stream-to-mp4.py` 是一个强大的命令行工具，用于将各种流媒体格式转换为标准 MP4 格式。

## ✨ 支持的格式

- **HLS 流**: `.m3u8`, `.m3u`
- **MPEG-TS**: `.ts`
- **DASH 分片**: `.m4s`
- **DASH MPD**: `.mpd`, `.dash`
- 其他 FFmpeg 支持的视频格式

## 🚀 快速开始

### 前置要求

确保系统已安装 FFmpeg：

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# 从 https://ffmpeg.org/download.html 下载
```

### 基本用法

#### 1. 转换 m3u8 流

```bash
python stream-to-mp4.py https://example.com/video.m3u8
```

输出文件会自动命名为 `video.mp4`

#### 2. 指定输出文件名

```bash
python stream-to-mp4.py https://example.com/video.m3u8 -o myvideo.mp4
```

#### 3. 转换本地 TS 文件

```bash
python stream-to-mp4.py video.ts -o output.mp4
```

#### 4. 批量转换

创建一个文本文件 `urls.txt`，每行一个 URL：

```
https://example.com/video1.m3u8
https://example.com/video2.m3u8
https://example.com/video3.m3u8
```

然后运行：

```bash
python stream-to-mp4.py --batch urls.txt
```

#### 5. 批量转换并指定输出目录

```bash
python stream-to-mp4.py --batch urls.txt -d ./output_videos
```

## 📋 完整参数说明

```
positional arguments:
  input                 输入 URL 或文件路径

optional arguments:
  -h, --help            显示帮助信息
  -o OUTPUT, --output OUTPUT
                        输出文件名（默认自动生成）
  -d OUTPUT_DIR, --output-dir OUTPUT_DIR
                        批量转换时的输出目录
  --batch BATCH         批量转换模式，指定包含 URL 列表的文件
```

## 💡 使用场景

### 场景 1：下载在线视频

```bash
# 下载 HLS 流媒体
python stream-to-mp4.py https://example.com/live/stream.m3u8 -o live_video.mp4
```

### 场景 2：转换录制的 TS 文件

```bash
# 转换电视录制的 TS 文件
python stream-to-mp4.py recording.ts -o recording.mp4
```

### 场景 3：批量下载课程视频

```bash
# 创建 course_urls.txt 包含所有课程视频 URL
python stream-to-mp4.py --batch course_urls.txt -d ./my_course
```

## ⚙️ 技术细节

### 转换参数

脚本使用以下 FFmpeg 参数：

- `-c copy`: 直接复制流，不重新编码（保持原始质量）
- `-bsf:a aac_adtstoasc`: 修复 AAC 音频流
- `-movflags faststart`: 优化 MP4 文件以便网络播放
- `-y`: 自动覆盖已存在的文件

### 格式自动检测

脚本会根据输入 URL 或文件扩展名自动检测流类型：

- `.m3u8` / `.m3u` → HLS 流
- `.ts` → MPEG-TS
- `.m4s` → DASH 分片
- `.mpd` / `.dash` → DASH 清单

## 🔧 与 Chrome 扩展配合使用

`stream-to-mp4.py` 可以作为 chrome-media-catcher 扩展的补充工具：

1. 使用扩展捕获视频流 URL
2. 使用本工具转换为标准 MP4
3. 享受高质量的本地视频文件

## ⚠️ 注意事项

1. **网络速度**: 转换在线流媒体时，速度受网络限制
2. **版权问题**: 请遵守版权法规，仅转换您有权下载的内容
3. **DRM 保护**: 受 DRM 保护的内容无法转换
4. **磁盘空间**: 确保有足够的磁盘空间存储输出文件

## 🐛 故障排除

### 问题 1：提示"未找到 FFmpeg"

**解决方案**：
```bash
# macOS
brew install ffmpeg

# 验证安装
ffmpeg -version
```

### 问题 2：转换失败

**可能原因**：
- URL 无效或无法访问
- 网络连接问题
- 视频流受 DRM 保护

**解决方法**：
- 检查 URL 是否正确
- 尝试在浏览器中打开 URL
- 使用 FFmpeg 直接测试：`ffmpeg -i "your_url"`

### 问题 3：转换速度慢

**原因**：
- 网络速度限制
- 视码率高

**说明**：
- 脚本使用 `-c copy` 不重新编码，已经是最快方式
- 主要时间花在下载上

## 📊 性能说明

- **CPU 占用**: 极低（使用 `-c copy` 不重新编码）
- **转换速度**: 取决于网络速度和视频码率
- **输出质量**: 与源视频完全相同（无损转换）

## 🔄 更新日志

### v1.0.0 (2026-02-01)
- ✅ 支持多种流媒体格式
- ✅ 自动格式检测
- ✅ 批量转换功能
- ✅ 实时进度显示
- ✅ 友好的命令行界面

## 📝 许可证

MIT License

---

**需要帮助？** 请查看项目文档或提交 Issue。
