// Background Service Worker
console.log('Service Worker 开始加载...');

// 🔥 存储捕获状态
let captureState = {
  images: true,
  audios: true,
  videos: true
};

// 🔥 存储已捕获的 m3u8 主文件的 URL 基础路径
// 用于过滤掉 m3u8 的分片文件（.ts、.m3s 等）
let capturedM3u8Bases = new Set();

// 🔥 存储已捕获的 mpd 主文件的 URL 基础路径
// 用于过滤掉 DASH 的分片文件（.m4s 等）
let capturedMpdBases = new Set();

// 🔥 存储已捕获的 m3u8 主文件的基础名称（用于去重视频/音频）
// 例如：stream.m3u8 和 stream_audio.m3u8 只保留一个
let capturedM3u8Names = new Set();

// 🔥 监听 webRequest 请求 - 使用 onHeadersReceived 获取准确的内容类型
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // 🔥 忽略非 http/https 请求和特殊页面
    if (details.tabId < 0) return;

    // 🔥 获取标签页信息，检查是否为特殊页面
    chrome.tabs.get(details.tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) {
        return;
      }

      const url = tab.url;
      // 跳过特殊页面
      if (url.startsWith('chrome://') ||
          url.startsWith('chrome-extension://') ||
          url.startsWith('about:') ||
          url.startsWith('edge://') ||
          url.startsWith('opera://')) {
        return;
      }

      const contentType = details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-type')?.value;

      console.log('🔍 检测请求:', details.url, contentType);

      let mediaType = null;

      // 🔥 首先通过 Content-Type 判断（最准确）
      if (contentType) {
        const contentTypeLower = contentType.toLowerCase();

        // 图片类型
        if (contentTypeLower.startsWith('image/')) {
          mediaType = 'image';
          console.log('✅ 通过 Content-Type 识别为图片:', contentType);
        }
        // 音频类型（包括流媒体）
        else if (contentTypeLower.startsWith('audio/') ||
                 contentTypeLower.includes('mpegurl') ||  // HLS
                 contentTypeLower.includes('dash+xml')) {  // DASH
          mediaType = 'audio';
          console.log('✅ 通过 Content-Type 识别为音频:', contentType);
        }
        // 视频类型（不包含流媒体）
        else if (contentTypeLower.startsWith('video/')) {
          mediaType = 'video';
          console.log('✅ 通过 Content-Type 识别为视频:', contentType);
        }
      }

      // 🔥 如果没有 Content-Type 或无法判断，通过 URL 判断
      if (!mediaType) {
        // 🔥 优先检查特殊域名（Twitter等使用查询参数的网站）
        const urlLower = details.url.toLowerCase();
        if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
          mediaType = 'image';
          console.log('✅ 通过 Twitter 域名识别为图片');
        } else if (isVideoUrl(details.url)) {
          mediaType = 'video';
          console.log('✅ 通过 URL 识别为视频');
        } else if (isAudioUrl(details.url)) {
          mediaType = 'audio';
          console.log('✅ 通过 URL 识别为音频');
        } else if (isImageUrl(details.url)) {
          mediaType = 'image';
          console.log('✅ 通过 URL 识别为图片');
        }
      }

      if (mediaType) {
        // 🔥 检查是否为流媒体分片文件，如果是则跳过（video 和 audio 都检查）
        if ((mediaType === 'video' || mediaType === 'audio') && isStreamSegment(details.url)) {
          console.log('🚫 过滤流媒体分片文件:', details.url, '类型:', mediaType);
          return { cancel: false };
        }

        // 🔥 如果是流媒体主文件，记录其基础路径
        if (mediaType === 'video' && isStreamMainFile(details.url)) {
          const baseUrl = getStreamBaseUrl(details.url);

          // 🔥 特殊处理 m3u8：视频和音频只保留一个
          if (details.url.toLowerCase().includes('.m3u8') || details.url.toLowerCase().includes('.m3u')) {
            const baseName = getM3u8BaseName(details.url);

            // 如果基础名称已存在，跳过（去重视频/音频）
            if (capturedM3u8Names.has(baseName)) {
              console.log('🚫 过滤重复的 m3u8:', details.url, '基础名称:', baseName);
              return { cancel: false };
            }

            // 记录基础名称
            capturedM3u8Names.add(baseName);
            capturedM3u8Bases.add(baseUrl);
            console.log('📝 记录 m3u8 基础路径:', baseUrl, '基础名称:', baseName);
          } else if (details.url.toLowerCase().includes('.mpd')) {
            capturedMpdBases.add(baseUrl);
            console.log('📝 记录 mpd 基础路径:', baseUrl);
          }
        }

        console.log('🎯 捕获到媒体资源:', mediaType, details.url);

        // 只向发起请求的标签页发送消息
        chrome.tabs.sendMessage(details.tabId, {
          action: 'mediaResourceDetected',
          url: details.url,
          type: mediaType,
          contentType: contentType,
          // 🔥 添加页面信息，用于权限验证
          pageInfo: {
            referer: tab.url, // 页面URL作为Referer
            tabId: details.tabId
          }
        }).catch(err => {
          console.log('发送消息失败:', err);
        });
      }
    });

    return { cancel: false };
  },
  { urls: ['http://*/*', 'https://*/*'] },
  ['responseHeaders']
);

