// 🔥 视频流关联工具 - 识别相关的视频和音频流
class StreamGroupHelper {
  constructor() {
    this.streamGroups = new Map(); // 存储视频流分组
  }

  // 🔥 从 URL 提取基础标识符
  extractBaseId(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const search = urlObj.search;

      // 1. 移除文件扩展名
      const withoutExt = pathname.replace(/\.[^/.]+$/, '');

      // 2. 移除常见的分段标识符
      const patterns = [
        /segment_\d+/,           // segment_00001, segment_00002
        /seg\d+/,                // seg1, seg2
        /\d+$/,                  // 末尾数字
        /-chunk\d+/,            // video-chunk0, video-chunk1
        /_part\d+/,             // part1, part2
        /frag\d+/,              // frag1, frag2
        /\.m4s$/,               // 移除 .m4s（虽然已过滤，但保留逻辑）
        /\.ts$/,                // 移除 .ts
        /\.m4s$/,               // DASH 分片
      ];

      let baseId = withoutExt;
      for (const pattern of patterns) {
        baseId = baseId.replace(pattern, '');
      }

      // 3. 添加查询参数（如果有）
      if (search) {
        // 只保留重要参数，忽略随机 token 等
        const searchObj = new URLSearchParams(search);
        const importantParams = [];

        if (searchObj.has('id')) importantParams.push(`id=${searchObj.get('id')}`);
        if (searchObj.has('quality')) importantParams.push(`quality=${searchObj.get('quality')}`);
        if (searchObj.has('type')) importantParams.push(`type=${searchObj.get('type')}`);

        if (importantParams.length > 0) {
          baseId += '?' + importantParams.join('&');
        }
      }

      return baseId;
    } catch (e) {
      // URL 解析失败，直接返回原始 URL 的简化版本
      return url.split('?')[0].replace(/\d+/g, '').replace(/segment_|seg|chunk|frag/g, '');
    }
  }

  // 🔥 判断两个 URL 是否属于同一个视频流
  isRelatedStream(url1, url2) {
    const baseId1 = this.extractBaseId(url1);
    const baseId2 = this.extractBaseId(url2);

    // 精确匹配
    if (baseId1 === baseId2) {
      return true;
    }

    // 模糊匹配：允许路径相似度达到 80%
    const similarity = this.calculateSimilarity(baseId1, baseId2);
    return similarity >= 0.8;
  }

  // 🔥 计算两个字符串的相似度（Levenshtein 距离）
  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = [];

    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // 删除
          matrix[i][j - 1] + 1,      // 插入
          matrix[i - 1][j - 1] + cost // 替换
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLen;
  }

  // 🔥 添加流到分组
  addToGroup(url, type) {
    const baseId = this.extractBaseId(url);

    if (!this.streamGroups.has(baseId)) {
      this.streamGroups.set(baseId, {
        baseId: baseId,
        videos: [],
        audios: [],
        sampleUrl: url
      });
    }

    const group = this.streamGroups.get(baseId);

    if (type === 'video') {
      group.videos.push(url);
    } else if (type === 'audio') {
      group.audios.push(url);
    }

    return group;
  }

  // 🔥 获取流分组
  getStreamGroups() {
    return Array.from(this.streamGroups.values());
  }

  // 🔥 根据视频 URL 查找相关的音频
  findRelatedAudio(videoUrl, allAudios) {
    const related = [];

    for (const audioUrl of allAudios) {
      if (this.isRelatedStream(videoUrl, audioUrl)) {
        related.push(audioUrl);
      }
    }

    return related;
  }

  // 🔥 根据音频 URL 查找相关的视频
  findRelatedVideo(audioUrl, allVideos) {
    const related = [];

    for (const videoUrl of allVideos) {
      if (this.isRelatedStream(audioUrl, videoUrl)) {
        related.push(videoUrl);
      }
    }

    return related;
  }

  // 🔥 检测流类型
  detectStreamType(url) {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('.m3u8') || urlLower.includes('.m3u')) {
      return 'hls';
    } else if (urlLower.includes('.mpd') || urlLower.includes('.dash')) {
      return 'dash';
    } else if (urlLower.includes('.ts')) {
      return 'mpegts';
    }

    // 检查是否是分片文件
    if (urlLower.match(/segment|seg|chunk|frag|_\d+\.|-\d+\.|\.m4s/i)) {
      return 'fragment';
    }

    return 'unknown';
  }

  // 🔥 分析流的组成（视频、音频、混合）
  analyzeStreamComposition(url, type) {
    const streamType = this.detectStreamType(url);

    return {
      url: url,
      type: type,
      streamType: streamType,
      baseId: this.extractBaseId(url),
      isFragment: streamType === 'fragment' || ['hls', 'dash', 'mpegts'].includes(streamType)
    };
  }
}

// 导出到全局
window.StreamGroupHelper = StreamGroupHelper;
