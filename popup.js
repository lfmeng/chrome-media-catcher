// 全局状态
let currentTab = 'images';
let isCapturing = false;
let capturedImages = [];
let capturedVideos = [];
let capturedAudios = [];
let selectedImages = new Set(); // 🔥 存储选中的图片索引
let selectedVideos = new Set(); // 🔥 存储选中的视频索引
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
    downloadSelectedImages();
  });

  // 🔥 新增：批量删除选中图片
  deleteSelectedImagesBtn.addEventListener('click', () => {
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
    // 🔥 先尝试找最近的按钮元素（包括被点击的元素本身）
    let clickedBtn = e.target;
    if (!clickedBtn.classList.contains('btn-icon')) {
      clickedBtn = clickedBtn.closest('.btn-icon');
    }

    if (!clickedBtn) return;

    const btn = clickedBtn;
    const playerWrapper = btn.closest('.video-player-wrapper');

    // 🔥 处理新窗口打开
    if (btn.classList.contains('open-new-tab')) {
      e.preventDefault();
      e.stopPropagation();
      const url = btn.dataset.url;
      if (url) {
        chrome.tabs.create({ url: url });
      }
      return;
    }

    // 🔥 处理下载
    if (btn.classList.contains('download')) {
      const url = btn.dataset.url;
      if (playerWrapper) {
        const index = parseInt(playerWrapper.dataset.index);
        if (url) {
          downloadMedia(url, index, 'video');
        }
      }
      return;
    }

    // 🔥 处理删除
    if (btn.classList.contains('delete')) {
      if (playerWrapper) {
        const index = parseInt(playerWrapper.dataset.index);
        deleteVideo(index);
      }
      return;
    }
  });

  audiosList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-icon');
    if (!btn) return;

    // 处理流媒体音频（九宫格布局）
    const gridItem = btn.closest('.grid-item');
    const mediaItem = btn.closest('.media-item');

    if (btn.classList.contains('play') || btn.classList.contains('download')) {
      // 播放按钮和下载按钮都触发下载
      const url = btn.dataset.url;
      if (gridItem) {
        // 流媒体音频
        const index = parseInt(gridItem.dataset.index);
        if (url) {
          downloadMedia(url, index, 'audio');
        }
      } else if (mediaItem) {
        // 普通音频
        const index = parseInt(mediaItem.dataset.index);
        const url = mediaItem.querySelector('.media-url').textContent;
        if (url) {
          downloadMedia(url, index, 'audio');
        }
      }
    } else if (btn.classList.contains('delete')) {
      if (gridItem) {
        // 流媒体音频
        const index = parseInt(gridItem.dataset.index);
        deleteMedia(index, 'audio');
      } else if (mediaItem) {
        // 普通音频
        const index = parseInt(mediaItem.dataset.index);
        deleteMedia(index, 'audio');
      }
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
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'startCapture',
          type: type
        },
        (response) => {
          if (chrome.runtime.lastError) {
          } else {
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
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'stopCapture',
          type: type
        },
        (response) => {
          if (chrome.runtime.lastError) {
          } else {
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
        }

        capturedAudios.push(media);
        updateAudiosList();
        saveCapturedData();
      }
    } else if (type === 'video') {
      // 🔥 标准化 URL 以便检测重复（移除常见的时间戳等无关参数）
      const normalizedUrl = normalizeVideoUrl(media.url);

      // 🔥 检查是否重复（使用标准化后的 URL）
      const isDuplicate = capturedVideos.some(vid => normalizeVideoUrl(vid.url) === normalizedUrl);

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
          // 🔥 过滤掉只有音频或只有视频的流媒体文件
          const audioOnlyExtensions = ['.m4a', '.aac', '.mp3', '.wav', '.ogg', '.flac', '.ac3', '.wma', '.opus', '.aiff', '.aif', '.aifc', '.amr', '.3ga'];
          const videoOnlyExtensions = ['.m4v', '.h264', '.h265', '.hevc', '.avc', '.vc1', '.vp8', '.vp9', '.av1', '.mv4'];

          const urlLower = media.url.toLowerCase();
          const contentType = (media.type || '').toLowerCase();

          // 🔥 多重检测机制
          let isAudioOnly = audioOnlyExtensions.some(ext => urlLower.includes(ext));
          let isVideoOnly = videoOnlyExtensions.some(ext => urlLower.includes(ext));

          // 🔥 通过 URL 路径关键词检测
          const audioKeywords = ['/audio/', '/sound/', '/voice/', 'audio_only', 'audio-only', '/aud/', 'audonly', 'audiostream'];
          const videoOnlyKeywords = ['/video_only/', 'video-only', 'video_only', 'mute', 'silent', '/vidonly/', 'videoonly'];

          isAudioOnly = isAudioOnly || audioKeywords.some(keyword => urlLower.includes(keyword));
          isVideoOnly = isVideoOnly || videoOnlyKeywords.some(keyword => urlLower.includes(keyword));

          // 🔥 通过 Content-Type 检测
          if (contentType) {
            if (contentType.startsWith('audio/') && !contentType.includes('video')) {
              isAudioOnly = true;
            }
            if (contentType.includes('video') && contentType.includes('only')) {
              isVideoOnly = true;
            }
          }

          // 🔥 检查 URL 参数中是否有 audio_only 或 video_only 标记
          try {
            const urlObj = new URL(media.url);
            if (urlObj.searchParams.has('audio_only') || urlObj.searchParams.has('audio-only')) {
              isAudioOnly = true;
            }
            if (urlObj.searchParams.has('video_only') || urlObj.searchParams.has('video-only') || urlObj.searchParams.has('mute')) {
              isVideoOnly = true;
            }

            // 🔥 流媒体特殊检测：检查路径中包含 audio/video 标记
            const pathname = urlObj.pathname.toLowerCase();
            if (pathname.includes('/audio/') || pathname.includes('/audio_') ||
                pathname.includes('-audio-') || pathname.includes('.audio.')) {
              isAudioOnly = true;
            }
            if (pathname.includes('/video_only/') || pathname.includes('-videoonly-') ||
                pathname.includes('/mute/') || pathname.includes('-mute-')) {
              isVideoOnly = true;
            }
          } catch (e) {
            // URL 解析失败，忽略
          }

          // 🔥 特殊检测：检查文件名模式
          const filename = urlLower.substring(urlLower.lastIndexOf('/') + 1);
          if (filename.match(/^audio/)) {
            isAudioOnly = true;
          }
          if (filename.match(/^video.*only/) || filename.match(/mute/)) {
            isVideoOnly = true;
          }

          // 只保留包含音视频的完整文件
          if (!isAudioOnly && !isVideoOnly) {
            // 🔥 添加到视频流分组
            streamGroupHelper.addToGroup(media.url, 'video');

            // 🔥 分析流信息
            const streamInfo = streamGroupHelper.analyzeStreamComposition(media.url, 'video');
            media.streamInfo = streamInfo;

            // 查找相关的音频
            const relatedAudios = streamGroupHelper.findRelatedAudio(media.url, capturedAudios.map(a => a.url));
            if (relatedAudios.length > 0) {
              media.relatedAudios = relatedAudios;
            }

            capturedVideos.push(media);
            updateVideosList();
            saveCapturedData();
          } else {
            // 🔥 视频/音频不完整，不添加到列表中
          }
        } else {
          // JavaScript bundle，不添加
        }
      }
    }
  } else if (message.action === 'autoCaptureStarted') {
    // 🔥 自动捕获已启动，更新UI状态

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
         type.includes('webm') ||
         url.includes('.webm');
}

