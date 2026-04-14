/**
 * Service Worker - 后台流程控制
 * 负责：消息路由、AI 调用、流程控制
 */

import { aiReplier } from '../lib/ai-replier.js';

// 当前处理状态
let currentStatus = 'idle';
let currentTabId = null;
let sourceTabId = null; // 来源标签页 ID（列表页）

// 更新状态并持久化
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
 * 获取当前状态（用于 Popup 恢复）
 */
function getCurrentState() {
  return {
    status: currentStatus,
    tabId: currentTabId
  };
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
 * 等待新标签页打开（详情页）
 */
function waitForNewDetailTab() {
  return new Promise((resolve) => {
    let resolved = false;

    const listener = (tab) => {
      if (resolved) return;

      // 检查是否是新打开的详情页标签页
      if (tab.url?.includes('maDetail.htm') || tab.url?.includes('conversation')) {
        resolved = true;
        // 移除监听器
        chrome.tabs.onCreated.removeListener(listener);
        resolve(tab.id);
      }
    };

    // 监听新标签页打开
    chrome.tabs.onCreated.addListener(listener);

    // 5 秒超时
    setTimeout(() => {
      if (!resolved) {
        chrome.tabs.onCreated.removeListener(listener);
        resolve(null);
      }
    }, 5000);
  });
}

/**
 * 等待详情页加载完成
 */
function waitForDetailPageLoaded(tabId) {
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

/**
 * 发送桌面通知
 */
function sendNotification(title, message, iconUrl = '/icons/icon-48.png') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl,
    title,
    message,
    priority: 100,
    requireInteraction: false
  });
}

/**
 * 处理询盘流程
 */
async function processInquiry(sourceTabId) {
  try {
    // Step 1: 检测页面类型
    updateStatus('detecting', { message: '检测页面类型...' });

    const pageType = await sendMessageToTab(sourceTabId, { type: 'GET_PAGE_TYPE' });

    if (pageType?.pageType !== 'list') {
      throw new Error('请在询盘列表页面使用此功能');
    }

    // Step 2: 获取第一个询盘链接并打开新标签页
    updateStatus('clicking', { message: '打开询盘详情...' });

    // 等待新标签页打开（监听器已在上面注册）
    const newTabIdPromise = waitForNewDetailTab();

    // 发送点击请求（会触发 OPEN_DETAIL_TAB 消息）
    await sendMessageToTab(sourceTabId, { type: 'CLICK_FIRST_INQUIRY' });

    // 等待新标签页打开
    updateStatus('waiting', { message: '等待详情页打开...' });

    const newTabId = await newTabIdPromise;

    if (!newTabId) {
      throw new Error('等待详情页打开超时');
    }

    currentTabId = newTabId;

    // 等待详情页加载完成
    await waitForDetailPageLoaded(newTabId);

    // Step 4: 读取聊天记录
    updateStatus('reading', { message: '读取聊天记录...' });

    const chatResult = await sendMessageToTab(newTabId, { type: 'GET_CHAT_HISTORY' });

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

    const fillResult = await sendMessageToTab(newTabId, {
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

    // 发送桌面通知
    sendNotification('✅ 询盘处理完成', 'AI 回复已生成，请检查并发送');

  } catch (error) {
    console.error('处理询盘失败:', error);
    updateStatus('error', { message: error.message });
    chrome.runtime.sendMessage({
      type: 'ERROR',
      message: error.message
    });

    // 发送错误通知
    sendNotification('❌ 询盘处理失败', error.message, '/icons/icon-48.png');
  }
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

    case 'OPEN_DETAIL_TAB':
      // Content Script 请求打开详情页
      chrome.tabs.create({ url: request.url, active: true }, (newTab) => {
        console.log('已打开详情页标签页:', newTab.id);
      });
      sendResponse({ success: true });
      return true;

    case 'GET_STATUS':
      sendResponse({ status: currentStatus, tabId: currentTabId });
      return true;

    case 'GET_CURRENT_STATE':
      // 返回当前状态用于 Popup 恢复
      sendResponse(getCurrentState());
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

console.log('Service Worker 已启动');
