# Chrome Media Catcher - FFmpeg 集成更新说明

## 📅 更新日期
2026-02-01

## 🎯 更新目标

继续完善资源提取器相关任务，**集成本地 FFmpeg 自动转换视频流为 MP4 格式**，确保用户最终下载的是可直接播放的 MP4 文件，而不仅仅是流媒体文件。

---

## ✨ 新增功能

### 1. 增强的 FFmpeg 本地集成

#### a) 实时进度反馈
**文件：** `native_host/ffmpeg_host.py`

**改进前：**
```python
result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
# 只有完成或失败，没有中间进度
```

**改进后：**
```python
# 实时解析 FFmpeg 输出，提取视频时长和当前进度
process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

while True:
    line = process.stderr.readline()
    if 'Duration:' in line:
        duration = parse_duration(line)  # 解析总时长
    if 'time=' in line and duration:
        current_time = parse_current_time(line)
        percent = int((current_time / duration) * 80) + 10

        # 实时发送进度到 Chrome 扩展
        send_message({
            'type': 'progress',
            'percent': percent,
            'message': f'正在转换... {percent}%'
        })
```

**效果：**
- 转换过程中实时显示进度：10% → 35% → 68% → 100%
- 用户体验更直观，不再"黑盒"等待

#### b) 优化 FFmpeg 参数
**新增参数：**
```bash
ffmpeg -i <input> \
  -c copy \                              # 直接复制，不重新编码（快速）
  -bsf:a aac_adtstoasc \                 # 修复 AAC 流
  -movflags faststart \                  # 优化网络播放
  output.mp4 \
  -y
```

**好处：**
- 转换速度更快（不重新编码）
- 生成的 MP4 可以边下边播
- 兼容性更好

### 2. 新增 M4S 格式支持

**文件：** `native_host/ffmpeg_host.py`

**新增函数：**
```python
def process_m4s_video(m4s_url, output_dir):
    """处理M4S视频文件（DASH分片）"""
    # 1. 下载 M4S 文件
    # 2. 使用 FFmpeg 转换为 MP4
    # 3. 返回 MP4 数据
```

**文件：** `stream-downloader.js`

**更新：**
```javascript
detectStreamType(url) {
  // ...原有代码...
  } else if (urlLower.includes('.m4s')) {
    return 'm4s';  // 新增 M4S 检测
  }
}
```

**支持格式总览：**
| 格式 | 扩展名 | FFmpeg 支持 | 降级方案 |
|------|--------|------------|---------|
| HLS | .m3u8, .m3u | ✅ | ZIP 打包 |
| MPEG-TS | .ts | ✅ | 原始下载 |
| M4S | .m4s | ✅ | ❌ 无（需要 FFmpeg） |
| DASH | .mpd | ❌ | - |

### 3. 改进的进度处理

**文件：** `stream-downloader.js`

**改进前：**
```javascript
port.onMessage.addListener((response) => {
  clearTimeout(timeout);
  if (response.success) {
    // 只处理最终结果
  }
});
```

**改进后：**
```javascript
port.onMessage.addListener((response) => {
  // 处理进度消息
  if (response.type === 'progress') {
    progressCallback({
      type: 'progress',
      percent: response.percent,
      message: response.message
    });
    return; // 继续等待最终结果
  }

  // 处理最终结果
  if (response.success) {
    resolve({ blob, filename, success: true });
  }
});
```

**效果：**
- Native Host 可以发送多个中间进度消息
- 扩展实时更新 UI 进度条
- 最后才发送最终结果

### 4. 增强的格式检测

**更新：** `stream-downloader.js`