// 🔥 判断是否为流媒体格式
// 🔥 判断是否为流媒体格式（更严格的检测）
function isStreamingVideo(url) {
  const urlLower = url.toLowerCase();

  // 🔥 明确的流媒体文件扩展名
  const streamingExtensions = ['.m3u8', '.m3u', '.mpd', '.dash', '.f4m'];

  // 🔥 检查是否有流媒体扩展名
  const hasStreamingExt = streamingExtensions.some(ext => {
    // 检查 pathname 是否以这些扩展名结尾
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return pathname.endsWith(ext);
    } catch (e) {
      return urlLower.includes(ext);
    }
  });

  // 🔥 检查 .ts 和 .m4s（这些是流分片，但也可能是普通文件）
  const isFragment = urlLower.includes('.ts') || urlLower.includes('.m4s');

  // 🔥 如果包含明确的流媒体扩展名，或者同时包含多个流分片，才判定为流媒体
  return hasStreamingExt || isFragment;
}

// 🔥 检测流媒体类型
function detectStreamType(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.m3u8') || urlLower.includes('.m3u')) {
    return 'HLS';
  } else if (urlLower.includes('.ts')) {
    return 'TS';
  } else if (urlLower.includes('.m4s')) {
    return 'M4S';
  } else if (urlLower.includes('stream')) {
    return 'STREAM';
  }
  return 'STREAM';
}

// 🔥 判断是否为流媒体音频
function isStreamingAudio(url) {
  const urlLower = url.toLowerCase();
  return urlLower.includes('.m3u8') ||
         urlLower.includes('.m3u') ||
         urlLower.includes('.ts') ||
         urlLower.includes('.m4s');
}

// 🔥 检测音频流媒体类型
function detectAudioStreamType(url) {
  return detectStreamType(url);
}

