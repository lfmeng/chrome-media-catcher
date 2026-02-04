# Chrome Media Catcher - 本地FFmpeg转换功能

## 功能说明

本扩展支持调用本地安装的FFmpeg工具，将流媒体视频（m3u8、ts等）自动转换为标准MP4格式。

## 优势

- ✅ **真正可播放的MP4**：使用FFmpeg转码，输出标准MP4文件
- ✅ **高质量**：使用`-c copy`参数，不重新编码，保持原始质量
- ✅ **自动降级**：FFmpeg不可用时自动使用打包下载
- ✅ **快速便捷**：一键转换，无需手动操作

## 安装步骤

### 1. 安装FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
1. 访问 https://ffmpeg.org/download.html
2. 下载Windows版本
3. 解压并添加到系统PATH环境变量

### 2. 验证FFmpeg安装

打开终端/命令行，运行：
```bash
ffmpeg -version
```

如果显示版本信息，说明安装成功。

### 3. 安装Native Host

进入项目的`native_host`目录，运行安装脚本：

```bash
cd native_host
chmod +x install.sh
./install.sh
```

安装脚本会：
- 检查FFmpeg是否已安装
- 检查Python是否已安装
- 生成配置文件
- 提示输入扩展ID

### 4. 获取扩展ID

1. 在Chrome中打开 `chrome://extensions/`
2. 找到"媒体资源捕获器"扩展
3. 点击"详细信息"或查看扩展卡片
4. 复制扩展ID（类似：`abcdefghijklmnopqrstuvwxyzabcdef`）

### 5. 完成安装

在安装脚本中粘贴扩展ID，脚本会自动配置Native Host。

### 6. 重新加载扩展

1. 在 `chrome://extensions/` 页面
2. 点击"媒体资源捕获器"的刷新按钮
3. 或者关闭后重新打开Chrome

## 使用方法

### 自动转换

1. 打开任意网页
2. 点击扩展图标
3. 切换到"视频"标签
4. 点击任意视频的下载按钮
5. **如果检测到流媒体格式（m3u8、ts等）**：
   - 自动调用本地FFmpeg转换
   - 显示转换进度
   - 完成后自动下载MP4文件

### 批量转换

点击"下载ZIP"按钮时：
- 检测列表中的流媒体视频
- 自动使用FFmpeg逐个转换
- 打包成ZIP下载

## 工作原理

### 架构

```
Chrome扩展 (popup.js)
    ↓
Native Messaging
    ↓
Python脚本 (ffmpeg_host.py)
    ↓
本地FFmpeg工具
    ↓
返回MP4视频数据
```

### 流程

1. 用户点击下载流媒体视频
2. 扩展检测到流媒体格式
3. 通过Native Messaging发送请求到Python脚本
4. Python脚本调用本地FFmpeg：
   ```bash
   ffmpeg -i "http://example.com/video.m3u8" -c copy output.mp4
   ```
5. FFmpeg下载并转换视频
6. Python脚本读取转换后的文件
7. 返回视频数据给扩展
8. 扩展触发浏览器下载MP4文件

## 故障排除

### 问题1：下载时提示"无法连接到Native Host"

**原因**：Native Host未正确安装

**解决方案**：
```bash
cd native_host
./install.sh
```

重新输入扩展ID并安装。

### 问题2：FFmpeg转换超时

**原因**：视频太大或网络太慢

**解决方案**：
- 脚本默认超时时间为5分钟
- 可以在`ffmpeg_host.py`中修改超时参数（第65行、第95行）
- 或者手动使用FFmpeg命令行转换

### 问题3：扩展ID改变后无法使用

**原因**：重新加载扩展后，扩展ID会改变

**解决方案**：
重新运行安装脚本，输入新的扩展ID

### 问题4：FFmpeg未找到

**原因**：FFmpeg未安装或不在PATH中

**解决方案**：
1. 验证FFmpeg安装：`ffmpeg -version`
2. 如果显示"command not found"，需要安装FFmpeg
3. 安装后重新运行安装脚本

## 手动使用FFmpeg

如果自动转换失败，可以手动使用FFmpeg：

### 转换m3u8
```bash
ffmpeg -i "http://example.com/video.m3u8" -c copy -bsf:a aac_adtstoasc output.mp4
```

### 转换ts文件
```bash
ffmpeg -i input.ts -c copy output.mp4
```

### 转换m4s文件
```bash
ffmpeg -i input.m4s -c copy output.mp4
```

## 技术细节

### Native Messaging配置

配置文件位置：
- **macOS**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- **Linux**: `~/.config/google-chrome/NativeMessagingHosts/`

配置文件内容：
```json
{
  "name": "com.chrome.media.catcher.ffmpeg",
  "description": "Chrome Media Catcher - FFmpeg Native Host",
  "path": "/path/to/ffmpeg_host.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID/"
  ]
}
```

### 安全性

- Native Host只在用户点击下载按钮时才会被调用
- 只能被指定的扩展ID调用
- Python脚本只能调用FFmpeg，没有其他系统权限

## 性能说明

- **转换速度**：取决于网络速度和视频大小
- **CPU使用**：使用`-c copy`参数，不重新编码，CPU占用低
- **内存使用**：转换过程中会在`/tmp`目录创建临时文件
- **清理**：Python脚本会自动清理临时文件

## 更多帮助

如果遇到问题，请检查：
1. Chrome控制台（F12）的错误信息
2. Native Host脚本的输出
3. FFmpeg是否正确安装

## 许可证

本扩展遵循开源许可证。FFmpeg是独立的开源项目。
