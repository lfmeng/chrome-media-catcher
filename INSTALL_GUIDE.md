# 快速安装指南 - 本地FFmpeg转换功能

## ⚡ 快速开始（3步完成）

### 第1步：安装 FFmpeg

FFmpeg 正在后台自动安装中...

或者手动安装：
```bash
brew install ffmpeg
```

### 第2步：加载 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目文件夹：`/Users/menglingfei/Public/code/vue/chrome-media-catcher`
5. 复制显示的扩展ID（32位字符，类似：`abcdefghijklmnopqrstuvwxy...`）

### 第3步：配置 Native Host

```bash
cd /Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host

# 运行自动配置脚本
./setup.sh
```

然后更新扩展ID：
```bash
./update_extension_id.sh 你的扩展ID
```

例如：
```bash
./update_extension_id.sh abcdefghijklmnopqrstuvwxyzabcdef
```

最后，在 Chrome 扩展页面点击「重新加载」按钮。

## ✅ 完成！

现在打开任意网页，点击扩展图标，切换到"视频"标签，下载视频时会自动调用本地 FFmpeg 转换为 MP4！

---

## 📝 详细说明

### 文件说明

- `setup.sh` - 自动安装和配置脚本（会自动安装FFmpeg、Python、配置Native Host）
- `update_extension_id.sh` - 更新扩展ID的脚本
- `ffmpeg_host.py` - Native Host 主程序（调用本地FFmpeg）
- `com.chrome.media.catcher.ffmpeg.json` - Native Messaging 配置文件

### 工作原理

1. 用户点击下载流媒体视频
2. 扩展通过 Native Messaging 发送请求给 Python 脚本
3. Python 脚本调用本地 FFmpeg 转换视频
4. 转换完成后返回 MP4 数据给扩展
5. 扩展触发浏览器下载

### 支持的格式

- ✅ `.m3u8` / `.m3u` (HLS) → MP4
- ✅ `.ts` (MPEG-TS) → MP4
- ⚠️  `.m4s` → 降级为直接下载

### 常见问题

**Q: FFmpeg 安装需要多久？**
A: 通常5-10分钟，需要下载70多个依赖包。

**Q: 如何检查 FFmpeg 是否安装成功？**
A: 运行 `ffmpeg -version`，应该显示版本信息。

**Q: 扩展ID 在哪里？**
A: 在 `chrome://extensions/` 页面，扩展卡片上会显示。

**Q: 重新加载扩展后扩展ID会变吗？**
A: 是的，需要重新运行 `update_extension_id.sh` 更新。

**Q: 如何测试是否工作？**
A: 打开任意有视频的网页，点击下载按钮。如果是m3u8或ts格式，会自动转换。

### 卸载方法

如果需要卸载 Native Host：

```bash
# macOS
rm ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.chrome.media.catcher.ffmpeg.json

# Linux
rm ~/.config/google-chrome/NativeMessagingHosts/com.chrome.media.catcher.ffmpeg.json
```

---

## 🎯 测试命令

安装完成后，可以测试 Native Host 是否工作：

```bash
echo '{"action":"test"}' | python3 /Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host/ffmpeg_host.py
```

应该返回 JSON 响应。

---

需要更多帮助？查看 `FFMPEG_NATIVE_HOST.md` 获取详细文档。