// 🔥 标准化视频 URL（移除无关参数以便检测重复）
function normalizeVideoUrl(url) {
  try {
    const urlObj = new URL(url);

    // 🔥 移除常见的无关参数（这些参数不影响视频内容）
    const paramsToRemove = [
      't', 'timestamp', 'time', '_t', '_time', '_ts',
      'rand', 'random', '_rand', '_random',
      'nonce', '_nonce',
      'token', '_token', 'session',
      'expire', 'expires', '_expire',
      'signature', 'sig', '_sig',
      'cache', 'no_cache', 'nocache',
      'v', 'version', '_v',
      'ref', 'referer', 'source',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid',
      'mkt_tok', 'msclkid',
      'idx', 'index', 'i',
      'id', '_id',
      'sq', 'sequence', 'seq',
      'start', 'end',
      'offset',
      'quality', 'qual',
      'profile', 'prof'
    ];

    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    // 🔥 对于流媒体 URL（m3u8, mpd, ts 等），移除更多参数
    const pathname = urlObj.pathname.toLowerCase();
    const isStreaming = pathname.includes('.m3u8') || pathname.includes('.m3u') ||
                       pathname.includes('.mpd') || pathname.includes('.ts') ||
                       pathname.includes('.m4s');

    if (isStreaming) {
      // 流媒体特有的参数
      const streamingParamsToRemove = [
        'm3u8', 'ts', 'segment',
        'hdnea', 'mnt', 'cn', 'token',
        'session_id', 'sess_id',
        'pl', 'play_list',
        's', 'server',
        'cdn', 'region'
      ];

      streamingParamsToRemove.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      // 🔥 对于流媒体，只保留关键参数
      const importantParams = ['format', 'type', 'ext', 'mime'];
      const allParams = Array.from(urlObj.searchParams.keys());
      allParams.forEach(param => {
        if (!importantParams.includes(param.toLowerCase())) {
          urlObj.searchParams.delete(param);
        }
      });
    }

    // 🔥 对于某些 CDN，移除所有查询参数（因为它们通常用于缓存控制）
    const hostname = urlObj.hostname.toLowerCase();
    const removeParamsHosts = [
      'googlevideo.com',
      'googleusercontent.com',
      'ytimg.com',
      'video.twimg.com',
      'twimg.com',
      'fbcdn.net',
      'instagram.com',
      'cdn.instagram.com',
      'cloudflare.com',
      'cloudfront.net',
      'akamaihd.net',
      'amazonaws.com'
    ];

    const shouldRemoveAllParams = removeParamsHosts.some(host =>
      hostname.includes(host) || hostname.endsWith('.' + host)
    );

    if (shouldRemoveAllParams) {
      // 保留重要的格式参数
      const formatParam = urlObj.searchParams.get('format');
      const typeParam = urlObj.searchParams.get('type');
      const extParam = urlObj.searchParams.get('ext');

      urlObj.search = '';

      if (formatParam) urlObj.searchParams.set('format', formatParam);
      if (typeParam) urlObj.searchParams.set('type', typeParam);
      if (extParam) urlObj.searchParams.set('ext', extParam);
    }

    return urlObj.toString();
  } catch (e) {
    // URL 解析失败，返回原始 URL
    return url;
  }
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
      const loadId = `img-${img.originalIndex}`;
      return `
        <div class="grid-item" data-index="${img.originalIndex}">
          <input type="checkbox"
                 class="grid-checkbox"
                 data-index="${img.originalIndex}"
                 ${isSelected ? 'checked' : ''}>
          <label class="grid-checkbox-label"></label>
          <div class="grid-thumbnail" data-url="${img.url}" data-headers='${JSON.stringify(img.requestHeaders || {})}' data-load-id="${loadId}">
            <img src="${img.url}" alt="${fileName}" data-load-id="${loadId}" class="lazy-image">
            <div class="placeholder lazy-placeholder" style="display:none;">
              <img src="../icons/placeholder-200x150.png" alt="图片加载失败" class="placeholder-image">
              <span style="font-size:10px;margin-top:4px;">点击加载</span>
            </div>
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

  // 🔥 为所有图片添加加载事件监听器
  const lazyImages = imagesList.querySelectorAll('.lazy-image');
  lazyImages.forEach(img => {
    // 加载成功时隐藏占位符
    img.addEventListener('load', () => {
      const placeholder = img.nextElementSibling;
      if (placeholder && placeholder.classList.contains('lazy-placeholder')) {
        placeholder.style.display = 'none';
      }
    });

    // 加载失败时显示占位符
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const placeholder = img.nextElementSibling;
      if (placeholder && placeholder.classList.contains('lazy-placeholder')) {
        placeholder.style.display = 'flex';
        placeholder.style.cursor = 'pointer';

        // 添加点击加载事件
        placeholder.onclick = () => loadImagePreview(placeholder);
      }
    });
  });
}

// 🔥 记录当前已渲染的视频 URL（用于增量更新）
let renderedVideoUrls = new Set();

// 🔥 创建视频元素的辅助函数
function createVideoElement(video) {
  const fileName = getFileName(video.url, video.type);
  const uniqueId = `video-streaming-${video.originalIndex}`;
  const isStreaming = isStreamingVideo(video.url);
  const streamType = isStreaming ? detectStreamType(video.url) : null;

  // 计算关联信息
  let relatedHtml = '';
  const related = video.relatedAudios || video.relatedVideos;
  if (related && related.length > 0) {
    const relatedType = video.relatedAudios ? '音频' : '视频';
    relatedHtml = '<div style="font-size: 10px; color: #4caf50; padding: 4px; background: #e8f5e9; border-radius: 4px; margin-top: 4px;">🔗 关联 ' + relatedType + ': ' + related.length + ' 个</div>';
  }

  // 创建包装器
  const wrapper = document.createElement('div');
  wrapper.className = 'video-player-wrapper';
  wrapper.dataset.index = video.originalIndex;
  wrapper.dataset.url = video.url;

  // 创建视频容器
  const videoContainer = document.createElement('div');
  videoContainer.style.position = 'relative';

  // 创建视频元素
  const videoElement = document.createElement('video');
  videoElement.id = uniqueId;
  videoElement.className = isStreaming ? 'video-player streaming-video' : 'video-player';
  videoElement.preload = 'auto';
  videoElement.controls = true;
  videoElement.playsInline = true;
  videoElement.crossOrigin = 'anonymous';

  // 设置 poster
  videoElement.poster = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E▶%3C/text%3E%3C/svg%3E";

  // 创建 source 元素
  const source = document.createElement('source');
  source.src = video.url;
  source.type = video.type || (isStreaming ? 'application/x-mpegURL' : 'video/mp4');
  videoElement.appendChild(source);
  videoElement.appendChild(document.createTextNode('您的浏览器不支持视频播放。'));

  videoContainer.appendChild(videoElement);

  // 添加流媒体徽章
  if (isStreaming && streamType) {
    const badge = document.createElement('div');
    badge.style.cssText = 'position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 10px; padding: 4px 8px; border-radius: 4px; z-index: 5; font-weight: 600;';
    badge.textContent = streamType;
    videoContainer.appendChild(badge);
  }

  wrapper.appendChild(videoContainer);

  // 创建文件名
  const filenameDiv = document.createElement('div');
  filenameDiv.className = 'video-filename';
  filenameDiv.title = video.url;
  filenameDiv.textContent = fileName + (relatedHtml ? relatedHtml : '');
  wrapper.appendChild(filenameDiv);

  // 创建操作按钮容器
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'video-actions';

  // 新窗口按钮
  const newTabBtn = document.createElement('button');
  newTabBtn.className = 'btn-icon open-new-tab';
  newTabBtn.title = '新窗口播放';
  newTabBtn.dataset.url = video.url;
  newTabBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v7A1.5 1.5 0 0 0 1.5 13h6.636a.5.5 0 0 0 .5-.5v-1h1v1a1.5 1.5 0 0 1-1.5 1.5H1.5A1.5 1.5 0 0 1 0 11.5v-7A1.5 1.5 0 0 1 1.5 3.5h6.636a.5.5 0 0 0 .5-.5v-1zM7.5 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H8a.5.5 0 0 1-.5-.5v-1A1.5 1.5 0 0 1 9 1h1.276a.5.5 0 0 1 0-1H9a2.5 2.5 0 0 0-2.5 2.5v7a2.5 2.5 0 0 0 2.5 2.5h1.276a.5.5 0 0 1 0 1H9a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 9 1h1.276a.5.5 0 0 1 .5-.5v-1z"/></svg><span>新窗口</span>`;

  // 下载按钮
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn-icon download';
  downloadBtn.title = '下载';
  downloadBtn.dataset.url = video.url;
  downloadBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>`;

  // 删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon delete';
  deleteBtn.title = '删除';
  deleteBtn.dataset.index = video.originalIndex;
  deleteBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;

  actionsDiv.appendChild(newTabBtn);
  actionsDiv.appendChild(downloadBtn);
  actionsDiv.appendChild(deleteBtn);
  wrapper.appendChild(actionsDiv);

  return wrapper;
}

// 🔥 更新视频列表 - 增量更新，避免重渲染导致播放中断
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

  // 🔥 首次渲染时，创建基础结构
  if (renderedVideoUrls.size === 0) {
    videosList.innerHTML = '';
    createVideoGroups();
  }

  // 🔥 增量更新：只添加新视频
  capturedVideos.forEach((video, index) => {
    const normalizedUrl = normalizeVideoUrl(video.url);
    if (!renderedVideoUrls.has(normalizedUrl)) {
      // 这是新视频，需要添加
      const videoWithIndex = { ...video, originalIndex: index };
      const videoElement = createVideoElement(videoWithIndex);

      // 找到对应的容器并添加
      const isStreaming = isStreamingVideo(video.url);
      const gridId = isStreaming ? 'streaming-videos-grid' : 'regular-videos-grid';
      const grid = videosList.querySelector(`#${gridId}`);

      if (grid) {
        grid.appendChild(videoElement);

        // 如果是流媒体，初始化 HLS
        if (isStreaming) {
          const videoEl = videoElement.querySelector('.streaming-video');
          if (videoEl) {
            initializeHlsForVideo(videoEl, video.url);
          }
        }
      }

      renderedVideoUrls.add(normalizedUrl);
    }
  });

  // 🔥 更新分组标题的计数
  updateGroupCounts();
}

