// 测试图片URL标准化逻辑

console.log('========================================');
console.log('   图片URL标准化测试');
console.log('========================================\n');

// ========== 模拟 content.js 的标准化函数 ==========
function normalizeImageUrl(url) {
  let normalizedUrl = url;
  try {
    const urlObj = new URL(url, 'http://example.com');
    const pathname = urlObj.pathname.toLowerCase();

    // 媒体文件扩展名列表
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
      console.log('  ✅ 有扩展名，移除所有参数');
    } else {
      // 没有扩展名，检查是否有格式相关查询参数
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
        console.log('  ✅ 无扩展名，保留格式参数');
      } else {
        // 既没有扩展名也没有格式参数，移除所有查询参数
        normalizedUrl = urlObj.origin + urlObj.pathname;
        console.log('  ✅ 无扩展名且无格式参数，移除所有参数');
      }
    }
  } catch (e) {
    console.log('  ⚠️ URL解析失败，使用原始URL');
  }

  return normalizedUrl;
}

// ========== 测试用例 ==========
const testCases = [
  {
    name: '新浪微博图片（有.jpg扩展名）',
    url: 'https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg?KID=imgbed,tva&Expires=1770210780&ssig=ZVB5f00iHX',
    expected: 'https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg'
  },
  {
    name: '新浪微博图片（有.png扩展名）',
    url: 'https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.png?KID=imgbed,tva&Expires=1770210780&ssig=ZVB5f00iHX',
    expected: 'https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.png'
  },
  {
    name: 'Twitter图片（无扩展名，format参数）',
    url: 'https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium',
    expected: 'https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg'
  },
  {
    name: 'Twitter图片（无扩展名，type参数）',
    url: 'https://pbs.twimg.com/media/ABC123?type=png&size=large',
    expected: 'https://pbs.twimg.com/media/ABC123?type=png'
  },
  {
    name: '普通图片（有.jpg扩展名，有其他参数）',
    url: 'https://example.com/images/photo.jpg?v=123&token=abc',
    expected: 'https://example.com/images/photo.jpg'
  },
  {
    name: '普通视频（有.mp4扩展名）',
    url: 'https://example.com/videos/movie.mp4?t=123&quality=hd',
    expected: 'https://example.com/videos/movie.mp4'
  },
  {
    name: '音频文件（有.mp3扩展名）',
    url: 'https://example.com/audio/song.mp3?user=test&session=xyz',
    expected: 'https://example.com/audio/song.mp3'
  },
  {
    name: '无扩展名的资源（有format参数）',
    url: 'https://example.com/media/item123?format=webp&quality=high',
    expected: 'https://example.com/media/item123?format=webp'
  },
  {
    name: '无扩展名的资源（有id参数）',
    url: 'https://example.com/resource?id=456&temp=true',
    expected: 'https://example.com/resource?id=456'
  },
  {
    name: '无扩展名且无格式参数',
    url: 'https://example.com/resource/page?param1=value1&param2=value2',
    expected: 'https://example.com/resource/page'
  }
];

// ========== 执行测试 ==========
let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  console.log(`原始URL: ${testCase.url}`);

  const result = normalizeImageUrl(testCase.url);
  const pass = result === testCase.expected;

  if (pass) {
    console.log(`✅ 通过`);
    passCount++;
  } else {
    console.log(`❌ 失败`);
    console.log(`   预期: ${testCase.expected}`);
    console.log(`   实际: ${result}`);
    failCount++;
  }

  console.log('');
});

// ========== 测试结果汇总 ==========
console.log('========================================');
console.log('   测试结果汇总');
console.log('========================================');
console.log(`✅ 通过: ${passCount} / ${testCases.length}`);
console.log(`❌ 失败: ${failCount} / ${testCases.length}`);
console.log(`📊 通过率: ${((passCount / testCases.length) * 100).toFixed(1)}%`);
console.log('');

if (failCount === 0) {
  console.log('🎉 所有测试通过！');
} else {
  console.log('⚠️ 存在失败的测试用例，请检查逻辑');
}

// ========== 去重测试 ==========
console.log('');
console.log('========================================');
console.log('   去重效果测试');
console.log('========================================\n');

const dedupTests = [
  {
    name: '同一张新浪图片，不同临时参数',
    urls: [
      'https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg?KID=imgbed,tva&Expires=1770210780&ssig=ZVB5f00iHX',
      'https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/0060I2dWly8i9xpbdso6tj30u00u0aiz.jpg?KID=imgbed,tva&Expires=1770210781&ssig=ZVB5f00iYY'
    ]
  },
  {
    name: '同一Twitter图片，不同尺寸参数',
    urls: [
      'https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=medium',
      'https://pbs.twimg.com/media/G_WxV4UaAAAA690?format=jpg&name=large'
    ]
  }
];

dedupTests.forEach((test, index) => {
  console.log(`去重测试 ${index + 1}: ${test.name}`);

  const normalizedUrls = test.urls.map(url => normalizeImageUrl(url));
  const uniqueUrls = [...new Set(normalizedUrls)];

  console.log('原始URLs:');
  test.urls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
  });

  console.log('标准化后:');
  normalizedUrls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
  });

  if (uniqueUrls.length === 1) {
    console.log('✅ 去重成功：所有URL标准化为同一个');
  } else {
    console.log(`ℹ️  不同的URL：${uniqueUrls.length} 个不同的资源`);
  }

  console.log('');
});
