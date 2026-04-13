/**
 * 默认配置文件
 * 包含 LLM API 配置等信息
 */

export const LLM_CONFIG = {
  baseUrl: 'https://api.anthropic.com/v1',
  apiKey: '', // 从 chrome.storage 获取
  model: 'claude-sonnet-4-20250514'
};

export const DEFAULT_SETTINGS = {
  replyTone: 'professional',
  autoLanguage: true,
  enableNotifications: true,
  autoProcess: true
};