// 🔥 创建视频分组结构
function createVideoGroups() {
  const streamingVideos = [];
  const regularVideos = [];

  capturedVideos.forEach((video, index) => {
    const videoWithIndex = { ...video, originalIndex: index };
    if (isStreamingVideo(video.url)) {
      streamingVideos.push(videoWithIndex);
    } else {
      regularVideos.push(videoWithIndex);
    }
  });

  let html = '';

  // 流媒体视频分组
  if (streamingVideos.length > 0) {
    html += `
      <div class="media-group" id="streaming-group">
        <div class="group-header">
          <span class="group-title">🎬 流媒体视频 (<span id="streaming-count">${streamingVideos.length}</span>)</span>
          <div class="group-info">
            <span class="group-count">HLS/m3u8/TS/M4S</span>
            <svg class="group-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z"/>
            </svg>
          </div>
        </div>
        <div class="media-videos-grid" id="streaming-videos-grid">
        </div>
      </div>
    `;
  }

  // 普通视频分组
  if (regularVideos.length > 0) {
    html += `
      <div class="media-group" id="regular-group">
        <div class="group-header">
          <span class="group-title">📹 普通视频 (<span id="regular-count">${regularVideos.length}</span>)</span>
          <div class="group-info">
            <span class="group-count">MP4/WEBM</span>
            <svg class="group-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z"/>
            </svg>
          </div>
        </div>
        <div class="media-videos-grid" id="regular-videos-grid">
        </div>
      </div>
    `;
  }

  videosList.innerHTML = html;

  // 初始化所有现有视频
  [...streamingVideos, ...regularVideos].forEach(video => {
    const normalizedUrl = normalizeVideoUrl(video.url);
    renderedVideoUrls.add(normalizedUrl);
    const videoElement = createVideoElement(video);
    const isStreaming = isStreamingVideo(video.url);
    const gridId = isStreaming ? 'streaming-videos-grid' : 'regular-videos-grid';
    const grid = videosList.querySelector(`#${gridId}`);

    if (grid) {
      grid.appendChild(videoElement);

      // 如果是流媒体，初始化 HLS
      if (isStreaming) {
        const videoEl = videoElement.querySelector('.streaming-video');
        if (videoEl) {
          initializeHlsForVideo(videoEl, video.url);
        }
      }
    }
  });
}

