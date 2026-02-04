#!/usr/bin/env python3
"""
修改 popup.js 中的 updateVideosList 函数，对流媒体格式显示特殊界面
"""

import re

# 读取文件
with open('popup.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 updateVideosList 函数并进行替换
old_pattern = r'(function updateVideosList\(\) \{[\s\S]*?const fileName = getFileName\(video\.url, video\.type\);[\s\S]*?)return `[\s\S]*?`'

new_code = r'''\1const urlLower = video.url.toLowerCase();

        // 🔥 检测是否为流媒体格式
        const isStreaming = urlLower.includes('.m3u8') || urlLower.includes('.m3u') ||
                           urlLower.includes('.mpd') || urlLower.includes('.dash') ||
                           urlLower.includes('.ts');

        // 流媒体格式不使用原生播放器
        if (isStreaming) {
          return `
            <div class="video-player-wrapper" data-index="${index}" data-url="${video.url}">
              <div class="streaming-placeholder">
                <div class="placeholder-icon">🎬</div>
                <div class="placeholder-text">流媒体视频</div>
                <div class="streaming-badge">需要下载</div>
              </div>
              <div class="video-filename" title="${video.url}">${fileName}</div>
              <div class="video-actions">
                <button class="btn-icon download" title="下载" data-url="${video.url}">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                </button>
                <button class="btn-icon delete" title="删除" data-index="${index}">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
              </div>
            </div>
          `;
        }

        // 普通视频使用原生播放器
        return `'''

# 执行替换
content = re.sub(old_pattern, new_code, content, count=1)

# 写回文件
with open('popup.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ popup.js 已更新！")
