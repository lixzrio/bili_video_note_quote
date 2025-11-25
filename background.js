// background.js - 处理权限和文件下载功能

// 导入文件处理工具函数
// 注意：在Service Worker中，需要使用动态导入或直接实现需要的函数，因为ES模块导入有限制

// 由于Service Worker环境限制，直接实现需要的函数
function generateMarkdownContent(videoInfo, options = {}) {
  const { title, url } = videoInfo;
  const { 
    includeMetadata = true,
    includeTimestamp = true,
    template = 'default'
  } = options;
  
  let content = '';
  
  switch (template) {
    case 'minimal':
      content = `[${title}](${url})`;
      break;
      
    case 'detailed':
      content = `# ${title}\n\n## 视频信息\n\n- **标题**: ${title}\n- **链接**: ${url}\n`;
      
      if (includeTimestamp) {
        content += `- **保存时间**: ${new Date().toLocaleString('zh-CN')}\n`;
      }
      
      content += '\n## 笔记区域\n\n在这里添加你的笔记...\n';
      break;
      
    default:
      content = `# ${title}\n\n## 视频链接\n\n${url}\n\n`;
      
      if (includeMetadata) {
        content += '## 引用信息\n\n';
        content += `- **来源**: Bilibili\n`;
        content += `- **标题**: ${title}\n`;
        
        if (includeTimestamp) {
          content += `- **保存时间**: ${new Date().toLocaleString('zh-CN')}\n`;
        }
      }
      
      content += '\n## 笔记\n\n<!-- 在这里添加你的笔记 -->\n';
      break;
  }
  
  return content;
}

function sanitizeFileName(name, options = {}) {
  const { 
    maxLength = 200,
    replaceSpaces = true,
    replacementChar = '_'
  } = options;
  
  let sanitized = name
    .replace(/[<>"/\\|?*]/g, replacementChar)
    .replace(/[\x00-\x1f\x7f]/g, replacementChar);
  
  if (replaceSpaces) {
    sanitized = sanitized.replace(/\s+/g, replacementChar);
  }
  
  sanitized = sanitized.trim('. ' + replacementChar);
  
  if (sanitized.startsWith('.')) {
    sanitized = replacementChar + sanitized.slice(1);
  }
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  if (!sanitized || sanitized === replacementChar) {
    sanitized = '未命名文件_' + new Date().getTime();
  }
  
  return sanitized;
}

// 监听来自content script或popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_VIDEO_LINK') {
    const { title, url } = message.data;
    
    // 使用工具函数创建markdown内容
    const markdownContent = generateMarkdownContent({ title, url }, {
      includeMetadata: true,
      includeTimestamp: true,
      template: 'default'
    });
    
    // 使用工具函数清理标题，移除不适合作为文件名的字符
    const sanitizedTitle = sanitizeFileName(title);
    const fileName = `${sanitizedTitle}.md`;
    
    try {
      // 创建Blob对象
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const blobUrl = URL.createObjectURL(blob);
      
      // 方法1：尝试使用downloads API（优先）
      chrome.downloads.download({
        url: blobUrl,
        filename: fileName,
        saveAs: true // 显示保存对话框让用户选择目录
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('使用downloads API下载失败:', chrome.runtime.lastError);
          
          // 尝试方法2：创建下载链接
          try {
            console.log('尝试使用替代方法下载');
            // 由于Service Worker中不能直接操作DOM，使用更兼容的方法
            // 向popup.js发送消息，让它处理文件下载
            chrome.runtime.sendMessage({
              type: 'DOWNLOAD_FILE',
              data: {
                content: markdownContent,
                fileName: fileName,
                mimeType: 'text/markdown'
              }
            });
            
            sendResponse({ success: true, message: '请在弹出界面中完成保存操作' });
          } catch (fallbackError) {
            console.error('替代下载方法也失败:', fallbackError);
            sendResponse({ success: false, error: '所有下载方法均失败' });
          } finally {
            // 清理blob URL
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 100);
          }
        } else {
          // downloads API成功，稍后清理
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 100);
          sendResponse({ success: true, downloadId });
        }
      });
    } catch (e) {
      console.error('保存文件时发生异常:', e);
      sendResponse({ success: false, error: e.message });
    }
    
    // 告诉Chrome我们会异步发送响应
    return true;
  }
});

// 注意：sanitizeFileName函数已经在文件顶部实现

// 初始化存储设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    defaultSavePath: '',
    fileFormat: 'markdown'
  });
  
  console.log('B站视频笔记引用插件已安装');
});

// 监听下载完成事件，可以添加通知等功能
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    // 可以在这里添加下载完成的通知
    console.log('文件下载完成');
  }
});
