// 全局状态
let currentTab = 'images';
let isCapturing = false;
let capturedImages = [];
let capturedVideos = [];
let capturedAudios = [];
let selectedImages = new Set(); // 🔥 存储选中的图片索引
let currentImageFilter = 'all'; // 🔥 当前图片类型筛选
let streamGroupHelper = new StreamGroupHelper(); // 🔥 视频流分组助手
let translator = null; // 🔥 翻译器实例

// DOM 元素
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = {
  images: document.getElementById('images-panel'),
  videos: document.getElementById('videos-panel'),
  audios: document.getElementById('audios-panel'),
  translator: document.getElementById('translator-panel')
};
const imageCount = document.getElementById('image-count');
const videoCount = document.getElementById('video-count');
const audioCount = document.getElementById('audio-count');
const imagesList = document.getElementById('images-list');
const videosList = document.getElementById('videos-list');
const audiosList = document.getElementById('audios-list');

// 按钮元素
const captureImagesBtn = document.getElementById('capture-images');
const captureVideosBtn = document.getElementById('capture-videos');
const captureAudiosBtn = document.getElementById('capture-audios');
const downloadAllImagesBtn = document.getElementById('download-all-images');
const downloadAllVideosBtn = document.getElementById('download-all-videos');
const downloadAllAudiosBtn = document.getElementById('download-all-audios');
const clearImagesBtn = document.getElementById('clear-images');
const clearVideosBtn = document.getElementById('clear-videos');
const clearAudiosBtn = document.getElementById('clear-audios');

// 🔥 新增按钮和筛选器
const imageTypeFilter = document.getElementById('image-type-filter');
const downloadSelectedImagesBtn = document.getElementById('download-selected-images');
const deleteSelectedImagesBtn = document.getElementById('delete-selected-images');

// 🔥 翻译工具元素
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const swapLangsBtn = document.getElementById('swap-langs');
const sourceText = document.getElementById('source-text');
const translationResult = document.getElementById('translation-result');
const translateBtn = document.getElementById('translate-btn');
const copyBtn = document.getElementById('copy-btn');
const charCount = document.getElementById('char-count');

// 初始化
function init() {
  // 🔥 初始化翻译器
  if (typeof Translator !== 'undefined') {
    translator = new Translator();
  }

  setupEventListeners();
  loadCapturedData();
  checkCaptureStatus(); // 🔥 检查当前捕获状态
}

// 🔥 检查当前标签页的捕获状态
function checkCaptureStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      // 向 content script 查询当前状态
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'getCaptureStatus' },
        (response) => {
          if (!chrome.runtime.lastError && response) {
            // 如果已经在捕获，更新UI
            if (response.isCapturingImages) {
              captureImagesBtn.textContent = '停止捕获';
              captureImagesBtn.classList.add('capturing');
            }
            if (response.isCapturingVideos) {
              captureVideosBtn.textContent = '停止捕获';
              captureVideosBtn.classList.add('capturing');
            }
            if (response.isCapturingAudios) {
              captureAudiosBtn.textContent = '停止捕获';
              captureAudiosBtn.classList.add('capturing');
            }
          }
        }
      );
    }
  });
}

// 设置事件监听
function setupEventListeners() {
  // Tab 切换
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
    });
  });

  // 捕获按钮
  captureImagesBtn.addEventListener('click', () => toggleCapture('images'));
  captureVideosBtn.addEventListener('click', () => toggleCapture('videos'));
  captureAudiosBtn.addEventListener('click', () => toggleCapture('audios'));

  // 下载全部按钮
  downloadAllImagesBtn.addEventListener('click', () => downloadAll('images'));
  downloadAllVideosBtn.addEventListener('click', () => downloadAll('videos'));
  downloadAllAudiosBtn.addEventListener('click', () => downloadAll('audios'));

  // 清空按钮
  clearImagesBtn.addEventListener('click', () => clearList('images'));
  clearVideosBtn.addEventListener('click', () => clearList('videos'));
  clearAudiosBtn.addEventListener('click', () => clearList('audios'));

  // 🔥 新增：图片类型筛选
  imageTypeFilter.addEventListener('change', (e) => {
    currentImageFilter = e.target.value;
    updateImagesList();
  });

  // 🔥 新增：批量下载选中图片
  downloadSelectedImagesBtn.addEventListener('click', () => {
    console.log('下载选中按钮被点击');
    downloadSelectedImages();
  });

  // 🔥 新增：批量删除选中图片
  deleteSelectedImagesBtn.addEventListener('click', () => {
    console.log('删除选中按钮被点击');
    deleteSelectedImages();
  });

  // 🔥 事件委托处理列表点击（适配九宫格布局和分组展开）
  imagesList.addEventListener('click', (e) => {
    // 处理分组标题点击
    const header = e.target.closest('.group-header');
    if (header) {
      const grid = header.nextElementSibling;
      const arrow = header.querySelector('.group-arrow');

      if (grid.style.display === 'none') {
        grid.style.display = 'grid';
        arrow.style.transform = 'rotate(0deg)';
      } else {
        grid.style.display = 'none';
        arrow.style.transform = 'rotate(-90deg)';
      }
      return;
    }

    const btn = e.target.closest('.btn-icon');
    if (!btn) return;

    // 九宫格布局
    if (btn.classList.contains('preview')) {
      const url = btn.dataset.url;
      if (url) {
        previewMedia(url);
      }
    } else if (btn.classList.contains('download')) {
      const url = btn.dataset.url;
      const index = parseInt(btn.closest('.grid-item').dataset.index);
      if (url) {
        downloadMedia(url, index, 'image');
      }
    } else if (btn.classList.contains('delete')) {
      const index = parseInt(btn.dataset.index);
      deleteMedia(index, 'image');
    }
  });

  videosList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-icon');
    if (!btn) return;

    const item = btn.closest('.video-player-wrapper');
    const index = parseInt(item.dataset.index);

    if (btn.classList.contains('download')) {
      const url = btn.dataset.url;
      downloadMedia(url, index, 'video');
    } else if (btn.classList.contains('delete')) {
      deleteVideo(index);
    }
  });

  audiosList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-icon');
    if (!btn) return;

    const item = btn.closest('.media-item');
    const index = parseInt(item.dataset.index);

    if (btn.classList.contains('download')) {
      const url = item.querySelector('.media-url').textContent;
      downloadMedia(url, index, 'audio');
    } else if (btn.classList.contains('delete')) {
      deleteMedia(index, 'audio');
    }
  });

  // 🔥 翻译工具事件监听器
  if (sourceText && translateBtn) {
    // 输入框字符计数
    sourceText.addEventListener('input', () => {
      const count = sourceText.value.length;
      charCount.textContent = `${count} 字符`;

      // 启用/禁用翻译按钮
      translateBtn.disabled = count === 0;
    });

    // 翻译按钮
    translateBtn.addEventListener('click', handleTranslate);

    // 交换语言按钮
    swapLangsBtn.addEventListener('click', () => {
      const sourceValue = sourceLangSelect.value;
      const targetValue = targetLangSelect.value;

      // 如果源语言是自动检测，则不能交换
      if (sourceValue === 'auto') {
        alert('自动检测语言无法交换，请先选择具体语言');
        return;
      }

      sourceLangSelect.value = targetValue;
      targetLangSelect.value = sourceValue;
    });

    // 复制按钮
    copyBtn.addEventListener('click', handleCopyTranslation);
  }
}

