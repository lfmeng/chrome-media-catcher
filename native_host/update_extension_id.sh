#!/bin/bash
# 更新Native Host配置中的扩展ID

if [ -z "$1" ]; then
    echo "❌ 请提供扩展ID"
    echo ""
    echo "用法: ./update_extension_id.sh EXTENSION_ID"
    echo ""
    echo "示例: ./update_extension_id.sh abcdefghijklmnopqrstuvwxyzabcdef"
    exit 1
fi

EXTENSION_ID="$1"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_DIR/native_host/com.chrome.media.catcher.ffmpeg.json"

echo "🔧 更新扩展ID: $EXTENSION_ID"

# 确定Chrome配置目录
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CONFIG_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

# 读取配置文件并更新扩展ID
cat "$CONFIG_FILE" | sed "s|\"chrome-extension://\*/\"|\"chrome-extension://$EXTENSION_ID/\"|" > "$CONFIG_DIR/com.chrome.media.catcher.ffmpeg.json"

echo "✅ 扩展ID已更新"
echo ""
echo "📌 下一步："
echo "   1. 在Chrome中打开 chrome://extensions/"
echo "   2. 找到「媒体资源捕获器」"
echo "   3. 点击「重新加载」按钮"
echo ""
