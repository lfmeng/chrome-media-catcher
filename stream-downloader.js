// 流媒体视频下载和转换工具
class StreamVideoDownloader {
  constructor() {
    this.isConverting = false;
  }

  // 检测是否为流媒体URL
  isStreamUrl(url) {
    const urlLower = url.toLowerCase();
    const streamFormats = ['.m3u8', '.m3u', '.ts', '.mpd', '.dash'];
    return streamFormats.some(ext => urlLower.includes(ext));
  }

  // 检测URL类型
  detectStreamType(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.m3u8') || urlLower.includes('.m3u')) {
      return 'hls';
    } else if (urlLower.includes('.mpd') || urlLower.includes('.dash')) {
      return 'dash';
    } else if (urlLower.includes('.ts')) {
      return 'mpegts';
    } else if (urlLower.includes('.m4s')) {
      return 'm4s';
    }
    return 'unknown';
  }

  // 🔥 通过 background script 调用本地 FFmpeg（修复：popup 不能直接调用 Native Host）
  async convertWithLocalFFmpeg(url, videoType, progressCallback, options = {}) {
    return new Promise((resolve, reject) => {
      progressCallback({ type: 'info', message: '正在调用本地FFmpeg...' });

      // 🔥 改为通过 background script 通信
      chrome.runtime.sendMessage(
        {
          action: 'convertWithFFmpeg',
          url: url,
          type: videoType,
          // 🔥 传递 Cookie 和 User-Agent
          cookie: options.cookie || '',
          userAgent: options.userAgent || '',
          referer: options.referer || ''
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.success) {
            // 转换成功
            const videoData = new Uint8Array(response.data);
            const blob = new Blob([videoData], { type: response.type });

            resolve({
              blob: blob,
              filename: response.filename,
              success: true
            });
          } else {
            // 转换失败
            reject(new Error(response?.error || 'FFmpeg转换失败'));
          }
        }
      );
    });
  }

  // 主下载方法：优先使用本地FFmpeg
  async download(url, progressCallback, options = {}) {
    const streamType = this.detectStreamType(url);

    // 🔥 优先尝试使用本地FFmpeg (支持 HLS、MPEG-TS、M4S)
    if (streamType === 'hls' || streamType === 'mpegts' || streamType === 'm4s') {
      progressCallback({ type: 'info', message: `检测到 ${streamType.toUpperCase()} 流媒体，正在调用本地FFmpeg转换...` });

      try {
        const result = await this.convertWithLocalFFmpeg(url, streamType, progressCallback, options);

        if (result.success) {
          progressCallback({ type: 'progress', percent: 100, message: '✅ 转换完成！已生成MP4文件' });
          return result;
        }
      } catch (ffmpegError) {
        console.warn('本地FFmpeg转换失败，降级为打包下载:', ffmpegError);
        progressCallback({ type: 'info', message: '本地FFmpeg不可用，使用打包下载...' });

        // 降级到原来的打包下载方式
        if (streamType === 'hls') {
          return await this.downloadAndConvertM3U8(url, progressCallback);
        } else if (streamType === 'mpegts') {
          return await this.downloadAndConvertTS(url, progressCallback);
        } else if (streamType === 'm4s') {
          // M4S 没有降级方案，直接抛出错误
          throw new Error('M4S格式需要本地FFmpeg支持，请运行 native_host/install.sh 安装');
        }
      }
    }

    // 其他格式使用原来的处理方式
    switch (streamType) {
      case 'hls':
        return await this.downloadAndConvertM3U8(url, progressCallback);

      case 'mpegts':
        return await this.downloadAndConvertTS(url, progressCallback);

      case 'dash':
        throw new Error('⚠️ DASH 流媒体格式暂不支持，请使用 youtube-dl 或 yt-dlp 下载');

      default:
        throw new Error('不支持的流媒体格式');
    }
  }

  // 下载m3u8视频 - 下载播放列表和所有分片，打包成ZIP
  async downloadAndConvertM3U8(url, progressCallback) {
    try {
      progressCallback({ type: 'info', message: '正在解析 m3u8 播放列表...' });

      // 下载m3u8播放列表
      const response = await fetch(url);
      const m3u8Content = await response.text();

      // 解析m3u8，获取所有ts分片URL
      const tsUrls = this.parseM3U8(m3u8Content, url);

      if (tsUrls.length === 0) {
        throw new Error('未找到任何视频分片');
      }

      progressCallback({ type: 'info', message: `找到 ${tsUrls.length} 个视频分片` });

      // 创建ZIP文件
      const zip = new JSZip();

      // 添加m3u8播放列表
      const m3u8FileName = this.generateFileName(url, 'm3u8');
      zip.file(m3u8FileName, m3u8Content);

      // 创建ts文件夹
      const tsFolder = zip.folder('segments');

      // 下载所有ts分片
      for (let i = 0; i < tsUrls.length; i++) {
        const percent = Math.round(((i + 1) / tsUrls.length) * 90);
        progressCallback({ type: 'progress', percent, message: `下载分片 ${i + 1}/${tsUrls.length}` });

        try {
          const segmentResponse = await fetch(tsUrls[i]);
          const segmentData = await segmentResponse.arrayBuffer();

          // 生成分片文件名
          const segmentFileName = `segment_${String(i + 1).padStart(5, '0')}.ts`;
          tsFolder.file(segmentFileName, segmentData);
        } catch (err) {
          console.warn(`分片 ${i + 1} 下载失败:`, err);
          // 继续下载其他分片
        }
      }

      progressCallback({ type: 'progress', percent: 95, message: '正在打包...' });

      // 添加说明文件
      const readme = `# HLS视频下载说明

此ZIP包含以下文件：
- ${m3u8FileName}: m3u8播放列表
- segments/: 文件夹包含 ${tsUrls.length} 个TS视频分片

## 如何转换为MP4：

### 方法1：使用FFmpeg（推荐）
1. 安装FFmpeg: https://ffmpeg.org/download.html
2. 解压此ZIP文件
3. 在命令行中运行：
   ffmpeg -i ${m3u8FileName} -c copy video.mp4

### 方法2：使用在线工具
访问 https://www.online-convert.com/ 将m3u8文件转换为MP4

### 方法3：使用VLC播放器
1. 下载VLC播放器: https://www.videolan.org/
2. 打开VLC，选择 "媒体" -> "打开网络串流"
3. 输入原始m3u8 URL: ${url}
4. 点击 "播放" -> 选择 "流" -> "添加" -> 选择转码格式为MP4
`;

      zip.file('README.txt', readme);

      // 生成ZIP
      progressCallback({ type: 'progress', percent: 98, message: '正在生成ZIP文件...' });
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      progressCallback({ type: 'progress', percent: 100, message: '完成！' });

      return {
        blob: zipBlob,
        filename: this.generateFileName(url, 'zip'),
        success: true,
        isZip: true
      };

    } catch (error) {
      console.error('m3u8下载失败:', error);
      throw error;
    }
  }

  // 解析m3u8播放列表
  parseM3U8(content, baseUrl) {
    const lines = content.split('\n');
    const tsUrls = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        // 这是一个分片URL
        let tsUrl = trimmedLine;

        // 如果是相对路径，转换为绝对路径
        if (!tsUrl.startsWith('http')) {
          const baseObj = new URL(baseUrl);
          const basePath = baseObj.pathname.substring(0, baseObj.pathname.lastIndexOf('/'));
          tsUrl = `${baseObj.protocol}//${baseObj.host}${basePath}/${tsUrl}`;
        }

        tsUrls.push(tsUrl);
      }
    }

    return tsUrls;
  }

  // 下载单个TS文件 - 直接下载，不转换
  async downloadAndConvertTS(url, progressCallback) {
    try {
      progressCallback({ type: 'info', message: '正在下载TS视频文件...' });

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      progressCallback({ type: 'progress', percent: 90, message: '下载完成...' });

      // TS文件可以直接下载
      const blob = new Blob([arrayBuffer], { type: 'video/mp2t' });

      progressCallback({ type: 'progress', percent: 100, message: '完成！' });

      return {
        blob: blob,
        filename: this.generateFileName(url, 'ts'),
        success: true,
        needsConversion: true,
        conversionTip: 'TS文件可以使用VLC播放器播放，或使用FFmpeg转换为MP4: ffmpeg -i input.ts -c copy output.mp4'
      };

    } catch (error) {
      console.error('TS下载失败:', error);
      throw error;
    }
  }

  // 生成文件名
  generateFileName(url, extension) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

      if (nameWithoutExt) {
        return `${nameWithoutExt}.${extension}`;
      }
    } catch (e) {
      // URL解析失败
    }

    return `video_${Date.now()}.${extension}`;
  }

  // 触发浏览器下载
  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 延迟释放URL对象
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }
}

// 导出到全局
window.StreamVideoDownloader = StreamVideoDownloader;