// 🔥 更新分组计数
function updateGroupCounts() {
  const streamingCount = capturedVideos.filter(v => isStreamingVideo(v.url)).length;
  const regularCount = capturedVideos.length - streamingCount;

  const streamingCountEl = videosList.querySelector('#streaming-count');
  const regularCountEl = videosList.querySelector('#regular-count');

  if (streamingCountEl) streamingCountEl.textContent = streamingCount;
  if (regularCountEl) regularCountEl.textContent = regularCount;
}

// 🔥 为单个视频初始化 HLS
function initializeHlsForVideo(videoElement, url) {
  if (!url.includes('.m3u8') && !url.includes('.m3u')) {
    return;
  }

  setTimeout(() => {
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      try {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });

        hls.loadSource(url);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          videoElement.play().catch(err => {
            // 静默处理自动播放失败
          });
        });

        hls.on(Hls.Events.ERROR, function(event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                break;
            }
          }
        });

        videoElement._hls = hls;
      } catch (error) {
        // hls.js 初始化失败
      }
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生支持 HLS
      videoElement.src = url;
      videoElement.addEventListener('loadedmetadata', function() {
        videoElement.play().catch(err => {
          // 静默处理自动播放失败
        });
      });
    }
  }, 100);
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
// 🔥 更新音频列表 - 支持九宫格布局
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

  // 🔥 分离流媒体音频和普通音频
  const streamingAudios = [];
  const regularAudios = [];

  capturedAudios.forEach((audio, index) => {
    const audioWithIndex = { ...audio, originalIndex: index };
    // 检查是否为流媒体格式
    if (isStreamingAudio(audio.url)) {
      streamingAudios.push(audioWithIndex);
    } else {
      regularAudios.push(audioWithIndex);
    }
  });

  let html = '';

  // 🔥 渲染流媒体音频（使用播放器布局）
  if (streamingAudios.length > 0) {
    html += `
      <div class="media-group">
        <div class="group-header">
          <span class="group-title">🎵 流媒体音频 (${streamingAudios.length})</span>
          <div class="group-info">
            <span class="group-count">HLS/TS/M4S</span>
            <svg class="group-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z"/>
            </svg>
          </div>
        </div>
        <div class="media-videos-grid">
    `;

    html += streamingAudios.map(audio => {
      const fileName = getFileName(audio.url, audio.type);

      // 计算关联信息
      let relatedHtml = '';
      if (audio.relatedVideos && audio.relatedVideos.length > 0) {
        relatedHtml = '<div style="font-size: 10px; color: #4caf50; padding: 4px; background: #e8f5e9; border-radius: 4px; margin-top: 4px;">🔗 关联视频: ' + audio.relatedVideos.length + ' 个</div>';
      }

      // 检测流格式类型
      const streamType = detectAudioStreamType(audio.url);
      const streamBadge = `<div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 10px; padding: 4px 8px; border-radius: 4px; z-index: 5; font-weight: 600;">${streamType}</div>`;

      return `
        <div class="video-player-wrapper" data-index="${audio.originalIndex}" data-url="${audio.url}">
          <div style="position: relative; width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
            ${streamBadge}
            <div style="color: white; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 12px;">🎵</div>
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${streamType} 流媒体音频</div>
              <div style="font-size: 12px; opacity: 0.9;">点击下方按钮下载</div>
            </div>
          </div>
          <div class="video-filename" title="${audio.url}">${fileName}${relatedHtml}</div>
          <div class="video-actions">
            <button class="btn-icon download" title="下载音频" data-url="${audio.url}">
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
              <span>下载</span>
            </button>
            <button class="btn-icon delete" title="删除" data-index="${audio.originalIndex}">
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
              <span>删除</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    html += `
        </div>
      </div>
    `;
  }

  // 🔥 渲染普通音频（列表布局）
  if (regularAudios.length > 0) {
    html += `
      <div class="media-group">
        <div class="group-header">
          <span class="group-title">🎵 普通音频 (${regularAudios.length})</span>
          <div class="group-info">
            <span class="group-count">MP3/AAC</span>
            <svg class="group-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z"/>
            </svg>
          </div>
        </div>
        <div class="regular-media-list">
    `;

    html += regularAudios.map((audio, index) => `
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
          <button class="btn-icon download" title="下载" data-url="${audio.url}">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
          </button>
          <button class="btn-icon delete" title="删除" data-index="${index}">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    html += `
        </div>
      </div>
    `;
  }

  audiosList.innerHTML = html;

  // 🔥 绑定事件
  const audioDeleteBtns = audiosList.querySelectorAll('.delete');
  audioDeleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      if (!isNaN(index)) {
        deleteAudio(index);
      }
    });
  });

  const audioDownloadBtns = audiosList.querySelectorAll('.download');
  audioDownloadBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.currentTarget.dataset.url;
      if (url) {
        handleDownload(url);
      }
    });
  });
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

  // 🔥 如果是视频，检查是否为流媒体格式
  if (type === 'video') {
    const downloader = new StreamVideoDownloader();
    const streamType = downloader.detectStreamType(url);


    if (downloader.isStreamUrl(url)) {

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

        // 下载并处理流媒体（传递 Cookie 和 UA）
        const result = await downloader.download(url, ({ type: msgType, percent, message }) => {

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
            }, 500);
          }

          // 延迟关闭进度提示
          setTimeout(() => {
            progress.classList.remove('active');
          }, 3000);
        }

      } catch (error) {

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
    }
  }

  // 非流媒体或非视频，使用浏览器直接下载

  // 🔥 查找媒体对象的请求头信息
  const mediaItem = [...capturedImages, ...capturedVideos, ...capturedAudios].find(m => m.url === url);
  const requestHeaders = mediaItem?.requestHeaders;

  // 🔥 通过background script下载（绕过CORS）
  try {

    // 发送消息到background script进行下载
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'downloadFile',
          url: url,
          requestHeaders: requestHeaders
        },
        (response) => {
          resolve(response);
        }
      );
    });

    if (response && response.success) {
    } else {
      throw new Error(response?.error || '下载失败');
    }
  } catch (error) {

    // 降级方案：使用chrome.downloads.download
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
    return `download_${Date.now()}`;
  }
}