// 🔥 判断是否为音频URL - 增强版
function isAudioUrl(url) {
  const urlLower = url.toLowerCase();

  // 通过查询参数判断
  const urlParams = new URL(url, 'http://example.com').searchParams;
  const formatParam = urlParams.get('format');
  const typeParam = urlParams.get('type');

  if (formatParam && ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'opus'].includes(formatParam.toLowerCase())) {
    return true;
  }

  // 文件扩展名
  const audioExtensions = [
    '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus',
    '.aiff', '.aif', '.aifc', '.amr', '.3gp', '.webm', '.mp4a', '.ac3'
  ];
  return audioExtensions.some(ext => urlLower.includes(ext));
}

// 🔥 判断是否为视频URL（不包含流媒体）
function isVideoUrl(url) {
  const urlLower = url.toLowerCase();

  // 通过查询参数判断
  const urlParams = new URL(url, 'http://example.com').searchParams;
  const formatParam = urlParams.get('format');
  const typeParam = urlParams.get('type');

  // 恢复所有视频格式支持
  if (formatParam && ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'm4s', 'mkv', '3gp', 'ts', 'm3u8', 'm3u'].includes(formatParam.toLowerCase())) {
    return true;
  }

  // 文件扩展名 - 恢复所有格式
  const videoExtensions = [
    '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv',
    '.m4v', '.m4s', '.mkv', '.3gp', '.m3u8', '.m3u', '.ts',
    '.f4v', '.mpd', '.dash', '.ogv'
  ];
  return videoExtensions.some(ext => urlLower.includes(ext));
}

// 🔥 判断是否为图片URL - 增强版
function isImageUrl(url) {
  const urlLower = url.toLowerCase();

  // 🔥 先过滤掉视频文件（重要！）
  const videoExtensions = [
    '.mp4', '.webm', '.ogg', '.ogv', '.avi', '.mov', '.wmv', '.flv',
    '.m4v', '.m4s', '.mkv', '.3gp', '.3g2', '.f4v', '.mpd', '.dash',
    '.m3u8', '.m3u', '.ts', '.rm', '.rmvb', '.asf', '.vob', '.drc',
    '.mng', '.qt', '.yuv', '.amv', '.m4p', '.mpg', '.mpeg', '.mpe',
    '.mpv', '.m2v', '.svi', '.mxf', '.roq', '.nsv', '.f4p', '.f4a', '.f4b'
  ];

  for (const ext of videoExtensions) {
    if (urlLower.includes(ext)) {
      console.log('❌ Background: 过滤视频文件:', ext, url);
      return false;
    }
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
    '.map', '.swf',                    // 其他非媒体文件
    '.mp3', '.wav', '.m4a', '.aac', '.flac', '.wma' // 音频文件
  ];

  for (const ext of nonImageExtensions) {
    if (urlLower.includes(ext)) {
      console.log('❌ Background: 过滤非图片文件:', ext, url);
      return false;
    }
  }

  // 🔥 特殊域名处理 - Twitter/X 图片
  if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
    console.log('✅ Background: 检测到 Twitter 域名，直接识别为图片');
    return true;
  }

  // 🔥 通过查询参数判断
  try {
    const urlObj = new URL(url);
    const formatParam = urlObj.searchParams.get('format');
    const typeParam = urlObj.searchParams.get('type');
    const extParam = urlObj.searchParams.get('ext');

    console.log('🔍 检查图片 URL:', url);
    console.log('  - format:', formatParam);
    console.log('  - type:', typeParam);
    console.log('  - ext:', extParam);

    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'apng', 'tiff', 'tif', 'psd', 'raw', 'heif', 'heic', 'jxl'];

    if (formatParam && imageFormats.includes(formatParam.toLowerCase())) {
      console.log('✅ 通过 format 参数识别为图片');
      return true;
    }
    if (typeParam && imageFormats.includes(typeParam.toLowerCase())) {
      console.log('✅ 通过 type 参数识别为图片');
      return true;
    }
    if (extParam && imageFormats.includes(extParam.toLowerCase())) {
      console.log('✅ 通过 ext 参数识别为图片');
      return true;
    }
  } catch (e) {
    console.log('❌ URL 解析失败:', e, url);
    // URL 解析失败，继续其他检测
  }

  // 文件扩展名
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
    '.avif', '.apng', '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic',
    '.jxl', '.jxr', '.jp2', '.jpf', '.jpx', '.pmg', '.pnm', '.pbm',
    '.pgm', '.ppm', '.bpg', '.flif', '.pict', '.tga', '.ilbm', '.iff'
  ];

  const hasExtension = imageExtensions.some(ext => urlLower.includes(ext));
  if (hasExtension) {
    console.log('✅ 通过文件扩展名识别为图片');
  }

  return hasExtension;
}

