/**
 * Popup 界面逻辑
 */

const PROCESS_STEPS = [
  { id: 'detecting', label: '检测页面' },
  { id: 'clicking', label: '点击询盘' },
  { id: 'waiting', label: '等待加载' },
  { id: 'reading', label: '读取聊天' },
  { id: 'generating', label: '生成回复' },
  { id: 'filling', label: '填充回复' },
  { id: 'complete', label: '完成' }
];

let currentPageType = null;

// DOM 元素
const startBtn = document.getElementById('start-btn');
const pageStatus = document.getElementById('page-status');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const progressArea = document.getElementById('progress-area');
const progressFill = document.getElementById('progress-fill');
const progressSteps = document.getElementById('progress-steps');

/**
 * 初始化
 */
async function init() {
  // 先从 Service Worker 恢复状态
  await restoreState();

  // 检测当前页面
  await detectCurrentPage();

  // 监听 Service Worker 消息
  setupMessageListener();
}

/**
 * 从 Service Worker 恢复状态
 */
async function restoreState() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATE' });

    if (state?.status && state.status !== 'idle') {
      console.log('恢复之前的状态:', state);

      // 恢复进度条显示
      if (state.status !== 'complete' && state.status !== 'error') {
        updateStatus(state.status, { message: '恢复处理状态...' });
        startBtn.disabled = true;
        startBtn.textContent = '处理中...';
      }
    }
  } catch (e) {
    console.log('无之前状态，从头开始');
  }
}

/**
 * 检测当前页面
 */
async function detectCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    console.log('当前标签页 URL:', tab.url);

    // 检查是否在阿里巴巴询盘页面
    const isInquiryPage = tab.url && (
      tab.url.includes('message.alibaba.com')
    );

    if (isInquiryPage) {
      // 先执行 Content Script（如果未注入）
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
      } catch (e) {
        // Content Script 可能已注入，忽略错误
      }

      // 等待一小段时间让 Content Script 初始化
      await new Promise(resolve => setTimeout(resolve, 500));

      // 尝试发送消息给 Content Script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TYPE' });
        console.log('Content Script 响应:', response);

        if (response?.pageType === 'list') {
          currentPageType = 'list';
          pageStatus.textContent = '询盘列表页';
          startBtn.disabled = false;
        } else if (response?.pageType === 'detail') {
          currentPageType = 'detail';
          pageStatus.textContent = '询盘详情页';
          startBtn.disabled = true;
          startBtn.textContent = '请在列表页使用';
        } else {
          pageStatus.textContent = '页面类型未知';
          startBtn.disabled = true;
        }
      } catch (msgError) {
        console.warn('Content Script 消息发送失败:', msgError);
        pageStatus.textContent = 'Content Script 未响应，请刷新页面';
        startBtn.disabled = true;
      }
    } else {
      pageStatus.textContent = '请在 message.alibaba.com 使用';
      startBtn.disabled = true;
    }
  } catch (error) {
    console.error('检测页面失败:', error);
    pageStatus.textContent = '检测失败';
    startBtn.disabled = true;
  }
}

/**
 * 监听消息
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.type) {
        case 'STATUS_UPDATE':
          updateStatus(request.status, request.details);
          break;

        case 'PROCESS_COMPLETE':
          showComplete();
          break;

        case 'ERROR':
          showError(request.message);
          break;
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
    return true;
  });
}

/**
 * 更新状态
 */
function updateStatus(status, details) {
  const stepIndex = PROCESS_STEPS.findIndex(s => s.id === status);

  // 更新进度条
  if (stepIndex >= 0) {
    const progress = ((stepIndex + 1) / PROCESS_STEPS.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressArea.style.display = 'block';

    // 更新步骤显示
    progressSteps.innerHTML = PROCESS_STEPS.map((step, i) =>
      `<span style="color: ${i <= stepIndex ? '#FF6600' : '#ccc'}">${step.label}</span>`
    ).join('');
  }

  // 更新状态文本
  statusText.textContent = details?.message || status;
  statusText.className = 'status-text status-processing';

  // 更新图标
  statusIcon.textContent = '⏳';
}

/**
 * 显示完成
 */
function showComplete() {
  statusIcon.textContent = '✅';
  statusText.textContent = '处理完成！请检查回复后手动发送';
  statusText.className = 'status-text status-complete';
  progressFill.style.width = '100%';
}

/**
 * 显示错误
 */
function showError(message) {
  statusIcon.textContent = '❌';
  statusText.textContent = message;
  statusText.className = 'status-text status-error';
}

// 开始按钮点击事件
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = '处理中...';

  // 发送开始消息给 Service Worker
  chrome.runtime.sendMessage({ type: 'START_PROCESS' });
});

// 初始化
init();