// 切换 Tab
function switchTab(tab) {
  currentTab = tab;

  // 更新按钮状态
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // 更新面板显示
  Object.keys(tabPanels).forEach(key => {
    tabPanels[key].classList.toggle('active', key === tab);
  });
}

// 切换捕获状态
function toggleCapture(type) {
  const button = type === 'images' ? captureImagesBtn :
                  type === 'videos' ? captureVideosBtn : captureAudiosBtn;

  // 检查当前按钮状态
  const isCurrentlyCapturing = button.classList.contains('capturing');

  if (isCurrentlyCapturing) {
    // 停止捕获
    button.textContent = '开始捕获';
    button.classList.remove('capturing');
    stopCapture(type);
  } else {
    // 开始捕获
    button.textContent = '停止捕获';
    button.classList.add('capturing');
    startCapture(type);
  }
}

// 开始捕获
function startCapture(type) {
  // 向当前标签页注入内容脚本
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      console.log(`🎯 开始捕获 ${type}...`);
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'startCapture',
          type: type
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息失败:', chrome.runtime.lastError);
          } else {
            console.log(`✅ 开始捕获 ${type} 成功`);
          }
        }
      );
    }
  });
}

// 停止捕获
function stopCapture(type) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      console.log(`⏹ 停止捕获 ${type}...`);
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'stopCapture',
          type: type
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息失败:', chrome.runtime.lastError);
          } else {
            console.log(`✅ 停止捕获 ${type} 成功`);
          }
        }
      );
    }
  });
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capturedMedia') {
    const { type, media } = message;

    if (type === 'image') {
      // 🔥 检查是否重复
      const isDuplicate = capturedImages.some(img => img.url === media.url);
      if (!isDuplicate) {
        // 🔥 过滤掉 JavaScript bundle 文件和其他非图片内容
        const urlLower = media.url.toLowerCase();

        // 🔥 JavaScript bundle 模式检测
        const jsBundlePatterns = [
          '~loader.',     // webpack loader pattern
          'bundle.',      // bundle pattern
          'chunk.',       // chunk pattern
          '.js.',         // .js.jpg 这种情况
          'vendor.',      // vendor chunk
          'runtime.',     // runtime chunk
          'main.',        // main chunk
          'index.',       // index chunk
          'app.',         // app chunk
          'common.',      // common chunk
          'shared.'       // shared chunk
        ];

        const isJsBundle = jsBundlePatterns.some(pattern => urlLower.includes(pattern));

        // 🔥 完整的视频扩展名列表
        const videoExtensions = [
          '.mp4', '.webm', '.ogg', '.ogv', '.avi', '.mov', '.wmv', '.flv',
          '.m4v', '.mkv', '.3gp', '.3g2', '.f4v', '.mpd', '.dash',
          '.m3u8', '.m3u', '.ts', '.rm', '.rmvb', '.asf', '.vob', '.drc',
          '.mng', '.qt', '.yuv', '.amv', '.m4p', '.mpg', '.mpeg', '.mpe',
          '.mpv', '.m2v', '.svi', '.mxf', '.roq', '.nsv', '.f4p', '.f4a', '.f4b'
        ];

        // 🔥 完整的非图片文件扩展名列表
        const nonImageExtensions = [
          '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass', '.less',
          '.html', '.htm', '.xhtml', '.json', '.xml', '.woff', '.woff2',
          '.ttf', '.eot', '.otf', '.pdf', '.zip', '.rar', '.tar', '.gz',
          '.map', '.txt', '.md', '.exe', '.dmg', '.apk', '.swf', '.svg'
        ];

        // 🔥 检查 Content-Type 是否为视频
        const contentType = (media.type || '').toLowerCase();
        const isVideoContentType = contentType.startsWith('video/');

        const isVideo = videoExtensions.some(ext => urlLower.includes(ext)) || isVideoContentType;
        const isNonImage = nonImageExtensions.some(ext => urlLower.includes(ext)) || isJsBundle;

        if (!isVideo && !isNonImage) {
          capturedImages.push(media);
          updateImagesList();
          saveCapturedData();
        } else {
          console.log('🚫 过滤掉非图片内容:', media.url, 'isVideo:', isVideo, 'isNonImage:', isNonImage, 'isJsBundle:', isJsBundle);
        }
      }
    } else if (type === 'audio') {
      // 🔥 检查是否重复
      const isDuplicate = capturedAudios.some(aud => aud.url === media.url);
      if (!isDuplicate) {
        // 🔥 添加到视频流分组
        streamGroupHelper.addToGroup(media.url, 'audio');
        
        // 🔥 分析流信息
        const streamInfo = streamGroupHelper.analyzeStreamComposition(media.url, 'audio');
        media.streamInfo = streamInfo;

        // 查找相关的视频
        const relatedVideos = streamGroupHelper.findRelatedVideo(media.url, capturedVideos.map(v => v.url));
        if (relatedVideos.length > 0) {
          media.relatedVideos = relatedVideos;
          console.log(`🔗 音频关联到 ${relatedVideos.length} 个视频:`, media.url);
        }

        capturedAudios.push(media);
        updateAudiosList();
        saveCapturedData();
      }
    } else if (type === 'video') {
      // 🔥 检查是否重复
      const isDuplicate = capturedVideos.some(vid => vid.url === media.url);
      if (!isDuplicate) {
        // 🔥 过滤掉 JavaScript bundle 文件
        const urlLower = media.url.toLowerCase();
        const jsBundlePatterns = [
          '~loader.', 'bundle.', 'chunk.', '.js.',
          'vendor.', 'runtime.', 'main.', 'index.',
          'app.', 'common.', 'shared.'
        ];
        const isJsBundle = jsBundlePatterns.some(pattern => urlLower.includes(pattern));

        if (!isJsBundle) {
          // 🔥 添加到视频流分组
          streamGroupHelper.addToGroup(media.url, 'video');
          
          // 🔥 分析流信息
          const streamInfo = streamGroupHelper.analyzeStreamComposition(media.url, 'video');
          media.streamInfo = streamInfo;

          // 查找相关的音频
          const relatedAudios = streamGroupHelper.findRelatedAudio(media.url, capturedAudios.map(a => a.url));
          if (relatedAudios.length > 0) {
            media.relatedAudios = relatedAudios;
            console.log(`🔗 视频关联到 ${relatedAudios.length} 个音频:`, media.url);
          }

          capturedVideos.push(media);
          updateVideosList();
          saveCapturedData();
        } else {
          console.log('🚫 过滤掉 JavaScript bundle (视频):', media.url);
        }
      }
    }
  } else if (message.action === 'autoCaptureStarted') {
    // 🔥 自动捕获已启动，更新UI状态
    console.log('🚀 自动捕获已启动:', message);

    if (message.images) {
      captureImagesBtn.textContent = '停止捕获';
      captureImagesBtn.classList.add('capturing');
    }

    if (message.videos) {
      captureVideosBtn.textContent = '停止捕获';
      captureVideosBtn.classList.add('capturing');
    }

    if (message.audios) {
      captureAudiosBtn.textContent = '停止捕获';
      captureAudiosBtn.classList.add('capturing');
    }
  }
});