// 🔥 流媒体分片过滤辅助函数

/**
 * 判断是否为流媒体主文件（.m3u8、.m3u、.mpd）
 */
function isStreamMainFile(url) {
  const urlLower = url.toLowerCase();
  return urlLower.includes('.m3u8') ||
         urlLower.includes('.m3u') ||
         urlLower.includes('.mpd');
}

/**
 * 判断是否为流媒体分片文件（.ts、.m3s、.m4s）
 * 直接过滤所有常见的分片格式
 */
function isStreamSegment(url) {
  const urlLower = url.toLowerCase();

  // 常见的流媒体分片扩展名
  const segmentExtensions = ['.ts', '.m3s', '.m4s', '.m4v', '.tm3', '.cmfv'];

  // 🔥 检查 URL 是否以分片扩展名结尾
  for (const ext of segmentExtensions) {
    // 匹配路径结尾或查询参数结尾，例如：
    // - https://example.com/video/segment001.ts
    // - https://example.com/video/segment.m3u8?type=m3s (这种情况较少)
    const regex = new RegExp(`${ext.replace('.', '\\.')}$`, 'i');

    if (regex.test(urlLower) || urlLower.includes(`${ext}?`)) {
      console.log('🔍 识别为分片文件:', url, '扩展名:', ext);
      return true;
    }
  }

  return false;
}

/**
 * 获取流媒体 URL 的基础路径
 * 例如: https://example.com/video/stream.m3u8 -> https://example.com/video/
 */
function getStreamBaseUrl(streamUrl) {
  try {
    const urlObj = new URL(streamUrl);
    const pathname = urlObj.pathname;

    // 找到最后一个 / 的位置
    const lastSlashIndex = pathname.lastIndexOf('/');

    if (lastSlashIndex > 0) {
      // 提取基础路径（包括子目录）
      const basePath = pathname.substring(0, lastSlashIndex + 1);
      return `${urlObj.protocol}//${urlObj.host}${basePath}`;
    }

    // 如果没有子目录，返回根路径
    return `${urlObj.protocol}//${urlObj.host}/`;
  } catch (e) {
    console.error('❌ 解析流媒体 URL 失败:', e);
    return null;
  }
}

/**
 * 获取 m3u8 文件的基础名称（用于去重视频/音频）
 * 去掉 _video、_audio、.m3u8 等后缀
 * 例如：
 * - stream.m3u8 -> stream
 * - stream_video.m3u8 -> stream
 * - stream_audio.m3u8 -> stream
 * - index.m3u8 -> index
 */
function getM3u8BaseName(m3u8Url) {
  try {
    const urlObj = new URL(m3u8Url);
    const pathname = urlObj.pathname;

    // 提取文件名（不含路径）
    const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);

    // 去掉 .m3u8 或 .m3u 扩展名
    let baseName = fileName.replace(/\.(m3u8|m3u)$/i, '');

    // 去掉常见的后缀标识（视频/音频）
    baseName = baseName.replace(/_video$/i, '');
    baseName = baseName.replace(/_audio$/i, '');
    baseName = baseName.replace(/_sound$/i, '');
    baseName = baseName.replace(/_hd$/i, '');
    baseName = baseName.replace(/_sd$/i, '');

    return baseName;
  } catch (e) {
    console.error('❌ 解析 m3u8 基础名称失败:', e);
    return null;
  }
}

/**
 * 判断某个 URL 是否属于已捕获的流媒体（m3u8 或 mpd）
 */
