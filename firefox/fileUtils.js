// fileUtils.js - 文件处理工具函数

/**
 * 生成Markdown格式的文件内容
 * @param {Object} videoInfo - 视频信息对象
 * @param {string} videoInfo.title - 视频标题
 * @param {string} videoInfo.url - 视频URL
 * @param {Object} options - 可选配置
 * @returns {string} 格式化的Markdown内容
 */
export function generateMarkdownContent(videoInfo, options = {}) {
  const { title, url } = videoInfo;
  const { 
    includeMetadata = true,
    includeTimestamp = true,
    template = 'default'
  } = options;
  
  let content = '';
  
  // 根据模板生成内容
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
      // 默认模板
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

/**
 * 清理文件名，移除不合法字符
 * @param {string} name - 原始文件名
 * @param {Object} options - 清理选项
 * @returns {string} 清理后的文件名
 */
export function sanitizeFileName(name, options = {}) {
  const { 
    maxLength = 200,
    replaceSpaces = true,
    replacementChar = '_'
  } = options;
  
  // 移除或替换不适合作为文件名的字符
  let sanitized = name
    // Windows不允许的字符: < > " / \ | ? *
    .replace(/[<>\"/\\|?*]/g, replacementChar)
    // 替换控制字符
    .replace(/[\x00-\x1f\x7f]/g, replacementChar);
  
  // 替换空格
  if (replaceSpaces) {
    sanitized = sanitized.replace(/\s+/g, replacementChar);
  }
  
  // 移除开头和结尾的点、空格等
  sanitized = sanitized.trim('. ' + replacementChar);
  
  // 移除开头的点（Windows不允许）
  if (sanitized.startsWith('.')) {
    sanitized = replacementChar + sanitized.slice(1);
  }
  
  // 限制文件名长度
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // 如果文件名为空，使用默认名称
  if (!sanitized || sanitized === replacementChar) {
    sanitized = '未命名文件_' + new Date().getTime();
  }
  
  return sanitized;
}