// 🔥 获取图片类型（用于分组显示）
function getImageType(img) {
  const url = img.url.toLowerCase();
  const type = img.type || '';

  if (url.includes('.jpg') || url.includes('.jpeg') || type.includes('jpeg')) {
    return 'JPG';
  } else if (url.includes('.png') || type.includes('png')) {
    return 'PNG';
  } else if (url.includes('.gif') || type.includes('gif')) {
    return 'GIF';
  } else if (url.includes('.webp') || type.includes('webp')) {
    return 'WEBP';
  } else if (url.includes('.svg') || type.includes('svg')) {
    return 'SVG';
  } else if (url.includes('.bmp') || type.includes('bmp')) {
    return 'BMP';
  } else if (url.includes('.ico') || type.includes('icon')) {
    return 'ICO';
  } else {
    return '其他';
  }
}

// 🔥 获取视频类型（用于分组显示）
function getVideoType(video) {
  const url = video.url.toLowerCase();
  const type = video.type || '';

  if (url.includes('.mp4') || type.includes('mp4')) {
    return 'MP4';
  } else if (url.includes('.webm') || type.includes('webm')) {
    return 'WEBM';
  } else if (url.includes('.m3u8') || url.includes('.m3u') || type.includes('mpegurl')) {
    return 'HLS (M3U8)';
  } else if (url.includes('.mpd') || type.includes('dash')) {
    return 'DASH (MPD)';
  } else if (url.includes('.ts') || type.includes('mpegts')) {
    return 'MPEG-TS';
  } else if (url.includes('.ogg') || url.includes('.ogv') || type.includes('ogg')) {
    return 'OGG';
  } else if (url.includes('.avi') || type.includes('avi')) {
    return 'AVI';
  } else if (url.includes('.mov') || type.includes('quicktime')) {
    return 'MOV';
  } else if (url.includes('.mkv') || type.includes('matroska')) {
    return 'MKV';
  } else {
    return '其他';
  }
}

// 🔥 判断是否为 MP4 格式（用于自动删除）
function isMP4Video(video) {
  const url = video.url.toLowerCase();
  const type = (video.type || '').toLowerCase();

  return url.includes('.mp4') ||
         type.includes('mp4') ||
         type === 'video/mp4';
}

// 🔥 从URL提取文件名，并添加正确的扩展名
function getFileName(url, mimeType = null) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let fileName = pathname.substring(pathname.lastIndexOf('/') + 1);

    // 移除查询参数
    const lastQuestion = fileName.lastIndexOf('?');
    if (lastQuestion > 0) {
      fileName = fileName.substring(0, lastQuestion);
    }

    // 如果文件名为空或没有扩展名，根据 MIME 类型添加
    if (!fileName || fileName.indexOf('.') === -1) {
      fileName = 'image';
    }

    // 检查是否已有扩展名
    const hasExtension = /\.[a-z0-9]{3,5}$/i.test(fileName);

    if (!hasExtension && mimeType) {
      // 根据 MIME 类型添加扩展名
      const ext = getExtensionFromMimeType(mimeType);
      if (ext) {
        fileName += ext;
      }
    }

    return fileName || 'image.jpg';
  } catch (e) {
    // 如果URL解析失败，尝试直接提取
    const lastSlash = url.lastIndexOf('/');
    const lastQuestion = url.lastIndexOf('?');
    let fileName = url.substring(lastSlash + 1);
    if (lastQuestion > lastSlash) {
      fileName = fileName.substring(0, lastQuestion - lastSlash - 1);
    }

    if (!fileName || fileName.indexOf('.') === -1) {
      fileName = 'image';
      if (mimeType) {
        const ext = getExtensionFromMimeType(mimeType);
        if (ext) {
          fileName += ext;
        }
      }
    }

    return fileName || 'image.jpg';
  }
}

// 🔥 根据 MIME 类型获取文件扩展名
function getExtensionFromMimeType(mimeType) {
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/x-icon': '.ico',
    'image/ico': '.ico',
    'image/avif': '.avif',
    'image/tiff': '.tiff',
    'image/heif': '.heif',
    'image/heic': '.heic',
    'image/jxl': '.jxl'
  };

  return mimeMap[mimeType.toLowerCase()] || '.jpg';
}

