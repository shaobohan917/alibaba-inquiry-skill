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

    const apiKeyInput = document.getElementById('api-key');
    const apiSecretInput = document.getElementById('api-secret');
    const replyToneSelect = document.getElementById('reply-tone');
    const companyInfoTextarea = document.getElementById('company-info');
    const enableNotificationsCheckbox = document.getElementById('enable-notifications');
    const autoProcessCheckbox = document.getElementById('auto-process');

    if (apiKeyInput) apiKeyInput.value = result.apiKey;
    if (apiSecretInput) apiSecretInput.value = result.apiSecret;
    if (replyToneSelect) replyToneSelect.value = result.replyTone;
    if (companyInfoTextarea) companyInfoTextarea.value = result.companyInfo;
    if (enableNotificationsCheckbox) enableNotificationsCheckbox.checked = result.enableNotifications;
    if (autoProcessCheckbox) autoProcessCheckbox.checked = result.autoProcess;

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
    const apiKeyInput = document.getElementById('api-key');
    const apiSecretInput = document.getElementById('api-secret');
    const replyToneSelect = document.getElementById('reply-tone');
    const companyInfoTextarea = document.getElementById('company-info');
    const enableNotificationsCheckbox = document.getElementById('enable-notifications');
    const autoProcessCheckbox = document.getElementById('auto-process');

    const settings = {
      apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
      apiSecret: apiSecretInput ? apiSecretInput.value.trim() : '',
      replyTone: replyToneSelect ? replyToneSelect.value : 'professional',
      companyInfo: companyInfoTextarea ? companyInfoTextarea.value.trim() : '',
      enableNotifications: enableNotificationsCheckbox ? enableNotificationsCheckbox.checked : true,
      autoProcess: autoProcessCheckbox ? autoProcessCheckbox.checked : true
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
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');

  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (resetBtn) resetBtn.addEventListener('click', resetSettings);
}

/**
 * 显示消息
 */
function showMessage(text, type = 'info') {
  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.className = `message ${type} show`;

    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
}
