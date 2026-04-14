/**
 * Service Worker - 后台流程控制
 * 负责：消息路由、AI 调用、流程控制
 */

import { aiReplier } from '../lib/ai-replier.js';

// 当前处理状态
let currentStatus = 'idle';
let currentTabId = null;

// 更新状态
function updateStatus(status, details = {}) {
  currentStatus = status;

  // 通知 Popup
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    status,
    details
  }).catch(() => {
    // Popup 可能未打开，忽略错误
  });
}

/**
 * 处理询盘流程
 */
async function processInquiry(tabId) {
  currentTabId = tabId;

  try {
    // Step 1: 检测页面类型
    updateStatus('detecting', { message: '检测页面类型...' });

    const pageType = await sendMessageToTab(tabId, { type: 'GET_PAGE_TYPE' });

    if (pageType?.pageType !== 'list') {
      throw new Error('请在询盘列表页面使用此功能');
    }

    // Step 2: 点击第一个询盘
    updateStatus('clicking', { message: '点击第一个询盘...' });

    const clickResult = await sendMessageToTab(tabId, { type: 'CLICK_FIRST_INQUIRY' });

    if (!clickResult.success) {
      throw new Error('点击询盘失败');
    }

    // Step 3: 等待详情页加载
    updateStatus('waiting', { message: '等待详情页加载...' });

    await waitForDetailPage(tabId);

    // Step 4: 读取聊天记录
    updateStatus('reading', { message: '读取聊天记录...' });

    const chatResult = await sendMessageToTab(tabId, { type: 'GET_CHAT_HISTORY' });

    if (!chatResult.success || !chatResult.history || chatResult.history.length === 0) {
      throw new Error('未找到聊天记录');
    }

    updateStatus('reading', {
      message: `已读取 ${chatResult.history.length} 条聊天记录`
    });

    // Step 5: 生成 AI 回复
    updateStatus('generating', { message: 'AI 正在生成回复...' });

    const reply = await aiReplier.generateReply(chatResult.history);

    // Step 6: 填充回复
    updateStatus('filling', { message: '填充回复到输入框...' });

    const fillResult = await sendMessageToTab(tabId, {
      type: 'FILL_REPLY',
      content: reply
    });

    if (!fillResult.success) {
      throw new Error('填充回复失败');
    }

    // 完成
    updateStatus('complete', {
      message: '处理完成！请检查回复内容后手动发送',
      reply
    });

    chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });

  } catch (error) {
    console.error('处理询盘失败:', error);
    updateStatus('error', { message: error.message });
    chrome.runtime.sendMessage({
      type: 'ERROR',
      message: error.message
    });
  }
}

/**
 * 向指定标签页发送消息
 */
async function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve(response);
    });
  });
}

/**
 * 等待详情页加载
 */
function waitForDetailPage(tabId) {
  return new Promise((resolve) => {
    const checkUrl = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (tab?.url?.includes('maDetail.htm') || tab?.url?.includes('conversation')) {
          resolve();
        } else {
          setTimeout(checkUrl, 500);
        }
      });
    };
    checkUrl();
  });
}

// 监听来自 Popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service Worker 收到消息:', request);

  switch (request.type) {
    case 'START_PROCESS':
      // 获取当前活动标签页
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          processInquiry(tabs[0].id);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: '未找到活动标签页' });
        }
      });
      return true; // 保持消息通道开放

    case 'GET_STATUS':
      sendResponse({ status: currentStatus, tabId: currentTabId });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// 监听标签页更新（用于检测详情页加载）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' &&
      (tab.url?.includes('maDetail.htm') || tab.url?.includes('conversation'))) {
    // 详情页已加载，继续处理流程
    if (currentTabId === tabId && currentStatus === 'waiting') {
      // 流程会自动继续，因为 processInquiry 在等待
    }
  }
});

console.log('Service Worker 已启动');
