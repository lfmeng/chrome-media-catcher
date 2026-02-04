# 视频流关联功能说明

## 🔗 功能概述

视频流关联功能可以自动识别和关联来自同一个源的视频和音频流。这对于处理 HLS、DASH 等流媒体格式特别有用，因为这些格式通常将视频和音频分离存储。

## ✨ 功能特点

### 1. 自动识别流关联
- **智能匹配**：通过 URL 模式识别相关的视频和音频流
- **支持多种格式**：HLS (.m3u8), DASH (.mpd), MPEG-TS (.ts) 等
- **分片检测**：自动识别 segment, chunk, frag 等分片模式

### 2. URL 分析
提取基础标识符时考虑：
- 移除文件扩展名（.ts, .m4s, .mp4 等）
- 移除分段标识符（segment_001, seg1, chunk0 等）
- 保留重要查询参数（id, quality, type 等）
- 路径相似度匹配（Levenshtein 距离算法）

### 3. 可视化提示
在视频列表中显示：
- 🔗 关联音频: X 个（绿色标签）
- 🔗 关联视频: X 个（绿色标签）

## 🎯 工作原理

### 流匹配算法

```
示例 URL:
- 视频: https://example.com/video/segment_001_video.ts
- 音频: https://example.com/video/segment_001_audio.ts

提取基础 ID:
- 视频: example.com/video/segment_
- 音频: example.com/video/segment_

匹配: ✅ 属于同一流
```

### 识别的模式

| 模式 | 说明 | 示例 |
|------|------|------|
| `segment_\d+` | 分段标识 | segment_00001.ts |
| `seg\d+` | 简短分段 | seg1.ts |
| `-chunk\d+` | 块标识 | video-chunk0.m4s |
| `_\d+$` | 末尾数字 | video_1.ts, video_2.ts |
| `.m4s` | DASH 分片 | video_0.m4s, audio_0.m4s |
| `.ts` | MPEG-TS 分片 | segment.ts |

## 📊 使用场景

### 场景 1: HLS 流媒体
```
视频文件:
- video_00001.ts
- video_00002.ts
- video_00003.ts

音频文件:
- audio_00001.ts  ← 关联到 video_00001.ts
- audio_00002.ts  ← 关联到 video_00002.ts
- audio_00003.ts  ← 关联到 video_00003.ts
```

### 场景 2: DASH 流媒体
```
视频文件:
- video-chunk0.m4s
- video-chunk1.m4s

音频文件:
- audio-chunk0.m4s  ← 关联到 video-chunk0.m4s
- audio-chunk1.m4s  ← 关联到 video-chunk1.m4s
```

## 🛠️ 技术实现

### 核心类: StreamGroupHelper

```javascript
// 创建实例
const helper = new StreamGroupHelper();

// 判断两个 URL 是否关联
const isRelated = helper.isRelatedStream(videoUrl, audioUrl);

// 查找相关的音频
const relatedAudios = helper.findRelatedAudio(videoUrl, allAudioUrls);

// 分析流的组成
const info = helper.analyzeStreamComposition(url, 'video');
// 返回: { url, type, streamType, baseId, isFragment }
```

### 匹配算法

1. **精确匹配**：基础 ID 完全相同
2. **模糊匹配**：相似度 ≥ 80%（Levenshtein 距离）
3. **流类型检测**：HLS, DASH, MPEG-TS, Fragment

## 🔧 配置文件

### stream-group-helper.js
包含所有关联逻辑的核心文件。

### 修改的文件
1. `stream-group-helper.js` - 新增
2. `popup.html` - 引入 stream-group-helper.js
3. `popup.js` - 集成关联功能

## 💡 使用提示

### 查看关联信息
1. 打开扩展 popup
2. 开始捕获视频和音频
3. 查看视频列表
4. 关联的视频/音频会显示绿色标签："🔗 关联 X 个"

### 控制台日志
捕获时会输出关联信息：
```
🔗 视频关联到 2 个音频: https://example.com/video.ts
🔗 音频关联到 1 个视频: https://example.com/audio.ts
```

## 🎉 优势

1. **自动化**：无需手动匹配，自动识别关联
2. **准确性**：基于 URL 模式，准确率高
3. **实时性**：捕获时即时分析和关联
4. **可扩展**：支持添加更多匹配模式

## 📝 未来改进

- [ ] 合并视频和音频流下载
- [ ] 显示流的完整组成（所有分段）
- [ ] 导出流关联报告
- [ ] 支持 HLS 播放列表解析
- [ ] 支持 DASH MPD 文件解析
