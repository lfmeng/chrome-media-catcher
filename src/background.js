// 背景服务脚本 - Background Service Worker
'use strict';

let isCapturingImages = false;
let isCapturingVideos = false;

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('媒体捕获器已安装');

    // 打开欢迎页面
    chrome.tabs.create({
      url: 'https://github.com/hyf0/chrome-media-catcher'
    });
  } else if (details.reason === 'update') {
    console.log('媒体捕获器已更新');
  }

  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'captureImage',
    title: '捕获图片',
    contexts: ['image', 'video']
  });

  chrome.contextMenus.create({
    id: 'captureVideo',
    title: '捕获视频',
    contexts: ['video', 'link']
  });
});

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture') {
    if (message.type === 'images') {
      isCapturingImages = true;
      console.log('后台：开始捕获图片');
    } else if (message.type === 'videos') {
      isCapturingVideos = true;
      console.log('后台：开始捕获视频');
    }
    sendResponse({ success: true });
  } else if (message.action === 'stopCapture') {
    if (message.type === 'images') {
      isCapturingImages = false;
      console.log('后台：停止捕获图片');
    } else if (message.type === 'videos') {
      isCapturingVideos = false;
      console.log('后台：停止捕获视频');
    }
    sendResponse({ success: true });
  } else if (message.action === 'getCaptureStatus') {
    sendResponse({
      isCapturingImages,
      isCapturingVideos
    });
  } else if (message.action === 'autoCaptureStarted') {
    // 🔥 自动捕获已启动
    if (message.images) {
      isCapturingImages = true;
    }
    if (message.videos) {
      isCapturingVideos = true;
    }
    console.log('🚀 后台：自动捕获已启动');
    sendResponse({ success: true });
  }
  return true; // 保持消息通道打开
});

// 使用 webRequest API 拦截网络请求（作为补充）
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return; // 忽略非标签页请求

    const url = details.url;
    const type = details.type;

    // 检查图片请求
    if (isCapturingImages && type === 'image') {
      // 通知 content script
      chrome.tabs.sendMessage(details.tabId, {
        action: 'networkRequest',
        type: 'image',
        url: url
      }).catch(() => {
        // 忽略错误（content script 可能未加载）
      });
    }

    // 检查媒体请求（包括视频）
    if (isCapturingVideos && (type === 'media' || type === 'other')) {
      // 判断是否为视频
      if (isVideoUrl(url)) {
        chrome.tabs.sendMessage(details.tabId, {
          action: 'networkRequest',
          type: 'video',
          url: url
        }).catch(() => {
          // 忽略错误
        });
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// 监听响应头，获取 Content-Type
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const url = details.url;
    const headers = details.responseHeaders || [];
    const contentType = headers.find(h => h.name.toLowerCase() === 'content-type');

    if (!contentType) return;

    const mimeType = contentType.value.toLowerCase();

    // 检查图片响应
    if (isCapturingImages && mimeType.startsWith('image/')) {
      chrome.tabs.sendMessage(details.tabId, {
        action: 'networkResponse',
        type: 'image',
        url: url,
        mimeType: mimeType
      }).catch(() => {});
    }

    // 检查视频响应
    if (isCapturingVideos && mimeType.startsWith('video/')) {
      chrome.tabs.sendMessage(details.tabId, {
        action: 'networkResponse',
        type: 'video',
        url: url,
        mimeType: mimeType
      }).catch(() => {});
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 判断是否为视频 URL
function isVideoUrl(url) {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.m4v'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.includes(ext));
}

// 监听下载事件
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('下载已创建:', downloadItem);
});

// 监听下载完成
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('下载完成:', downloadDelta.id);
  }
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'captureImage') {
    // 捕获选中的图片
    const imageUrl = info.srcUrl;
    if (imageUrl) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'captureDirect',
        type: 'image',
        url: imageUrl
      });
    }
  } else if (info.menuItemId === 'captureVideo') {
    // 捕获选中的视频
    const videoUrl = info.srcUrl || info.linkUrl;
    if (videoUrl) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'captureDirect',
        type: 'video',
        url: videoUrl
      });
    }
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('页面加载完成:', tab.url);
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('标签页激活:', activeInfo.tabId);
});

console.log('媒体捕获器后台服务已启动');