// 更新图片列表 - 九宫格布局
function updateImagesList() {
  imageCount.textContent = capturedImages.length;

  if (capturedImages.length === 0) {
    imagesList.innerHTML = `
      <div class="empty-state">
        <p>点击"开始捕获"按钮开始捕获图片</p>
      </div>
    `;
    return;
  }

  // 🔥 根据筛选器过滤图片
  const filteredImages = capturedImages.filter((img, index) => {
    if (currentImageFilter === 'all') return true;
    const type = getImageType(img);
    return type.toLowerCase() === currentImageFilter.toLowerCase();
  });

  if (filteredImages.length === 0) {
    imagesList.innerHTML = `
      <div class="empty-state">
        <p>没有找到该类型的图片</p>
      </div>
    `;
    return;
  }

  // 🔥 按类型分组
  const groupedImages = {};
  filteredImages.forEach((img) => {
    const type = getImageType(img);
    if (!groupedImages[type]) {
      groupedImages[type] = [];
    }
    // 保存原始索引用于批量操作
    const originalIndex = capturedImages.indexOf(img);
    groupedImages[type].push({ ...img, originalIndex });
  });

  // 🔥 添加全选复选框
  let html = `
    <div class="select-all-container">
      <input type="checkbox" id="select-all-images" class="select-all-checkbox">
      <label for="select-all-images" class="select-all-label">全选当前列表</label>
      <span style="margin-left: auto; font-size: 12px; color: #999;">
        已选中: <span id="selected-count">0</span> / ${filteredImages.length}
      </span>
    </div>
  `;

  // 🔥 生成分组显示的HTML
  Object.keys(groupedImages).sort().forEach(type => {
    const images = groupedImages[type];
    const groupId = `group-${type}`;

    html += `
      <div class="media-group">
        <div class="group-header">
          <span class="group-title">${type}</span>
          <div class="group-info">
            <span class="group-count">${images.length} 张</span>
            <svg class="group-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z"/>
            </svg>
          </div>
        </div>
        <div class="media-items-grid" id="${groupId}">
    `;

    html += images.map(img => {
      const fileName = getFileName(img.url, img.type);
      const isSelected = selectedImages.has(img.originalIndex);
      return `
        <div class="grid-item" data-index="${img.originalIndex}">
          <input type="checkbox"
                 class="grid-checkbox"
                 data-index="${img.originalIndex}"
                 ${isSelected ? 'checked' : ''}>
          <label class="grid-checkbox-label"></label>
          <div class="grid-thumbnail">
            <img src="${img.url}" alt="${fileName}" onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'>📷</div>'">
            <div class="grid-overlay">
              <button class="btn-icon preview" title="预览" data-url="${img.url}">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/></svg>
              </button>
              <button class="btn-icon download" title="下载" data-url="${img.url}">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
              </button>
              <button class="btn-icon delete" title="删除" data-index="${img.originalIndex}">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
              </button>
            </div>
          </div>
          <div class="grid-filename" title="${img.url}">${fileName}</div>
        </div>
      `;
    }).join('');

    html += `
        </div>
      </div>
    `;
  });

  imagesList.innerHTML = html;

  // 🔥 绑定复选框事件
  const selectAllCheckbox = document.getElementById('select-all-images');
  const selectedCountSpan = document.getElementById('selected-count');
  const checkboxes = imagesList.querySelectorAll('.grid-checkbox');

  // 全选/取消全选
  selectAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    checkboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
      const index = parseInt(checkbox.dataset.index);
      if (isChecked) {
        selectedImages.add(index);
      } else {
        selectedImages.delete(index);
      }
    });
    updateSelectedCount();
  });

  // 单个复选框
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      if (e.target.checked) {
        selectedImages.add(index);
      } else {
        selectedImages.delete(index);
      }
      updateSelectedCount();

      // 更新全选复选框状态
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      selectAllCheckbox.checked = allChecked && checkboxes.length > 0;
    });
  });

  function updateSelectedCount() {
    selectedCountSpan.textContent = selectedImages.size;
  }
}

// 🔥 记录当前已渲染的视频 URL（用于增量更新）
let renderedVideoUrls = new Set();

