// 阿里巴巴询盘助手 - Options 页面脚本

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
});

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get({
      apiKey: '',
      apiSecret: '',
      replyTone: 'professional',
      companyInfo: '',
      enableNotifications: true,
      autoProcess: true
    });

    document.getElementById('api-key').value = result.apiKey;
    document.getElementById('api-secret').value = result.apiSecret;
    document.getElementById('reply-tone').value = result.replyTone;
    document.getElementById('company-info').value = result.companyInfo;
    document.getElementById('enable-notifications').checked = result.enableNotifications;
    document.getElementById('auto-process').checked = result.autoProcess;

    console.log('设置已加载');
  } catch (error) {
    console.error('加载设置失败:', error);
    showMessage('加载设置失败', 'error');
  }
}

/**
 * 保存设置
 */
async function saveSettings() {
  try {
    const settings = {
      apiKey: document.getElementById('api-key').value.trim(),
      apiSecret: document.getElementById('api-secret').value.trim(),
      replyTone: document.getElementById('reply-tone').value,
      companyInfo: document.getElementById('company-info').value.trim(),
      enableNotifications: document.getElementById('enable-notifications').checked,
      autoProcess: document.getElementById('auto-process').checked
    };

    await chrome.storage.sync.set(settings);
    console.log('设置已保存', settings);
    showMessage('设置已保存成功！', 'success');
  } catch (error) {
    console.error('保存设置失败:', error);
    showMessage('保存设置失败', 'error');
  }
}

/**
 * 重置设置
 */
async function resetSettings() {
  if (!confirm('确定要重置所有设置吗？')) {
    return;
  }

  try {
    await chrome.storage.sync.clear();
    loadSettings();
    showMessage('设置已重置', 'success');
  } catch (error) {
    console.error('重置设置失败:', error);
    showMessage('重置设置失败', 'error');
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
}

/**
 * 显示消息
 */
function showMessage(text, type = 'info') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type} show`;

  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}
