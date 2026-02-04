#!/bin/bash

# Chrome 扩展快速安装脚本

echo "=========================================="
echo "   Chrome 媒体资源捕获器 - 快速安装"
echo "=========================================="
echo ""

PROJECT_DIR="/Users/menglingfei/Public/code/vue/chrome-media-catcher"

echo "📁 项目位置: $PROJECT_DIR"
echo ""

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在！"
    exit 1
fi

echo "✅ 项目目录存在"
echo ""

# 检查必需文件
echo "📋 检查必需文件..."
required_files=(
    "manifest.json"
    "popup.html"
    "popup.css"
    "popup.js"
    "src/background.js"
    "src/content.js"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (缺失)"
        all_files_exist=false
    fi
done

echo ""

if [ "$all_files_exist" = false ]; then
    echo "❌ 缺少必需文件，请检查项目！"
    exit 1
fi

echo "✅ 所有必需文件都存在"
echo ""

# 提供安装说明
echo "=========================================="
echo "  📖 安装步骤"
echo "=========================================="
echo ""

echo "方法一：使用 Chrome 界面"
echo "─────────────────────────────────────"
echo "1. 打开 Chrome 浏览器"
echo "2. 在地址栏输入: chrome://extensions/"
echo "3. 打开右上角的 '开发者模式' 开关"
echo "4. 点击 '加载已解压的扩展程序'"
echo "5. 选择文件夹: $PROJECT_DIR"
echo ""

echo "方法二：拖拽安装（推荐）"
echo "─────────────────────────────────────"
echo "1. 打开 Chrome 浏览器"
echo "2. 在地址栏输入: chrome://extensions/"
echo "3. 打开右上角的 '开发者模式' 开关"
echo "4. 打开 Finder，找到项目文件夹"
echo "5. 直接拖拽文件夹到浏览器窗口"
echo ""

echo "方法三：使用命令行打开"
echo "─────────────────────────────────────"
echo "执行以下命令自动打开扩展页面："
echo ""
echo "  open -a 'Google Chrome' chrome://extensions/"
echo ""

# 询问是否要打开浏览器
read -p "是否现在打开 Chrome 扩展页面？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 正在打开 Chrome 扩展页面..."
    open -a "Google Chrome" "chrome://extensions/"
    echo ""
    echo "✅ 已打开！"
    echo ""
    echo "接下来："
    echo "1. 打开 '开发者模式' 开关（右上角）"
    echo "2. 点击 '加载已解压的扩展程序'"
    echo "3. 选择文件夹: $PROJECT_DIR"
else
    echo ""
    echo "你可以稍后手动打开 Chrome 并访问:"
    echo "chrome://extensions/"
fi

echo ""
echo "=========================================="
echo "  ✨ 安装完成后"
echo "=========================================="
echo ""
echo "1. 在浏览器工具栏找到插件图标"
echo "2. 点击图标打开插件"
echo "3. 选择 '图片' 或 '视频' 标签"
echo "4. 点击 '开始捕获' 按钮"
echo "5. 浏览网页自动捕获媒体资源"
echo ""
echo "祝你使用愉快！🎉"
echo ""