```javascript
// 主下载方法：优先使用本地FFmpeg
async download(url, progressCallback) {
  const streamType = this.detectStreamType(url);

  // 🔥 优先尝试使用本地FFmpeg (支持 HLS、MPEG-TS、M4S)
  if (['hls', 'mpegts', 'm4s'].includes(streamType)) {
    progressCallback({
      type: 'info',
      message: `检测到 ${streamType.toUpperCase()} 流媒体，正在调用本地FFmpeg转换...`
    });

    try {
      const result = await this.convertWithLocalFFmpeg(url, streamType);
      if (result.success) {
        progressCallback({
          type: 'progress',
          percent: 100,
          message: '✅ 转换完成！已生成MP4文件'
        });
        return result;
      }
    } catch (ffmpegError) {
      // 降级方案...
    }
  }
}
```

**改进：**
- 明确提示用户正在转换的格式
- 成功后明确告知已生成 MP4
- M4S 格式没有降级方案，强制要求 FFmpeg

---

## 📝 文档更新

### 1. 大幅更新 README.md

**新增章节：**
- ✨ FFmpeg 本地集成说明
- 📖 详细的使用指南（包括流媒体转换）
- 🛠️ FFmpeg 集成架构图
- 🎯 使用场景和限制说明
- 🔗 相关资源链接

**更新内容：**
```
# 功能特性
- 新增"视频流转换"章节
- 详细说明支持的格式和自动降级

# 安装方法
- 新增"前置要求"章节
- 详细的 Native Host 安装步骤
- FFmpeg 安装指南

# 使用指南
- 新增"流媒体视频处理"章节
- 详细的转换流程说明
- 降级方案和手动转换方法

# 技术实现
- 新增"FFmpeg 集成架构"图
- 详细的工作流程说明

# 更新日志
- 新增 v1.1.0 版本说明
```

### 2. 创建快速入门指南 (QUICKSTART.md)

**内容结构：**
- 🚀 5 分钟快速上手
- 📸 图片捕获测试
- 🎬 视频捕获测试
- 🔧 常见问题排查
- 💡 使用技巧
- ✅ 安装检查清单

**亮点：**
- 清晰的步骤说明
- 具体的测试网站
- 详细的问题排查表格
- 功能对照表（有无 FFmpeg 的区别）

---

## 🔧 技术改进

### 1. 代码结构优化

| 文件 | 改进 | 好处 |
|------|------|------|
| `ffmpeg_host.py` | 新增 `process_m4s_video()` | 支持 M4S 格式 |
| `ffmpeg_host.py` | 实时解析 FFmpeg 输出 | 进度反馈更准确 |
| `stream-downloader.js` | 改进消息处理逻辑 | 支持进度消息 |
| `stream-downloader.js` | 新增 M4S 检测 | 自动识别 M4S 格式 |
| `manifest.json` | 版本更新到 1.1.0 | 强制刷新缓存 |

### 2. 性能优化

- **超时时间：** 5分钟 → 10分钟（大视频转换）
- **错误处理：** 更详细的错误信息
- **内存管理：** 转换完成后自动清理临时文件
- **进度计算：** 智能计算转换进度

### 3. 用户体验改进

**改进前：**
```
下载中... (等待5分钟) ✅ 完成
```

**改进后：**
```
正在调用本地FFmpeg...
正在转换... 10%
正在转换... 35%
正在转换... 68%
正在转换... 95%
✅ 转换完成！已生成MP4文件
```

---

## 📊 支持的格式对照表

| 格式 | 扩展名 | FFmpeg 转换 | 降级方案 | 文件大小 | 转换速度 |
|------|--------|------------|---------|---------|---------|
| **HLS** | .m3u8, .m3u | ✅ output.mp4 | ⚠️ ZIP 打包 | 大 | 快 |
| **MPEG-TS** | .ts | ✅ output.mp4 | ⚠️ 原始 TS | 中 | 快 |
| **M4S** | .m4s | ✅ output.mp4 | ❌ 无 | 小 | 快 |
| **DASH** | .mpd | ❌ | ❌ | - | - |

---

## 🎯 用户收益

### 对于安装了 FFmpeg 的用户：