// 🔥 更新视频列表 - 增量更新，避免重渲染导致播放中断
function updateVideosList() {
  videoCount.textContent = capturedVideos.length;

  // 创建或获取视频网格容器
  let grid = videosList.querySelector('.media-videos-grid');

  if (capturedVideos.length === 0) {
    videosList.innerHTML = `
      <div class="empty-state">
        <p>点击"开始捕获"按钮开始捕获视频</p>
      </div>
    `;
    renderedVideoUrls.clear();
    return;
  }

  // 如果网格容器不存在，创建它
  if (!grid) {
    videosList.innerHTML = '<div class="media-videos-grid"></div>';
    grid = videosList.querySelector('.media-videos-grid');
  }

  // 🔥 增量更新：只添加新视频，保留旧视频的播放状态
  const currentUrls = new Set(capturedVideos.map(v => v.url));

  // 移除已删除的视频
  const wrappers = grid.querySelectorAll('.video-player-wrapper');
  wrappers.forEach(wrapper => {
    const url = wrapper.dataset.url;
    if (!currentUrls.has(url)) {
      wrapper.remove();
      renderedVideoUrls.delete(url);
    }
  });

  // 添加新视频
  capturedVideos.forEach((video, index) => {
    // 如果这个视频已经渲染过，跳过（保留播放状态）
    if (renderedVideoUrls.has(video.url)) {
      // 更新索引（确保删除按钮正确）
      const existingWrapper = grid.querySelector(`[data-url="${CSS.escape(video.url)}"]`);
      if (existingWrapper) {
        existingWrapper.dataset.index = index;
        const deleteBtn = existingWrapper.querySelector('.delete');
        if (deleteBtn) {
          deleteBtn.dataset.index = index;
        }
      }
      return;
    }

    // 创建新的视频元素
    const fileName = getFileName(video.url, video.type);

    // 计算关联信息
    let relatedHtml = '';
    const related = video.relatedAudios || video.relatedVideos;
    if (related && related.length > 0) {
      const relatedType = video.relatedAudios ? '音频' : '视频';
      relatedHtml = '<div style="font-size: 10px; color: #4caf50; padding: 4px; background: #e8f5e9; border-radius: 4px; margin-top: 4px;">🔗 关联 ' + relatedType + ': ' + related.length + ' 个</div>';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'video-player-wrapper';
    wrapper.dataset.index = index;
    wrapper.dataset.url = video.url;

    wrapper.innerHTML = `
      <video
        class="video-player"
        preload="auto"
        controls
        controlsList="nodownload"
        playsinline
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E▶%3C/text%3E%3C/svg%3E">
        <source src="${video.url}" type="${video.type || 'video/mp4'}">
        您的浏览器不支持视频播放。
      </video>
      <div class="video-filename" title="${video.url}">${fileName}${relatedHtml}</div>
      <div class="video-actions">
        <button class="btn-icon download" title="下载" data-url="${video.url}">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        </button>
        <button class="btn-icon delete" title="删除" data-index="${index}">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
        </button>
      </div>
    `;

    grid.appendChild(wrapper);
    renderedVideoUrls.add(video.url);

    // 🔥 为新视频添加多种错误检测
    const videoElement = wrapper.querySelector('video');
    let hasError = false;
    let hasPlayed = false;
    let deleteTimeout = null;

    const scheduleDelete = (reason) => {
      if (hasError || deleteTimeout) return; // 避免重复删除

      // 🔥 只对 MP4 格式进行自动删除
      if (!isMP4Video(video)) {
        console.log(`ℹ️ 非 MP4 格式，跳过自动删除:`, video.url);
        return;
      }

      hasError = true;
      console.warn(`⚠️ 视频异常 (${reason}):`, video.url);

      // 延迟删除，给用户看一眼错误提示
      deleteTimeout = setTimeout(() => {
        const indexToDelete = capturedVideos.findIndex(v => v.url === video.url);
        if (indexToDelete !== -1) {
          console.log('🗑️ 自动删除无法播放的视频:', video.url, `原因: ${reason}`);
          capturedVideos.splice(indexToDelete, 1);
          renderedVideoUrls.delete(video.url);
          saveCapturedData();
          updateVideosList();
          showNotification(`已自动删除无法播放的MP4 (${reason})`, 'warning');
        }
      }, 2000); // 2秒后删除
    };

    // 1. 监听加载失败
    videoElement.addEventListener('error', (e) => {
      scheduleDelete('加载失败');
    });

    // 2. 监听播放停滞（数据加载停滞）
    videoElement.addEventListener('stalled', (e) => {
      if (videoElement.readyState < 3 && !hasPlayed) {
        scheduleDelete('播放停滞');
      }
    });

    // 3. 监听加载挂起
    videoElement.addEventListener('suspend', (e) => {
      if (videoElement.readyState < 3 && !hasPlayed) {
        scheduleDelete('加载挂起');
      }
    });

    // 4. 监听 abort（加载被中止）
    videoElement.addEventListener('abort', (e) => {
      scheduleDelete('加载中止');
    });

    // 5. 检测网络状态异常
    const originalNetworkState = videoElement.networkState;
    setTimeout(() => {
      if (videoElement.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && !hasPlayed) {
        scheduleDelete('无视频源');
      }
    }, 3000);

    // 6. 检测是否能播放（超时检测）
    setTimeout(() => {
      if (!hasPlayed && videoElement.readyState < 3 && !hasError) {
        // 尝试播放
        const playPromise = videoElement.play();
        if (playPromise) {
          playPromise.catch(err => {
            console.log('播放失败:', err);
            scheduleDelete('无法播放');
          });
        }
      }
    }, 2000);

    // 7. 监听播放成功（标记为可播放）
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
  });
}

// 🔥 显示通知提示
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'warning' ? '#ff9800' : '#4caf50'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
    font-size: 13px;
  `;

  document.body.appendChild(notification);

  // 3秒后自动消失
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 删除视频
function deleteVideo(index) {
  capturedVideos.splice(index, 1);
  updateVideosList();
  saveCapturedData();
}
function updateAudiosList() {
  audioCount.textContent = capturedAudios.length;

  if (capturedAudios.length === 0) {
    audiosList.innerHTML = `
      <div class="empty-state">
        <p>点击"开始捕获"按钮开始捕获音频</p>
      </div>
    `;
    return;
  }

  audiosList.innerHTML = capturedAudios.map((audio, index) => `
    <div class="media-item" data-index="${index}">
      <div class="media-thumbnail">
        <div class="placeholder">🎵</div>
      </div>
      <div class="media-info">
        <div class="media-url">${audio.url}</div>
        <div class="media-size">${audio.size || '未知大小'}</div>
        <span class="media-type">${audio.type || 'audio'}</span>
      </div>
      <div class="media-actions">
        <button class="btn-icon download" title="下载">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        </button>
        <button class="btn-icon delete" title="删除">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// 预览媒体
function previewMedia(url) {
  window.open(url, '_blank');
}

// 🔥 打开视频模态框
function openVideoModal(videoUrl, videoType) {
  const modal = document.getElementById('videoModal');
  const videoPlayer = document.getElementById('videoPlayer');
  const videoSource = document.getElementById('videoSource');
  const videoInfo = document.getElementById('videoInfo');

  // 设置视频源
  videoSource.src = videoUrl;
  videoSource.type = videoType || 'video/mp4';

  // 显示视频信息
  videoInfo.innerHTML = `
    <p><strong>视频地址:</strong> ${videoUrl}</p>
    <p><strong>视频类型:</strong> ${videoType || 'video/mp4'}</p>
  `;

  // 显示模态框
  modal.classList.add('active');

  // 加载并播放视频
  videoPlayer.load();
  videoPlayer.play().catch(err => {
    console.log('自动播放失败，可能需要用户交互:', err);
  });

  // 阻止事件冒泡
  modal.querySelector('.modal-content').addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// 🔥 关闭视频模态框
function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const videoPlayer = document.getElementById('videoPlayer');

  // 暂停视频
  videoPlayer.pause();
  videoPlayer.currentTime = 0;

  // 隐藏模态框
  modal.classList.remove('active');
}

// 🔥 监听 ESC 键关闭模态框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('videoModal');
    if (modal.classList.contains('active')) {
      closeVideoModal();
    }
  }
});

