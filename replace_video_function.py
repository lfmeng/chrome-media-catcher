#!/usr/bin/env python3
"""
替换 popup.js 中的 updateVideosList 函数
"""

# 新的 updateVideosList 函数
NEW_FUNCTION = '''// 🔥 更新视频列表 - 按类型分组展示
function updateVideosList() {
  videoCount.textContent = capturedVideos.length;

  if (capturedVideos.length === 0) {
    videosList.innerHTML = `
      <div class="empty-state">
        <p>点击"开始捕获"按钮开始捕获视频</p>
      </div>
    `;
    renderedVideoUrls.clear();
    return;
  }

  // 🔥 按类型分组
  const groupedVideos = {};
  capturedVideos.forEach((video) => {
    const type = getVideoType(video);
    if (!groupedVideos[type]) {
      groupedVideos[type] = [];
    }
    const originalIndex = capturedVideos.indexOf(video);
    groupedVideos[type].push({ ...video, originalIndex });
  });

  let html = '';
  Object.keys(groupedVideos).sort().forEach(type => {
    const videos = groupedVideos[type];
    const groupId = `video-group-${type.replace(/\\s+/g, '-')}`;

    html += `
      <div class="media-group">
        <div class="group-header">
          <span class="group-title">${type}</span>
          <div class="group-info">
            <span class="group-count">${videos.length} 个</span>
            <svg class="group-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z"/>
            </svg>
          </div>
        </div>
        <div class="media-items-grid media-videos-grid-inner" id="${groupId}">
    `;

    html += videos.map(video => {
      const fileName = getFileName(video.url, video.type);

      // 计算关联信息
      let relatedHtml = '';
      const related = video.relatedAudios || video.relatedVideos;
      if (related && related.length > 0) {
        const relatedType = video.relatedAudios ? '音频' : '视频';
        relatedHtml = '<div style="font-size: 10px; color: #4caf50; padding: 4px; background: #e8f5e9; border-radius: 4px; margin-top: 4px;">🔗 关联 ' + relatedType + ': ' + related.length + ' 个</div>';
      }

      return `
        <div class="grid-item video-item" data-index="${video.originalIndex}" data-url="${video.url}">
          <div class="grid-thumbnail video-thumbnail">
            <video
              class="video-player"
              preload="metadata"
              controls
              controlsList="nodownload"
              playsinline
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E▶%3C/text%3E%3C/svg%3E">
              <source src="${video.url}" type="${video.type || 'video/mp4'}">
              您的浏览器不支持视频播放。
            </video>
            <div class="grid-overlay">
              <button class="btn-icon download" title="下载" data-url="${video.url}">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
              </button>
              <button class="btn-icon delete" title="删除" data-index="${video.originalIndex}">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
              </button>
            </div>
          </div>
          <div class="grid-filename" title="${video.url}">${fileName}${relatedHtml}</div>
        </div>
      `;
    }).join('');

    html += `
        </div>
      </div>
    `;
  });

  videosList.innerHTML = html;

  // 🔥 为每个视频添加错误监听
  const videoItems = videosList.querySelectorAll('.video-item');
  videoItems.forEach(item => {
    const videoElement = item.querySelector('video');
    const videoData = capturedVideos[item.dataset.index];

    if (!videoData) return;

    let hasError = false;
    let hasPlayed = false;
    let deleteTimeout = null;

    const scheduleDelete = (reason) => {
      if (hasError || deleteTimeout) return;

      // 🔥 只对 MP4 格式进行自动删除
      if (!isMP4Video(videoData)) {
        console.log(`ℹ️ 非 MP4 格式，跳过自动删除:`, videoData.url);
        return;
      }

      hasError = true;
      console.warn(`⚠️ 视频异常 (${reason}):`, videoData.url);

      deleteTimeout = setTimeout(() => {
        const indexToDelete = capturedVideos.findIndex(v => v.url === videoData.url);
        if (indexToDelete !== -1) {
          console.log('🗑️ 自动删除无法播放的视频:', videoData.url, `原因: ${reason}`);
          capturedVideos.splice(indexToDelete, 1);
          saveCapturedData();
          updateVideosList();
          showNotification(`已自动删除无法播放的MP4 (${reason})`, 'warning');
        }
      }, 2000);
    };

    videoElement.addEventListener('error', () => scheduleDelete('加载失败'));
    videoElement.addEventListener('stalled', () => {
      if (videoElement.readyState < 3 && !hasPlayed) scheduleDelete('播放停滞');
    });
    videoElement.addEventListener('suspend', () => {
      if (videoElement.readyState < 3 && !hasPlayed) scheduleDelete('加载挂起');
    });
    videoElement.addEventListener('abort', () => scheduleDelete('加载中止'));

    setTimeout(() => {
      if (videoElement.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && !hasPlayed) {
        scheduleDelete('无视频源');
      }
    }, 3000);

    setTimeout(() => {
      if (!hasPlayed && videoElement.readyState < 3 && !hasError) {
        const playPromise = videoElement.play();
        if (playPromise) {
          playPromise.catch(err => {
            console.log('播放失败:', err);
            scheduleDelete('无法播放');
          });
        }
      }
    }, 2000);

    videoElement.addEventListener('playing', () => {
      hasPlayed = true;
      if (deleteTimeout) {
        clearTimeout(deleteTimeout);
        deleteTimeout = null;
      }
    });

    videoElement.addEventListener('canplay', () => {
      if (deleteTimeout && !hasError) {
        clearTimeout(deleteTimeout);
        deleteTimeout = null;
      }
    });

    renderedVideoUrls.add(videoData.url);
  });

  // 🔥 绑定分组展开/折叠事件
  const groupHeaders = videosList.querySelectorAll('.group-header');
  groupHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      const grid = header.nextElementSibling;
      const arrow = header.querySelector('.group-arrow');

      if (grid.style.display === 'none') {
        grid.style.display = 'grid';
        arrow.style.transform = 'rotate(0deg)';
      } else {
        grid.style.display = 'none';
        arrow.style.transform = 'rotate(-90deg)';
      }
    });
  });
}
'''

def main():
    # 读取文件
    with open('popup.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 找到 updateVideosList 函数的起始和结束位置
    start_idx = None
    end_idx = None
    brace_count = 0
    found_start = False

    for i, line in enumerate(lines):
        # 查找函数开始
        if 'function updateVideosList()' in line:
            start_idx = i
            found_start = True
            continue

        # 如果找到了开始，计算大括号
        if found_start:
            brace_count += line.count('{')
            brace_count -= line.count('}')

            # 当大括号回到 0 或更少，表示函数结束
            if brace_count <= 0 and start_idx is not None:
                end_idx = i + 1
                break

    if start_idx is None or end_idx is None:
        print("❌ 未找到 updateVideosList 函数")
        return

    print(f"✅ 找到函数位置: {start_idx} - {end_idx}")

    # 替换函数
    new_lines = lines[:start_idx] + [NEW_FUNCTION + '\n'] + lines[end_idx:]

    # 写回文件
    with open('popup.js', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"✅ 已成功替换 updateVideosList 函数")
    print(f"   原函数长度: {end_idx - start_idx} 行")
    print(f"   新函数长度: {len(NEW_FUNCTION.split(chr(10)))} 行")

if __name__ == '__main__':
    main()
