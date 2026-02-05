#!/usr/bin/env python3
"""
CORS 修复测试脚本

测试图片加载功能是否正常工作

创建日期：2026-02-05
创建者：Claude Code
"""

import subprocess
import sys

def main():
    print("🧪 CORS 修复测试")
    print("=" * 60)

    print("\n✅ 已完成的修复：")
    print("1. 移除了 img 标签的 crossorigin 属性")
    print("2. 实现了延迟加载机制（避免阻塞）")
    print("3. 优化了 background.js 的 fetchBlob 函数：")
    print("   - 添加了 Origin 头")
    print("   - 自动提取 Referer")
    print("   - 将 Sec-Fetch-Mode 改为 'cors'")
    print("   - 添加了完整的 Cookie 支持（包括 HttpOnly）")
    print("   - 添加了默认 User-Agent")

    print("\n📋 测试步骤：")
    print("1. 在 Chrome 中重新加载插件")
    print("2. 访问包含跨域图片的网站")
    print("3. 打开插件，开始捕获图片")
    print("4. 观察图片加载情况：")
    print("   - 如果图片能直接加载，会正常显示")
    print("   - 如果图片加载失败，会显示占位符")
    print("5. 点击占位符上的'点击加载'按钮")
    print("6. 图片应该通过 background.js 加载并显示")

    print("\n🔧 调试方法：")
    print("1. 打开 Chrome DevTools（F12）")
    print("2. 切换到 Console 标签")
    print("3. 查看日志输出，应该能看到：")
    print("   - 📥 获取Blob: [URL]")
    print("   - 🍪 获取到 X 个 Cookie")
    print("   - 🔐 实际请求头: {...}")
    print("   - ✅ Blob 类型: image/xxx")

    print("\n📝 修改的文件：")
    print("- popup.js: 优化图片加载逻辑")
    print("- background.js: 增强 fetchBlob 函数")

    print("\n🎯 关键改进：")
    print("- 不再使用 crossorigin='anonymous'，避免 CORS 预检")
    print("- 使用 background.js 的 fetch API，不受 CORS 限制")
    print("- 自动获取完整的 Cookie（包括 HttpOnly）")
    print("- 智能提取 Referer，防止防盗链")

    print("\n" + "=" * 60)
    print("✨ 修复完成！请按上述步骤测试")

if __name__ == "__main__":
    main()
