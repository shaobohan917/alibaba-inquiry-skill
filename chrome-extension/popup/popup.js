// 阿里巴巴询盘助手 - Popup 脚本

document.addEventListener('DOMContentLoaded', () => {
  initPopup();
});

/**
 * 初始化 Popup
 */
async function initPopup() {
  // 检查登录状态
  await checkLoginStatus();

  // 检查当前页面状态
  await checkCurrentPage();

  // 绑定事件
  bindEvents();
}

/**
 * 检查登录状态
 */
async function checkLoginStatus() {
  const loginStatusEl = document.getElementById('login-status');

  try {
    // 检查是否有阿里巴巴的 cookie
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (currentTab?.url?.includes('message.alibaba.com')) {
      loginStatusEl.textContent = '已登录';
      loginStatusEl.classList.add('success');
    } else {
      loginStatusEl.textContent = '未检测';
      loginStatusEl.style.color = '#999';
    }
  } catch (error) {
    loginStatusEl.textContent = '检测失败';
    loginStatusEl.classList.add('error');
    console.error('检查登录状态失败:', error);
  }
}

/**
 * 检查当前页面状态
 */
async function checkCurrentPage() {
  const pageStatusEl = document.getElementById('page-status');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (currentTab?.url?.includes('message.alibaba.com')) {
      pageStatusEl.textContent = '询盘页面';
      pageStatusEl.classList.add('success');
    } else if (currentTab?.url?.includes('alibaba.com')) {
      pageStatusEl.textContent = '阿里巴巴网站';
      pageStatusEl.style.color = '#f59e0b';
    } else {
      pageStatusEl.textContent = '其他页面';
      pageStatusEl.style.color = '#999';
    }
  } catch (error) {
    pageStatusEl.textContent = '检测失败';
    pageStatusEl.classList.add('error');
    console.error('检查页面状态失败:', error);
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 处理询盘按钮
  document.getElementById('process-btn').addEventListener('click', async () => {
    const btn = document.getElementById('process-btn');
    const originalText = btn.textContent;
    btn.textContent = '处理中...';
    btn.disabled = true;

    try {
      // 获取当前标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.url?.includes('message.alibaba.com')) {
        showMessage('请在询盘页面使用此功能', 'error');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      // 发送消息给 content script
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'processInquiry',
        data: {
          url: currentTab.url,
          timestamp: new Date().toISOString()
        }
      });

      if (response && response.success) {
        showMessage('✅ 回复已生成并填充到输入框', 'success');
      } else {
        showMessage('❌ 生成失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('处理询盘失败:', error);
      showMessage('❌ 处理失败，请刷新页面后重试', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // 设置按钮
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 选项链接
  document.getElementById('options-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

/**
 * 显示消息
 */
function showMessage(text, type = 'info') {
  const messagePanel = document.getElementById('message-panel');
  messagePanel.textContent = text;
  messagePanel.className = `message ${type}`;

  // 5 秒后恢复默认消息
  setTimeout(() => {
    messagePanel.textContent = '💡 提示：在询盘列表页面点击"开始处理询盘"按钮，AI 将自动生成专业回复。';
    messagePanel.className = 'message info';
  }, 5000);
}
