#!/bin/bash
# 自动配置 Native Host - 完整版

echo "🎬 Chrome Media Catcher - 自动配置脚本"
echo "=========================================="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 项目目录: $PROJECT_DIR"

# 1. 检查并安装FFmpeg
echo ""
echo "🔍 步骤 1/5: 检查FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg未安装，正在安装..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            echo "❌ 未找到Homebrew，请先安装: https://brew.sh/"
            exit 1
        fi

        echo "📦 使用Homebrew安装FFmpeg..."
        brew install ffmpeg
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "📦 使用apt安装FFmpeg..."
        sudo apt update
        sudo apt install -y ffmpeg
    else
        echo "❌ 不支持的操作系统: $OSTYPE"
        exit 1
    fi

    if [ $? -eq 0 ]; then
        echo "✅ FFmpeg安装成功: $(ffmpeg -version | head -n 1)"
    else
        echo "❌ FFmpeg安装失败"
        exit 1
    fi
else
    echo "✅ FFmpeg已安装: $(ffmpeg -version | head -n 1)"
fi

# 2. 检查Python
echo ""
echo "🔍 步骤 2/5: 检查Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到Python3"
    exit 1
else
    echo "✅ Python已安装: $(python3 --version)"
fi

# 3. 设置Python脚本可执行
echo ""
echo "🔍 步骤 3/5: 配置Python脚本..."
chmod +x "$PROJECT_DIR/native_host/ffmpeg_host.py"
echo "✅ Python脚本已配置"

# 4. 配置Native Host
echo ""
echo "🔍 步骤 4/5: 配置Native Messaging Host..."

# 确定Chrome配置目录
if [[ "$OSTYPE" == "darwin"* ]]; then
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROME_CANARY_DIR="$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROME_CANARY_DIR="$HOME/.config/google-chrome-canary/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
fi

# 选择配置目录
CONFIG_DIR=""
if [ -d "$CHROME_DIR" ]; then
    CONFIG_DIR="$CHROME_DIR"
elif [ -d "$CHROME_CANARY_DIR" ]; then
    CONFIG_DIR="$CHROME_CANARY_DIR"
elif [ -d "$CHROMIUM_DIR" ]; then
    CONFIG_DIR="$CHROMIUM_DIR"
else
    CONFIG_DIR="$CHROME_DIR"
fi

echo "📂 配置目录: $CONFIG_DIR"

# 创建配置目录
mkdir -p "$CONFIG_DIR"

# 复制配置文件（使用通配符，允许任何扩展ID）
CONFIG_FILE="$PROJECT_DIR/native_host/com.chrome.media.catcher.ffmpeg.json"
cp "$CONFIG_FILE" "$CONFIG_DIR/com.chrome.media.catcher.ffmpeg.json"

echo "✅ Native Host配置文件已安装"

# 5. 显示完成信息
echo ""
echo "🎉 安装完成！"
echo ""
echo "📋 安装摘要："
echo "   ✅ FFmpeg: $(ffmpeg -version | head -n 1)"
echo "   ✅ Python: $(python3 --version)"
echo "   ✅ Native Host: $CONFIG_DIR/com.chrome.media.catcher.ffmpeg.json"
echo ""
echo "📌 下一步操作："
echo ""
echo "   1️⃣  在Chrome中打开 chrome://extensions/"
echo "   2️⃣  开启「开发者模式」"
echo "   3️⃣  点击「加载已解压的扩展程序」"
echo "   4️⃣  选择项目文件夹: $PROJECT_DIR"
echo "   5️⃣  复制扩展ID（在扩展卡片上显示）"
echo "   6️⃣  运行以下命令更新扩展ID："
echo ""
echo "      cd $PROJECT_DIR/native_host"
echo "      ./update_extension_id.sh YOUR_EXTENSION_ID"
echo ""
echo "   7️⃣  在扩展页面点击「重新加载」按钮"
echo "   8️⃣  测试下载功能！"
echo ""
echo "💡 提示："
echo "   - Native Host已配置为接受任何扩展ID（用于开发）"
echo "   - 生产环境建议指定具体的扩展ID"
echo "   - FFmpeg转码日志将显示在Chrome开发者工具的控制台中"
echo ""
