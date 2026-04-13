// 阿里巴巴询盘助手 - Content Script
// 页面内容脚本，负责与询盘页面交互

console.log('阿里巴巴询盘助手 Content Script 已加载');

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 加载完成，初始化询盘助手');
  initInquiryAssistant();
});

// 如果 DOM 已经加载完成，直接初始化
if (document.readyState !== 'loading') {
  initInquiryAssistant();
}

/**
 * 初始化询盘助手
 */
function initInquiryAssistant() {
  // 检测是否在询盘页面
  if (isInquiryPage()) {
    console.log('检测到询盘页面');
    injectAssistantButton();
  }
}

/**
 * 判断是否在询盘页面
 */
function isInquiryPage() {
  return window.location.hostname.includes('message.alibaba.com');
}

/**
 * 注入助手按钮
 */
function injectAssistantButton() {
  const button = document.createElement('button');
  button.id = 'alibaba-assistant-btn';
  button.textContent = '🤖 AI 生成回复';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 24px;
    background: #FF6600;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(255, 102, 0, 0.3);
    transition: all 0.3s ease;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.background = '#FF8533';
    button.style.transform = 'translateY(-2px)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#FF6600';
    button.style.transform = 'translateY(0)';
  });

  button.addEventListener('click', () => {
    handleButtonClick();
  });

  document.body.appendChild(button);
  console.log('助手按钮已注入');
}

/**
 * 处理按钮点击
 */
function handleButtonClick() {
  console.log('用户点击了 AI 生成回复按钮');

  // 发送消息给 Service Worker
  chrome.runtime.sendMessage({
    action: 'processInquiry',
    data: {
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  }, (response) => {
    if (response && response.success) {
      console.log('处理成功:', response);
      fillReply(response.reply);
    } else {
      console.error('处理失败:', response);
      alert('生成回复失败，请稍后重试');
    }
  });
}

/**
 * 填充回复内容到输入框
 */
function fillReply(replyText) {
  // 尝试找到输入框并填充内容
  const textarea = document.querySelector('textarea[placeholder*="message"], textarea[class*="input"], .message-input textarea');

  if (textarea) {
    textarea.value = replyText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('回复内容已填充到输入框');

    // 显示成功提示
    showToast('✅ AI 回复已生成，请检查后发送');
  } else {
    console.log('未找到输入框，尝试其他方式...');
    showToast('⚠️ 未找到输入框，请手动粘贴回复内容');

    // 复制回复内容到剪贴板
    navigator.clipboard.writeText(replyText).then(() => {
      console.log('回复内容已复制到剪贴板');
    });
  }
}

/**
 * 显示提示消息
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 12px 24px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 8px;
    font-size: 14px;
    animation: fadeInOut 3s ease-in-out;
  `;

  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      15% { opacity: 1; transform: translateX(-50%) translateY(0); }
      85% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  // 3 秒后移除提示
  setTimeout(() => {
    toast.remove();
    style.remove();
  }, 3000);
}
