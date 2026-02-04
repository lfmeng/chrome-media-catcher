// 媒体捕获器 - Content Script
(function() {
  'use strict';

  // 🔥 强制输出日志，确保脚本已加载
  console.log('%c' + '='.repeat(60), 'color: #ff6b6b; font-size: 16px; font-weight: bold;');
  console.log('%c📸 媒体捕获器已启动', 'color: #4ecdc4; font-size: 20px; font-weight: bold;');
  console.log('%c📍 当前页面:', 'color: #95e1d3; font-size: 14px;', window.location.href);
  console.log('%c' + '='.repeat(60), 'color: #ff6b6b; font-size: 16px; font-weight: bold;');

  // 🔥 检查是否在特殊页面上，如果是则退出
  const protocol = window.location.protocol;
  if (protocol === 'chrome:' ||
      protocol === 'chrome-extension:' ||
      protocol === 'about:' ||
      protocol === 'edge:' ||
      protocol === 'opera:') {
    console.log('%c🚫 特殊页面，跳过媒体捕获器', 'color: #ff6b6b; font-size: 14px;');
    return;
  }

  console.log('%c✅ 页面检查通过，开始初始化...', 'color: #4ecdc4; font-size: 14px;');

  let isCapturingImages = false;
  let isCapturingAudios = false;
  let isCapturingVideos = false;
  let capturedUrls = new Set();

  // 🔥 存储媒体URL对应的请求头信息（用于权限验证）
  let mediaRequestHeaders = new Map();

  // 🔥 安全的消息发送函数（处理Extension Context失效）
  function safeSendMessage(message, callback) {
    try {
      // 检查extension context是否还有效
      if (!chrome.runtime || !chrome.runtime.id) {
        return;
      }
      chrome.runtime.sendMessage(message, (response) => {
        // 捕获Extension Context失效错误
        if (chrome.runtime.lastError) {
          // 静默处理 - 可能是扩展重新加载了
          return;
        }
        if (callback) {
          callback(response);
        }
      });
    } catch (error) {
      // Extension Context已失效，静默处理
      if (error.message.includes('Extension context invalidated')) {
        return;
      }
      console.warn('发送消息失败:', error);
    }
  }

  // 🔥 默认自动捕获配置
  const AUTO_CAPTURE_ON_LOAD = true; // 页面加载时自动捕获

  // 🔥 使用 Performance API 监听所有网络请求
  function observeNetworkResources() {
    // 监听页面加载完成后的所有资源
    if (window.PerformanceObserver) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (entry.name && !capturedUrls.has(entry.name)) {
            // 检查资源类型
            const initiatorType = entry.initiatorType || '';

            // 图片资源
            if (isCapturingImages && (initiatorType === 'img' || entry.name.includes('.jpg') ||
                entry.name.includes('.png') || entry.name.includes('.gif') ||
                entry.name.includes('.webp') || entry.name.includes('.svg'))) {
              checkMediaResource(entry.name, null);
            }

            // 音频资源（包括 audio 标签和其他方式加载的）
            if (isCapturingAudios && (initiatorType === 'audio' || entry.name.includes('.mp3') ||
                entry.name.includes('.wav') || entry.name.includes('.m4a') ||
                entry.name.includes('.aac') || entry.name.includes('.ogg') ||
                entry.name.includes('.flac') || entry.name.includes('.wma'))) {
              checkMediaResource(entry.name, null);
            }

            // 视频资源（包括 video 标签和其他方式加载的）
            if (isCapturingVideos && (initiatorType === 'video' || entry.name.includes('.mp4') ||
                entry.name.includes('.m3u8') || entry.name.includes('.ts') ||
                entry.name.includes('.webm') || entry.name.includes('.ogg'))) {
              checkMediaResource(entry.name, null);
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('PerformanceObserver 注册失败:', e);
      }
    }

  // 🔥 扫描已加载的所有资源 - 增强版
  setTimeout(() => {
      const resources = performance.getEntriesByType('resource');

      let imageCount = 0;
      let audioCount = 0;
      let videoCount = 0;

      resources.forEach((resource) => {
        if (resource.name && !capturedUrls.has(resource.name)) {
          const url = resource.name;

          // 🔥 检查图片 - 放宽判断条件
          if (isCapturingImages) {
            // 尝试多种方式判断是否为图片
            const contentType = resource.initiatorType === 'img' ? 'image' : null;
            if (isImage(url, contentType)) {
              imageCount++;
              checkMediaResource(url, contentType);
            }
          }

          // 🔥 检查音频
          if (isCapturingAudios) {
            if (isAudio(url, null)) {
              audioCount++;
              checkMediaResource(url, null);
            }
          }

          // 检查视频 - 移除流媒体格式支持
          if (isCapturingVideos) {
            const contentType = resource.initiatorType === 'video' ? 'video' : null;
            if (isVideo(url, contentType)) {
              videoCount++;
              checkMediaResource(url, contentType);
            }
          }
        }
      });

      if (imageCount > 0 || audioCount > 0 || videoCount > 0) {
        console.log(`✅ Performance API 扫描完成: ${imageCount} 图片, ${audioCount} 音频, ${videoCount} 视频`);
      }
    }, 1500);
  }

  // 拦截 XMLHttpRequest
  try {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('load', function() {
        if (this._url) {
          try {
            checkMediaResource(this._url, this.getResponseHeader('Content-Type'));
          } catch (e) {
            // 忽略错误
          }
        }
      });
      return originalXHRSend.apply(this, args);
    };
  } catch (e) {
    console.log('XHR 拦截失败:', e);
  }

  // 拦截 Fetch API
  try {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;

      return originalFetch.apply(this, args).then(response => {
        try {
          const contentType = response.headers.get('Content-Type');
          checkMediaResource(url, contentType);
        } catch (e) {
          // 忽略错误
        }
        return response;
      });
    };
  } catch (e) {
    console.log('Fetch 拦截失败:', e);
  }

  // 检查是否为媒体资源
  function checkMediaResource(url, contentType) {
    if (!url) {
      return;
    }

    // 🔥 智能标准化URL（根据文件类型决定是否保留参数）
    let normalizedUrl = url;
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname.toLowerCase();

      // 🔥 优先级1：对于有明确扩展名的媒体文件，移除所有查询参数
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
                               '.avif', '.apng', '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic', '.jxl'];
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mkv',
                               '.3gp', '.m3u8', '.m3u', '.ts', '.mpd'];
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.wma', '.opus', '.ogg'];

      const hasImageExt = imageExtensions.some(ext => pathname.endsWith(ext));
      const hasVideoExt = videoExtensions.some(ext => pathname.endsWith(ext));
      const hasAudioExt = audioExtensions.some(ext => pathname.endsWith(ext));
      const hasMediaExt = hasImageExt || hasVideoExt || hasAudioExt;

      if (hasMediaExt) {
        // 有明确的媒体文件扩展名，移除所有查询参数
        normalizedUrl = urlObj.origin + urlObj.pathname;
        console.log('✅ 媒体文件（有扩展名），移除所有参数:', normalizedUrl);
      } else {
        // 🔥 优先级2：没有扩展名，检查是否有格式相关查询参数
        const formatParam = urlObj.searchParams.get('format');
        const typeParam = urlObj.searchParams.get('type');
        const extParam = urlObj.searchParams.get('ext');
        const idParam = urlObj.searchParams.get('id');

        if (formatParam || typeParam || extParam || idParam) {
          // 保留重要的格式参数
          const importantParams = new URLSearchParams();
          if (formatParam) importantParams.set('format', formatParam);
          if (typeParam) importantParams.set('type', typeParam);
          if (extParam) importantParams.set('ext', extParam);
          if (idParam) importantParams.set('id', idParam);

          const queryString = importantParams.toString();
          normalizedUrl = urlObj.origin + urlObj.pathname + (queryString ? '?' + queryString : '');
          console.log('✅ 无扩展名，保留格式参数:', normalizedUrl);
        } else {
          // 🔥 优先级3：既没有扩展名也没有格式参数，移除所有查询参数
          normalizedUrl = urlObj.origin + urlObj.pathname;
          console.log('✅ 无扩展名且无格式参数，移除所有参数:', normalizedUrl);
        }
      }
    } catch (e) {
      // URL解析失败，使用原始URL
      console.log('⚠️ URL解析失败，使用原始URL:', url);
    }

    // 检查是否已捕获过（使用标准化后的URL）
    if (capturedUrls.has(normalizedUrl)) {
      return;
    }

    // 🔥 立即标记为已捕获（使用标准化后的URL）
    capturedUrls.add(normalizedUrl);

    // 检查图片
    if (isCapturingImages && isImage(url, contentType)) {
      captureImage(url, contentType);
    }

    // 检查音频
    if (isCapturingAudios && isAudio(url, contentType)) {
      captureAudio(url, contentType);
    }

    // 检查视频
    if (isCapturingVideos && isVideo(url, contentType)) {
      captureVideo(url, contentType, false); // false = 已经标记过，不需要再次标记
    }
  }

  // 判断是否为图片 - 增强版
  function isImage(url, contentType) {
    const urlLower = url.toLowerCase();

    // 🔥 先过滤掉 JavaScript bundle 文件（即使末尾有图片扩展名）
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

    for (const pattern of jsBundlePatterns) {
      if (urlLower.includes(pattern)) {
        return false;
      }
    }

    // 🔥 先过滤掉视频文件（重要！）
    const videoExtensions = [
      '.mp4', '.webm', '.ogg', '.ogv', '.avi', '.mov', '.wmv', '.flv',
      '.m4v', '.mkv', '.3gp', '.3g2', '.f4v', '.mpd', '.dash',
      '.m3u8', '.m3u', '.ts', '.rm', '.rmvb', '.asf', '.vob', '.drc',
      '.mng', '.qt', '.yuv', '.amv', '.m4p', '.mpg', '.mpeg', '.mpe',
      '.mpv', '.m2v', '.svi', '.mxf', '.roq', '.nsv', '.f4p', '.f4a', '.f4b'
    ];

    for (const ext of videoExtensions) {
      if (urlLower.includes(ext)) {
        return false;
      }
    }

    // 🔥 检查 Content-Type 是否为视频
    if (contentType && contentType.startsWith('video/')) {
      return false;
    }

    // 🔥 先过滤掉明显不是图片的文件类型
    const nonImageExtensions = [
      '.js', '.jsx', '.ts', '.tsx',      // JavaScript/TypeScript
      '.css', '.scss', '.sass', '.less', // 样式文件
      '.html', '.htm', '.xhtml',         // HTML 文件
      '.json', '.xml',                   // 数据文件
      '.woff', '.woff2', '.ttf', '.eot', '.otf', // 字体文件
      '.md', '.txt',                     // 文本文件
      '.pdf', '.doc', '.docx',           // 文档文件
      '.zip', '.rar', '.tar', '.gz',     // 压缩文件
      '.exe', '.dmg', '.apk',            // 可执行文件
      '.map', '.swf'                     // 其他非媒体文件
    ];

    for (const ext of nonImageExtensions) {
      if (urlLower.includes(ext)) {
        return false;
      }
    }

    // 🔥 特殊域名处理 - Twitter/X 图片
    if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
      return true;
    }

    // 🔥 通过查询参数判断
    try {
      const urlObj = new URL(url);
      const formatParam = urlObj.searchParams.get('format');
      const typeParam = urlObj.searchParams.get('type');
      const extParam = urlObj.searchParams.get('ext');

      const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'apng', 'tiff', 'tif', 'psd', 'raw', 'heif', 'heic', 'jxl'];

      if (formatParam && imageFormats.includes(formatParam.toLowerCase())) {
        return true;
      }
      if (typeParam && imageFormats.includes(typeParam.toLowerCase())) {
        return true;
      }
      if (extParam && imageFormats.includes(extParam.toLowerCase())) {
        return true;
      }
    } catch (e) {
      // URL 解析失败，继续其他检测
    }

    // 文件扩展名
    const imageExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
      '.avif', '.apng', '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic',
      '.jxl', '.jp2', '.jpf'
    ];

    const imageMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'image/bmp', 'image/x-icon', 'image/avif', 'image/tiff', 'image/heif',
      'image/heic', 'image/jxl'
    ];

    const hasExtension = imageExtensions.some(ext => urlLower.includes(ext));
    const hasMimeType = contentType && imageMimes.some(mime => contentType.includes(mime));

    return hasExtension || hasMimeType;
  }

  // 判断是否为视频 - 增强版
  function isVideo(url, contentType) {
    const urlLower = url.toLowerCase();

    // 🔥 先过滤掉 JavaScript bundle 文件
    const jsBundlePatterns = [
      '~loader.', 'bundle.', 'chunk.', '.js.',
      'vendor.', 'runtime.', 'main.', 'index.',
      'app.', 'common.', 'shared.'
    ];

    for (const pattern of jsBundlePatterns) {
      if (urlLower.includes(pattern)) {
        return false;
      }
    }

    // 🔥 通过查询参数判断
    try {
      const urlObj = new URL(url, 'http://example.com');
      const formatParam = urlObj.searchParams.get('format');
      const typeParam = urlObj.searchParams.get('type');

      const videoFormats = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'mkv', '3gp', 'ts', 'm3u8', 'm3u'];


      if (formatParam && videoFormats.includes(formatParam.toLowerCase())) {
        return true;
      }
      if (typeParam && videoFormats.includes(typeParam.toLowerCase())) {
        return true;
      }
    } catch (e) {
      // URL 解析失败，继续其他检测
    }

    // 🔥 文件扩展名 - 包含流媒体格式和普通视频
    const videoExtensions = [
      // 普通视频格式
      '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv',
      '.m4v', '.mkv', '.3gp', '.f4v', '.ogv', '.rm', '.rmvb',
      '.asf', '.vob', '.mpg', '.mpeg', '.mpe', '.mpv', '.m2v',
      // 流媒体格式（不包括 m4s 分片）
      '.m3u8', '.m3u', '.ts', '.mpd', '.dash'
    ];

    const videoMimes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
      'video/x-flv', 'video/x-m4v', 'video/matroska', 'video/3gpp',
      'video/x-flv', 'video/f4v',
      'application/dash+xml',
      'application/x-mpegURL', // m3u8
      'video/mp2t' // ts
    ];

    const hasExtension = videoExtensions.some(ext => urlLower.includes(ext));
    const hasMimeType = contentType && videoMimes.some(mime => contentType.includes(mime));

    return hasExtension || hasMimeType;
  }

  // 判断是否为音频 - 增强版
  function isAudio(url, contentType) {
    const urlLower = url.toLowerCase();

    // 🔥 通过查询参数判断
    try {
      const urlObj = new URL(url);
      const formatParam = urlObj.searchParams.get('format');
      const typeParam = urlObj.searchParams.get('type');

      const audioFormats = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'opus', 'aiff', 'aif', 'aifc', 'amr', '3gp', 'webm'];

      if (formatParam && audioFormats.includes(formatParam.toLowerCase())) {
        return true;
      }
      if (typeParam && audioFormats.includes(typeParam.toLowerCase())) {
        return true;
      }
    } catch (e) {
      // URL 解析失败，继续其他检测
    }

    // 文件扩展名
    const audioExtensions = [
      '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus',
      '.aiff', '.aif', '.aifc', '.amr', '.3gp', '.webm', '.mp4a', '.ac3'
    ];

    const audioMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac',
      'audio/x-ms-wma', 'audio/webm', 'audio/opus', 'audio/aiff',
      'audio/x-aiff', 'audio/amr', 'audio/ac3'
    ];

    const hasExtension = audioExtensions.some(ext => urlLower.includes(ext));
    const hasMimeType = contentType && audioMimes.some(mime => contentType.includes(mime));

    return hasExtension || hasMimeType;
  }

  // 捕获图片
  function captureImage(url, contentType, markAsCaptured = true) {
    // 🔥 立即标记为已捕获，防止重复请求
    if (markAsCaptured) {
      capturedUrls.add(url);
    }

    // 🔥 获取请求头信息
    const requestHeaders = mediaRequestHeaders.get(url);

    // 获取图片大小
    fetch(url)
      .then(response => {
        const size = response.headers.get('Content-Length');
        const sizeFormatted = size ? formatSize(parseInt(size)) : '未知大小';

        const media = {
          url: url,
          type: contentType || 'image/jpeg',
          size: sizeFormatted,
          timestamp: Date.now(),
          // 🔥 添加请求头信息（用于下载时的权限验证）
          requestHeaders: requestHeaders ? {
            referer: requestHeaders.referer,
            userAgent: requestHeaders.userAgent,
            cookie: requestHeaders.cookie
          } : null
        };

        // 发送到 popup（忽略错误，因为popup可能未打开）
        safeSendMessage({
          action: 'capturedMedia',
          type: 'image',
          media: media
        }, () => {
          // 忽略"没有消息接收器"的错误
          if (chrome.runtime.lastError) {
            // 静默处理 - popup可能只是没有打开
          }
        });
      })
      .catch(err => {
        // 即使无法获取大小，仍然捕获图片
        const media = {
          url: url,
          type: contentType || 'image/jpeg',
          size: '未知大小',
          timestamp: Date.now(),
          // 🔥 添加请求头信息（用于下载时的权限验证）
          requestHeaders: requestHeaders ? {
            referer: requestHeaders.referer,
            userAgent: requestHeaders.userAgent,
            cookie: requestHeaders.cookie
          } : null
        };

        safeSendMessage({
          action: 'capturedMedia',
          type: 'image',
          media: media
        }, () => {
          if (chrome.runtime.lastError) {
            // 静默处理
          }
        });
      });
  }

  // 捕获音频
  function captureAudio(url, contentType, markAsCaptured = true) {
    // 🔥 立即标记为已捕获，防止重复请求
    if (markAsCaptured) {
      capturedUrls.add(url);
    }

    // 🔥 获取请求头信息
    const requestHeaders = mediaRequestHeaders.get(url);

    fetch(url)
      .then(response => {
        const size = response.headers.get('Content-Length');
        const sizeFormatted = size ? formatSize(parseInt(size)) : '未知大小';

        let audioType = contentType || detectAudioType(url);

        const media = {
          url: url,
          type: audioType,
          size: sizeFormatted,
          timestamp: Date.now(),
          // 🔥 添加请求头信息（用于下载时的权限验证）
          requestHeaders: requestHeaders ? {
            referer: requestHeaders.referer,
            userAgent: requestHeaders.userAgent,
            cookie: requestHeaders.cookie
          } : null
        };

        // 发送到 popup（忽略错误，因为popup可能未打开）
        safeSendMessage({
          action: 'capturedMedia',
          type: 'audio',
          media: media
        }, () => {
          if (chrome.runtime.lastError) {
            // 静默处理
          }
        });
      })
      .catch(err => {
        let audioType = contentType || detectAudioType(url);

        const media = {
          url: url,
          type: audioType,
          size: '未知大小',
          timestamp: Date.now(),
          // 🔥 添加请求头信息（用于下载时的权限验证）
          requestHeaders: requestHeaders ? {
            referer: requestHeaders.referer,
            userAgent: requestHeaders.userAgent,
            cookie: requestHeaders.cookie
          } : null
        };

        safeSendMessage({
          action: 'capturedMedia',
          type: 'audio',
          media: media
        }, () => {
          if (chrome.runtime.lastError) {
            // 静默处理
          }
        });
      });
  }

  // 捕获视频
  function captureVideo(url, contentType, markAsCaptured = true) {
    // 🔥 立即标记为已捕获，防止重复请求
    if (markAsCaptured) {
      capturedUrls.add(url);
    }

    // 🔥 获取请求头信息
    const requestHeaders = mediaRequestHeaders.get(url);

    fetch(url)
      .then(response => {
        const size = response.headers.get('Content-Length');
        const sizeFormatted = size ? formatSize(parseInt(size)) : '未知大小';

        let videoType = contentType || detectVideoType(url);

        const media = {
          url: url,
          type: videoType,
          size: sizeFormatted,
          timestamp: Date.now(),
          // 🔥 添加请求头信息（用于下载时的权限验证）
          requestHeaders: requestHeaders ? {
            referer: requestHeaders.referer,
            userAgent: requestHeaders.userAgent,
            cookie: requestHeaders.cookie
          } : null
        };

        // 发送到 popup（忽略错误，因为popup可能未打开）
        safeSendMessage({
          action: 'capturedMedia',
          type: 'video',
          media: media
        }, () => {
          if (chrome.runtime.lastError) {
            // 静默处理
          }
        });
      })
      .catch(err => {
        let videoType = contentType || detectVideoType(url);

        const media = {
          url: url,
          type: videoType,
          size: '未知大小',
          timestamp: Date.now(),
          // 🔥 添加请求头信息（用于下载时的权限验证）
          requestHeaders: requestHeaders ? {
            referer: requestHeaders.referer,
            userAgent: requestHeaders.userAgent,
            cookie: requestHeaders.cookie
          } : null
        };

        safeSendMessage({
          action: 'capturedMedia',
          type: 'video',
          media: media
        }, () => {
          if (chrome.runtime.lastError) {
            // 静默处理
          }
        });
      });
  }

  // 🔥 根据扩展名检测视频类型（恢复所有格式）
  function detectVideoType(url) {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('.m3u8') || urlLower.includes('.m3u')) {
      return 'application/x-mpegURL'; // HLS
    } else if (urlLower.includes('.ts')) {
      return 'video/mp2t'; // MPEG-TS
    } else if (urlLower.includes('.mpd') || urlLower.includes('.dash')) {
      return 'application/dash+xml'; // MPEG-DASH
    } else if (urlLower.includes('.mp4')) {
      return 'video/mp4';
    } else if (urlLower.includes('.webm')) {
      return 'video/webm';
    } else if (urlLower.includes('.ogg') || urlLower.includes('.ogv')) {
      return 'video/ogg';
    } else if (urlLower.includes('.mov')) {
      return 'video/quicktime';
    }

    return 'video/mp4'; // 默认
  }

  // 🔥 根据扩展名检测音频类型
  function detectAudioType(url) {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('.mp3')) {
      return 'audio/mpeg';
    } else if (urlLower.includes('.wav')) {
      return 'audio/wav';
    } else if (urlLower.includes('.ogg') || urlLower.includes('.oga')) {
      return 'audio/ogg';
    } else if (urlLower.includes('.aac')) {
      return 'audio/aac';
    } else if (urlLower.includes('.flac')) {
      return 'audio/flac';
    } else if (urlLower.includes('.m4a')) {
      return 'audio/mp4';
    } else if (urlLower.includes('.wma')) {
      return 'audio/x-ms-wma';
    } else if (urlLower.includes('.opus')) {
      return 'audio/opus';
    } else if (urlLower.includes('.webm')) {
      return 'audio/webm';
    }

    return 'audio/mpeg'; // 默认
  }

  // 格式化文件大小
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startCapture') {
      if (message.type === 'images') {
        isCapturingImages = true;
      } else if (message.type === 'audios') {
        isCapturingAudios = true;
      } else if (message.type === 'videos') {
        isCapturingVideos = true;
      }

      sendResponse({ success: true });
    } else if (message.action === 'stopCapture') {
      if (message.type === 'images') {
        isCapturingImages = false;
      } else if (message.type === 'audios') {
        isCapturingAudios = false;
      } else if (message.type === 'videos') {
        isCapturingVideos = false;
      }

      sendResponse({ success: true });
    } else if (message.action === 'getCaptureStatus') {
      // 🔥 返回当前捕获状态
      sendResponse({
        isCapturingImages,
        isCapturingAudios,
        isCapturingVideos
      });
    } else if (message.action === 'mediaResourceDetected') {
      // 🔥 来自background script的媒体检测
      const { url, type, pageInfo } = message;

      if (capturedUrls.has(url)) {
        return; // 已经捕获过
      }

      // 🔥 存储请求头信息（用于下载时的权限验证）
      if (pageInfo) {
        mediaRequestHeaders.set(url, {
          referer: pageInfo.referer || window.location.href,
          userAgent: navigator.userAgent,
          cookie: document.cookie
        });
        console.log('🔐 存储请求头信息:', url, pageInfo.referer);
      }

      // 🔥 立即标记为已捕获
      capturedUrls.add(url);

      // 根据类型捕获
      if (type === 'video' && isCapturingVideos) {
        captureVideo(url, null, false);
      } else if (type === 'audio' && isCapturingAudios) {
        captureAudio(url, null, false);
      } else if (type === 'image' && isCapturingImages) {
        captureImage(url, null, false);
      }
    }

    return true; // 保持消息通道开放
  });

  // 监听 DOM 变化，捕获通过 img/video 标签加载的媒体
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // 元素节点
            // 检查 img 标签
            if (node.tagName === 'IMG' && isCapturingImages) {
              const url = node.src || node.currentSrc;
              if (url && !capturedUrls.has(url)) {
                checkMediaResource(url, 'image');
              }

              // 🔥 检查 srcset 属性（Twitter 可能使用 srcset 加载不同尺寸的图片）
              if (node.srcset) {
                const srcsetUrls = node.srcset.split(',').map(s => s.trim().split(' ')[0]);
                srcsetUrls.forEach(srcsetUrl => {
                  if (srcsetUrl && !capturedUrls.has(srcsetUrl)) {
                    checkMediaResource(srcsetUrl, 'image');
                  }
                });
              }
            }

            // 检查 audio 标签
            if (node.tagName === 'AUDIO' && isCapturingAudios) {
              const url = node.src || node.currentSrc;
              if (url && !capturedUrls.has(url)) {
                checkMediaResource(url, 'audio');
              }

              // 检查 audio 标签的 source 子元素
              const sources = node.querySelectorAll('source');
              sources.forEach(source => {
                const sourceUrl = source.src;
                if (sourceUrl && !capturedUrls.has(sourceUrl)) {
                  checkMediaResource(sourceUrl, 'audio');
                }
              });
            }

            // 检查 picture 标签
            if (node.tagName === 'PICTURE' && isCapturingImages) {
              const imgs = node.querySelectorAll('img');
              imgs.forEach(img => {
                const url = img.src || img.currentSrc;
                if (url && !capturedUrls.has(url)) {
                  checkMediaResource(url, 'image');
                }

                // 🔥 检查 srcset 属性
                if (img.srcset) {
                  const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
                  srcsetUrls.forEach(srcsetUrl => {
                    if (srcsetUrl && !capturedUrls.has(srcsetUrl)) {
                      checkMediaResource(srcsetUrl, 'image');
                    }
                  });
                }
              });

              // 🔥 检查 picture 标签的 source 子元素
              const sources = node.querySelectorAll('source');
              sources.forEach(source => {
                const sourceUrl = source.srcset;
                if (sourceUrl) {
                  const srcsetUrls = sourceUrl.split(',').map(s => s.trim().split(' ')[0]);
                  srcsetUrls.forEach(srcsetUrl => {
                    if (srcsetUrl && !capturedUrls.has(srcsetUrl)) {
                      checkMediaResource(srcsetUrl, 'image');
                    }
                  });
                }
              });
            }

            // 检查所有后代元素
            if (node.querySelectorAll) {
              const images = node.querySelectorAll('img');
              const audios = node.querySelectorAll('audio');
              const videos = node.querySelectorAll('video');

              if (isCapturingImages) {
                images.forEach(img => {
                  const url = img.src || img.currentSrc;
                  if (url && !capturedUrls.has(url)) {
                    checkMediaResource(url, 'image');
                  }

                  // 🔥 检查 srcset 属性
                  if (img.srcset) {
                    const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
                    srcsetUrls.forEach(srcsetUrl => {
                      if (srcsetUrl && !capturedUrls.has(srcsetUrl)) {
                        checkMediaResource(srcsetUrl, 'image');
                      }
                    });
                  }
                });
              }

              if (isCapturingAudios) {
                audios.forEach(audio => {
                  const url = audio.src || audio.currentSrc;
                  if (url && !capturedUrls.has(url)) {
                    checkMediaResource(url, 'audio');
                  }

                  const sources = audio.querySelectorAll('source');
                  sources.forEach(source => {
                    const sourceUrl = source.src;
                    if (sourceUrl && !capturedUrls.has(sourceUrl)) {
                      checkMediaResource(sourceUrl, 'audio');
                    }
                  });
                });
              }

              if (isCapturingVideos) {
                videos.forEach(video => {
                  const url = video.src || video.currentSrc;
                  if (url && !capturedUrls.has(url)) {
                    checkMediaResource(url, 'video');
                  }

                  const sources = video.querySelectorAll('source');
                  sources.forEach(source => {
                    const sourceUrl = source.src;
                    if (sourceUrl && !capturedUrls.has(sourceUrl)) {
                      checkMediaResource(sourceUrl, 'video');
                    }
                  });
                });
              }
            }
          }
        });
      });
    });

    // 开始观察
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // 页面加载完成后开始观察 DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDOM);
  } else {
    observeDOM();
  }

  // 捕获页面上已存在的媒体
  function captureExistingMedia() {
    setTimeout(() => {
      let totalCaptured = 0;

      // 捕获已存在的图片
      if (isCapturingImages) {
        const images = document.querySelectorAll('img');

        let capturedCount = 0;
        images.forEach((img, index) => {
          const url = img.src || img.currentSrc;
          if (url && !capturedUrls.has(url)) {
            checkMediaResource(url, 'image');
            capturedCount++;
          }

          // 🔥 检查 srcset 属性
          if (img.srcset) {
            const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
            srcsetUrls.forEach(srcsetUrl => {
              if (srcsetUrl && !capturedUrls.has(srcsetUrl)) {
                checkMediaResource(srcsetUrl, 'image');
                capturedCount++;
              }
            });
          }
        });

        // 🔍 检查 CSS background-image
        const allElements = document.querySelectorAll('*');
        let bgCount = 0;

        allElements.forEach(el => {
          const computedStyle = window.getComputedStyle(el);
          const bgImage = computedStyle.backgroundImage;

          if (bgImage && bgImage !== 'none') {
            // 提取 URL，格式可能是 url("...") 或 url(...)
            const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
            if (matches) {
              matches.forEach(match => {
                const url = match.replace(/url\(['"]?|['"]?\)/g, '');
                if (url && !capturedUrls.has(url) && !url.startsWith('data:')) {
                  bgCount++;
                  checkMediaResource(url, 'image');
                }
              });
            }
          }
        });

        totalCaptured += capturedCount + bgCount;
      }

      // 捕获已存在的音频
      if (isCapturingAudios) {
        const audios = document.querySelectorAll('audio');

        audios.forEach(audio => {
          const url = audio.src || audio.currentSrc;
          if (url && !capturedUrls.has(url)) {
            checkMediaResource(url, 'audio');
            totalCaptured++;
          }

          const sources = audio.querySelectorAll('source');
          sources.forEach(source => {
            const sourceUrl = source.src;
            if (sourceUrl && !capturedUrls.has(sourceUrl)) {
              checkMediaResource(sourceUrl, 'audio');
              totalCaptured++;
            }
          });
        });
      }

      // 捕获已存在的视频
      if (isCapturingVideos) {
        const videos = document.querySelectorAll('video');

        videos.forEach(video => {
          const url = video.src || video.currentSrc;
          if (url && !capturedUrls.has(url)) {
            checkMediaResource(url, 'video');
            totalCaptured++;
          }

          const sources = video.querySelectorAll('source');
          sources.forEach(source => {
            const sourceUrl = source.src;
            if (sourceUrl && !capturedUrls.has(sourceUrl)) {
              checkMediaResource(sourceUrl, 'video');
              totalCaptured++;
            }
          });
        });
      }

      console.log('✅ 页面媒体扫描完成');
    }, 100);
  }

  // 监听捕获状态变化，捕获现有媒体
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'startCapture') {
      captureExistingMedia();
    }
  });

  // 🔥 页面加载时自动开始捕获
  function autoStartCapture() {
    if (AUTO_CAPTURE_ON_LOAD) {
      // 自动开始捕获图片、音频和视频
      isCapturingImages = true;
      isCapturingAudios = true;
      isCapturingVideos = true;

      // 🔥 启动网络资源监听
      observeNetworkResources();

      // 通知 background 和 popup
      safeSendMessage({
        action: 'autoCaptureStarted',
        images: true,
        audios: true,
        videos: true
      });

      // 🔥 立即捕获现有媒体（不延迟）
      captureExistingMedia();

      // 🔥 多次延迟扫描，确保捕获动态加载的内容
      const delays = [500, 1000, 2000, 3000, 5000, 8000];
      delays.forEach(delay => {
        setTimeout(() => {
          console.log(`🔍 延迟扫描 (${delay}ms)...`);
          captureExistingMedia();
        }, delay);
      });
    }
  }

  // 页面加载完成后自动启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoStartCapture);
  } else {
    // 页面已经加载完成，立即启动
    autoStartCapture();
  }

  console.log('📸 媒体捕获器已加载 - 自动捕获: ' + (AUTO_CAPTURE_ON_LOAD ? '开启' : '关闭'));
})();
