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
    const detailUrl = link?.href || link;

    if (detailUrl) {
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
  const messages = document.querySelectorAll(SELECTORS.chatMessage);

  return Array.from(messages).map(msg => {
    const isBuyer = msg.classList.contains('buyer-chat-msg') ||
                    msg.classList.contains('buyer') ||
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
  try {
    // 先点击输入框激活编辑器
    const inputBox = document.querySelector(SELECTORS.inputBox);
    if (inputBox) {
      inputBox.click();
    }

    // 使用 TinyMCE API 填充内容
    if (window.tinymce) {
      const editor = window.tinymce.get(SELECTORS.editorId);
      if (editor) {
        editor.setContent(content);
        editor.fire('change');
        editor.fire('input');

        // 同时更新底层 textarea
        const textarea = document.getElementById(SELECTORS.editorId);
        if (textarea) {
          textarea.value = content;
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        console.log('回复已填充到 TinyMCE 编辑器');
        return true;
      }
    }

    // 备用方案：直接填充 textarea
    const fallbackInput = document.querySelector(SELECTORS.fallbackInput);
    if (fallbackInput) {
      fallbackInput.value = content;
      fallbackInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('回复已填充到备用输入框');
      return true;
    }

    console.warn('未找到输入框');
    return false;
  } catch (error) {
    console.error('填充回复失败:', error.message);
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
