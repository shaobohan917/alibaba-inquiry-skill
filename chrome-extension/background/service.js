// 阿里巴巴询盘助手 - Service Worker
// 后台服务脚本，处理扩展的核心逻辑

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('阿里巴巴询盘助手已安装', details);

  // 初始化默认配置
  chrome.storage.sync.set({
    apiKey: '',
    apiSecret: '',
    autoProcess: false,
    notificationEnabled: true
  });
});

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);

  switch (message.action) {
    case 'processInquiry':
      handleProcessInquiry(message.data, sendResponse);
      return true; // 保持消息通道开启用于异步响应

    case 'getApiKey':
      getApiKey(sendResponse);
      return true;

    case 'notify':
      showNotification(message.data);
      sendResponse({ success: true });
      break;

    default:
      console.log('未知消息类型:', message.action);
  }
});

// 处理询盘
async function handleProcessInquiry(data, sendResponse) {
  try {
    console.log('开始处理询盘:', data);

    // TODO: 调用 AI API 生成回复
    const response = {
      success: true,
      message: '询盘处理成功',
      reply: '感谢您的询盘，我们会尽快回复您。'
    };

    sendResponse(response);
  } catch (error) {
    console.error('处理询盘失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 获取 API Key
function getApiKey(sendResponse) {
  chrome.storage.sync.get(['apiKey'], (result) => {
    sendResponse({ apiKey: result.apiKey });
  });
}

// 显示通知
function showNotification(data) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: '阿里巴巴询盘助手',
    message: data.message
  });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('message.alibaba.com')) {
    console.log('检测到询盘页面:', tab.url);
  }
});