function belongsToStream(url) {
  try {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname;

    // 检查是否属于已捕获的 m3u8
    for (const baseUrl of capturedM3u8Bases) {
      try {
        const baseObj = new URL(baseUrl);
        const basePath = baseObj.pathname;

        if (urlPath.startsWith(basePath) && urlObj.host === baseObj.host) {
          console.log('🔗 分片属于 m3u8:', url);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    // 检查是否属于已捕获的 mpd
    for (const baseUrl of capturedMpdBases) {
      try {
        const baseObj = new URL(baseUrl);
        const basePath = baseObj.pathname;

        if (urlPath.startsWith(basePath) && urlObj.host === baseObj.host) {
          console.log('🔗 分片属于 mpd:', url);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  } catch (e) {
    console.error('❌ 判断 URL 归属失败:', e);
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 收到消息:', message);

  if (message.action === 'getCaptureStatus') {
    sendResponse(captureState);
  } else if (message.action === 'updateCaptureState') {
    captureState = message.state;
    sendResponse({ success: true });
  } else if (message.action === 'getCookies') {
    // 🔥 获取 Cookies
    chrome.cookies.getAll({ url: message.url }, (cookies) => {
      sendResponse({ cookies: cookies || [] });
    });
    return true; // 保持消息通道开放
  } else if (message.action === 'fetchBlob') {
    // 🔥 获取文件Blob（用于批量下载，绕过CORS）
    handleFetchBlob(message, sendResponse);
    return true; // 保持消息通道开放
  } else if (message.action === 'downloadFile') {
    // 🔥 下载文件（绕过CORS限制）
    handleDownloadFile(message, sendResponse);
    return true; // 保持消息通道开放
  } else if (message.action === 'convertWithFFmpeg') {
    // 🔥 处理 FFmpeg 转换请求
    handleFFmpegConversion(message, sendResponse);
    return true; // 保持消息通道开放
  } else {
    sendResponse({ success: true });
  }

  return true;
});

// 🔥 获取文件Blob（用于批量下载）
async function handleFetchBlob(message, sendResponse) {
  const { url, requestHeaders } = message;

  console.log('📥 获取Blob:', url);
  console.log('🔐 原始请求头:', requestHeaders);

  try {
    // 🔥 获取当前标签页的完整 Cookie
    let fullCookie = requestHeaders?.cookie || '';

    // 如果 URL 是微博等需要 HttpOnly Cookie 的网站，通过 Chrome API 获取完整 Cookie
    try {
      const urlObj = new URL(url);
      const cookies = await chrome.cookies.getAll({ domain: urlObj.hostname });

      if (cookies && cookies.length > 0) {
        fullCookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`🍪 获取到 ${cookies.length} 个 Cookie`);
      }
    } catch (err) {
      console.warn('获取 Cookie 失败:', err);
    }

    // 🔥 构建完整的请求头
    const headers = {
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'same-site',
    };

    // 添加 Referer
    if (requestHeaders?.referer) {
      headers['Referer'] = requestHeaders.referer;
    }

    // 添加 User-Agent
    if (requestHeaders?.userAgent) {
      headers['User-Agent'] = requestHeaders.userAgent;
    }

    // 添加 Cookie
    if (fullCookie) {
      headers['Cookie'] = fullCookie;
    }

    console.log('🔐 实际请求头:', headers);

    // 使用fetch下载
    const response = await fetch(url, {
      headers: headers
    });

    console.log('📊 响应状态:', response.status, response.statusText);
    console.log('📊 响应类型:', response.headers.get('Content-Type'));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('✅ Blob 类型:', blob.type, '大小:', blob.size);

    // 将blob转换为base64（因为不能直接传递blob）
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1]; // 移除data:xxx;base64,前缀
      sendResponse({
        success: true,
        data: base64data,
        type: blob.type
      });
    };
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error('❌ 获取Blob失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 🔥 处理文件下载（绕过CORS）
async function handleDownloadFile(message, sendResponse) {
  const { url, requestHeaders } = message;

  console.log('📥 Background下载文件:', url);
  console.log('🔐 原始请求头:', requestHeaders);

  // 从URL中提取文件名
  let fileName = 'download';
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    fileName = pathname.split('/').pop();

    // 如果没有扩展名，根据URL参数添加
    if (fileName && !fileName.includes('.')) {
      const urlParams = new URLSearchParams(urlObj.search);
      const format = urlParams.get('format');
      if (format) {
        fileName += '.' + format;
      }
    }

    // 如果文件名为空，使用默认名称
    if (!fileName) {
      const timestamp = Date.now();
      fileName = `download_${timestamp}`;
    }
  } catch (e) {
    console.error('❌ 解析URL失败:', e);
    fileName = `download_${Date.now()}`;
  }

  try {
    // 🔥 获取当前标签页的完整 Cookie
    let fullCookie = requestHeaders?.cookie || '';

    // 如果 URL 是微博等需要 HttpOnly Cookie 的网站，通过 Chrome API 获取完整 Cookie
    try {
      const urlObj = new URL(url);
      const cookies = await chrome.cookies.getAll({ domain: urlObj.hostname });

      if (cookies && cookies.length > 0) {
        fullCookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`🍪 获取到 ${cookies.length} 个 Cookie`);
      }
    } catch (err) {
      console.warn('获取 Cookie 失败:', err);
    }

    // 🔥 构建完整的请求头
    const headers = {};

    // 添加 Referer
    if (requestHeaders?.referer) {
      headers['Referer'] = requestHeaders.referer;
    }

    // 添加 User-Agent
    if (requestHeaders?.userAgent) {
      headers['User-Agent'] = requestHeaders.userAgent;
    }

    // 添加 Cookie
    if (fullCookie) {
      headers['Cookie'] = fullCookie;
    }

    console.log('🔐 实际请求头:', headers);

    // 使用fetch下载（background script不受CORS限制）
    const response = await fetch(url, {
      headers: headers
    });

    console.log('📊 响应状态:', response.status, response.statusText);
    console.log('📊 响应类型:', response.headers.get('Content-Type'));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('✅ Blob 类型:', blob.type, '大小:', blob.size);

    // 创建Blob URL
    const blobUrl = URL.createObjectURL(blob);

    // 使用chrome.downloads.download下载
    chrome.downloads.download({
      url: blobUrl,
      filename: fileName,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('❌ 下载失败:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        console.log('✅ 下载成功:', fileName);

        // 清理Blob URL（延迟执行，确保下载开始）
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5000);

        sendResponse({
          success: true,
          filename: fileName,
          downloadId: downloadId
        });
      }
    });
  } catch (error) {
    console.error('❌ Fetch失败:', error);

    // 降级方案：直接使用chrome.downloads.download（不带请求头）
    console.log('🔄 降级到直接下载');
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        sendResponse({
          success: true,
          filename: fileName,
          downloadId: downloadId,
          note: '降级下载（未使用请求头）'
        });
      }
    });
  }
}