// 🔥 通过background script下载文件（绕过CORS）
async function fetchViaBackground(url, requestHeaders) {

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'fetchBlob',
        url: url,
        requestHeaders: requestHeaders
      },
      (response) => {
        if (response && response.success) {
          // 将base64转换为blob
          const byteCharacters = atob(response.data);
          const byteArrays = [];

          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }

          const blob = new Blob(byteArrays, { type: response.type });
          resolve(blob);
        } else {
          reject(new Error(response?.error || 'Fetch failed'));
        }
      }
    );
  });
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
            progressText.textContent = `正在处理第 ${i + 1}/${total} 个视频...`;

            try {
              // 下载并处理流媒体
              const result = await downloader.download(item.url, ({ type, percent, message }) => {
            });

              if (result.success) {
                blob = result.blob;
                fileName = result.filename;
              }
            } catch (convertError) {
              // 处理失败，跳过此文件
              throw convertError;
            }
          } else {
            // 非流媒体，通过background下载
            blob = await fetchViaBackground(item.url, item.requestHeaders);
          }
        } else {
          // 非视频，通过background下载
          blob = await fetchViaBackground(item.url, item.requestHeaders);
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
  // 🔥 保存前过滤不完整的视频
  const filteredVideos = filterIncompleteVideos(capturedVideos);

  chrome.storage.local.set({
    capturedImages,
    capturedVideos: filteredVideos,
    capturedAudios
  });
}

