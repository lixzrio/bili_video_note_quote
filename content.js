// content.js - 在B站视频页面获取视频信息

console.log('B站视频笔记引用插件已加载');

// 获取视频信息的函数
function getVideoInfo() {
  let title = '';
  let url = window.location.href;
  
  // 方法1: 从页面标题获取
  if (document.title) {
    // 通常B站标题格式: 视频标题_哔哩哔哩_bilibili
    title = document.title.replace(/_哔哩哔哩_bilibili$/, '').trim();
  }
  
  // 方法2: 从视频标题元素获取
  if (!title) {
    const titleElement = document.querySelector('h1.video-title, h1.video-name, .video-info-title');
    if (titleElement) {
      title = titleElement.textContent.trim();
    }
  }
  
  // 方法3: 从元数据获取
  if (!title) {
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle && metaTitle.content) {
      title = metaTitle.content.trim();
    }
  }
  
  // 方法4: 从JSON数据获取（B站页面可能在script标签中包含视频数据）
  if (!title) {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (script.textContent.includes('__INITIAL_STATE__')) {
        try {
          const match = script.textContent.match(/__INITIAL_STATE__=(\{[^;]+\});/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            if (data.videoData && data.videoData.title) {
              title = data.videoData.title;
              break;
            }
          }
        } catch (e) {
          console.error('解析视频数据失败:', e);
        }
      }
    }
  }
  
  // 如果仍然没有获取到标题，使用URL或默认值
  if (!title) {
    title = 'B站视频_' + new Date().getTime();
  }
  
  // 确保获取的是短链接形式
  const videoId = getVideoIdFromUrl(url);
  if (videoId) {
    // 生成标准的B站分享链接格式
    url = `https://www.bilibili.com/video/${videoId}/`;
  }
  
  return { title, url };
}

// 从URL中提取视频ID
function getVideoIdFromUrl(url) {
  // 匹配各种B站视频URL格式
  const patterns = [
    /\/video\/(BV[\w]+)\/?/,  // BV号格式
    /\/av(\d+)\/?/,         // AV号格式
    /bvid=(BV[\w]+)/,        // 查询参数中的BV号
    /aid=(\d+)/              // 查询参数中的AV号
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_VIDEO_INFO') {
    const videoInfo = getVideoInfo();
    sendResponse(videoInfo);
    return true;
  }
});

// 当页面加载完成或视频信息更新时，可以主动通知background
function notifyVideoLoaded() {
  const videoInfo = getVideoInfo();
  if (videoInfo.title && videoInfo.url) {
    console.log('检测到视频信息:', videoInfo);
  }
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', notifyVideoLoaded);
} else {
  notifyVideoLoaded();
}

// 监听页面可能的动态更新（对于SPA页面）
let lastVideoId = getVideoIdFromUrl(window.location.href);

// 使用MutationObserver监听DOM变化
const observer = new MutationObserver(() => {
  const currentVideoId = getVideoIdFromUrl(window.location.href);
  if (currentVideoId !== lastVideoId) {
    lastVideoId = currentVideoId;
    setTimeout(notifyVideoLoaded, 1000); // 延迟执行，确保页面内容已更新
  }
});

// 开始观察DOM变化
observer.observe(document.body, {
  childList: true,
  subtree: true
});
