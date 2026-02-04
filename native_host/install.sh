#!/bin/bash
# Chrome Media Catcher - Native Host 安装脚本

echo "🎬 Chrome Media Catcher - Native Host 安装脚本"
echo "================================================"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 项目目录: $PROJECT_DIR"

# 检查FFmpeg是否已安装
echo ""
echo "🔍 检查FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ 未找到FFmpeg！"
    echo ""
    echo "请先安装FFmpeg："
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: https://ffmpeg.org/download.html"
    echo ""
    exit 1
else
    echo "✅ FFmpeg已安装: $(ffmpeg -version | head -n 1)"
fi

# 检查Python是否已安装
echo ""
echo "🔍 检查Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到Python3！"
    exit 1
else
    echo "✅ Python已安装: $(python3 --version)"
fi

# 获取Chrome Native Messaging Hosts目录
echo ""
echo "🔍 确定Chrome配置目录..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROME_CANARY_DIR="$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROME_CANARY_DIR="$HOME/.config/google-chrome-canary/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

# 确定使用哪个目录
CONFIG_DIR=""
if [ -d "$CHROME_DIR" ]; then
    CONFIG_DIR="$CHROME_DIR"
elif [ -d "$CHROME_CANARY_DIR" ]; then
    CONFIG_DIR="$CHROME_CANARY_DIR"
elif [ -d "$CHROMIUM_DIR" ]; then
    CONFIG_DIR="$CHROMIUM_DIR"
else
    # 使用默认的Chrome目录
    CONFIG_DIR="$CHROME_DIR"
fi

echo "📂 配置目录: $CONFIG_DIR"

# 创建配置目录（如果不存在）
mkdir -p "$CONFIG_DIR"

# 获取扩展ID（用户需要输入）
echo ""
echo "📝 请输入Chrome扩展ID（在扩展管理页面chrome://extensions/中查看）:"
echo "   提示：加载扩展后，扩展ID会显示在扩展详情页"
read -p "   扩展ID: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "❌ 扩展ID不能为空"
    exit 1
fi

# 更新配置文件中的allowed_origins
CONFIG_FILE="$PROJECT_DIR/native_host/com.chrome.media.catcher.ffmpeg.json"
TEMP_CONFIG="$PROJECT_DIR/native_host/com.chrome.media.catcher.ffmpeg.temp.json"

echo ""
echo "📝 生成配置文件..."

cat "$CONFIG_FILE" | sed "s|\"chrome-extension://\\*/\"|\"chrome-extension://$EXTENSION_ID/\"|" > "$TEMP_CONFIG"

# 复制配置文件到Chrome目录
cp "$TEMP_CONFIG" "$CONFIG_DIR/com.chrome.media.catcher.ffmpeg.json"
rm "$TEMP_CONFIG"

echo "✅ 配置文件已安装到: $CONFIG_DIR/com.chrome.media.catcher.ffmpeg.json"

# 测试Native Host
echo ""
echo "🧪 测试Native Host..."
TEST_OUTPUT=$(echo '{"action":"test"}' | python3 "$PROJECT_DIR/native_host/ffmpeg_host.py" 2>&1)
if [ $? -eq 0 ]; then
    echo "✅ Native Host测试成功"
else
    echo "⚠️  Native Host测试失败，但可能仍然可用"
fi

# 显示安装完成信息
echo ""
echo "✅ 安装完成！"
echo ""
echo "📋 安装摘要："
echo "   FFmpeg: $(ffmpeg -version | head -n 1)"
echo "   Python: $(python3 --version)"
echo "   Native Host: $CONFIG_DIR/com.chrome.media.catcher.ffmpeg.json"
echo "   扩展ID: $EXTENSION_ID"
echo ""
echo "📌 下一步："
echo "   1. 在Chrome中打开 chrome://extensions/"
echo "   2. 重新加载扩展程序"
echo "   3. 打开任意网页，点击扩展图标"
echo "   4. 下载流媒体视频时，将自动调用本地FFmpeg转换"
echo ""
echo "💡 提示："
echo "   - 如果更改了扩展位置，需要重新运行此安装脚本"
echo "   - FFmpeg转换日志将显示在Chrome开发者工具的控制台中"
echo ""