// 🔥 点击加载图片预览（通过 background script 绕过 CORS）
async function loadImagePreview(placeholderElement) {
  const thumbnail = placeholderElement.parentElement;
  const url = thumbnail.dataset.url;
  const headers = JSON.parse(thumbnail.dataset.headers || '{}');
  const loadId = thumbnail.dataset.loadId;

  // 显示加载中
  placeholderElement.innerHTML = '<span>⏳</span><span style="font-size:10px;margin-top:4px;">加载中...</span>';

  try {
    // 通过 background script 获取图片
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'fetchBlob',
          url: url,
          requestHeaders: headers
        },
        (response) => resolve(response)
      );
    });

    if (response && response.success) {
      // 将 base64 转换为 blob URL
      const byteCharacters = atob(response.data);
      const byteArrays = [];
      const sliceSize = 512;

      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: response.type });
      const blobUrl = URL.createObjectURL(blob);

      // 找到并更新 img 标签
      const img = thumbnail.querySelector(`img[data-load-id="${loadId}"]`);
      if (img) {
        img.src = blobUrl;
        img.style.display = 'block';
        placeholderElement.style.display = 'none';

        // 释放旧的 blob URL（如果存在）
        if (img.dataset.blobUrl) {
          URL.revokeObjectURL(img.dataset.blobUrl);
        }
        img.dataset.blobUrl = blobUrl;
      }
    } else {
      throw new Error(response?.error || '加载失败');
    }
  } catch (error) {
    placeholderElement.innerHTML = '<span>❌</span><span style="font-size:10px;margin-top:4px;">加载失败</span>';
  }
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
          // 🔥 通过background script下载，绕过CORS
          const blob = await fetchViaBackground(image.url, image.requestHeaders);

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
        } catch (err) {
        }
      }
    }


    if (count === 0) {
      alert('没有成功下载任何图片');
      return;
    }

    // 生成ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });


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
    alert('批量下载失败: ' + error.message);
  }
}

// 🔥 批量删除选中的图片
function deleteSelectedImages() {

  if (selectedImages.size === 0) {
    alert('请先选择要删除的图片');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) {
    return;
  }

  // 将索引转为数组并降序排列（从后往前删除，避免索引变化）
  const indexesToDelete = Array.from(selectedImages).sort((a, b) => b - a);

  indexesToDelete.forEach(index => {
    capturedImages.splice(index, 1);
  });


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
      // 🔥 加载时也过滤不完整的视频
      capturedVideos = filterIncompleteVideos(result.capturedVideos);
      updateVideosList();
    }
    if (result.capturedAudios) {
      capturedAudios = result.capturedAudios;
      updateAudiosList();
    }
  });
}