// 下载单个媒体
async function downloadMedia(url, index, type) {
  console.log('🔄 开始下载:', { url, type });

  // 🔥 如果是视频，检查是否为流媒体格式
  if (type === 'video') {
    const downloader = new StreamVideoDownloader();
    const streamType = downloader.detectStreamType(url);

    console.log('🔍 视频类型检测结果:', streamType);
    console.log('🔍 是否为流媒体:', downloader.isStreamUrl(url));

    if (downloader.isStreamUrl(url)) {
      console.log('🎬 检测到流媒体视频，开始处理:', url);

      // 显示进度提示
      const progress = document.getElementById('downloadProgress');
      const progressText = document.getElementById('progressText');
      const progressFill = document.getElementById('progressFill');

      progress.classList.add('active');
      progressText.textContent = '正在检测视频格式...';
      progressFill.style.width = '0%';

      try {
        // 🔥 获取当前标签页的 Cookie 和 User-Agent
        const currentTab = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs[0]);
          });
        });

        if (!currentTab) {
          throw new Error('无法获取当前标签页信息');
        }

        console.log('📍 当前标签页:', currentTab.url);

        // 🔥 通过 background script 获取 Cookie（因为 popup 可能没有 cookies 权限）
        const cookies = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: 'getCookies',
              url: currentTab.url
            },
            (response) => {
              resolve(response?.cookies || []);
            }
          );
        });

        // 转换 Cookie 为格式字符串
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('🍪 获取到 Cookie 数量:', cookies.length);

        // 下载并处理流媒体（传递 Cookie 和 UA）
        const result = await downloader.download(url, ({ type: msgType, percent, message }) => {
          console.log(`📊 [${msgType}]`, message);

          if (msgType === 'progress') {
            progressText.textContent = `${message} (${percent}%)`;
            progressFill.style.width = `${percent}%`;
          } else if (msgType === 'info') {
            progressText.textContent = message;
          }
        }, {
          cookie: cookieString,
          userAgent: navigator.userAgent,
          referer: currentTab.url
        });

        console.log('✅ 下载完成:', result);

        if (result.success) {
          progressText.textContent = '下载完成！';

          // 触发浏览器下载
          downloader.triggerDownload(result.blob, result.filename);

          // 🔥 显示成功信息
          if (result.conversionTip) {
            setTimeout(() => {
              alert(`⚠️ FFmpeg转换失败，已下载原始文件\n\n${result.conversionTip}\n\n提示：请确保已安装 FFmpeg 和 Native Host。\n运行: cd native_host && ./install.sh`);
            }, 500);
          } else if (result.isZip) {
            setTimeout(() => {
              alert('⚠️ FFmpeg不可用，已下载ZIP文件\n\nZIP文件包含：\n- m3u8播放列表\n- 所有TS视频分片\n- README说明文档\n\n请安装 FFmpeg 以自动转换为 MP4。\n运行: cd native_host && ./install.sh');
            }, 500);
          } else {
            // ✅ 成功转换为 MP4
            setTimeout(() => {
              console.log('✅ 已成功下载 MP4 文件:', result.filename);
            }, 500);
          }

          // 延迟关闭进度提示
          setTimeout(() => {
            progress.classList.remove('active');
          }, 3000);
        }

      } catch (error) {
        console.error('❌ 流媒体下载失败:', error);
        console.error('❌ 错误堆栈:', error.stack);

        const errorMsg = error.message || '未知错误';
        alert(`❌ 流媒体下载失败！\n\n错误信息: ${errorMsg}\n\n可能的原因：\n1. Native Host 未安装\n2. FFmpeg 未安装\n3. 网络连接问题\n\n解决方案：\ncd native_host\n./install.sh\n\n将尝试使用浏览器直接下载。`);

        // 降级方案：使用浏览器直接下载
        progress.classList.remove('active');
        chrome.downloads.download({
          url: url,
          saveAs: true
        });
      }

      return;
    } else {
      console.log('ℹ️ 非流媒体视频，使用浏览器直接下载');
    }
  }

  // 非流媒体或非视频，使用浏览器直接下载
  console.log('📥 使用浏览器直接下载:', url);

  // 🔥 查找媒体对象的请求头信息
  const mediaItem = [...capturedImages, ...capturedVideos, ...capturedAudios].find(m => m.url === url);
  const requestHeaders = mediaItem?.requestHeaders;

  if (requestHeaders) {
    console.log('🔐 使用保存的请求头下载:', requestHeaders.referer);

    // 🔥 使用fetch下载（带上请求头），然后触发浏览器下载
    try {
      const response = await fetch(url, {
        headers: {
          'Referer': requestHeaders.referer || '',
          'User-Agent': requestHeaders.userAgent || navigator.userAgent,
          'Cookie': requestHeaders.cookie || ''
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // 从URL中提取文件名
      const fileName = extractFileName(url);

      // 触发下载
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();

      // 清理blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      console.log('✅ 下载完成（带请求头）');
    } catch (error) {
      console.error('❌ 使用请求头下载失败:', error);
      console.log('🔄 降级到普通下载');

      // 降级方案：使用chrome.downloads.download（不支持请求头）
      chrome.downloads.download({
        url: url,
        saveAs: true
      });
    }
  } else {
    console.log('ℹ️ 没有请求头信息，使用普通下载');
    chrome.downloads.download({
      url: url,
      saveAs: true
    });
  }
}

// 🔥 从URL中提取文件名的辅助函数
function extractFileName(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 提取文件名
    let fileName = pathname.split('/').pop();

    // 如果没有扩展名，根据URL或其他信息添加扩展名
    if (fileName && !fileName.includes('.')) {
      // 可能是Twitter格式（如?format=jpg）
      const urlParams = new URLSearchParams(urlObj.search);
      const format = urlParams.get('format');
      if (format) {
        fileName += '.' + format;
      } else {
        // 默认扩展名
        fileName = 'download';
      }
    }

    // 如果文件名为空，使用默认名称
    if (!fileName) {
      const timestamp = Date.now();
      fileName = `download_${timestamp}`;
    }

    return fileName;
  } catch (e) {
    console.error('❌ 解析URL失败:', e);
    return `download_${Date.now()}`;
  }
}

// 下载全部 - 🔥 打包成 ZIP
async function downloadAll(type) {
  const items = type === 'images' ? capturedImages :
                  type === 'videos' ? capturedVideos : capturedAudios;

  if (items.length === 0) {
    alert('没有可下载的媒体文件');
    return;
  }

  // 显示进度提示
  const progress = document.getElementById('downloadProgress');
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');

  progress.classList.add('active');

  try {
    // 创建 ZIP 对象
    const zip = new JSZip();
    const folderName = type === 'images' ? 'images' :
                      type === 'videos' ? 'videos' : 'audios';
    const folder = zip.folder(folderName);

    // 下载所有文件
    const total = items.length;
    for (let i = 0; i < total; i++) {
      const item = items[i];
      const progressPercent = Math.round(((i + 1) / total) * 100);

      // 更新进度
      progressText.textContent = `正在下载 ${i + 1}/${total} 个文件...`;
      progressFill.style.width = `${progressPercent}%`;

      try {
        let blob;
        let fileName = getFileName(item.url, item.type);

        // 🔥 如果是视频，检查是否为流媒体格式
        if (type === 'videos') {
          const downloader = new StreamVideoDownloader();

          if (downloader.isStreamUrl(item.url)) {
            console.log(`🎬 [${i + 1}/${total}] 检测到流媒体:`, item.url);
            progressText.textContent = `正在处理第 ${i + 1}/${total} 个视频...`;

            try {
              // 下载并处理流媒体
              const result = await downloader.download(item.url, ({ type, percent, message }) => {
              console.log(`  [${type}] ${message}`);
            });

              if (result.success) {
                blob = result.blob;
                fileName = result.filename;
                console.log(`✅ [${i + 1}/${total}] 处理成功:`, fileName);
              }
            } catch (convertError) {
              console.error(`❌ [${i + 1}/${total}] 处理失败:`, convertError);
              // 处理失败，跳过此文件
              throw convertError;
            }
          } else {
            // 非流媒体，直接下载
            const response = await fetch(item.url);
            blob = await response.blob();
          }
        } else {
          // 非视频，直接下载
          // 🔥 使用保存的请求头信息
          const requestHeaders = item.requestHeaders;
          const fetchOptions = {};

          if (requestHeaders) {
            fetchOptions.headers = {
              'Referer': requestHeaders.referer || '',
              'User-Agent': requestHeaders.userAgent || navigator.userAgent,
              'Cookie': requestHeaders.cookie || ''
            };
            console.log(`🔐 [${i + 1}/${total}] 使用请求头下载:`, requestHeaders.referer);
          }

          const response = await fetch(item.url, fetchOptions);
          blob = await response.blob();
        }

        // 添加序号避免重名
        if (!fileName.includes(`_${i + 1}.`)) {
          const extIndex = fileName.lastIndexOf('.');
          if (extIndex > 0) {
            const name = fileName.substring(0, extIndex);
            const ext = fileName.substring(extIndex);
            fileName = `${name}_${i + 1}${ext}`;
          } else {
            fileName = `${fileName}_${i + 1}`;
          }
        }

        // 添加到 ZIP
        folder.file(fileName, blob);

      } catch (err) {
        console.error(`下载文件失败: ${item.url}`, err);
        // 继续下载下一个文件
      }
    }

    // 更新进度 - 生成 ZIP
    progressText.textContent = '正在生成 ZIP 文件...';

    // 生成 ZIP 文件
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    // 更新进度 - 下载 ZIP
    progressText.textContent = '正在下载...';

    // 创建下载链接
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}_${new Date().getTime()}.zip`;

    // 触发下载
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 释放 URL 对象
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    // 完成
    setTimeout(() => {
      progress.classList.remove('active');

      // 🔥 如果下载的是视频，显示转换提示
      if (type === 'videos') {
        const hasStreaming = items.some(item => {
          const downloader = new StreamVideoDownloader();
          return downloader.isStreamUrl(item.url);
        });

        if (hasStreaming) {
          setTimeout(() => {
            alert('批量下载完成！\n\n注意：ZIP中包含的m3u8和TS等流媒体视频需要使用FFmpeg等工具转换为MP4才能播放。\n\n推荐的转换方法：\n1. 安装FFmpeg\n2. 解压ZIP文件\n3. 运行: ffmpeg -i video.m3u8 -c copy output.mp4\n\n或使用VLC播放器直接播放这些文件。');
          }, 500);
        }
      }
    }, 500);

  } catch (error) {
    console.error('批量下载失败:', error);
    alert('批量下载失败，请重试');
    progress.classList.remove('active');
  }
}

// 删除媒体
function deleteMedia(index, type) {
  if (type === 'image') {
    capturedImages.splice(index, 1);
    updateImagesList();
  } else if (type === 'video') {
    capturedVideos.splice(index, 1);
    updateVideosList();
  } else if (type === 'audio') {
    capturedAudios.splice(index, 1);
    updateAudiosList();
  }
  saveCapturedData();
}

// 🔥 删除重复项
function removeDuplicates(type) {
  if (type === 'image') {
    const uniqueUrls = new Set();
    const uniqueImages = [];

    capturedImages.forEach(img => {
      if (!uniqueUrls.has(img.url)) {
        uniqueUrls.add(img.url);
        uniqueImages.push(img);
      }
    });

    const removedCount = capturedImages.length - uniqueImages.length;
    capturedImages = uniqueImages;
    updateImagesList();
    saveCapturedData();

    if (removedCount > 0) {
      alert(`已删除 ${removedCount} 张重复图片`);
    } else {
      alert('没有重复的图片');
    }
  } else if (type === 'video') {
    const uniqueUrls = new Set();
    const uniqueVideos = [];

    capturedVideos.forEach(vid => {
      if (!uniqueUrls.has(vid.url)) {
        uniqueUrls.add(vid.url);
        uniqueVideos.push(vid);
      }
    });

    const removedCount = capturedVideos.length - uniqueVideos.length;
    capturedVideos = uniqueVideos;
    updateVideosList();
    saveCapturedData();

    if (removedCount > 0) {
      alert(`已删除 ${removedCount} 个重复视频`);
    } else {
      alert('没有重复的视频');
    }
  } else if (type === 'audio') {
    const uniqueUrls = new Set();
    const uniqueAudios = [];

    capturedAudios.forEach(aud => {
      if (!uniqueUrls.has(aud.url)) {
        uniqueUrls.add(aud.url);
        uniqueAudios.push(aud);
      }
    });

    const removedCount = capturedAudios.length - uniqueAudios.length;
    capturedAudios = uniqueAudios;
    updateAudiosList();
    saveCapturedData();

    if (removedCount > 0) {
      alert(`已删除 ${removedCount} 个重复音频`);
    } else {
      alert('没有重复的音频');
    }
  }
}

// 清空列表
function clearList(type) {
  if (type === 'images') {
    capturedImages = [];
    updateImagesList();
  } else if (type === 'videos') {
    capturedVideos = [];
    updateVideosList();
  } else if (type === 'audios') {
    capturedAudios = [];
    updateAudiosList();
  }
  saveCapturedData();
}

// 保存捕获的数据
function saveCapturedData() {
  chrome.storage.local.set({
    capturedImages,
    capturedVideos,
    capturedAudios
  });
}

// 🔥 批量下载选中的图片
async function downloadSelectedImages() {
  if (selectedImages.size === 0) {
    alert('请先选择要下载的图片');
    return;
  }

  try {
    const zip = new JSZip();
    let count = 0;
    let fileIndex = 1; // 🔥 添加序号避免重名

    for (const index of selectedImages) {
      const image = capturedImages[index];
      if (image) {
        try {
          const response = await fetch(image.url);
          const blob = await response.blob();

          // 🔥 传入 MIME 类型以确保正确的扩展名
          let fileName = getFileName(image.url, image.type);

          // 🔥 添加序号避免重名
          const extIndex = fileName.lastIndexOf('.');
          if (extIndex > 0) {
            const name = fileName.substring(0, extIndex);
            const ext = fileName.substring(extIndex);
            fileName = `${name}_${fileIndex}${ext}`;
          } else {
            fileName = `${fileName}_${fileIndex}`;
          }
          fileIndex++;

          zip.file(fileName, blob);
          count++;
          console.log(`✅ 已添加第 ${count} 张图片:`, fileName);
        } catch (err) {
          console.warn('下载图片失败:', image.url, err);
        }
      }
    }

    console.log(`📦 总共添加了 ${count} 张图片到 ZIP`);

    if (count === 0) {
      alert('没有成功下载任何图片');
      return;
    }

    // 生成ZIP
    console.log('🔄 正在生成 ZIP 文件...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    console.log('✅ ZIP 文件生成完成，大小:', zipBlob.size, '字节');

    // 触发下载
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_images_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 清空选择
    selectedImages.clear();
    updateImagesList();

  } catch (error) {
    console.error('批量下载失败:', error);
    alert('批量下载失败: ' + error.message);
  }
}

// 🔥 批量删除选中的图片
function deleteSelectedImages() {
  console.log('deleteSelectedImages 被调用');
  console.log('当前选中的图片数量:', selectedImages.size);

  if (selectedImages.size === 0) {
    alert('请先选择要删除的图片');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) {
    return;
  }

  // 将索引转为数组并降序排列（从后往前删除，避免索引变化）
  const indexesToDelete = Array.from(selectedImages).sort((a, b) => b - a);
  console.log('要删除的索引:', indexesToDelete);

  indexesToDelete.forEach(index => {
    capturedImages.splice(index, 1);
  });

  console.log('删除后剩余图片数量:', capturedImages.length);

  // 清空选择并更新列表
  selectedImages.clear();
  saveCapturedData();
  updateImagesList();
}

// 加载捕获的数据
function loadCapturedData() {
  chrome.storage.local.get(['capturedImages', 'capturedVideos', 'capturedAudios'], (result) => {
    if (result.capturedImages) {
      capturedImages = result.capturedImages;
      updateImagesList();
    }
    if (result.capturedVideos) {
      capturedVideos = result.capturedVideos;
      updateVideosList();
    }
    if (result.capturedAudios) {
      capturedAudios = result.capturedAudios;
      updateAudiosList();
    }
  });
}

// 🔥 翻译工具函数

/**
 * 处理翻译按钮点击
 */
async function handleTranslate() {
  const text = sourceText.value.trim();

  if (!text) {
    alert('请输入要翻译的文本');
    return;
  }

  if (!translator) {
    alert('翻译器未初始化，请刷新页面重试');
    return;
  }

  const sourceLang = sourceLangSelect.value;
  const targetLang = targetLangSelect.value;

  // 禁用翻译按钮
  translateBtn.disabled = true;
  translateBtn.textContent = '翻译中...';

  // 添加加载状态
  translationResult.classList.add('translating');

  try {
    // 检查是否为多行文本
    const lines = text.split('\n').filter(line => line.trim());
    const isMultiLine = lines.length > 1;

    console.log('📝 输入文本行数:', lines.length);
    console.log('📝 分割后的行:', lines);

    if (isMultiLine) {
      // 多行文本：逐行翻译
      console.log(`🎯 开始逐行翻译，共 ${lines.length} 行`);

      const translatedLines = await translator.translateLines(
        lines,
        sourceLang,
        targetLang,
        (progress) => {
          console.log(`翻译进度: ${progress.current}/${progress.total} (${progress.percent}%)`);
        }
      );

      console.log('✅ 翻译完成，结果行数:', translatedLines.length);
      console.log('✅ 翻译结果:', translatedLines);

      // 显示翻译结果（原文+译文）
      displayTranslationResult(lines, translatedLines);
    } else {
      // 单行文本：直接翻译
      console.log('🎯 开始翻译单行文本');

      const translated = await translator.translate(text, sourceLang, targetLang);

      // 显示翻译结果
      translationResult.innerHTML = '<div class="translation-line">' + translated + '</div>';
      translationResult.classList.remove('translating');

      // 显示复制按钮
      copyBtn.style.display = 'flex';
    }

    console.log('✅ 翻译完成');

  } catch (error) {
    console.error('❌ 翻译失败:', error);

    translationResult.innerHTML =
      '<div class="translation-error">' +
      '翻译失败：' + error.message +
      '</div>';
    translationResult.classList.remove('translating');
  } finally {
    // 恢复翻译按钮
    translateBtn.disabled = false;
    translateBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">' +
        '<path d="M4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7A2.5 2.5 0 0 1 4.5 2z"/>' +
      '</svg>' +
      '翻译';
  }
}

/**
 * 显示翻译结果（原文+译文格式）
 * @param {string[]} originalLines - 原文行数组
 * @param {string[]} translatedLines - 译文行数组
 */
function displayTranslationResult(originalLines, translatedLines) {
  console.log('🎨 开始渲染翻译结果');
  console.log('📊 原文行数:', originalLines.length);
  console.log('📊 译文行数:', translatedLines.length);

  let html = '';

  for (let i = 0; i < originalLines.length; i++) {
    const original = originalLines[i];
    const translated = translatedLines[i];

    console.log(`第 ${i + 1} 行:`, { original, translated });

    html += '<div class="translation-line">';
    html += '<div class="original-line">' + escapeHtml(original) + '</div>';
    html += '<div class="translated-line">' + escapeHtml(translated) + '</div>';
    html += '</div>';
  }

  console.log('🖼️ 生成的HTML长度:', html.length);
  console.log('🖼️ HTML预览（前500字符）:', html.substring(0, 500));

  translationResult.innerHTML = html;
  translationResult.classList.remove('translating');

  // 显示复制按钮
  copyBtn.style.display = 'flex';

  console.log('✅ 翻译结果渲染完成');
}

/**
 * 复制翻译结果
 */
async function handleCopyTranslation() {
  const result = translationResult.textContent;

  if (!result || result.trim() === '翻译结果将显示在这里') {
    alert('没有可复制的翻译结果');
    return;
  }

  try {
    await navigator.clipboard.writeText(result);

    // 临时更改按钮文本
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '✓ 已复制';
    copyBtn.style.background = '#48bb78';

    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.style.background = '#48bb78';
    }, 2000);

  } catch (error) {
    console.error('复制失败:', error);
    alert('复制失败，请手动复制');
  }
}

/**
 * 转义HTML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化
init();