✅ **自动转换** - 无需手动操作，自动生成 MP4
✅ **实时进度** - 清楚知道转换进度，不再焦虑等待
✅ **格式扩展** - 新增 M4S 格式支持
✅ **质量保证** - 直接复制流，不重新编码，无损质量
✅ **快速下载** - 优化的 MP4，适合网络播放

### 对于未安装 FFmpeg 的用户：

⚠️ **降级方案** - 自动切换到打包下载
📦 **ZIP 文件** - 包含所有分片和详细说明
📖 **转换指南** - README 中有详细的转换教程
🐍 **独立工具** - 提供 `stream-to-mp4.py` 脚本

---

## 📦 安装和使用流程

### 完整安装流程：

```bash
# 1. 安装 FFmpeg（如果还没有）
brew install ffmpeg  # macOS
# 或
sudo apt install ffmpeg  # Ubuntu

# 2. 验证安装
ffmpeg -version
python3 --version

# 3. 加载 Chrome 扩展
# 打开 chrome://extensions/
# 启用开发者模式
# 加载已解压的扩展程序

# 4. 安装 Native Host
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host
chmod +x install.sh
./install.sh  # 输入扩展ID

# 5. 测试
# 打开包含视频的网页
# 点击插件图标
# 下载视频，查看是否自动转换为 MP4
```

### 验证安装成功：

```
✅ FFmpeg 已安装
✅ Python 3 已安装
✅ Chrome 扩展已加载
✅ Native Host 已安装
✅ 扩展ID 已配置
```

---

## 🐛 已知问题和限制

1. **大文件转换** - 超过 100MB 的视频可能需要较长时间
2. **网络依赖** - m3u8 转换需要稳定的网络连接
3. **平台差异** - 不同操作系统的 FFmpeg 行为可能略有不同
4. **M4S 无降级** - M4S 格式必须使用 FFmpeg

**解决方案：**
- 使用独立的 `stream-to-mp4.py` 脚本转换大文件
- 检查网络连接和 URL 可访问性
- 查看 QUICKSTART.md 的问题排查章节

---

## 🔄 后续优化方向

### 短期（v1.2.0）：
- [ ] 添加转换历史记录
- [ ] 支持暂停和恢复转换
- [ ] 添加转换队列管理

### 中期（v1.3.0）：
- [ ] 支持更多视频格式（RMVB、AVI 等）
- [ ] 添加视频压缩选项
- [ ] 支持字幕提取和嵌入

### 长期（v2.0.0）：
- [ ] WebAssembly FFmpeg（完全本地化，无需 Native Host）
- [ ] 支持视频剪辑和合并
- [ ] 云端转换选项

---

## 📄 相关文件清单

### 核心文件（已修改）：
- ✅ `manifest.json` - 版本更新到 1.1.0
- ✅ `native_host/ffmpeg_host.py` - 实时进度 + M4S 支持
- ✅ `stream-downloader.js` - 改进消息处理 + M4S 检测

### 文档文件（已更新/新建）：
- ✅ `README.md` - 大幅更新
- ✅ `QUICKSTART.md` - 新建快速入门指南
- ✅ `UPDATE_LOG.md` - 本文件

### 配置文件（无变化）：
- `native_host/com.chrome.media.catcher.ffmpeg.json`
- `native_host/install.sh`

### 工具文件（无变化）：
- `stream-to-mp4.py` - 独立转换工具

---

## 🎓 总结

本次更新重点完善了 **FFmpeg 本地集成**，主要改进：

1. ✨ **新增 M4S 格式支持** - 扩展了支持的流媒体格式
2. 📊 **实时进度反馈** - 用户可以看到转换进度
3. 🚀 **优化转换参数** - 更快、更好的 MP4 输出
4. 📚 **完善文档** - 新建快速入门指南，更新 README

**核心价值：**
用户下载流媒体视频时，**自动获得标准 MP4 文件**，无需手动转换，大大提升了使用体验！

---

**作者：** Claude Code
**日期：** 2026-02-01
**版本：** v1.1.0
