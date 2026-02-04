// 测试 Twitter 图片 URL 识别逻辑

// 测试 URL
const testUrl = 'https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium';

console.log('🔍 测试 URL:', testUrl);
console.log('');

// ========== 测试 background.js 的 isImageUrl 函数 ==========
function testBackgroundIsImageUrl(url) {
  console.log('========== 测试 background.js isImageUrl ==========');
  const urlLower = url.toLowerCase();

  // 1. 检查视频扩展名过滤
  const videoExtensions = [
    '.mp4', '.webm', '.ogg', '.ogv', '.avi', '.mov', '.wmv', '.flv',
    '.m4v', '.m4s', '.mkv', '.3gp', '.3g2', '.f4v', '.mpd', '.dash',
    '.m3u8', '.m3u', '.ts', '.rm', '.rmvb', '.asf', '.vob', '.drc',
    '.mng', '.qt', '.yuv', '.amv', '.m4p', '.mpg', '.mpeg', '.mpe',
    '.mpv', '.m2v', '.svi', '.mxf', '.roq', '.nsv', '.f4p', '.f4a', '.f4b'
  ];

  let filtered = false;
  for (const ext of videoExtensions) {
    if (urlLower.includes(ext)) {
      console.log('❌ 被视频扩展名过滤:', ext);
      filtered = true;
      break;
    }
  }

  if (!filtered) {
    console.log('✅ 通过视频扩展名过滤');
  }

  // 2. 检查非图片扩展名过滤
  const nonImageExtensions = [
    '.js', '.jsx', '.ts', '.tsx',
    '.css', '.scss', '.sass', '.less',
    '.html', '.htm', '.xhtml',
    '.json', '.xml',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.md', '.txt',
    '.pdf', '.doc', '.docx',
    '.zip', '.rar', '.tar', '.gz',
    '.exe', '.dmg', '.apk',
    '.map', '.swf',
    '.mp3', '.wav', '.m4a', '.aac', '.flac', '.wma'
  ];

  filtered = false;
  for (const ext of nonImageExtensions) {
    if (urlLower.includes(ext)) {
      console.log('❌ 被非图片扩展名过滤:', ext);
      filtered = true;
      break;
    }
  }

  if (!filtered) {
    console.log('✅ 通过非图片扩展名过滤');
  }

  // 3. 检查 Twitter 域名
  if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
    console.log('✅ 通过 Twitter 域名识别');
    return true;
  } else {
    console.log('❌ 未通过 Twitter 域名识别');
  }

  // 4. 检查 format 参数
  try {
    const urlObj = new URL(url);
    const formatParam = urlObj.searchParams.get('format');
    const typeParam = urlObj.searchParams.get('type');
    const extParam = urlObj.searchParams.get('ext');

    console.log('📋 查询参数:');
    console.log('  - format:', formatParam);
    console.log('  - type:', typeParam);
    console.log('  - ext:', extParam);

    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'apng', 'tiff', 'tif', 'psd', 'raw', 'heif', 'heic', 'jxl'];

    if (formatParam && imageFormats.includes(formatParam.toLowerCase())) {
      console.log('✅ 通过 format 参数识别:', formatParam);
      return true;
    }

    if (typeParam && imageFormats.includes(typeParam.toLowerCase())) {
      console.log('✅ 通过 type 参数识别:', typeParam);
      return true;
    }

    if (extParam && imageFormats.includes(extParam.toLowerCase())) {
      console.log('✅ 通过 ext 参数识别:', extParam);
      return true;
    }
  } catch (e) {
    console.log('❌ URL 解析失败:', e);
  }

  // 5. 检查文件扩展名
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
    '.avif', '.apng', '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic',
    '.jxl', '.jxr', '.jp2', '.jpf', '.jpx', '.pmg', '.pnm', '.pbm',
    '.pgm', '.ppm', '.bpg', '.flif', '.pict', '.tga', '.ilbm', '.iff'
  ];

  const hasExtension = imageExtensions.some(ext => urlLower.includes(ext));
  if (hasExtension) {
    console.log('✅ 通过文件扩展名识别');
    return true;
  } else {
    console.log('❌ 未通过文件扩展名识别');
    return false;
  }
}

