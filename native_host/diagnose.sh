#!/bin/bash

echo "🔍 Native Host 诊断工具"
echo "======================================"
echo ""

# 1. 检查 Python
echo "1️⃣ 检查 Python:"
if command -v python3 &> /dev/null; then
    echo "   ✅ python3: $(python3 --version 2>&1)"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    echo "   ✅ python: $(python --version 2>&1)"
    PYTHON_CMD="python"
else
    echo "   ❌ 未找到 Python"
    exit 1
fi
echo ""

# 2. 检查 FFmpeg
echo "2️⃣ 检查 FFmpeg:"
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ ffmpeg: $(ffmpeg -version 2>&1 | head -n 1)"
else
    echo "   ❌ 未找到 FFmpeg"
fi
echo ""

# 3. 检查 Python 脚本
echo "3️⃣ 检查 Python 脚本:"
SCRIPT_PATH="/Users/menglingfei/Public/code/vue/chrome-media-catcher/native_host/ffmpeg_host.py"
if [ -f "$SCRIPT_PATH" ]; then
    echo "   ✅ 脚本文件存在"
    echo "   路径: $SCRIPT_PATH"
    echo "   权限: $(ls -la "$SCRIPT_PATH" | awk '{print $1}')"

    # 尝试运行脚本（发送测试消息）
    echo ""
    echo "4️⃣ 测试 Native Host:"
    echo '{"action":"test"}' | $PYTHON_CMD "$SCRIPT_PATH" 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Native Host 可以运行"
    else
        echo "   ❌ Native Host 运行失败"
    fi
else
    echo "   ❌ 脚本文件不存在: $SCRIPT_PATH"
fi
echo ""

# 5. 检查配置文件
echo "5️⃣ 检查配置文件:"
CONFIG_PATH="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chrome.media.catcher.ffmpeg.json"
if [ -f "$CONFIG_PATH" ]; then
    echo "   ✅ 配置文件存在"
    echo "   路径: $CONFIG_PATH"
    echo "   内容:"
    cat "$CONFIG_PATH" | sed 's/^/      /'
else
    echo "   ❌ 配置文件不存在: $CONFIG_PATH"
fi
echo ""

echo "======================================"
echo "诊断完成！"
