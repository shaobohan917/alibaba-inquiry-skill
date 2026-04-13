/**
 * 默认配置 - 内置 API Key
 * 用户安装即用，无需配置
 */

export const LLM_CONFIG = {
  // 通义千问 API 配置
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'sk-YOUR-API-KEY-HERE',  // TODO: 替换为实际的 API Key
  model: 'qwen-plus'
};

/**
 * 默认回复配置
 */
export const REPLY_CONFIG = {
  tone: 'professional',
  autoLanguage: true,
  signature: 'Best regards,\n[Your Name]'
};

/**
 * 自动化配置
 */
export const AUTOMATION_CONFIG = {
  autoFillReply: true,
  autoSend: false,  // 出于安全考虑，不自动发送
  delayBetweenActions: {
    min: 1000,
    max: 3000
  }
};

/**
 * DOM 选择器配置 - 阿里巴巴国际站
 */
export const SELECTORS = {
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
