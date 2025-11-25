// popup.js - 处理用户交互界面逻辑

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_FILE') {
    const { content, fileName, mimeType } = message.data;
    
    try {
      // 方法1：使用Data URL，不依赖Blob和URL.createObjectURL
      try {
        // 创建Data URL
        const dataUrl = 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content);
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        
        // 添加到document并触发点击
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
        
        // 显示成功消息
        showStatus('文件保存成功！', 'success');
      } catch (dataUrlError) {
        console.error('Data URL方法失败:', dataUrlError);
        
        // 方法2：降级到使用Blob但避免URL.createObjectURL
        try {
          const blob = new Blob([content], { type: mimeType });
          
          // 使用FileReader创建Data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const dataUrl = reader.result;
              
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = fileName;
              
              document.body.appendChild(a);
              a.click();
              
              setTimeout(() => {
                document.body.removeChild(a);
              }, 100);
              
              showStatus('文件保存成功！', 'success');
            } catch (e) {
              console.error('FileReader方法也失败:', e);
              showError('文件下载失败: 无法创建下载链接');
            }
          };
          reader.onerror = () => {
            console.error('FileReader错误');
            showError('文件下载失败: 无法读取文件内容');
          };
          reader.readAsDataURL(blob);
        } catch (fallbackError) {
          console.error('所有下载方法均失败:', fallbackError);
          showError('文件下载失败: ' + fallbackError.message);
        }
      }
    } catch (error) {
      console.error('文件下载过程中发生异常:', error);
      showError('文件下载失败: ' + error.message);
    }
  }
});

// DOM元素
const loadingEl = document.getElementById('loading');
const notBilibiliEl = document.getElementById('not-bilibili');
const videoContentEl = document.getElementById('video-content');
const videoTitleEl = document.getElementById('video-title');
const videoUrlEl = document.getElementById('video-url');
const saveBtn = document.getElementById('save-btn');
const copyBtn = document.getElementById('copy-btn');
const statusEl = document.getElementById('status');

// 当前视频信息
let currentVideoInfo = null;

// 初始化函数
function init() {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      showError('无法获取当前标签页');
      return;
    }
    
    const activeTab = tabs[0];
    
    // 检查是否是B站视频页面
    if (!activeTab.url || !activeTab.url.includes('bilibili.com/video/')) {
      loadingEl.style.display = 'none';
      notBilibiliEl.style.display = 'block';
      return;
    }
    
    // 向content script请求视频信息
    chrome.tabs.sendMessage(activeTab.id, { type: 'GET_VIDEO_INFO' }, (response) => {
      loadingEl.style.display = 'none';
      
      if (chrome.runtime.lastError) {
        // 如果content script没有加载或出错，尝试注入它
        injectContentScript(activeTab.id);
        return;
      }
      
      if (response && response.title && response.url) {
        displayVideoInfo(response);
      } else {
        showError('无法获取视频信息');
      }
    });
  });
}

// 注入content script到页面
function injectContentScript(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ['content.js']
    },
    () => {
      if (chrome.runtime.lastError) {
        showError('注入脚本失败: ' + chrome.runtime.lastError.message);
        return;
      }
      
      // 注入成功后再次尝试获取视频信息
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_VIDEO_INFO' }, (response) => {
          if (response && response.title && response.url) {
            displayVideoInfo(response);
          } else {
            showError('注入脚本后仍无法获取视频信息');
          }
        });
      }, 1000);
    }
  );
}

// 显示视频信息
function displayVideoInfo(videoInfo) {
  currentVideoInfo = videoInfo;
  
  // 限制标题长度，避免UI问题
  const displayTitle = videoInfo.title.length > 80 
    ? videoInfo.title.substring(0, 80) + '...' 
    : videoInfo.title;
  
  videoTitleEl.textContent = displayTitle;
  videoTitleEl.title = videoInfo.title; // 完整标题作为tooltip
  
  videoUrlEl.textContent = videoInfo.url;
  videoUrlEl.title = videoInfo.url; // URL作为tooltip
  
  videoContentEl.style.display = 'block';
  saveBtn.disabled = false;
}

// 保存为Markdown文件
function saveAsMarkdown() {
  if (!currentVideoInfo) {
    showError('没有视频信息可保存');
    return;
  }
  
  saveBtn.disabled = true;
  showStatus('正在保存文件...', 'info');
  
  // 向background发送保存请求
  chrome.runtime.sendMessage(
    { 
      type: 'SAVE_VIDEO_LINK', 
      data: currentVideoInfo 
    },
    (response) => {
      saveBtn.disabled = false;
      
      if (response && response.success) {
        // 如果有自定义消息，使用自定义消息
        const message = response.message || '文件保存成功！';
        showStatus(message, 'success');
      } else {
        showError(response ? response.error : '保存文件失败');
      }
    }
  );
}

// 复制视频链接
function copyVideoLink() {
  if (!currentVideoInfo || !currentVideoInfo.url) {
    showError('没有视频链接可复制');
    return;
  }
  
  // 使用Clipboard API复制
  navigator.clipboard.writeText(currentVideoInfo.url)
    .then(() => {
      showStatus('链接已复制到剪贴板！', 'success');
    })
    .catch(err => {
      // 降级方案
      try {
        const textArea = document.createElement('textarea');
        textArea.value = currentVideoInfo.url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showStatus('链接已复制到剪贴板！', 'success');
      } catch (fallbackErr) {
        showError('复制失败: ' + fallbackErr.message);
      }
    });
}

// 显示状态消息
function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;
  
  // 3秒后自动隐藏成功和信息状态
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

// 显示错误消息
function showError(message) {
  loadingEl.style.display = 'none';
  showStatus(message, 'error');
}

// 事件监听器
function setupEventListeners() {
  saveBtn.addEventListener('click', saveAsMarkdown);
  copyBtn.addEventListener('click', copyVideoLink);
}

// 启动应用
function startApp() {
  setupEventListeners();
  init();
}

// 当DOM加载完成后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
