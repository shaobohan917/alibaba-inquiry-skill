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
  // 检测当前页面
  await detectCurrentPage();

  // 监听 Service Worker 消息
  setupMessageListener();
}

/**
 * 检测当前页面
 */
async function detectCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url.includes('message.alibaba.com')) {
      // 发送消息给 Content Script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TYPE' }, (response) => {
        if (response?.pageType === 'list') {
          currentPageType = 'list';
          pageStatus.textContent = '询盘列表页';
          startBtn.disabled = false;
        } else if (response?.pageType === 'detail') {
          currentPageType = 'detail';
          pageStatus.textContent = '询盘详情页';
          startBtn.disabled = true;
          startBtn.textContent = '已在详情页';
        } else {
          pageStatus.textContent = '请在询盘页面使用';
          startBtn.disabled = true;
        }
      });
    } else {
      pageStatus.textContent = '请在询盘页面使用';
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
  chrome.runtime.onMessage.addListener((request) => {
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
