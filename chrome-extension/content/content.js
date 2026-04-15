/**
 * Content Script - 阿里巴巴询盘页面 DOM 操作
 * 负责：页面检测、数据提取、回复填充
 */

// DOM 选择器配置 - 阿里巴巴国际站
const SELECTORS = {
  // 列表页
  inquiryList: '.ui2-list-body, .inquiry-list, .aui-inquirylist-grid-container',
  inquiryItem: '.ui2-list-body .inquiry-item, .inquiry-list .inquiry-item',

  // 聊天页
  chatMessage: '.buyer-chat-msg, .chat-message, .message-list .message',
  buyerMessage: '.buyer-chat-msg, .buyer, .customer',
  inputBox: '.mock-reply',
  editorId: 'normal-im-send',

  // 备用选择器
  fallbackInput: 'textarea[placeholder*="Reply"], textarea[placeholder*="回复"]'
};

// 页面类型检测结果
let currentPageType = null;

/**
 * 检测页面类型
 */
function detectPageType() {
  const url = window.location.href;

  // 列表页：feedback/all 或 message.alibaba.com 根路径
  if (url.includes('feedback/all') ||
      url.includes('default.htm') ||
      (url.includes('message.alibaba.com') && !url.includes('maDetail.htm') && !url.includes('conversation'))) {
    return 'list';
  }

  // 详情页：maDetail.htm 或 conversation
  if (url.includes('maDetail.htm') || url.includes('conversation')) {
    return 'detail';
  }

  return 'unknown';
}

/**
 * 获取询盘列表
 */
function getInquiryList() {
  const items = document.querySelectorAll(SELECTORS.inquiryItem);

  return Array.from(items).map((item, index) => ({
    index,
    sender: item.querySelector('.buyer-name, .contact-name')?.textContent?.trim() || 'Unknown',
    subject: item.querySelector('.subject, .title')?.textContent?.trim() || 'No Subject',
    time: item.querySelector('.time, .date')?.textContent?.trim() || '',
    preview: item.querySelector('.preview, .summary')?.textContent?.trim() || '',
    unread: item.classList.contains('unread')
  }));
}

/**
 * 点击第一个询盘
 */
function clickFirstInquiry() {
  const firstItem = document.querySelector(SELECTORS.inquiryItem);

  if (firstItem) {
    // 获取询盘详情页链接
    const link = firstItem.querySelector('a[href*="maDetail.htm"], a[href*="conversation"]') ||
                 firstItem.getAttribute('href');
    let detailUrl = link?.href || link;

    if (detailUrl) {
      // 如果是相对路径，转换为完整 URL
      if (detailUrl.startsWith('/')) {
        detailUrl = 'https://message.alibaba.com' + detailUrl;
      }

      // 告诉 Service Worker 打开新标签页
      chrome.runtime.sendMessage({
        type: 'OPEN_DETAIL_TAB',
        url: detailUrl
      });

      // 阻止默认行为（防止打开第二个标签页）
      return { success: true, url: detailUrl };
    }

    console.warn('未找到详情链接');
    return { success: false, error: '未找到详情链接' };
  }

  console.warn('未找到询盘列表项');
  return { success: false, error: '未找到询盘列表项' };
}

/**
 * 获取聊天历史记录
 */