// ========== 测试 content.js 的 isImage 函数 ==========
function testContentIsImage(url) {
  console.log('');
  console.log('========== 测试 content.js isImage ==========');
  const urlLower = url.toLowerCase();

  // 1. 检查 JS bundle 过滤
  const jsBundlePatterns = [
    '~loader.', 'bundle.', 'chunk.', '.js.',
    'vendor.', 'runtime.', 'main.', 'index.',
    'app.', 'common.', 'shared.'
  ];

  let filtered = false;
  for (const pattern of jsBundlePatterns) {
    if (urlLower.includes(pattern)) {
      console.log('❌ 被 JS bundle 过滤:', pattern);
      filtered = true;
      break;
    }
  }

  if (!filtered) {
    console.log('✅ 通过 JS bundle 过滤');
  }

  // 2. 检查视频扩展名过滤
  const videoExtensions = [
    '.mp4', '.webm', '.ogg', '.ogv', '.avi', '.mov', '.wmv', '.flv',
    '.m4v', '.mkv', '.3gp', '.3g2', '.f4v', '.mpd', '.dash',
    '.m3u8', '.m3u', '.ts', '.rm', '.rmvb', '.asf', '.vob', '.drc',
    '.mng', '.qt', '.yuv', '.amv', '.m4p', '.mpg', '.mpeg', '.mpe',
    '.mpv', '.m2v', '.svi', '.mxf', '.roq', '.nsv', '.f4p', '.f4a', '.f4b'
  ];

  filtered = false;
  for (const ext of videoExtensions) {
    if (urlLower.includes(ext)) {
      console.log('❌ 被视频扩展名过滤:', ext);
      filtered = true;
      break;
    }
  }

  if (!filtered) {
    console.log('✅ 通过视频扩展名过滤');
  }

  // 3. 检查非图片扩展名过滤
  const nonImageExtensions = [
    '.js', '.jsx', '.ts', '.tsx',
    '.css', '.scss', '.sass', '.less',
    '.html', '.htm', '.xhtml',
    '.json', '.xml',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.md', '.txt',
    '.pdf', '.doc', '.docx',
    '.zip', '.rar', '.tar', '.gz',
    '.exe', '.dmg', '.apk',
    '.map', '.swf'
  ];

  filtered = false;
  for (const ext of nonImageExtensions) {
    if (urlLower.includes(ext)) {
      console.log('❌ 被非图片扩展名过滤:', ext);
      filtered = true;
      break;
    }
  }

  if (!filtered) {
    console.log('✅ 通过非图片扩展名过滤');
  }

  // 4. 检查 Twitter 域名
  if (urlLower.includes('pbs.twimg.com') || urlLower.includes('twimg.com')) {
    console.log('✅ 通过 Twitter 域名识别');
    return true;
  } else {
    console.log('❌ 未通过 Twitter 域名识别');
  }

  // 5. 检查 format 参数
  try {
    const urlObj = new URL(url);
    const formatParam = urlObj.searchParams.get('format');
    const typeParam = urlObj.searchParams.get('type');
    const extParam = urlObj.searchParams.get('ext');

    console.log('📋 查询参数:');
    console.log('  - format:', formatParam);
    console.log('  - type:', typeParam);
    console.log('  - ext:', extParam);

    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'apng', 'tiff', 'tif', 'psd', 'raw', 'heif', 'heic', 'jxl'];

    if (formatParam && imageFormats.includes(formatParam.toLowerCase())) {
      console.log('✅ 通过 format 参数识别:', formatParam);
      return true;
    }

    if (typeParam && imageFormats.includes(typeParam.toLowerCase())) {
      console.log('✅ 通过 type 参数识别:', typeParam);
      return true;
    }

    if (extParam && imageFormats.includes(extParam.toLowerCase())) {
      console.log('✅ 通过 ext 参数识别:', extParam);
      return true;
    }
  } catch (e) {
    console.log('❌ URL 解析失败:', e);
  }

  // 6. 检查文件扩展名
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
    '.avif', '.apng', '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic',
    '.jxl', '.jp2', '.jpf'
  ];

  const hasExtension = imageExtensions.some(ext => urlLower.includes(ext));
  if (hasExtension) {
    console.log('✅ 通过文件扩展名识别');
    return true;
  } else {
    console.log('❌ 未通过文件扩展名识别');
    return false;
  }
}

// ========== 测试 URL 标准化 ==========
function testUrlNormalization(url) {
  console.log('');
  console.log('========== 测试 URL 标准化 ==========');

  try {
    const urlObj = new URL(url);

    // 🔥 检查是否有重要的格式相关查询参数
    const formatParam = urlObj.searchParams.get('format');
    const typeParam = urlObj.searchParams.get('type');
    const extParam = urlObj.searchParams.get('ext');
    const idParam = urlObj.searchParams.get('id');

    console.log('📋 重要参数:');
    console.log('  - format:', formatParam);
    console.log('  - type:', typeParam);
    console.log('  - ext:', extParam);
    console.log('  - id:', idParam);

    let normalizedUrl;

    // 如果有格式参数，保留这些重要参数
    if (formatParam || typeParam || extParam || idParam) {
      const importantParams = new URLSearchParams();
      if (formatParam) importantParams.set('format', formatParam);
      if (typeParam) importantParams.set('type', typeParam);
      if (extParam) importantParams.set('ext', extParam);
      if (idParam) importantParams.set('id', idParam);

      const queryString = importantParams.toString();
      normalizedUrl = urlObj.origin + urlObj.pathname + (queryString ? '?' + queryString : '');

      console.log('✅ 保留重要参数');
      console.log('📝 标准化后的 URL:', normalizedUrl);
    } else {
      // 没有重要参数，移除所有查询参数和片段
      normalizedUrl = urlObj.origin + urlObj.pathname;
      console.log('✅ 移除所有查询参数');
      console.log('📝 标准化后的 URL:', normalizedUrl);
    }

    return normalizedUrl;
  } catch (e) {
    console.log('❌ URL 解析失败:', e);
    return url;
  }
}

// ========== 执行测试 ==========

// 测试 background.js
const bgResult = testBackgroundIsImageUrl(testUrl);
console.log('');
console.log('========== background.js 测试结果 ==========');
console.log('最终结果:', bgResult ? '✅ 识别为图片' : '❌ 未识别');

// 测试 content.js
const contentResult = testContentIsImage(testUrl);
console.log('');
console.log('========== content.js 测试结果 ==========');
console.log('最终结果:', contentResult ? '✅ 识别为图片' : '❌ 未识别');

// 测试 URL 标准化
const normalizedUrl = testUrlNormalization(testUrl);
console.log('');
console.log('========== 去重测试 ==========');
console.log('原始 URL:', testUrl);
console.log('标准化 URL:', normalizedUrl);
console.log('去重效果:', normalizedUrl === testUrl ? '❌ 无变化（可能重复）' : '✅ 已标准化');