// 🔥 处理 FFmpeg 转换
function handleFFmpegConversion(message, sendResponse) {
  console.log('🎬 开始 FFmpeg 转换:', {
    url: message.url,
    videoType: message.type,
    hasCookie: !!message.cookie,
    hasUserAgent: !!message.userAgent
  });

  try {
    // 连接到 Native Host
    const port = chrome.runtime.connectNative('com.chrome.media.catcher.ffmpeg');

    // 设置超时（10分钟）
    const timeout = setTimeout(() => {
      port.disconnect();
      sendResponse({
        success: false,
        error: 'FFmpeg转换超时（10分钟）'
      });
    }, 600000);

    // 监听响应
    port.onMessage.addListener((response) => {
      // 🔥 处理进度消息
      if (response.type === 'progress') {
        // 转发进度消息给 popup
        console.log('📊 FFmpeg 进度:', response);
        // 注意：这里不能直接 sendResponse，因为是异步的
        // 需要使用其他方式通知 popup（比如 chrome.tabs.sendMessage）
        return;
      }

      // 🔥 处理最终结果
      clearTimeout(timeout);

      if (response.success) {
        console.log('✅ FFmpeg 转换成功');
        sendResponse({
          success: true,
          data: response.data,
          type: response.type,
          filename: response.filename
        });
      } else {
        console.error('❌ FFmpeg 转换失败:', response.error);
        sendResponse({
          success: false,
          error: response.error || 'FFmpeg转换失败'
        });
      }

      port.disconnect();
    });

    // 监听断开
    port.onDisconnect.addListener(() => {
      clearTimeout(timeout);

      if (chrome.runtime.lastError) {
        console.error('❌ Native Host 断开连接:', chrome.runtime.lastError.message);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      }
    });

    // 🔥 发送转换请求（包含 Cookie 和 User-Agent）
    port.postMessage({
      action: 'convert',
      url: message.url,
      type: message.type,
      cookie: message.cookie || '',
      userAgent: message.userAgent || '',
      referer: message.referer || ''
    });

    console.log('✅ 已发送转换请求到 Native Host');

  } catch (error) {
    console.error('❌ 连接 Native Host 失败:', error);
    sendResponse({
      success: false,
      error: `无法连接到Native Host: ${error.message}\n\n请运行 native_host/install.sh 安装Native Host`
    });
  }
}

chrome.runtime.onStartup.addListener(() => {
  console.log('Service Worker 启动');
});

console.log('Service Worker 加载完成');