function getChatHistory() {
  console.log('[Content Script] 开始获取聊天记录...');

  const messages = document.querySelectorAll(SELECTORS.chatMessage);
  console.log('[Content Script] 找到消息元素数量:', messages.length, '选择器:', SELECTORS.chatMessage);

  // 调试：输出找到的元素
  messages.forEach((msg, i) => {
    console.log(`[Content Script] 消息 ${i}:`, msg.className, msg.textContent?.slice(0, 50));
  });

  // 如果主选择器没找到，尝试备用选择器
  if (messages.length === 0) {
    console.log('[Content Script] 尝试备用选择器...');
    const fallbackSelectors = [
      '.message-item',
      '.chat-item',
      '.conversation-item',
      '.msg-item',
      '[class*="message"]',
      '[class*="chat"]'
    ];

    for (const selector of fallbackSelectors) {
      const found = document.querySelectorAll(selector);
      console.log(`[Content Script] 选择器 "${selector}" 找到 ${found.length} 个元素`);
      if (found.length > 0) {
        console.log('[Content Script] 使用备用选择器:', selector);
        return Array.from(found).map(msg => ({
          sender: msg.classList.contains('buyer') || msg.classList.contains('customer') ? 'buyer' : 'seller',
          content: msg.textContent?.trim() || '',
          time: ''
        }));
      }
    }
  }

  return Array.from(messages).map(msg => {
    const isBuyer = msg.classList.contains('buyer-chat-msg') ||
                    msg.classList.contains('buyer') ||
                    msg.classList.contains('customer') ||
                    msg.querySelector('.buyer-chat-msg') !== null;

    return {
      sender: isBuyer ? 'buyer' : 'seller',
      content: msg.textContent?.trim() || '',
      time: msg.querySelector('.time, .timestamp')?.textContent?.trim() || ''
    };
  });
}

/**
 * 填充回复到输入框
 */
function fillReply(content) {
  console.log('[Content Script] 开始填充回复...');

  try {
    // 方案 1: 使用 TinyMCE API（主要方案）
    if (window.tinymce) {
      const editor = window.tinymce.get('normal-im-send');
      if (editor) {
        console.log('[Content Script] 使用 TinyMCE API 填充');
        editor.setContent(content);
        editor.fire('change');
        editor.fire('input');

        // 同时更新底层 textarea
        const textarea = document.getElementById('normal-im-send');
        if (textarea) {
          textarea.value = content;
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        console.log('[Content Script] 回复已填充到 TinyMCE 编辑器');
        return true;
      }
    }

    // 方案 2: 直接操作 iframe（备用方案）
    const iframe = document.querySelector('#normal-im-send_ifr');
    if (iframe) {
      console.log('[Content Script] 尝试操作 iframe 填充');

      // 先点击 .mock-reply 激活编辑器
      const mockReply = document.querySelector('.mock-reply');
      if (mockReply) {
        mockReply.click();
        console.log('[Content Script] 已点击 .mock-reply 激活编辑器');
      }

      // 等待一小段时间
      setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const body = iframeDoc.querySelector('body');
          if (body) {
            body.innerHTML = content;
            console.log('[Content Script] 已填充到 iframe');
          }
        } catch (e) {
          console.error('[Content Script] iframe 填充失败:', e);
        }
      }, 500);

      return true;
    }

    // 方案 3: 直接填充隐藏 textarea（最后方案）
    const textarea = document.getElementById('normal-im-send');
    if (textarea) {
      console.log('[Content Script] 使用方案 3: 直接填充 textarea');
      textarea.value = content;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    console.warn('[Content Script] 未找到输入框');
    return false;
  } catch (error) {
    console.error('[Content Script] 填充回复失败:', error.message);
    return false;
  }
}

/**
 * 向 Service Worker 发送消息
 */
function sendMessage(type, data) {
  chrome.runtime.sendMessage({ type, ...data });
}

// 页面加载完成后检测页面类型
function initContentScript() {
  currentPageType = detectPageType();

  // 告知 Service Worker
  sendMessage('PAGE_DETECTED', {
    pageType: currentPageType,
    url: window.location.href
  });

  console.log('Content Script 已加载，页面类型:', currentPageType, 'URL:', window.location.href);
}

// 如果是页面加载时注入，等待 DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  // 如果是后来注入的，立即执行
  initContentScript();
}

// 监听来自 Service Worker 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  switch (request.type) {
    case 'GET_PAGE_TYPE':
      sendResponse({ pageType: currentPageType });
      break;

    case 'GET_INQUIRY_LIST':
      try {
        const list = getInquiryList();
        sendResponse({ success: true, list });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'CLICK_FIRST_INQUIRY':
      try {
        const success = clickFirstInquiry();
        sendResponse({ success });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'GET_CHAT_HISTORY':
      try {
        const history = getChatHistory();
        sendResponse({ success: true, history });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'FILL_REPLY':
      try {
        const success = fillReply(request.content);
        sendResponse({ success });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // 保持消息通道开放用于异步响应
});