// 🔥 过滤不完整的视频（只有音频或只有视频）
function filterIncompleteVideos(videos) {
  if (!Array.isArray(videos)) return [];

  const audioOnlyExtensions = ['.m4a', '.aac', '.mp3', '.wav', '.ogg', '.flac', '.ac3', '.wma', '.opus', '.aiff', '.aif', '.aifc', '.amr', '.3ga'];
  const videoOnlyExtensions = ['.m4v', '.h264', '.h265', '.hevc', '.avc', '.vc1', '.vp8', '.vp9', '.av1', '.mv4'];
  const audioKeywords = ['/audio/', '/sound/', '/voice/', 'audio_only', 'audio-only', '/aud/', 'audonly', 'audiostream'];
  const videoOnlyKeywords = ['/video_only/', 'video-only', 'video_only', 'mute', 'silent', '/vidonly/', 'videoonly'];

  return videos.filter(video => {
    if (!video || !video.url) return false;

    const urlLower = video.url.toLowerCase();
    const contentType = (video.type || '').toLowerCase();

    // 检查扩展名
    const isAudioOnly = audioOnlyExtensions.some(ext => urlLower.includes(ext));
    const isVideoOnly = videoOnlyExtensions.some(ext => urlLower.includes(ext));

    // 检查 URL 关键词
    const hasAudioKeyword = audioKeywords.some(keyword => urlLower.includes(keyword));
    const hasVideoOnlyKeyword = videoOnlyKeywords.some(keyword => urlLower.includes(keyword));

    // 检查 Content-Type
    let isAudioByType = false;
    let isVideoOnlyByType = false;
    if (contentType) {
      if (contentType.startsWith('audio/') && !contentType.includes('video')) {
        isAudioByType = true;
      }
      if (contentType.includes('video') && contentType.includes('only')) {
        isVideoOnlyByType = true;
      }
    }

    // 检查 URL 参数
    let isAudioByParam = false;
    let isVideoOnlyByParam = false;
    try {
      const urlObj = new URL(video.url);
      if (urlObj.searchParams.has('audio_only') || urlObj.searchParams.has('audio-only')) {
        isAudioByParam = true;
      }
      if (urlObj.searchParams.has('video_only') || urlObj.searchParams.has('video-only') ||
          urlObj.searchParams.has('mute') || urlObj.searchParams.has('silent')) {
        isVideoOnlyByParam = true;
      }

      // 🔥 流媒体特殊检测：检查路径中包含 audio/video 标记
      const pathname = urlObj.pathname.toLowerCase();
      if (pathname.includes('/audio/') || pathname.includes('/audio_') ||
          pathname.includes('-audio-') || pathname.includes('.audio.')) {
        isAudioByParam = true;
      }
      if (pathname.includes('/video_only/') || pathname.includes('-videoonly-') ||
          pathname.includes('/mute/') || pathname.includes('-mute-')) {
        isVideoOnlyByParam = true;
      }
    } catch (e) {
      // URL 解析失败，忽略
    }

    // 🔥 特殊检测：检查文件名模式
    const filename = urlLower.substring(urlLower.lastIndexOf('/') + 1);
    if (filename.match(/^audio/)) {
      isAudioByParam = true;
    }
    if (filename.match(/^video.*only/) || filename.match(/mute/)) {
      isVideoOnlyByParam = true;
    }

    // 如果是任何一种不完整的情况，则过滤掉
    const isIncomplete = isAudioOnly || isVideoOnly ||
                        hasAudioKeyword || hasVideoOnlyKeyword ||
                        isAudioByType || isVideoOnlyByType ||
                        isAudioByParam || isVideoOnlyByParam;

    // 返回 true 表示保留（不是不完整的）
    return !isIncomplete;
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


    if (isMultiLine) {
      // 多行文本：逐行翻译

      const translatedLines = await translator.translateLines(
        lines,
        sourceLang,
        targetLang,
        (progress) => {
        }
      );


      // 显示翻译结果（原文+译文）
      displayTranslationResult(lines, translatedLines);
    } else {
      // 单行文本：直接翻译

      const translated = await translator.translate(text, sourceLang, targetLang);

      // 显示翻译结果
      translationResult.innerHTML = '<div class="translation-line">' + translated + '</div>';
      translationResult.classList.remove('translating');

      // 显示复制按钮
      copyBtn.style.display = 'flex';
    }


  } catch (error) {

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

  let html = '';

  for (let i = 0; i < originalLines.length; i++) {
    const original = originalLines[i];
    const translated = translatedLines[i];


    html += '<div class="translation-line">';
    html += '<div class="original-line">' + escapeHtml(original) + '</div>';
    html += '<div class="translated-line">' + escapeHtml(translated) + '</div>';
    html += '</div>';
  }


  translationResult.innerHTML = html;
  translationResult.classList.remove('translating');

  // 显示复制按钮
  copyBtn.style.display = 'flex';

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

// 🔥 将 loadImagePreview 暴露到全局作用域（供 HTML onclick 调用）
window.loadImagePreview = loadImagePreview;
